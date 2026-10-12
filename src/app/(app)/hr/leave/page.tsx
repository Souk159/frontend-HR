"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, SectionHead, StatusTag, Table, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { daysUntil, fmtDate, num, today } from "@/lib/format";
import {
  useCreateLeaveRequest,
  useCreateLeaveType,
  useDeleteLeaveType,
  useLeaveRequests,
  useLeaveTypes,
  useStaff,
  useUpdateLeaveType,
} from "@/features/hr/api";
import type { LeaveType } from "@/features/hr/types";
import { leaveTypeLabel, requestOutcome } from "@/features/hr/utils";

/** Calendar days between two dates, inclusive. */
const spanDays = (from: string, to: string) => Math.max(1, (daysUntil(to) ?? 0) - (daysUntil(from) ?? 0) + 1);

export default function LeavePage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const staff = useStaff();
  const types = useLeaveTypes();
  const requests = useLeaveRequests();
  const createReq = useCreateLeaveRequest();
  const createType = useCreateLeaveType();

  const [f, setF] = useState({ user_id: "", leave_type_id: "", from: today(), to: today(), days: "1", reason: "" });
  const [showType, setShowType] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", quota: "0" });

  const setRange = (from: string, to: string) => setF((p) => ({ ...p, from, to: to < from ? from : to, days: String(spanDays(from, to < from ? from : to)) }));

  async function submit() {
    const emp = staff.data?.find((s) => s.user_id === (f.user_id || staff.data?.[0]?.user_id));
    const typeId = Number(f.leave_type_id || types.data?.[0]?.id);
    if (!emp) return dialogs.error(tr("Missing employee", "ຍັງບໍ່ເລືອກພະນັກງານ"), new Error(tr("Select an employee before adding.", "ເລືອກພະນັກງານກ່ອນ.")));
    const days = parseFloat(f.days) || 1;
    try {
      const res = await createReq.mutateAsync({ user_id: emp.user_id, leave_type_id: typeId, start_date: f.from, end_date: f.to, days, reason: f.reason });
      const typeName = types.data?.find((x) => x.id === typeId)?.name ?? tr("Leave", "ລາ");
      dialogs.success(...requestOutcome(res, `${typeName} for ${emp.full_name} (${num(days)} day${days > 1 ? "s" : ""})`));
      setF((p) => ({ ...p, days: "1", reason: "" }));
    } catch (err) {
      dialogs.error(tr("Could not send request", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }

  async function addType() {
    if (!typeForm.name.trim()) return dialogs.error(tr("Missing name", "ຂາດຊື່"), new Error(tr("Enter a leave type name first.", "ໃສ່ຊື່ປະເພດລາກ່ອນ.")));
    try {
      await createType.mutateAsync({ name: typeForm.name.trim(), default_quota: parseInt(typeForm.quota) || 0 });
      dialogs.success(
        tr("Leave type created", "ສ້າງປະເພດລາແລ້ວ"),
        tr(`"${typeForm.name}" is now available in the Type dropdown, and a matching quota column has been added to Leave Quota for every employee.`, `"${typeForm.name}" ເລືອກໄດ້ໃນຊ່ອງປະເພດແລ້ວ ແລະ ເພີ່ມຖັນໂຄຕາໃນ ໂຄຕາລາພັກ ໃຫ້ທຸກຄົນແລ້ວ.`),
      );
      setTypeForm({ name: "", quota: "0" });
      setShowType(false);
    } catch (err) {
      dialogs.error(tr("Could not create leave type", "ສ້າງປະເພດລາບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="subview">
      <SectionHead title={t("sh_leave_requests")} />
      <Lede>
        {tr("Most staff don't have a phone to request leave themselves — HR logs it here on their behalf. Every request below goes through the Approval Rule, and only deducts from the employee's quota once approved. Public holidays (Public Holiday tab) appear here as leave types and can only be taken inside their window.", "ພະນັກງານສ່ວນຫຼາຍບໍ່ມີໂທລະສັບຂໍລາເອງ — HR ບັນທຶກແທນຢູ່ນີ້. ທຸກຄຳຂໍຜ່ານການອະນຸມັດ ແລະ ຫັກຈາກໂຄຕາ ເມື່ອອະນຸມັດແລ້ວເທົ່ານັ້ນ. ວັນພັກລັດຖະການ ເປັນປະເພດລາ ແລະ ລາໄດ້ສະເພາະໃນຊ່ວງທີ່ກຳນົດ.")}
      </Lede>
      <div className="card">
        <h3 style={{ fontSize: 14 }}>{tr("New leave request", "ຄຳຂໍລາໃໝ່")}</h3>
        <div className="land-row">
          <Field label={tr("Employee", "ພະນັກງານ")}>
            <select value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })}>
              {staff.data?.map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.full_name} ({s.department || "—"})
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Type", "ປະເພດ")}>
            <select value={f.leave_type_id} onChange={(e) => setF({ ...f, leave_type_id: e.target.value })}>
              {types.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {leaveTypeLabel(x.name)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("From date", "ແຕ່ວັນທີ")}>
            <input type="date" value={f.from} onChange={(e) => e.target.value && setRange(e.target.value, f.to)} />
          </Field>
          <Field label={tr("To date", "ຫາວັນທີ")}>
            <input type="date" value={f.to} min={f.from} onChange={(e) => e.target.value && setRange(f.from, e.target.value)} />
          </Field>
          <Field label={tr("Days", "ມື້")}>
            <input value={f.days} onChange={(e) => setF({ ...f, days: e.target.value.replace(/[^\d.]/g, "") })} />
          </Field>
        </div>
        <div className="land-row">
          <Field label={tr("Reason (optional)", "ເຫດຜົນ (ບໍ່ບັງຄັບ)")} grow={3}>
            <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          </Field>
          <button type="button" className="add-line-btn" onClick={submit} disabled={createReq.isPending}>
            {tr("Send for approval", "ສົ່ງອະນຸມັດ")}
          </button>
        </div>
      </div>

      {showType && (
        <div className="card">
          <h3 style={{ fontSize: 13 }}>{tr("New leave type", "ປະເພດລາໃໝ່")}</h3>
          <div className="land-row">
            <Field label={tr("Leave type name", "ຊື່ປະເພດລາ")}>
              <input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder={tr("e.g. Maternity leave", "ເຊັ່ນ ລາເກີດລູກ")} />
            </Field>
            <Field label={tr("Default quota (days/yr)", "ໂຄຕາເລີ່ມຕົ້ນ (ມື້/ປີ)")}>
              <input value={typeForm.quota} onChange={(e) => setTypeForm({ ...typeForm, quota: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <button type="button" className="add-line-btn" onClick={addType} disabled={createType.isPending}>
              {tr("Create", "ສ້າງ")}
            </button>
          </div>
          <p className="hint">{tr("Creates a matching quota column for every employee in Leave Quota — editable per person there.", "ຈະສ້າງຖັນໂຄຕາໃຫ້ທຸກຄົນໃນໜ້າ ໂຄຕາການລາ — ແກ້ລາຍຄົນໄດ້ຢູ່ນັ້ນ.")}</p>
          <LeaveTypesTable />
        </div>
      )}
      <button type="button" className="mini-btn" style={{ marginBottom: 12 }} onClick={() => setShowType((v) => !v)}>
        {showType ? tr("Close leave types", "ປິດປະເພດລາ") : tr("+ Create / edit leave types", "+ ສ້າງ / ແກ້ ປະເພດລາ")}
      </button>

      <DataState loading={requests.isLoading} error={requests.error}>
        <Table head={[tr("Employee", "ພະນັກງານ"), tr("Type", "ປະເພດ"), tr("Dates", "ວັນທີ"), tr("Days", "ມື້"), tr("Reason", "ເຫດຜົນ"), tr("Status", "ສະຖານະ")]}>
          {(requests.data ?? []).length === 0 && <EmptyRow cols={6}>{tr("No leave requests yet.", "ຍັງບໍ່ມີຄຳຂໍລາ.")}</EmptyRow>}
          {requests.data?.map((r) => (
            <tr key={r.id}>
              <td>{r.employee}</td>
              <td>{leaveTypeLabel(r.leave_type)}</td>
              <td>{r.start_date === r.end_date ? fmtDate(r.start_date) : `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`}</td>
              <td className="mono">{num(r.days)}</td>
              <td>{r.reason || "—"}</td>
              <td>
                <StatusTag status={r.status} />
              </td>
            </tr>
          ))}
        </Table>
      </DataState>
    </div>
  );
}

/** Custom leave types: rename, change the default quota, delete one nobody has used. */
function LeaveTypesTable() {
  const types = useLeaveTypes();
  const custom = (types.data ?? []).filter((t) => t.name !== "Annual leave" && t.name !== "Sick leave" && !t.is_holiday);
  if (custom.length === 0) return null;
  return (
    <>
      <h3 style={{ fontSize: 13, marginTop: 14 }}>{tr("Custom leave types", "ປະເພດລາທີ່ສ້າງເອງ")}</h3>
      <Table head={[tr("Name", "ຊື່"), tr("Default quota (days/yr)", "ໂຄຕາເລີ່ມຕົ້ນ (ມື້/ປີ)"), ""]}>
        {custom.map((t) => (
          <LeaveTypeRow key={`${t.id}:${t.name}:${t.default_quota}`} t={t} />
        ))}
      </Table>
      <p className="hint">{tr("Annual and sick leave are set in Work Rules; public holidays on the Public Holiday tab.", "ລາພັກປະຈຳປີ ແລະ ລາປ່ວຍ ຕັ້ງໃນ ກົດລະບຽບການເຮັດວຽກ; ວັນພັກລັດຖະການ ຕັ້ງໃນໜ້າ ວັນພັກລັດຖະການ.")}</p>
    </>
  );
}

function LeaveTypeRow({ t }: { t: LeaveType }) {
  const dialogs = useDialogs();
  const update = useUpdateLeaveType();
  const del = useDeleteLeaveType();
  const [name, setName] = useState(t.name);
  const [quota, setQuota] = useState(String(t.default_quota));
  const dirty = name.trim() !== t.name || (parseInt(quota) || 0) !== t.default_quota;
  return (
    <tr>
      <td>
        <input className="inline-input" value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <input className="inline-input" style={{ width: 70 }} value={quota} onChange={(e) => setQuota(e.target.value.replace(/\D/g, ""))} />
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        {dirty && (
          <button
            type="button"
            className="mini-btn"
            disabled={update.isPending}
            onClick={() =>
              update
                .mutateAsync({ id: t.id, name: name.trim(), default_quota: parseInt(quota) || 0 })
                .then(() => dialogs.success(tr("Saved", "ບັນທຶກແລ້ວ"), `Leave type "${name.trim()}" updated.`))
                .catch((err) => dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err))
            }
          >
            {tr("Save", "ບັນທຶກ")}
          </button>
        )}
        <button
          type="button"
          className="mini-btn flag"
          disabled={del.isPending}
          onClick={() => {
            if (!window.confirm(tr(`Delete the leave type "${t.name}"? Only possible if nobody has used it.`, `ລຶບປະເພດລາ "${t.name}"? ລຶບໄດ້ສະເພາະຖ້າບໍ່ມີໃຜໃຊ້.`))) return;
            del.mutateAsync(t.id).catch((err) => dialogs.error(tr("Could not delete", "ລົບບໍ່ສຳເລັດ"), err));
          }}
        >
          {tr("🗑 Delete", "🗑 ລົບ")}
        </button>
      </td>
    </tr>
  );
}
