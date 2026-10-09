"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, Modal, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import {
  useAllProperties,
  useCreateProperty,
  useDeleteScanner,
  useHRAccess,
  useProperties,
  useRegisterScanner,
  useRenameProperty,
  useSaveScannerSettings,
  useScannerSettings,
  useScanners,
  useSetPropertyActive,
  useUpdateScanner,
} from "@/features/hr/api";
import type { Property, PropertyAdmin, Scanner } from "@/features/hr/types";

/**
 * Not in the prototype: the group's properties (resorts), which property each
 * SmartAC / ZKTeco scanner stands at, and the server address scanners send to.
 * Adding / removing scanners and properties is for Owner, Admin and GM.
 */
export default function ScannersPage() {
  const { t } = useLang();
  const scanners = useScanners();
  const props = useProperties();
  const access = useHRAccess();
  const settings = useScannerSettings();
  const [adding, setAdding] = useState(false);
  const canAdmin = !!access.data?.can_manage_accounts;
  const server = settings.data?.adms_server ?? "";
  return (
    <div className="dash-wrap">
      {canAdmin && <PropertiesSection />}
      <SectionHead title={t("sh_scanners")}>
        {canAdmin && (
          <button type="button" className="submit-btn" onClick={() => setAdding(true)}>
            + Add scanner
          </button>
        )}
      </SectionHead>
      <Lede>
        Each scanner belongs to one property. An employee&apos;s Scanner PIN is linked only to the scanners of their own property (plus any
        scanner not assigned yet), so the same PIN can be used by different people at different resorts. A scanner sends nothing until its
        serial number is added here{canAdmin ? "" : " by Admin, GM or Owner"}.
      </Lede>
      <ServerSetting key={server} current={server} canEdit={canAdmin} />
      <DataState loading={scanners.isLoading} error={scanners.error}>
        <Table head={["Scanner", "Serial no.", "Property", "Linked PINs", "Last scan", ""]}>
          {(scanners.data ?? []).length === 0 && <EmptyRow cols={6}>No scanners registered yet.</EmptyRow>}
          {scanners.data?.map((s) => (
            <ScannerRow key={s.id} scanner={s} properties={props.data ?? []} canDelete={canAdmin} />
          ))}
        </Table>
      </DataState>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add scanner">
        {adding && <AddScannerForm scanners={scanners.data ?? []} properties={props.data ?? []} server={server} onDone={() => setAdding(false)} />}
      </Modal>
    </div>
  );
}

/** The address entered on every scanner (COMM. → Cloud Server Setting / ADMS) — stored per business, not in code. */
function ServerSetting({ current, canEdit }: { current: string; canEdit: boolean }) {
  const dialogs = useDialogs();
  const save = useSaveScannerSettings();
  const [value, setValue] = useState(current);
  async function submit() {
    try {
      const r = await save.mutateAsync(value);
      dialogs.success("Saved", r.adms_server ? `Scanners send to ${r.adms_server}, port 80.` : "Server address cleared.");
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }
  return (
    <div className="card">
      <div className="land-row" style={{ alignItems: "flex-end", marginBottom: 0 }}>
        <Field
          label="Server address entered on the scanners"
          grow={2}
          hint="The API domain of this system (not the HR website), e.g. api.example.com — scanners add /iclock/… themselves."
        >
          {canEdit ? (
            <input className="mono" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. uat.superproject.yorlapa.com" />
          ) : (
            <b className="mono">{current || "— not set —"}</b>
          )}
        </Field>
        {canEdit && (
          <button type="button" className="mini-btn" onClick={submit} disabled={save.isPending || value.trim() === current}>
            Save
          </button>
        )}
      </div>
    </div>
  );
}

function AddScannerForm({
  scanners, properties, server, onDone,
}: { scanners: Scanner[]; properties: Property[]; server: string; onDone: () => void }) {
  const dialogs = useDialogs();
  const register = useRegisterScanner();
  const [serial, setSerial] = useState("");
  const [label, setLabel] = useState("");
  const [propertyId, setPropertyId] = useState(properties.length === 1 ? properties[0].id : "");
  const serialNo = serial.replace(/\s+/g, "");
  const existing = scanners.find((s) => s.serial_no.toLowerCase() === serialNo.toLowerCase());
  const serverText = server || "(set the server address on this page first)";

  async function submit() {
    if (!serialNo) return dialogs.error("Serial number required", "Enter the serial number shown on the scanner (System Info → Device Info).");
    if (existing) return dialogs.error("Already registered", `${serialNo} is already registered as "${existing.label || existing.serial_no}". Edit it in the list instead.`);
    try {
      await register.mutateAsync({ serial_no: serialNo, label: label.trim(), property_id: propertyId || null });
      dialogs.success("Scanner added", `${label.trim() || serialNo} is registered. Set its Cloud Server (ADMS) to ${serverText}, port 80 — scans appear here once it connects.`);
      onDone();
    } catch (err) {
      dialogs.error("Could not add scanner", err);
    }
  }

  return (
    <>
      <Field label="Serial number" hint="On the scanner: Menu → System Info → Device Info → Serial Number. Must match exactly.">
        <input className="mono" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="e.g. AJE1260301561" autoFocus />
      </Field>
      {existing && (
        <p className="hint">
          <Tag kind="low">Already registered</Tag> as {existing.label || existing.serial_no}
          {existing.property ? ` at ${existing.property}` : ""}.
        </p>
      )}
      <Field label="Name">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Namkat staff gate" />
      </Field>
      <Field label="Property" hint="Which resort the scanner stands at. Employees' PINs are linked to the scanners of their property.">
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">— Not assigned —</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="hint" style={{ margin: "12px 0" }}>
        Then on the scanner, <b>COMM. → Cloud Server Setting</b>: Server mode <b>ADMS</b>, Enable domain name <b>ON</b>, Server address{" "}
        <b className="mono">{serverText}</b>, Port <b className="mono">80</b>, HTTPS and proxy <b>OFF</b>. Set the time zone to GMT+7.
      </div>
      <button type="button" className="submit-btn" onClick={submit} disabled={register.isPending || !serialNo || !!existing}>
        {register.isPending ? "…" : "+ Add scanner"}
      </button>
    </>
  );
}

function ScannerRow({ scanner, properties, canDelete }: { scanner: Scanner; properties: Property[]; canDelete: boolean }) {
  const dialogs = useDialogs();
  const update = useUpdateScanner();
  const del = useDeleteScanner();
  const [label, setLabel] = useState(scanner.label);
  const [propertyId, setPropertyId] = useState(scanner.property_id ?? "");
  const dirty = label !== scanner.label || propertyId !== (scanner.property_id ?? "");

  async function save() {
    try {
      await update.mutateAsync({ id: scanner.id, property_id: propertyId || null, label });
      dialogs.success("Scanner updated", `${label || scanner.serial_no} is now assigned to ${properties.find((p) => p.id === propertyId)?.name ?? "no property"}.`);
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }

  async function remove() {
    const name = scanner.label || scanner.serial_no;
    if (
      !window.confirm(
        `Remove scanner ${name}? Its ${scanner.linked_pins} PIN link(s) are removed and anything it sends afterwards is ignored until it is added again. Attendance it already recorded stays.`,
      )
    )
      return;
    try {
      await del.mutateAsync(scanner.id);
    } catch (err) {
      dialogs.error("Could not remove", err);
    }
  }

  return (
    <tr>
      <td>
        <input className="inline-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Front gate" />
      </td>
      <td className="mono">{scanner.serial_no}</td>
      <td>
        <select className="inline-input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">— Not assigned —</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {!scanner.property_id && (
          <>
            {" "}
            <Tag kind="pending">Unassigned</Tag>
          </>
        )}
      </td>
      <td className="mono">{scanner.linked_pins}</td>
      <td>{scanner.last_scan ?? "—"}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        {dirty && (
          <button type="button" className="mini-btn" onClick={save} disabled={update.isPending}>
            Save
          </button>
        )}
        {canDelete && (
          <button type="button" className="mini-btn flag" onClick={remove} disabled={del.isPending}>
            🗑 Remove
          </button>
        )}
      </td>
    </tr>
  );
}

/** Properties (resorts) of the group — staff, scanners and outlets each belong to one. */
function PropertiesSection() {
  const dialogs = useDialogs();
  const all = useAllProperties();
  const create = useCreateProperty();
  const [name, setName] = useState("");

  async function add() {
    const n = name.trim();
    if (!n) return;
    try {
      await create.mutateAsync(n);
      setName("");
      dialogs.success("Property added", `${n} can now be chosen for employees and scanners.`);
    } catch (err) {
      dialogs.error("Could not add property", err);
    }
  }

  return (
    <>
      <SectionHead title="Properties" />
      <Lede>
        The resorts of the group. Renaming one keeps its employees, scanners and outlets linked to it. A property can be closed once no
        employee or scanner is left there; a closed one disappears from every list until it is reopened.
      </Lede>
      <div className="land-row">
        <Field label="New property" grow={2}>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="e.g. Nampien Yorlapa" />
        </Field>
        <button type="button" className="submit-btn" onClick={add} disabled={create.isPending || !name.trim()}>
          + Add property
        </button>
      </div>
      <DataState loading={all.isLoading} error={all.error}>
        <Table head={["Property", "Employees", "Scanners", "Status", ""]}>
          {(all.data ?? []).length === 0 && <EmptyRow cols={5}>No properties yet.</EmptyRow>}
          {all.data?.map((p) => (
            <PropertyRow key={`${p.id}:${p.name}:${p.is_active}`} property={p} />
          ))}
        </Table>
      </DataState>
      <div style={{ height: 28 }} />
    </>
  );
}

function PropertyRow({ property }: { property: PropertyAdmin }) {
  const dialogs = useDialogs();
  const rename = useRenameProperty();
  const setActive = useSetPropertyActive();
  const [name, setName] = useState(property.name);
  const dirty = name.trim() !== property.name && name.trim() !== "";

  async function save() {
    try {
      await rename.mutateAsync({ id: property.id, name: name.trim() });
      dialogs.success("Property renamed", `${property.name} is now ${name.trim()}.`);
    } catch (err) {
      dialogs.error("Could not rename", err);
    }
  }

  async function toggle() {
    if (property.is_active && !window.confirm(`Close ${property.name}? It disappears from every list until reopened.`)) return;
    try {
      await setActive.mutateAsync({ id: property.id, is_active: !property.is_active });
    } catch (err) {
      dialogs.error(property.is_active ? "Could not close" : "Could not reopen", err);
    }
  }

  return (
    <tr style={property.is_active ? undefined : { opacity: 0.6 }}>
      <td>
        <input className="inline-input" value={name} onChange={(e) => setName(e.target.value)} style={{ minWidth: 260 }} />
      </td>
      <td className="mono">{property.employees}</td>
      <td className="mono">{property.scanners}</td>
      <td>{property.is_active ? <Tag kind="ok">Open</Tag> : <Tag kind="muted">Closed</Tag>}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        {dirty && (
          <button type="button" className="mini-btn" onClick={save} disabled={rename.isPending}>
            Save
          </button>
        )}
        <button type="button" className={`mini-btn${property.is_active ? " flag" : ""}`} onClick={toggle} disabled={setActive.isPending}>
          {property.is_active ? "Close" : "Reopen"}
        </button>
      </td>
    </tr>
  );
}
