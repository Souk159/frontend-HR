"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, Modal, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import {
  useCreateProperty,
  useHRAccess,
  useProperties,
  useRegisterScanner,
  useRenameProperty,
  useScanners,
  useUpdateScanner,
} from "@/features/hr/api";
import type { Property, Scanner } from "@/features/hr/types";

/** The Go API only lets these roles register a scanner or add / rename a property. */
const REGISTER_ROLES = ["admin", "gm", "owner"];
/** Server address entered on the scanner (COMM. → Cloud Server Setting, ADMS). */
const ADMS_SERVER = "uat.superproject.yorlapa.com";

/**
 * Not in the prototype: which property (resort) each SmartAC / ZKTeco scanner
 * stands at, so attendance shows where every scan came from and PINs are
 * matched per property.
 */
export default function ScannersPage() {
  const { t } = useLang();
  const scanners = useScanners();
  const props = useProperties();
  const access = useHRAccess();
  const [adding, setAdding] = useState(false);
  const canRegister = REGISTER_ROLES.includes(access.data?.role ?? "");
  return (
    <div className="dash-wrap">
      {canRegister && <PropertiesSection properties={props.data ?? []} loading={props.isLoading} error={props.error} />}
      <SectionHead title={t("sh_scanners")}>
        {canRegister && (
          <button type="button" className="submit-btn" onClick={() => setAdding(true)}>
            + Add scanner
          </button>
        )}
      </SectionHead>
      <Lede>
        Each scanner belongs to one property. An employee&apos;s Scanner PIN is linked only to the scanners of their own property (plus any
        scanner not assigned yet), so the same PIN can be used by different people at different resorts. A scanner sends nothing until its
        serial number is added here{canRegister ? "" : " by Admin, GM or Owner"}.
      </Lede>
      <DataState loading={scanners.isLoading} error={scanners.error}>
        <Table head={["Scanner", "Serial no.", "Property", "Linked PINs", "Last scan", ""]}>
          {(scanners.data ?? []).length === 0 && <EmptyRow cols={6}>No scanners registered yet.</EmptyRow>}
          {scanners.data?.map((s) => (
            <ScannerRow key={s.id} scanner={s} properties={props.data ?? []} />
          ))}
        </Table>
      </DataState>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add scanner">
        {adding && <AddScannerForm scanners={scanners.data ?? []} properties={props.data ?? []} onDone={() => setAdding(false)} />}
      </Modal>
    </div>
  );
}

function AddScannerForm({ scanners, properties, onDone }: { scanners: Scanner[]; properties: Property[]; onDone: () => void }) {
  const dialogs = useDialogs();
  const register = useRegisterScanner();
  const [serial, setSerial] = useState("");
  const [label, setLabel] = useState("");
  const [propertyId, setPropertyId] = useState(properties.length === 1 ? properties[0].id : "");
  const serialNo = serial.replace(/s+/g, "");
  const existing = scanners.find((s) => s.serial_no.toLowerCase() === serialNo.toLowerCase());

  async function submit() {
    if (!serialNo) return dialogs.error("Serial number required", "Enter the serial number shown on the scanner (System Info → Device Info).");
    if (existing) return dialogs.error("Already registered", `${serialNo} is already registered as "${existing.label || existing.serial_no}". Edit it in the list instead.`);
    try {
      await register.mutateAsync({ serial_no: serialNo, label: label.trim(), property_id: propertyId || null });
      dialogs.success(
        "Scanner added",
        `${label.trim() || serialNo} is registered. Set its Cloud Server (ADMS) to ${ADMS_SERVER}, port 80 — scans appear here once it connects.`,
      );
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
        <b className="mono">{ADMS_SERVER}</b>, Port <b className="mono">80</b>, HTTPS and proxy <b>OFF</b>. Set the time zone to GMT+7.
      </div>
      <button type="button" className="submit-btn" onClick={submit} disabled={register.isPending || !serialNo || !!existing}>
        {register.isPending ? "…" : "+ Add scanner"}
      </button>
    </>
  );
}

function ScannerRow({ scanner, properties }: { scanner: Scanner; properties: Property[] }) {
  const dialogs = useDialogs();
  const update = useUpdateScanner();
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
      <td>
        {dirty && (
          <button type="button" className="mini-btn" onClick={save} disabled={update.isPending}>
            Save
          </button>
        )}
      </td>
    </tr>
  );
}

/** Properties (resorts) of the group — staff, scanners and outlets each belong to one. */
function PropertiesSection({ properties, loading, error }: { properties: Property[]; loading: boolean; error: unknown }) {
  const dialogs = useDialogs();
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
      <Lede>The resorts of the group. Renaming one keeps its employees, scanners and outlets linked to it.</Lede>
      <div className="land-row">
        <Field label="New property" grow={2}>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="e.g. Nampien Yorlapa" />
        </Field>
        <button type="button" className="submit-btn" onClick={add} disabled={create.isPending || !name.trim()}>
          + Add property
        </button>
      </div>
      <DataState loading={loading} error={error}>
        <Table head={["Property", ""]}>
          {properties.length === 0 && <EmptyRow cols={2}>No properties yet.</EmptyRow>}
          {properties.map((p) => (
            <PropertyRow key={`${p.id}:${p.name}`} property={p} />
          ))}
        </Table>
      </DataState>
      <div style={{ height: 28 }} />
    </>
  );
}

function PropertyRow({ property }: { property: Property }) {
  const dialogs = useDialogs();
  const rename = useRenameProperty();
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

  return (
    <tr>
      <td>
        <input className="inline-input" value={name} onChange={(e) => setName(e.target.value)} style={{ minWidth: 260 }} />
      </td>
      <td>
        {dirty && (
          <button type="button" className="mini-btn" onClick={save} disabled={rename.isPending}>
            Save
          </button>
        )}
      </td>
    </tr>
  );
}
