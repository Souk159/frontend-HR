"use client";

import { useState } from "react";
import { DataState, Field, Kpi, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { fmtDate, fmtMonth, lak, num, thisMonth } from "@/lib/format";
import { usePayroll, useSendPayroll } from "@/features/hr/api";
import { fmtStamp } from "@/features/hr/utils";

export default function PayrollPage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const [month, setMonth] = useState(thisMonth());
  const [search, setSearch] = useState("");
  const payroll = usePayroll(month);
  const send = useSendPayroll();

  const q = search.toLowerCase();
  const depts = (payroll.data?.departments ?? [])
    .map((d) => ({ ...d, rows: d.name.toLowerCase().includes(q) ? d.rows : d.rows.filter((r) => r.name.toLowerCase().includes(q)) }))
    .filter((d) => d.rows.length > 0);

  const p = payroll.data;
  const review = (p?.departments ?? []).flatMap((d) => d.rows.filter((r) => r.no_scans).map((r) => `${r.name} (${d.name})`));

  async function sendToAccountant() {
    const warn = [
      p?.in_progress ? `${fmtMonth(month)} is not finished yet — hours are only counted up to ${fmtDate(p.as_of)}.` : "",
      review.length ? `${review.length} employee(s) have no scans at all: ${review.join(", ")}.` : "",
    ].filter(Boolean);
    const msg = [...warn, `Send ${fmtMonth(month)} payroll cost to the Accountant? This can only be done once per month.`].join("\n\n");
    if (!window.confirm(msg)) return;
    try {
      const r = await send.mutateAsync(month);
      dialogs.success("Sent to Accountant", `Payroll cost sent, split into ${r.messages_sent} department message(s). No individual salaries were included.`);
    } catch (err) {
      dialogs.error("Could not send", err);
    }
  }

  return (
    <div className="subview">
      <SectionHead title={`${t("sh_payroll")} — ${fmtMonth(month)}`} />
      <Lede>
        Generated live from the Employee Directory and scanner attendance, grouped by department, counting only days that have passed (from
        the join date for new hires). Each week gives the rest days set in Work Rules, which can&apos;t be taken on blocked days (Saturday and
        Sunday by default) — any other absence is deducted. Daily rate = base salary ÷ 26; missing hours are deducted at daily rate ÷ hours
        per day. A day with only one scan counts as half a day; approved leave is never deducted; working all 7 days earns nothing extra;
        employees who don&apos;t scan are paid in full. Bonus is the department&apos;s unfilled-quota savings minus part-time cost,
        shared across its active staff.
      </Lede>
      <div className="land-row">
        <Field label="Month">
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
        <Field label="Search" grow={2}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee or department..." />
        </Field>
      </div>
      <DataState loading={payroll.isLoading} error={payroll.error}>
        {p?.in_progress && (
          <p className="hint" style={{ marginBottom: 10 }}>
            ⏳ {fmtMonth(month)} is in progress — hours are counted up to <b>{fmtDate(p.as_of)}</b>. Figures change daily until the month ends.
          </p>
        )}
        {review.length > 0 && (
          <div className="form-error">
            <b>Check before sending —</b> must scan, but no scans at all this month: {review.join(", ")}. Fix the Scanner PIN, or untick
            &quot;Must scan attendance&quot; for staff who don&apos;t use the scanner.
          </div>
        )}
        <div className="kpi-row" style={{ gridTemplateColumns: "1fr" }}>
          <Kpi dark label="Group total net payroll" value={lak(payroll.data?.grand_total)} />
        </div>
        {depts.map((d) => (
          <div className="card" key={d.name}>
            <h3 style={{ fontSize: 14 }}>
              {d.name}{" "}
              <span className="c-soft" style={{ fontWeight: 400, fontSize: 10.5, fontFamily: "var(--font-body)" }}>
                ({num(d.hours_per_day)}h/day, {d.days_per_week} days/week)
              </span>
            </h3>
            <Table head={["Employee", "Base salary", "Hours", "Deduction", "OT", "Service charge", "Bonus", "Activities bonus", "Net salary"]}>
              {d.rows.map((r) => (
                <tr key={r.user_id}>
                  <td>{r.name}</td>
                  <td className="mono">{lak(r.base_salary)}</td>
                  <td className="mono">
                    {r.requires_scan ? `${num(r.hours_worked)} / ${num(r.required_hours)}` : <span className="c-soft">no scan needed</span>}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                      {r.no_scans && <Tag kind="low">No scans — check</Tag>}
                      {r.half_days > 0 && <Tag kind="pending">{r.half_days} half day{r.half_days > 1 ? "s" : ""}</Tag>}
                      {r.absent_days > 0 && <Tag kind="low">{r.absent_days} absent</Tag>}
                      {r.rest_days > 0 && <Tag kind="muted">{r.rest_days} rest day{r.rest_days > 1 ? "s" : ""}</Tag>}
                      {r.leave_days > 0 && <Tag kind="muted">{r.leave_days} leave day{r.leave_days > 1 ? "s" : ""}</Tag>}
                    </div>
                  </td>
                  <td className={`mono ${r.deduction > 0 ? "c-clay" : ""}`}>{lak(r.deduction)}</td>
                  <td className="mono">{lak(r.ot_pay)}</td>
                  <td className="mono">{lak(r.service_charge)}</td>
                  <td className="mono c-jade bold">{lak(r.quota_bonus)}</td>
                  <td className="mono c-gold bold">{lak(r.activities_bonus)}</td>
                  <td className="mono bold">{lak(r.net)}</td>
                </tr>
              ))}
              <tr className="total">
                <td colSpan={8}>Department total</td>
                <td className="mono">{lak(d.total)}</td>
              </tr>
            </Table>
          </div>
        ))}
        {depts.length === 0 && <p className="empty">No employees to pay for {fmtMonth(month)}.</p>}
        <div className="land-row">
          <button type="button" className="submit-btn" onClick={sendToAccountant} disabled={send.isPending || !!payroll.data?.sent_at}>
            📨 Send this month&apos;s cost to Accountant
          </button>
        </div>
        <p className={`hint${payroll.data?.sent_at ? " match" : ""}`}>
          {payroll.data?.sent_at
            ? `✓ Sent to the Accountant on ${fmtStamp(payroll.data.sent_at)}.`
            : "Sends each department's total payroll cost to the Accountant's Cost Message tab — never individual salaries."}
        </p>
      </DataState>
    </div>
  );
}
