"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, Modal, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
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
            {tr("+ Add scanner", "+ ເພີ່ມເຄື່ອງສະແກນ")}
          </button>
        )}
      </SectionHead>
      <Lede>
        {tr(
          `Each scanner belongs to one property. An employee's Scanner PIN is linked only to the scanners of their own property (plus any scanner not assigned yet), so the same PIN can be used by different people at different resorts. A scanner sends nothing until its serial number is added here${canAdmin ? "" : " by Admin, GM or Owner"}.`,
          `ແຕ່ລະເຄື່ອງສະແກນເປັນຂອງຣີສອດດຽວ. PIN ສະແກນຂອງພະນັກງານ ຜູກສະເພາະກັບເຄື່ອງຂອງຣີສອດຕົນເອງ (ແລະ ເຄື່ອງທີ່ຍັງບໍ່ກຳນົດ), ສະນັ້ນ PIN ດຽວກັນ ໃຊ້ໄດ້ກັບຄົນຕ່າງກັນໃນຕ່າງຣີສອດ. ເຄື່ອງຈະບໍ່ສົ່ງຫຍັງ ຈົນກວ່າເລກ Serial ຖືກເພີ່ມຢູ່ນີ້${canAdmin ? "" : " ໂດຍ Admin, GM ຫຼື ເຈົ້າຂອງ"}.`,
        )}
      </Lede>
      <ServerSetting key={server} current={server} canEdit={canAdmin} />
      <DataState loading={scanners.isLoading} error={scanners.error}>
        <Table head={[tr("Scanner", "ເຄື່ອງສະແກນ"), tr("Serial no.", "ເລກ Serial"), tr("Property", "ຣີສອດ"), tr("Linked PINs", "PIN ທີ່ຜູກ"), tr("Last scan", "ສະແກນລ່າສຸດ"), ""]}>
          {(scanners.data ?? []).length === 0 && <EmptyRow cols={6}>{tr("No scanners registered yet.", "ຍັງບໍ່ມີເຄື່ອງສະແກນ.")}</EmptyRow>}
          {scanners.data?.map((s) => (
            <ScannerRow key={s.id} scanner={s} properties={props.data ?? []} canDelete={canAdmin} />
          ))}
        </Table>
      </DataState>
      <Modal open={adding} onClose={() => setAdding(false)} title={tr("Add scanner", "ເພີ່ມເຄື່ອງສະແກນ")}>
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
      dialogs.success(tr("Saved", "ບັນທຶກແລ້ວ"), r.adms_server ? tr(`Scanners send to ${r.adms_server}, port 80.`, `ເຄື່ອງສະແກນສົ່ງໄປ ${r.adms_server}, port 80.`) : tr("Server address cleared.", "ລ້າງທີ່ຢູ່ server ແລ້ວ."));
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }
  return (
    <div className="card">
      <div className="land-row" style={{ alignItems: "flex-end", marginBottom: 0 }}>
        <Field
          label={tr("Server address entered on the scanners", "ທີ່ຢູ່ server ທີ່ໃສ່ໃນເຄື່ອງສະແກນ")}
          grow={2}
          hint={tr("The API domain of this system (not the HR website), e.g. api.example.com — scanners add /iclock/… themselves.", "ໂດເມນ API ຂອງລະບົບ (ບໍ່ແມ່ນເວັບ HR) ເຊັ່ນ api.example.com — ເຄື່ອງເພີ່ມ /iclock/… ເອງ.")}
        >
          {canEdit ? (
            <input className="mono" value={value} onChange={(e) => setValue(e.target.value)} placeholder={tr("e.g. uat.superproject.yorlapa.com", "ເຊັ່ນ uat.superproject.yorlapa.com")} />
          ) : (
            <b className="mono">{current || "— not set —"}</b>
          )}
        </Field>
        {canEdit && (
          <button type="button" className="mini-btn" onClick={submit} disabled={save.isPending || value.trim() === current}>
            {tr("Save", "ບັນທຶກ")}
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
  const serverText = server || tr("(set the server address on this page first)", "(ຕັ້ງທີ່ຢູ່ server ໃນໜ້ານີ້ກ່ອນ)");

  async function submit() {
    if (!serialNo) return dialogs.error(tr("Serial number required", "ຕ້ອງມີເລກ Serial"), tr("Enter the serial number shown on the scanner (System Info → Device Info).", "ໃສ່ເລກ Serial ທີ່ສະແດງໃນເຄື່ອງ (System Info → Device Info)."));
    if (existing) return dialogs.error(tr("Already registered", "ລົງທະບຽນແລ້ວ"), tr(`${serialNo} is already registered as "${existing.label || existing.serial_no}". Edit it in the list instead.`, `${serialNo} ລົງທະບຽນແລ້ວ ເປັນ "${existing.label || existing.serial_no}". ແກ້ໃນລາຍການແທນ.`));
    try {
      await register.mutateAsync({ serial_no: serialNo, label: label.trim(), property_id: propertyId || null });
      dialogs.success(tr("Scanner added", "ເພີ່ມເຄື່ອງສະແກນແລ້ວ"), tr(`${label.trim() || serialNo} is registered. Set its Cloud Server (ADMS) to ${serverText}, port 80 — scans appear here once it connects.`, `ລົງທະບຽນ ${label.trim() || serialNo} ແລ້ວ. ຕັ້ງ Cloud Server (ADMS) ເປັນ ${serverText}, port 80 — ເມື່ອເຊື່ອມຕໍ່ໄດ້ ການສະແກນຈະສະແດງຢູ່ນີ້.`));
      onDone();
    } catch (err) {
      dialogs.error(tr("Could not add scanner", "ເພີ່ມເຄື່ອງສະແກນບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      <Field label={tr("Serial number", "ເລກ Serial")} hint={tr("On the scanner: Menu → System Info → Device Info → Serial Number. Must match exactly.", "ຢູ່ເຄື່ອງ: Menu → System Info → Device Info → Serial Number. ຕ້ອງກົງທຸກຕົວ.")}>
        <input className="mono" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder={tr("e.g. AJE1260301561", "ເຊັ່ນ AJE1260301561")} autoFocus />
      </Field>
      {existing && (
        <p className="hint">
          <Tag kind="low">{tr("Already registered", "ລົງທະບຽນແລ້ວ")}</Tag> as {existing.label || existing.serial_no}
          {existing.property ? ` at ${existing.property}` : ""}.
        </p>
      )}
      <Field label={tr("Name", "ຊື່")}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tr("e.g. Namkat staff gate", "ເຊັ່ນ ປະຕູພະນັກງານ Namkat")} />
      </Field>
      <Field label={tr("Property", "ຣີສອດ")} hint={tr("Which resort the scanner stands at. Employees' PINs are linked to the scanners of their property.", "ເຄື່ອງຕັ້ງຢູ່ຣີສອດໃດ. PIN ຂອງພະນັກງານ ຜູກກັບເຄື່ອງຂອງຣີສອດຕົນເອງ.")}>
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">{tr("— Not assigned —", "— ຍັງບໍ່ກຳນົດ —")}</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="hint" style={{ margin: "12px 0" }}>
        {tr("Then on the scanner,", "ຈາກນັ້ນ ຢູ່ເຄື່ອງສະແກນ ເຂົ້າ")} <b>COMM. → Cloud Server Setting</b>: Server mode <b>ADMS</b>, Enable domain name <b>ON</b>, Server address{" "}
        <b className="mono">{serverText}</b>, Port <b className="mono">80</b>, HTTPS {tr("and", "ແລະ")} proxy <b>OFF</b>. {tr("Set the time zone to GMT+7.", "ຕັ້ງເຂດເວລາເປັນ GMT+7.")}
      </div>
      <button type="button" className="submit-btn" onClick={submit} disabled={register.isPending || !serialNo || !!existing}>
        {register.isPending ? "…" : tr("+ Add scanner", "+ ເພີ່ມເຄື່ອງສະແກນ")}
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
      dialogs.success(tr("Scanner updated", "ອັບເດດເຄື່ອງສະແກນແລ້ວ"), tr(`${label || scanner.serial_no} is now assigned to ${properties.find((p) => p.id === propertyId)?.name ?? "no property"}.`, `${label || scanner.serial_no} ຖືກກຳນົດໃຫ້ ${properties.find((p) => p.id === propertyId)?.name ?? "ບໍ່ມີຣີສອດ"} ແລ້ວ.`));
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  async function remove() {
    const name = scanner.label || scanner.serial_no;
    if (
      !window.confirm(
        tr(`Remove scanner ${name}? Its ${scanner.linked_pins} PIN link(s) are removed and anything it sends afterwards is ignored until it is added again. Attendance it already recorded stays.`, `ລຶບເຄື່ອງ ${name}? PIN ທີ່ຜູກ ${scanner.linked_pins} ລາຍການຈະຖືກລຶບ ແລະ ສິ່ງທີ່ສົ່ງມາພາຍຫຼັງຈະຖືກມອງຂ້າມ ຈົນກວ່າຈະເພີ່ມຄືນ. ການເຂົ້າວຽກທີ່ບັນທຶກແລ້ວຍັງຢູ່.`),
      )
    )
      return;
    try {
      await del.mutateAsync(scanner.id);
    } catch (err) {
      dialogs.error(tr("Could not remove", "ລົບບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <tr>
      <td>
        <input className="inline-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tr("e.g. Front gate", "ເຊັ່ນ ປະຕູໜ້າ")} />
      </td>
      <td className="mono">{scanner.serial_no}</td>
      <td>
        <select className="inline-input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">{tr("— Not assigned —", "— ຍັງບໍ່ກຳນົດ —")}</option>
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
            {tr("Save", "ບັນທຶກ")}
          </button>
        )}
        {canDelete && (
          <button type="button" className="mini-btn flag" onClick={remove} disabled={del.isPending}>
            {tr("🗑 Remove", "🗑 ລົບອອກ")}
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
      dialogs.success(tr("Property added", "ເພີ່ມຣີສອດແລ້ວ"), tr(`${n} can now be chosen for employees and scanners.`, `ເລືອກ ${n} ໃຫ້ພະນັກງານ ແລະ ເຄື່ອງສະແກນໄດ້ແລ້ວ.`));
    } catch (err) {
      dialogs.error(tr("Could not add property", "ເພີ່ມຣີສອດບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      <SectionHead title={tr("Properties", "ຣີສອດ")} />
      <Lede>
        {tr("The resorts of the group. Renaming one keeps its employees, scanners and outlets linked to it. A property can be closed once no employee or scanner is left there; a closed one disappears from every list until it is reopened.", "ຣີສອດຂອງກຸ່ມ. ປ່ຽນຊື່ແລ້ວ ພະນັກງານ, ເຄື່ອງສະແກນ ແລະ outlet ຍັງຕິດຢູ່ຄືເກົ່າ. ປິດໄດ້ເມື່ອບໍ່ມີພະນັກງານ ແລະ ເຄື່ອງເຫຼືອ; ຣີສອດທີ່ປິດຈະບໍ່ສະແດງ ຈົນກວ່າຈະເປີດຄືນ.")}
      </Lede>
      <div className="land-row">
        <Field label={tr("New property", "ຣີສອດໃໝ່")} grow={2}>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={tr("e.g. Nampien Yorlapa", "ເຊັ່ນ Nampien Yorlapa")} />
        </Field>
        <button type="button" className="submit-btn" onClick={add} disabled={create.isPending || !name.trim()}>
          {tr("+ Add property", "+ ເພີ່ມຣີສອດ")}
        </button>
      </div>
      <DataState loading={all.isLoading} error={all.error}>
        <Table head={[tr("Property", "ຣີສອດ"), tr("Employees", "ພະນັກງານ"), tr("Scanners", "ເຄື່ອງສະແກນ"), tr("Status", "ສະຖານະ"), ""]}>
          {(all.data ?? []).length === 0 && <EmptyRow cols={5}>{tr("No properties yet.", "ຍັງບໍ່ມີຣີສອດ.")}</EmptyRow>}
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
      dialogs.success(tr("Property renamed", "ປ່ຽນຊື່ຣີສອດແລ້ວ"), `${property.name} is now ${name.trim()}.`);
    } catch (err) {
      dialogs.error(tr("Could not rename", "ປ່ຽນຊື່ບໍ່ສຳເລັດ"), err);
    }
  }

  async function toggle() {
    if (property.is_active && !window.confirm(tr(`Close ${property.name}? It disappears from every list until reopened.`, `ປິດ ${property.name}? ຈະຫາຍຈາກທຸກລາຍການ ຈົນກວ່າຈະເປີດຄືນ.`))) return;
    try {
      await setActive.mutateAsync({ id: property.id, is_active: !property.is_active });
    } catch (err) {
      dialogs.error(property.is_active ? tr("Could not close", "ປິດບໍ່ສຳເລັດ") : tr("Could not reopen", "ເປີດຄືນບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <tr style={property.is_active ? undefined : { opacity: 0.6 }}>
      <td>
        <input className="inline-input" value={name} onChange={(e) => setName(e.target.value)} style={{ minWidth: 260 }} />
      </td>
      <td className="mono">{property.employees}</td>
      <td className="mono">{property.scanners}</td>
      <td>{property.is_active ? <Tag kind="ok">{tr("Open", "ເປີດ")}</Tag> : <Tag kind="muted">{tr("Closed", "ປິດແລ້ວ")}</Tag>}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        {dirty && (
          <button type="button" className="mini-btn" onClick={save} disabled={rename.isPending}>
            {tr("Save", "ບັນທຶກ")}
          </button>
        )}
        <button type="button" className={`mini-btn${property.is_active ? " flag" : ""}`} onClick={toggle} disabled={setActive.isPending}>
          {property.is_active ? tr("Close", "ປິດ") : tr("Reopen", "ເປີດຄືນ")}
        </button>
      </td>
    </tr>
  );
}
