"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { fmtDate, lak, today } from "@/lib/format";
import {
  useCreateDailyHire,
  useDailyHireDayAction,
  useDailyHireDays,
  useDailyHires,
  useDeleteDailyHire,
  useDepartments,
  useOutlets,
  useUpdateDailyHire,
} from "@/features/hr/api";
import type { DailyHire, DailyHireDay, DayStatus } from "@/features/hr/types";
import { groupByDept, requestOutcome } from "@/features/hr/utils";

const editable = (s: DayStatus) => s === "draft" || s === "unlocked" || s === "denied";

function DayStatusTag({ status }: { status: DayStatus }) {
  if (status === "pending") return <Tag kind="pending">Pending</Tag>;
  if (status === "approved") return <Tag kind="ok">Approved</Tag>;
  if (status === "denied") return <Tag kind="low">Denied</Tag>;
  if (status === "unlocked") return <Tag kind="pending">Editing — not yet sent</Tag>;
  return <Tag kind="muted">Not sent</Tag>;
}

export default function PartTimePage() {
  const { t } = useLang();
  const [tab, setTab] = useState<"add" | "history">("add");
  const days = useDailyHireDays();
  const notSent = (days.data ?? []).filter((d) => d.status === "draft").length;

  return (
    <div className="subview">
      <SectionHead title={t("sh_part_time")} />
      <div className="todo-tabs">
        <button type="button" className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}>
          Add
        </button>
        <button type="button" className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
          Approval and History
          {notSent > 0 && <span className="tab-badge">{notSent}</span>}
        </button>
      </div>
      {tab === "add" ? <AddPanel /> : <HistoryPanel days={days.data ?? []} loading={days.isLoading} error={days.error} />}
    </div>
  );
}

function AddPanel() {
  const dialogs = useDialogs();
  const [date, setDate] = useState(today());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", department_id: "", outlet_id: "", price: "", comment: "" });
  const hires = useDailyHires(date);
  const allDays = useDailyHireDays();
  // reasons used before, offered as suggestions (prototype dhCommentList)
  const pastComments = [...new Set((allDays.data ?? []).flatMap((d) => d.hires.map((h) => h.comment)).filter(Boolean))];
  const depts = useDepartments();
  const outlets = useOutlets();
  const create = useCreateDailyHire();
  const status = hires.data?.status ?? "draft";

  async function save() {
    const price = parseFloat(form.price) || 0;
    const dept = form.department_id || depts.data?.[0]?.id || "";
    if (!form.name.trim() || !price || !dept)
      return dialogs.error("Missing information", new Error("Enter at least a name, department and price per day."));
    try {
      await create.mutateAsync({
        work_date: date, name: form.name.trim(), department_id: dept, outlet_id: form.outlet_id || null, price_per_day: price,
        comment: form.comment.trim(),
      });
      setForm((f) => ({ ...f, name: "", price: "", comment: "" }));
      setShowForm(false);
    } catch (err) {
      dialogs.error("Could not add", err);
    }
  }

  return (
    <>
      <Lede>
        Covers gaps in a department without adding to headcount quota. Their daily cost is factored against that department&apos;s payroll
        bonus pool. Pick a date first — you&apos;ll see who&apos;s already logged for that day before adding more.
      </Lede>
      <Field label="Date" style={{ maxWidth: 220 }}>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      {!editable(status) && (
        <p className="hint warn">
          {fmtDate(date)} is {status === "pending" ? "waiting for approval" : "already approved"} — new part-time staff can&apos;t be
          added to it. Use &quot;Request a change&quot; in Approval and History instead.
        </p>
      )}
      <DataState loading={hires.isLoading} error={hires.error}>
        <Table head={["Name", "Department", "Outlet", "Price / day", "Comment"]}>
          {(hires.data?.hires ?? []).length === 0 && <EmptyRow cols={5}>No part-time staff logged for {fmtDate(date)} yet.</EmptyRow>}
          {hires.data?.hires.map((h) => (
            <tr key={h.id}>
              <td>{h.name}</td>
              <td>{h.department}</td>
              <td>{h.outlet || "—"}</td>
              <td className="mono">{lak(h.price_per_day)}</td>
              <td>{h.comment || <span className="c-soft">—</span>}</td>
            </tr>
          ))}
        </Table>
      </DataState>
      {editable(status) && (
        <button type="button" className="mini-btn" style={{ marginTop: 8 }} onClick={() => setShowForm((v) => !v)}>
          + Add part-time for this day
        </button>
      )}
      {showForm && editable(status) && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="land-row">
            <Field label="Name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Keo N." />
            </Field>
            <Field label="Department">
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                {depts.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Outlet">
              <select value={form.outlet_id} onChange={(e) => setForm({ ...form, outlet_id: e.target.value })}>
                <option value="">—</option>
                {outlets.data?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.property})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price per day (₭)">
              <input inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d]/g, "") })} placeholder="e.g. 120000" />
            </Field>
            <Field label="Comment (reason for hiring)" grow={2}>
              <input list="dh-comments" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="e.g. covering for staff on leave" />
              <datalist id="dh-comments">
                {pastComments.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <button type="button" className="submit-btn" onClick={save} disabled={create.isPending}>
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function HistoryPanel({ days, loading, error }: { days: DailyHireDay[]; loading: boolean; error: unknown }) {
  const [filter, setFilter] = useState("");
  const shown = filter ? days.filter((d) => d.work_date === filter) : days;
  return (
    <>
      <Lede>
        One entry per day worked. Editable — name, price, and removing someone — only until you send it for approval; it locks the
        moment it&apos;s sent. Once it is approved (Approval Rule), &quot;Send to Accountant&quot; appears.
      </Lede>
      <Field label="Filter by date" style={{ maxWidth: 220 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All dates</option>
          {days.map((d) => (
            <option key={d.work_date} value={d.work_date}>
              {fmtDate(d.work_date)}
            </option>
          ))}
        </select>
      </Field>
      <DataState loading={loading} error={error}>
        {shown.length === 0 && <p className="empty">No part-time days logged yet.</p>}
        {shown.map((d) => (
          <DayCard key={d.work_date} day={d} />
        ))}
      </DataState>
    </>
  );
}

function DayCard({ day }: { day: DailyHireDay }) {
  const dialogs = useDialogs();
  const action = useDailyHireDayAction();
  const canEdit = editable(day.status);
  const date = fmtDate(day.work_date);
  const groups = groupByDept(day.hires, (h) => h.department, []);

  async function run(kind: "submit" | "unlock" | "send-to-accounting") {
    try {
      const r = await action.mutateAsync({ date: day.work_date, action: kind });
      if (kind === "submit") dialogs.success(...requestOutcome(r, `Part-time list for ${date} (${day.hires.length} staff)`));
      if (kind === "unlock")
        dialogs.success("Unlocked for editing", `${date}'s part-time list is now editable. Make your corrections, then send them for approval.`);
      if (kind === "send-to-accounting")
        dialogs.success("Sent to Accountant", `Part-time cost for ${date} sent as ${r.messages_sent} department message(s).`);
    } catch (err) {
      dialogs.error("Could not complete", err);
    }
  }

  return (
    <div className="card">
      <h3 className="card-head">
        <span>
          {date} — {day.hires.length} part-time, {lak(day.total)}
        </span>
        <span className="approve-actions">
          <DayStatusTag status={day.status} />
          {(day.status === "draft" || day.status === "denied") && (
            <button type="button" className="mini-btn" onClick={() => run("submit")} disabled={action.isPending}>
              Send for approval
            </button>
          )}
          {day.status === "unlocked" && (
            <button type="button" className="submit-btn" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => run("submit")} disabled={action.isPending}>
              Send correction for approval
            </button>
          )}
          {day.status === "approved" && !day.sent_to_accounting && (
            <>
              <button type="button" className="mini-btn flag" onClick={() => run("unlock")} disabled={action.isPending}>
                Request a change
              </button>
              <button type="button" className="mini-btn" onClick={() => run("send-to-accounting")} disabled={action.isPending}>
                Send to Accountant
              </button>
            </>
          )}
          {day.sent_to_accounting && (
            <button type="button" className="mini-btn" disabled>
              ✓ Sent to Accountant
            </button>
          )}
        </span>
      </h3>
      {groups.map(([dept, hires]) => (
        <div key={dept}>
          <h4 style={{ fontSize: 12, margin: "8px 0 4px" }}>{dept}</h4>
          <Table head={["Name", "Outlet", "Price/day", ""]}>
            {hires.map((h) => (
              <HireRow key={h.id} hire={h} editable={canEdit} />
            ))}
          </Table>
        </div>
      ))}
    </div>
  );
}

function HireRow({ hire, editable }: { hire: DailyHire; editable: boolean }) {
  const dialogs = useDialogs();
  const update = useUpdateDailyHire();
  const del = useDeleteDailyHire();
  const [name, setName] = useState(hire.name);
  const [price, setPrice] = useState(String(hire.price_per_day));

  const commit = (body: { name?: string; price_per_day?: number }) =>
    update.mutateAsync({ id: hire.id, ...body }).catch((err) => dialogs.error("Could not save", err));

  if (!editable)
    return (
      <tr>
        <td>{hire.name}</td>
        <td>{hire.outlet || "—"}</td>
        <td className="mono">{lak(hire.price_per_day)}</td>
        <td>—</td>
      </tr>
    );
  return (
    <tr>
      <td>
        <input className="inline-input" style={{ width: 130 }} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== hire.name && commit({ name })} />
      </td>
      <td>{hire.outlet || "—"}</td>
      <td>
        <input
          className="inline-input"
          style={{ width: 100, textAlign: "right" }}
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={() => Number(price) !== hire.price_per_day && commit({ price_per_day: Number(price) })}
        />
      </td>
      <td>
        <button type="button" className="mini-btn flag" onClick={() => del.mutateAsync(hire.id).catch((err) => dialogs.error("Could not delete", err))}>
          Delete
        </button>
      </td>
    </tr>
  );
}
