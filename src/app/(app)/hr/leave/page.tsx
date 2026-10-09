"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, SectionHead, StatusTag, Table, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
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
import { requestOutcome } from "@/features/hr/utils";

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
    if (!emp) return dialogs.error("Missing employee", new Error("Select an employee before adding."));
    const days = parseFloat(f.days) || 1;
    try {
      const res = await createReq.mutateAsync({ user_id: emp.user_id, leave_type_id: typeId, start_date: f.from, end_date: f.to, days, reason: f.reason });
      const typeName = types.data?.find((x) => x.id === typeId)?.name ?? "Leave";
      dialogs.success(...requestOutcome(res, `${typeName} for ${emp.full_name} (${num(days)} day${days > 1 ? "s" : ""})`));
      setF((p) => ({ ...p, days: "1", reason: "" }));
    } catch (err) {
      dialogs.error("Could not send request", err);
    }
  }

  async function addType() {
    if (!typeForm.name.trim()) return dialogs.error("Missing name", new Error("Enter a leave type name first."));
    try {
      await createType.mutateAsync({ name: typeForm.name.trim(), default_quota: parseInt(typeForm.quota) || 0 });
      dialogs.success(
        "Leave type created",
        `"${typeForm.name}" is now available in the Type dropdown, and a matching quota column has been added to Leave Quota for every employee.`,
      );
      setTypeForm({ name: "", quota: "0" });
      setShowType(false);
    } catch (err) {
      dialogs.error("Could not create leave type", err);
    }
  }

  return (
    <div className="subview">
      <SectionHead title={t("sh_leave_requests")} />
      <Lede>
        Most staff don&apos;t have a phone to request leave themselves — HR logs it here on their behalf. Every request below goes through the
        Approval Rule, and only deducts from the employee&apos;s quota once approved. Public holidays (Public Holiday tab) appear here as
        leave types and can only be taken inside their window.
      </Lede>
      <div className="card">
        <h3 style={{ fontSize: 14 }}>New leave request</h3>
        <div className="land-row">
          <Field label="Employee">
            <select value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })}>
              {staff.data?.map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.full_name} ({s.department || "—"})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select value={f.leave_type_id} onChange={(e) => setF({ ...f, leave_type_id: e.target.value })}>
              {types.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From date">
            <input type="date" value={f.from} onChange={(e) => e.target.value && setRange(e.target.value, f.to)} />
          </Field>
          <Field label="To date">
            <input type="date" value={f.to} min={f.from} onChange={(e) => e.target.value && setRange(f.from, e.target.value)} />
          </Field>
          <Field label="Days">
            <input value={f.days} onChange={(e) => setF({ ...f, days: e.target.value.replace(/[^\d.]/g, "") })} />
          </Field>
        </div>
        <div className="land-row">
          <Field label="Reason (optional)" grow={3}>
            <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          </Field>
          <button type="button" className="add-line-btn" onClick={submit} disabled={createReq.isPending}>
            Send for approval
          </button>
        </div>
      </div>

      {showType && (
        <div className="card">
          <h3 style={{ fontSize: 13 }}>New leave type</h3>
          <div className="land-row">
            <Field label="Leave type name">
              <input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="e.g. Maternity leave" />
            </Field>
            <Field label="Default quota (days/yr)">
              <input value={typeForm.quota} onChange={(e) => setTypeForm({ ...typeForm, quota: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <button type="button" className="add-line-btn" onClick={addType} disabled={createType.isPending}>
              Create
            </button>
          </div>
          <p className="hint">Creates a matching quota column for every employee in Leave Quota — editable per person there.</p>
          <LeaveTypesTable />
        </div>
      )}
      <button type="button" className="mini-btn" style={{ marginBottom: 12 }} onClick={() => setShowType((v) => !v)}>
        {showType ? "Close leave types" : "+ Create / edit leave types"}
      </button>

      <DataState loading={requests.isLoading} error={requests.error}>
        <Table head={["Employee", "Type", "Dates", "Days", "Reason", "Status"]}>
          {(requests.data ?? []).length === 0 && <EmptyRow cols={6}>No leave requests yet.</EmptyRow>}
          {requests.data?.map((r) => (
            <tr key={r.id}>
              <td>{r.employee}</td>
              <td>{r.leave_type}</td>
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
      <h3 style={{ fontSize: 13, marginTop: 14 }}>Custom leave types</h3>
      <Table head={["Name", "Default quota (days/yr)", ""]}>
        {custom.map((t) => (
          <LeaveTypeRow key={`${t.id}:${t.name}:${t.default_quota}`} t={t} />
        ))}
      </Table>
      <p className="hint">Annual and sick leave are set in Work Rules; public holidays on the Public Holiday tab.</p>
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
                .then(() => dialogs.success("Saved", `Leave type "${name.trim()}" updated.`))
                .catch((err) => dialogs.error("Could not save", err))
            }
          >
            Save
          </button>
        )}
        <button
          type="button"
          className="mini-btn flag"
          disabled={del.isPending}
          onClick={() => {
            if (!window.confirm(`Delete the leave type "${t.name}"? Only possible if nobody has used it.`)) return;
            del.mutateAsync(t.id).catch((err) => dialogs.error("Could not delete", err));
          }}
        >
          🗑 Delete
        </button>
      </td>
    </tr>
  );
}
