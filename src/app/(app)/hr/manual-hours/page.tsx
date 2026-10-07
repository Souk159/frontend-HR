"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { fmtMonth, num, thisMonth, today } from "@/lib/format";
import { useManualClock, useManualHours, useManualTotal } from "@/features/hr/api";
import type { ManualHours } from "@/features/hr/types";
import { requestOutcome } from "@/features/hr/utils";

/** Prototype v168 hr-manualhours — for when the fingerprint scanner is down. */
export default function ManualHoursPage() {
  const { t } = useLang();
  const [month, setMonth] = useState(thisMonth());
  const data = useManualHours(month);
  return (
    <div className="subview">
      <SectionHead title={t("sh_manual_hours")} />
      <Lede>
        For when the fingerprint scanner is down and someone&apos;s hours didn&apos;t get logged. Use &quot;Clock in / out for a day&quot;
        for a single missed day — it counts like a scan for that day. Use &quot;Set total hours directly&quot; to correct the whole
        month&apos;s total at once. Either way it updates Payroll (unless the Approval Rule asks for sign-off first); the month&apos;s Payroll
        still needs its own approval before it&apos;s sent to the Accountant. A closed payroll month can&apos;t be corrected.
      </Lede>
      <Field label="Payroll month" style={{ maxWidth: 220 }}>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </Field>
      <DataState loading={data.isLoading} error={data.error}>
        {data.data && (
          <>
            {data.data.closed && <p className="hint warn">{fmtMonth(month)}&apos;s payroll is closed — pick an open month to correct hours.</p>}
            <DayForm key={`day-${month}`} employees={data.data.employees} month={month} closed={data.data.closed} />
            <TotalForm key={`total-${month}`} data={data.data} />
            <h3 style={{ fontSize: 13, marginTop: 20 }}>Correction log</h3>
            <Table head={["Date", "Employee", "Month", "Change", "Reason", "By"]}>
              {data.data.log.length === 0 && <EmptyRow cols={6}>No corrections logged yet.</EmptyRow>}
              {data.data.log.map((l) => (
                <tr key={l.id}>
                  <td className="mono">{l.created_at}</td>
                  <td>{l.employee}</td>
                  <td>{fmtMonth(l.month)}</td>
                  <td style={{ fontSize: 11 }}>
                    {l.old_summary} → <b>{l.new_summary}</b>
                  </td>
                  <td>{l.reason || "—"}</td>
                  <td>{l.created_by}</td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </DataState>
    </div>
  );
}

const clockHours = (a: string, b: string) => {
  if (!a || !b) return null;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let m = bh * 60 + bm - (ah * 60 + am);
  if (m <= 0) m += 24 * 60; // overnight shift
  return Math.round((m / 60) * 100) / 100;
};

function DayForm({ employees, month, closed }: { employees: ManualHours["employees"]; month: string; closed: boolean }) {
  const dialogs = useDialogs();
  const save = useManualClock();
  const [f, setF] = useState({ user_id: "", date: month === thisMonth() ? today() : `${month}-01`, in: "", out: "", reason: "" });
  const hours = clockHours(f.in, f.out);

  async function submit() {
    const userID = f.user_id || employees[0]?.user_id;
    if (!userID) return dialogs.error("No employee", new Error("There is no active employee to correct."));
    if (!f.date || hours === null) return dialogs.error("Invalid times", new Error("Enter the date and both a clock-in and a clock-out time."));
    if (!f.reason.trim()) return dialogs.error("Reason needed", new Error("Enter a short reason, e.g. which day the scanner was down."));
    try {
      const res = await save.mutateAsync({ user_id: userID, date: f.date, clock_in: f.in, clock_out: f.out, reason: f.reason.trim() });
      setF((p) => ({ ...p, in: "", out: "", reason: "" }));
      const name = employees.find((e) => e.user_id === userID)?.name ?? "the employee";
      dialogs.success(...requestOutcome(res, `${num(hours)} hours for ${name} on ${f.date}`));
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 14 }}>Clock in / out for a day</h3>
      <p className="hint">For one missed day — enter the times worked; a shift past midnight ends the next day.</p>
      <div className="land-row">
        <Field label="Employee">
          <select value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })}>
            {employees.map((e) => (
              <option key={e.user_id} value={e.user_id}>
                {e.name} ({e.department})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={f.date} max={today()} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Clock in">
          <input type="time" value={f.in} onChange={(e) => setF({ ...f, in: e.target.value })} />
        </Field>
        <Field label="Clock out">
          <input type="time" value={f.out} onChange={(e) => setF({ ...f, out: e.target.value })} />
        </Field>
      </div>
      <Field label="Reason" style={{ maxWidth: 420 }}>
        <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Scanner was down all morning on 3 Oct" />
      </Field>
      {hours !== null && <p className="hint">= {num(hours)} hours that day.</p>}
      <button type="button" className="submit-btn" onClick={submit} disabled={closed || save.isPending}>
        💾 Add this day&apos;s hours
      </button>
    </div>
  );
}

function TotalForm({ data }: { data: ManualHours }) {
  const dialogs = useDialogs();
  const save = useManualTotal();
  const [userID, setUserID] = useState(data.employees[0]?.user_id ?? "");
  const cur = data.employees.find((e) => e.user_id === userID);
  const [f, setF] = useState(() => ({
    hours: String(cur?.hours_worked ?? ""),
    ot: String(cur?.ot_hours ?? 0),
    otDaily: String(cur?.ot_hours_daily ?? 0),
    reason: "",
  }));
  const pick = (id: string) => {
    const e = data.employees.find((x) => x.user_id === id);
    setUserID(id);
    setF({ hours: String(e?.hours_worked ?? ""), ot: String(e?.ot_hours ?? 0), otDaily: String(e?.ot_hours_daily ?? 0), reason: "" });
  };

  async function submit() {
    const hours = parseFloat(f.hours);
    if (!cur || isNaN(hours) || hours < 0) return dialogs.error("Invalid hours", new Error("Enter a valid number of hours worked."));
    if (!f.reason.trim()) return dialogs.error("Reason needed", new Error("Enter a short reason for this correction."));
    try {
      const res = await save.mutateAsync({
        user_id: cur.user_id, month: data.month, hours_worked: hours,
        ot_hours: parseFloat(f.ot) || 0, ot_hours_daily: parseFloat(f.otDaily) || 0, reason: f.reason.trim(),
      });
      setF((p) => ({ ...p, reason: "" }));
      dialogs.success(...requestOutcome(res, `The hours correction for ${cur.name} (${fmtMonth(data.month)})`));
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 14 }}>Set total hours directly</h3>
      <p className="hint">Overwrites the employee&apos;s whole total for {fmtMonth(data.month)} — use this for a bigger correction, not a single day.</p>
      <div className="land-row">
        <Field label="Employee">
          <select value={userID} onChange={(e) => pick(e.target.value)}>
            {data.employees.map((e) => (
              <option key={e.user_id} value={e.user_id}>
                {e.name} ({e.department})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Total working hours this month">
          <input type="number" min={0} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} style={{ width: 120 }} />
        </Field>
        <Field label="OT — over the limit (hrs)">
          <input type="number" min={0} value={f.ot} onChange={(e) => setF({ ...f, ot: e.target.value })} style={{ width: 100 }} />
        </Field>
        <Field label="OT — within the day (hrs)">
          <input type="number" min={0} value={f.otDaily} onChange={(e) => setF({ ...f, otDaily: e.target.value })} style={{ width: 100 }} />
        </Field>
      </div>
      <Field label="Reason for the correction" style={{ maxWidth: 420 }}>
        <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Scanner was down on 3 Oct, confirmed with supervisor" />
      </Field>
      {cur && (
        <p className="hint">
          Currently on file: {num(cur.hours_worked)} hours worked, {num(cur.ot_hours)}h OT over limit, {num(cur.ot_hours_daily)}h OT within
          day{cur.manual ? " (already set by hand)" : " (from scans)"}.
        </p>
      )}
      <button type="button" className="submit-btn" onClick={submit} disabled={data.closed || save.isPending}>
        💾 Save correction
      </button>
    </div>
  );
}
