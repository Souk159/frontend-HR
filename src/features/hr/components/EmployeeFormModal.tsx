"use client";

import { tr } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Avatar, Field, Modal, useDialogs } from "@/components/ui";
import { lak, thisMonth, today } from "@/lib/format";
import {
  fetchNextEmployeeNo,
  useBonusTypes,
  useCreateStaff,
  useDeleteStaffPhoto,
  useDepartments,
  useProperties,
  useRequestStaffChange,
  useStaff,
  useUploadStaffPhoto,
} from "../api";
import type { Staff, StaffInput } from "../types";
import { employmentTypes, requestOutcome } from "../utils";

const blank = (): StaffInput => ({
  employee_no: "",
  full_name: "",
  name_lao: "",
  gender: "Male",
  date_of_birth: "",
  nationality: "Lao",
  national_id: "",
  phone: "",
  email: "",
  address: "",
  hire_date: today(),
  probation_end_date: "",
  contract_start: "",
  contract_end: "",
  department_id: null,
  property_id: null,
  position: "",
  employment_type: "permanent",
  base_salary: 0,
  bank_account: "",
  note: "",
  scanner_pin: "",
  requires_scan: true,
  gets_service_charge: true,
  always_full_service: false,
  gets_annual_leave: true,
  bonus_type_ids: [],
});

const fromStaff = (s: Staff): StaffInput => ({
  employee_no: s.employee_no,
  full_name: s.full_name,
  name_lao: s.name_lao,
  gender: s.gender || "Male",
  date_of_birth: s.date_of_birth ?? "",
  nationality: s.nationality,
  national_id: s.national_id,
  phone: s.phone,
  email: s.email.endsWith("@staff.local") ? "" : s.email,
  address: s.address,
  hire_date: s.hire_date ?? "",
  probation_end_date: s.probation_end_date ?? "",
  contract_start: s.contract_start ?? "",
  contract_end: s.contract_end ?? "",
  department_id: s.department_id,
  property_id: s.property_id,
  position: s.position,
  employment_type: s.employment_type,
  base_salary: s.base_salary,
  bank_account: s.bank_account,
  note: s.note,
  scanner_pin: s.scanner_pin,
  requires_scan: s.requires_scan,
  gets_service_charge: s.gets_service_charge,
  always_full_service: s.always_full_service,
  gets_annual_leave: s.gets_annual_leave,
  bonus_type_ids: s.bonus_type_ids ?? [],
});

/**
 * Add employee (immediate, no approval) / Edit employee (goes through the Approval Rule).
 * Mirrors the prototype's employeeFormModal (v168 flags and bonus ticks); adds Property and Scanner PIN.
 */
export function EmployeeFormModal({ editing, onClose }: { editing: Staff | null | "new"; onClose: () => void }) {
  const editingStaff = editing && editing !== "new" ? editing : null;
  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      wide
      title={editing === "new" ? tr("Add new employee", "ເພີ່ມພະນັກງານໃໝ່") : tr(`Edit employee — ${editingStaff?.full_name ?? ""}`, `ແກ້ໄຂພະນັກງານ — ${editingStaff?.full_name ?? ""}`)}
    >
      {/* keyed so the form state starts fresh for each employee */}
      {editing !== null && <EmployeeForm key={editingStaff?.user_id ?? "new"} editing={editingStaff} onClose={onClose} />}
    </Modal>
  );
}

function EmployeeForm({ editing: editingStaff, onClose }: { editing: Staff | null; onClose: () => void }) {
  const isNew = editingStaff === null;
  const depts = useDepartments();
  const props = useProperties();
  const staff = useStaff(true);
  const create = useCreateStaff();
  const uploadPhoto = useUploadStaffPhoto();
  const deletePhoto = useDeleteStaffPhoto();
  // a new hire's photo waits here until the employee exists
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  useEffect(() => () => { if (pendingPreview) URL.revokeObjectURL(pendingPreview); }, [pendingPreview]);
  const [photoUrl, setPhotoUrl] = useState(editingStaff?.photo_url ?? "");
  const change = useRequestStaffChange();
  const dialogs = useDialogs();
  const [f, setF] = useState<StaffInput>(() =>
    editingStaff
      ? fromStaff(editingStaff)
      : { ...blank(), department_id: depts.data?.[0]?.id ?? null, property_id: props.data?.[0]?.id ?? null },
  );
  const [salary, setSalary] = useState(() => (editingStaff ? String(editingStaff.base_salary) : ""));

  const generateId = () =>
    fetchNextEmployeeNo()
      .then((r) => setF((p) => ({ ...p, employee_no: r.employee_no })))
      .catch(() => undefined);

  // a new hire gets the next free EMP-#### straight away
  useEffect(() => {
    if (isNew) generateId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof StaffInput>(k: K, v: StaffInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const editingId = editingStaff?.user_id ?? null;
  const idClash = staff.data?.find((s) => s.employee_no === f.employee_no && s.user_id !== editingId);

  async function submit() {
    const body = { ...f, base_salary: Number(salary) || 0 };
    if (!body.full_name.trim()) return dialogs.error(tr("Missing name", "ຂາດຊື່"), new Error(tr("Enter at least the employee's English name.", "ໃສ່ຢ່າງໜ້ອຍຊື່ພາສາອັງກິດ.")));
    if (!body.base_salary) return dialogs.error(tr("Missing base salary", "ຂາດເງິນເດືອນ"), new Error(tr("Enter a base salary before saving.", "ໃສ່ເງິນເດືອນກ່ອນບັນທຶກ.")));
    if (idClash)
      return dialogs.error(
        tr("Duplicate Employee ID", "ລະຫັດພະນັກງານຊ້ຳ"),
        new Error(tr(`That Employee ID is already used by ${idClash.full_name} — generate a new one or pick a different ID.`, `ລະຫັດນີ້ ${idClash.full_name} ໃຊ້ແລ້ວ — ສ້າງລະຫັດໃໝ່ ຫຼື ເລືອກລະຫັດອື່ນ.`)),
      );
    try {
      if (isNew) {
        const created = await create.mutateAsync(body);
        if (pendingPhoto) {
          await uploadPhoto
            .mutateAsync({ id: created.user_id, file: pendingPhoto })
            .catch((err) => dialogs.error(tr("Employee added, but the photo was not saved", "ເພີ່ມພະນັກງານແລ້ວ ແຕ່ບັນທຶກຮູບບໍ່ສຳເລັດ"), err));
        }
        onClose();
        dialogs.success(tr("Employee added", "ເພີ່ມພະນັກງານແລ້ວ"), tr(`${body.full_name} has been added to the employee directory. No approval needed for a new hire.`, `ເພີ່ມ ${body.full_name} ເຂົ້າສາລະບານພະນັກງານແລ້ວ. ພະນັກງານໃໝ່ ບໍ່ຕ້ອງອະນຸມັດ.`));
      } else if (editingId) {
        const res = await change.mutateAsync({ id: editingId, body });
        onClose();
        dialogs.success(...requestOutcome(res, `Changes to ${body.full_name}'s profile`));
      }
    } catch (err) {
      dialogs.error(isNew ? tr("Could not add employee", "ເພີ່ມພະນັກງານບໍ່ສຳເລັດ") : tr("Could not send request", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }

  const busy = create.isPending || change.isPending;
  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return dialogs.error(tr("Photo too large", "ຮູບໃຫຍ່ໂພດ"), new Error(tr("Choose a photo of 5 MB or smaller.", "ເລືອກຮູບທີ່ບໍ່ເກີນ 5 MB.")));
    if (!editingId) {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setPendingPhoto(file);
      setPendingPreview(URL.createObjectURL(file));
      return;
    }
    try {
      const r = await uploadPhoto.mutateAsync({ id: editingId, file });
      setPhotoUrl(r.photo_url);
    } catch (err) {
      dialogs.error(tr("Could not upload the photo", "ອັບໂຫຼດຮູບບໍ່ສຳເລັດ"), err);
    }
  }
  async function removePhoto() {
    if (!editingId) {
      setPendingPhoto(null);
      setPendingPreview(null);
      return;
    }
    try {
      await deletePhoto.mutateAsync(editingId);
      setPhotoUrl("");
    } catch (err) {
      dialogs.error(tr("Could not remove the photo", "ລົບຮູບບໍ່ສຳເລັດ"), err);
    }
  }
  const shownPhoto = photoUrl || editingStaff?.device_photo_url || "";
  const photoNote = pendingPhoto
    ? tr("Saved when the employee is added.", "ຈະບັນທຶກເມື່ອເພີ່ມພະນັກງານ.")
    : photoUrl
      ? tr("Uploaded by HR. Changing the photo applies immediately (no approval).", "HR ອັບໂຫຼດ. ການປ່ຽນຮູບມີຜົນທັນທີ (ບໍ່ຕ້ອງອະນຸມັດ).")
      : editingStaff?.device_photo_url
        ? tr("Photo sent by the scanner. Upload one to replace it.", "ຮູບຈາກເຄື່ອງສະແກນ. ອັບໂຫຼດຮູບອື່ນເພື່ອປ່ຽນ.")
        : tr("No photo yet. JPEG, PNG or WebP, up to 5 MB.", "ຍັງບໍ່ມີຮູບ. JPEG, PNG ຫຼື WebP, ບໍ່ເກີນ 5 MB.");

  return (
    <>
      <div className="land-row photo-field">
        {pendingPreview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
          <img src={pendingPreview} alt={tr("New photo", "ຮູບໃໝ່")} className="avatar-img" style={{ width: 72, height: 72 }} />
        ) : (
          <Avatar name={f.full_name || "New"} url={shownPhoto} size={72} />
        )}
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <label className="mini-btn" style={{ cursor: "pointer" }}>
              {uploadPhoto.isPending ? tr("Uploading…", "ກຳລັງອັບໂຫຼດ…") : shownPhoto || pendingPreview ? tr("Change photo", "ປ່ຽນຮູບ") : tr("Upload photo", "ອັບໂຫຼດຮູບ")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {(photoUrl || pendingPreview) && (
              <button type="button" className="mini-btn flag" onClick={removePhoto} disabled={deletePhoto.isPending}>
                {tr("Remove", "ລົບ")}
              </button>
            )}
          </span>
          <p className="hint">{photoNote}</p>
        </div>
      </div>
      <div className="land-row">
        <Field label={tr("Employee ID", "ລະຫັດພະນັກງານ")} grow={2} hint={idClash ? <span className="c-clay">⚠ {tr(`This ID is already used by ${idClash.full_name}.`, `ລະຫັດນີ້ ${idClash.full_name} ໃຊ້ແລ້ວ.`)}</span> : undefined}>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="mono" value={f.employee_no} onChange={(e) => set("employee_no", e.target.value.toUpperCase())} placeholder={tr("e.g. EMP-0006", "ເຊັ່ນ EMP-0006")} style={{ flex: 1 }} />
            <button type="button" className="mini-btn" onClick={generateId}>
              {tr("Generate", "ສ້າງລະຫັດ")}
            </button>
          </div>
        </Field>
        <Field label={tr("Scanner PIN", "PIN ສະແກນ")} hint={tr("PIN enrolled on the SmartAC / ZKTeco scanner at this property", "PIN ທີ່ລົງທະບຽນໃນເຄື່ອງສະແກນຂອງຣີສອດນີ້")}>
          <input className="mono" inputMode="numeric" value={f.scanner_pin} onChange={(e) => set("scanner_pin", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 77" />
        </Field>
      </div>
      <div className="land-row">
        <Field label={tr("Full name (Lao)", "ຊື່ ແລະ ນາມສະກຸນ (ລາວ)")}>
          <input value={f.name_lao} onChange={(e) => set("name_lao", e.target.value)} placeholder="ຊື່ ນາມສະກຸນ" />
        </Field>
        <Field label={tr("Full name (English)", "ຊື່ ແລະ ນາມສະກຸນ (ອັງກິດ)")}>
          <input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder={tr("e.g. Anong Vong", "ເຊັ່ນ Anong Vong")} />
        </Field>
      </div>
      <div className="land-row">
        <Field label={tr("Gender", "ເພດ")}>
          <select value={f.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="Male">{tr("Male", "ຊາຍ")}</option>
            <option value="Female">{tr("Female", "ຍິງ")}</option>
            <option value="Other">{tr("Other", "ອື່ນໆ")}</option>
          </select>
        </Field>
        <Field label={tr("Date of birth", "ວັນເດືອນປີເກີດ")}>
          <input type="date" value={f.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
        </Field>
        <Field label={tr("Nationality", "ສັນຊາດ")}>
          <input value={f.nationality} onChange={(e) => set("nationality", e.target.value)} />
        </Field>
        <Field label={tr("ID card / Passport", "ບັດປະຈຳຕົວ / ໜັງສືຜ່ານແດນ")}>
          <input value={f.national_id} onChange={(e) => set("national_id", e.target.value)} placeholder="e.g. L1234567" />
        </Field>
      </div>
      <div className="land-row">
        <Field label={tr("Phone number", "ເບີໂທ")}>
          <input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="e.g. 020 5551 1234" />
        </Field>
        <Field label={tr("Email", "ອີເມວ")}>
          <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder={tr("e.g. name@yorlapa.com", "ເຊັ່ນ name@yorlapa.com")} />
        </Field>
      </div>
      <Field label={tr("Address", "ທີ່ຢູ່")}>
        <input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder={tr("Village, city", "ບ້ານ, ເມືອງ")} />
      </Field>
      <div className="land-row">
        <Field label={tr("Join date", "ວັນເຂົ້າວຽກ")}>
          <input type="date" value={f.hire_date} onChange={(e) => set("hire_date", e.target.value)} />
        </Field>
        <Field label={tr("Probation end date", "ວັນໝົດທົດລອງງານ")}>
          <input type="date" value={f.probation_end_date} onChange={(e) => set("probation_end_date", e.target.value)} />
        </Field>
      </div>
      <div className="land-row">
        <Field label={tr("Contract start", "ເລີ່ມສັນຍາ")}>
          <input type="date" value={f.contract_start} onChange={(e) => set("contract_start", e.target.value)} />
        </Field>
        {f.employment_type !== "permanent" && (
          <Field label={tr("Contract end", "ສິ້ນສຸດສັນຍາ")}>
            <input type="date" value={f.contract_end} onChange={(e) => set("contract_end", e.target.value)} />
          </Field>
        )}
      </div>
      <div className="land-row">
        <Field label={tr("Property", "ຣີສອດ")}>
          <select value={f.property_id ?? ""} onChange={(e) => set("property_id", e.target.value || null)}>
            <option value="">{tr("— Not set —", "— ບໍ່ໄດ້ກຳນົດ —")}</option>
            {props.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr("Department", "ພະແນກ")}>
          <select value={f.department_id ?? ""} onChange={(e) => set("department_id", e.target.value || null)}>
            <option value="">{tr("— Unassigned —", "— ບໍ່ມີພະແນກ —")}</option>
            {depts.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr("Position", "ຕຳແໜ່ງ")}>
          <input value={f.position} onChange={(e) => set("position", e.target.value)} placeholder={tr("e.g. Server", "ເຊັ່ນ ພະນັກງານເສີບ")} />
        </Field>
        <Field label={tr("Employment type", "ປະເພດການຈ້າງ")}>
          <select value={f.employment_type} onChange={(e) => set("employment_type", e.target.value as StaffInput["employment_type"])}>
            {employmentTypes().map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="land-row">
        <Field label={tr("Base salary (₭)", "ເງິນເດືອນ (₭)")}>
          <input inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 3200000" />
        </Field>
        <Field label={tr("Bank / payment information", "ບັນຊີທະນາຄານ / ການຈ່າຍເງິນ")}>
          <input value={f.bank_account} onChange={(e) => set("bank_account", e.target.value)} placeholder={tr("e.g. BCEL — 010-12-00-1234567-8", "ເຊັ່ນ BCEL — 010-12-00-1234567-8")} />
        </Field>
      </div>
      <Field label={tr("Employee notes", "ໝາຍເຫດ")}>
        <input value={f.note} onChange={(e) => set("note", e.target.value)} placeholder={tr("Optional", "ບໍ່ບັງຄັບ")} />
      </Field>
      <PayrollFlags f={f} set={set} />
      <button type="button" className="submit-btn" onClick={submit} disabled={busy}>
        {busy ? "…" : isNew ? tr("+ Add employee", "+ ເພີ່ມພະນັກງານ") : tr("Submit changes", "ສົ່ງການປ່ຽນແປງ")}
      </button>
    </>
  );
}

/** Prototype v168 payroll flags and bonus ticks — nobody gets a bonus type until it is ticked here. */
function PayrollFlags({ f, set }: { f: StaffInput; set: <K extends keyof StaffInput>(k: K, v: StaffInput[K]) => void }) {
  const bonusTypes = useBonusTypes(thisMonth());
  const toggleBonus = (id: string, on: boolean) =>
    set("bonus_type_ids", on ? [...f.bonus_type_ids, id] : f.bonus_type_ids.filter((b) => b !== id));
  return (
    <div className="field">
      <label>{tr("Payroll & benefits", "ເງິນເດືອນ ແລະ ສະຫວັດດີການ")}</label>
      <label className="check-label">
        <input type="checkbox" checked={f.gets_service_charge} onChange={(e) => set("gets_service_charge", e.target.checked)} />
        {tr("Gets service charge", "ໄດ້ຄ່າບໍລິການ")}
      </label>
      <label className="check-label">
        <input type="checkbox" checked={f.always_full_service} onChange={(e) => set("always_full_service", e.target.checked)} />
        Always gets full service charge (even on leave)
      </label>
      <label className="check-label">
        <input type="checkbox" checked={!f.requires_scan} onChange={(e) => set("requires_scan", !e.target.checked)} />
        {tr("No fingerprint scan needed (e.g. GM, HR) — full salary, no OT", "ບໍ່ຕ້ອງສະແກນ (ເຊັ່ນ GM, HR) — ເງິນເດືອນເຕັມ, ບໍ່ມີ OT")}
      </label>
      <label className="check-label">
        <input type="checkbox" checked={f.gets_annual_leave} onChange={(e) => set("gets_annual_leave", e.target.checked)} />
        Gets annual leave quota (appears on Leave Quota)
      </label>
      {(bonusTypes.data ?? []).length > 0 && (
        <>
          <label style={{ marginTop: 8 }}>{tr("Bonuses", "ໂບນັດ")}</label>
          {bonusTypes.data?.map((b) => (
            <label key={b.id} className="check-label">
              <input type="checkbox" checked={f.bonus_type_ids.includes(b.id)} onChange={(e) => toggleBonus(b.id, e.target.checked)} />
              {b.name}
              <span className="c-soft" style={{ fontSize: 11 }}>
                {b.kind === "flat" ? tr(`— ${lak(b.amount)} each`, `— ຄົນລະ ${lak(b.amount)}`) : tr("— pooled, split evenly", "— ລວມກ້ອນ, ແບ່ງເທົ່າກັນ")}
              </span>
            </label>
          ))}
        </>
      )}
    </div>
  );
}
