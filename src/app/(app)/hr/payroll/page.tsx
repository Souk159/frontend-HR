"use client";

import { useState } from "react";
import { DataState, Field, Kpi, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { fmtDate, fmtMonth, lak, num, thisMonth } from "@/lib/format";
import { usePayroll, usePayrollMonthAction, useSendPayroll } from "@/features/hr/api";
import type { MonthStatus, PayrollDept, PayrollPreview, PayrollRow } from "@/features/hr/types";
import { fmtStamp, requestOutcome } from "@/features/hr/utils";
import { printSlip } from "@/features/hr/print";

export default function PayrollPage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const [month, setMonth] = useState(thisMonth());
  const [search, setSearch] = useState("");
  const payroll = usePayroll(month);
  const send = useSendPayroll();
  const monthAction = usePayrollMonthAction();

  const q = search.toLowerCase();
  const depts = (payroll.data?.departments ?? [])
    .map((d) => ({ ...d, rows: d.name.toLowerCase().includes(q) ? d.rows : d.rows.filter((r) => r.name.toLowerCase().includes(q)) }))
    .filter((d) => d.rows.length > 0);

  const p = payroll.data;
  const st = p?.status;
  const review = (p?.departments ?? []).flatMap((d) => d.rows.filter((r) => r.no_scans).map((r) => `${r.name} (${d.name})`));
  const warnings = [
    p?.in_progress ? `${fmtMonth(month)} is not finished yet — hours are only counted up to ${fmtDate(p.as_of)}.` : "",
    review.length ? `${review.length} employee(s) have no scans at all: ${review.join(", ")}.` : "",
  ].filter(Boolean);

  async function submit() {
    const msg = [...warnings, `Submit ${fmtMonth(month)}'s payroll (${lak(p?.grand_total)}) for approval?`].join("\n\n");
    if (!window.confirm(msg)) return;
    try {
      const res = await monthAction.mutateAsync({ month, action: "submit" });
      dialogs.success(...requestOutcome(res, `${fmtMonth(month)}'s payroll`));
    } catch (err) {
      dialogs.error("Could not submit", err);
    }
  }

  async function sendToAccountant() {
    if (!window.confirm(`Send ${fmtMonth(month)} payroll cost to the Accountant? This can only be done once per month.`)) return;
    try {
      const r = await send.mutateAsync(month);
      dialogs.success(
        "Sent to Accountant",
        `Payroll cost sent, grouped into ${r.messages_sent} cost line(s) per your Department Cost Labeling. No individual salaries were included.`,
      );
    } catch (err) {
      dialogs.error("Could not send", err);
    }
  }

  async function closeMonth() {
    if (!window.confirm(`Close ${fmtMonth(month)}'s payroll? Once closed it is locked permanently — no more hours corrections.`)) return;
    try {
      const res = await monthAction.mutateAsync({ month, action: "close" });
      dialogs.success(...requestOutcome(res, `Closing ${fmtMonth(month)}'s payroll`));
    } catch (err) {
      dialogs.error("Could not request", err);
    }
  }

  const busy = send.isPending || monthAction.isPending;
  return (
    <div className="subview">
      <SectionHead title={`${t("sh_payroll")} — ${fmtMonth(month)}`} />
      <Lede>
        Generated live from the Employee Directory and scanner attendance, grouped by department. Each department&apos;s standard month
        (hours/day × days/week × 4) comes from its Work Rules; hours short of it are deducted at the hourly rate (base salary ÷{" "}
        {p?.settings.salary_calc_days ?? 30} ÷ hours per day), and hours above it are paid as OT. Approved leave counts as worked. Bonus is
        the department&apos;s unfilled-quota savings minus part-time cost, shared across its staff; Other bonuses are Bonus Types and public
        holiday payouts.
      </Lede>
      <div className="land-row" style={{ alignItems: "flex-end" }}>
        <Field label="Month">
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
        <Field label="Search" grow={2}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee or department..." />
        </Field>
        {st && (
          <div style={{ paddingBottom: 10 }}>
            <MonthTag status={st} />
          </div>
        )}
      </div>
      <DataState loading={payroll.isLoading} error={payroll.error}>
        {p?.closed_snapshot && (
          <p className="hint match" style={{ marginBottom: 10 }}>
            🔒 {fmtMonth(month)} was closed on {fmtStamp(p.status.closed_at)} — these are the figures saved at that moment; later scans or
            profile changes don&apos;t alter them.
          </p>
        )}
        {!p?.closed_snapshot && p?.in_progress && (
          <p className="hint" style={{ marginBottom: 10 }}>
            ⏳ {fmtMonth(month)} is in progress — the requirement is pro-rated to <b>{fmtDate(p.as_of)}</b>. Figures change daily until the
            month ends.
          </p>
        )}
        {review.length > 0 && (
          <div className="form-error">
            <b>Check before submitting —</b> must scan, but no scans at all this month: {review.join(", ")}. Fix the Scanner PIN, tick
            &quot;No fingerprint scan needed&quot; for staff who don&apos;t use the scanner, or enter the hours in Manual Hours Entry.
          </div>
        )}
        <div className="kpi-row" style={{ gridTemplateColumns: "1fr" }}>
          <Kpi dark label="Group total net payroll" value={lak(p?.grand_total)} />
        </div>
        {depts.map((d) => (
          <DeptCard key={d.name} dept={d} preview={p!} />
        ))}
        {depts.length === 0 && <p className="empty">No employees to pay for {fmtMonth(month)}.</p>}
        {st && (
          <>
            <div className="land-row">
              <button type="button" className="mini-btn" onClick={submit} disabled={busy || st.status !== "open"}>
                📝 Submit this month for approval
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={sendToAccountant}
                disabled={busy || st.status !== "approved" || !!st.sent_at}
              >
                📨 Send this month&apos;s cost to Accountant
              </button>
              <button type="button" className="mini-btn" onClick={closeMonth} disabled={busy || st.status !== "approved" || st.close_pending}>
                🔒 Close this month
              </button>
            </div>
            <p className={`hint${st.sent_at ? " match" : ""}`}>
              {st.sent_at
                ? `✓ Sent to the Accountant on ${fmtStamp(st.sent_at)}.`
                : "Sends each cost label's total payroll (Department Cost Labeling) to the Accountant's Cost Message tab as a Salaries line — never individual salaries. Submitting and closing follow the Approval Rule page."}
            </p>
            {st.close_pending && <p className="hint warn">Closing {fmtMonth(month)} is awaiting sign-off.</p>}
          </>
        )}
        <p className="hint">Foundational view for now — tax brackets and social security deductions will come once payroll rules are confirmed.</p>
      </DataState>
    </div>
  );
}

function MonthTag({ status }: { status: MonthStatus }) {
  switch (status.status) {
    case "closed":
      return <Tag kind="ok">🔒 Closed — locked permanently</Tag>;
    case "approved":
      return <Tag kind="ok">✓ Approved {status.sent_at ? "— sent to Accountant" : "— ready to send to Accountant"}</Tag>;
    case "pending":
      return <Tag kind="pending">Awaiting approval</Tag>;
    default:
      return <Tag kind="pending">Not yet submitted for approval</Tag>;
  }
}

function DeptCard({ dept: d, preview }: { dept: PayrollDept; preview: PayrollPreview }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 14 }}>
        {d.name}{" "}
        <span className="c-soft" style={{ fontWeight: 400, fontSize: 10.5, fontFamily: "var(--font-body)" }}>
          ({num(d.hours_per_day)}h/day, {d.days_per_week} days/week)
        </span>
      </h3>
      <Table head={["Employee", "Base salary", "Hours", "Deduction", "OT", "Service charge", "Bonus", "Other bonuses", "Net salary", ""]}>
        {d.rows.map((r) => (
          <tr key={r.user_id}>
            <td>{r.name}</td>
            <td className="mono">{lak(r.base_salary)}</td>
            <td className="mono">
              {r.requires_scan ? `${num(r.effective_hours)} / ${num(r.required_hours)}` : <span className="c-soft">no scan needed</span>}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                {r.no_scans && <Tag kind="low">No scans — check</Tag>}
                {r.manual_hours && <Tag kind="muted">Manual hours</Tag>}
                {r.half_days > 0 && <Tag kind="pending">{r.half_days} half day{r.half_days > 1 ? "s" : ""}</Tag>}
                {r.leave_days > 0 && <Tag kind="muted">{r.leave_days} leave day{r.leave_days > 1 ? "s" : ""}</Tag>}
              </div>
            </td>
            <td className={`mono ${r.deduction > 0 ? "c-clay" : ""}`}>
              {lak(r.deduction)}
              {r.short_hours > 0 && <div className="hint">{num(r.short_hours)}h short</div>}
            </td>
            <td className="mono">
              {lak(r.ot_pay)}
              {(r.ot_hours > 0 || r.ot_hours_daily > 0) && (
                <div className="hint">
                  {r.ot_hours > 0 && `${num(r.ot_hours)}h over`}
                  {r.ot_hours > 0 && r.ot_hours_daily > 0 && " · "}
                  {r.ot_hours_daily > 0 && `${num(r.ot_hours_daily)}h in day`}
                </div>
              )}
            </td>
            <td className="mono">{lak(r.service_charge)}</td>
            <td className="mono c-jade bold">{lak(r.quota_bonus)}</td>
            <td className="mono c-gold bold" title={r.bonuses.map((b) => `${b.name}: ${lak(b.amount)}`).join("\n")}>
              {lak(r.other_bonuses)}
            </td>
            <td className="mono bold">{lak(r.net)}</td>
            <td>
              <button type="button" className="mini-btn" onClick={() => payslip(r, d, preview)}>
                📄 Payslip
              </button>
            </td>
          </tr>
        ))}
        <tr className="total">
          <td colSpan={8}>Department total</td>
          <td className="mono">{lak(d.total)}</td>
          <td />
        </tr>
      </Table>
    </div>
  );
}

function payslip(r: PayrollRow, d: PayrollDept, p: PayrollPreview) {
  printSlip(
    `Payslip — ${r.name} — ${fmtMonth(p.month)}`,
    `Payslip — ${fmtMonth(p.month)}`,
    [
      ["Employee", `${r.name}${r.employee_no ? ` (${r.employee_no})` : ""}`],
      ["Department", d.name],
      ["Position", r.position || "—"],
      ["Hours", r.requires_scan ? `${num(r.effective_hours)} of ${num(r.required_hours)}` : "No scan needed"],
      ["Hourly rate", lak(r.hourly_rate)],
    ],
    [
      { label: "Base salary", value: lak(r.base_salary) },
      ...(r.deduction > 0 ? [{ label: `Deduction (${num(r.short_hours)}h short)`, value: `− ${lak(r.deduction)}`, negative: true }] : []),
      ...(r.ot_pay > 0 ? [{ label: `OT (${num(r.ot_hours)}h over the limit, ${num(r.ot_hours_daily)}h within the day)`, value: lak(r.ot_pay) }] : []),
      ...(r.service_charge > 0 ? [{ label: "Service charge", value: lak(r.service_charge) }] : []),
      ...(r.quota_bonus > 0 ? [{ label: "Bonus", value: lak(r.quota_bonus) }] : []),
      ...r.bonuses.map((b) => ({ label: b.name, value: lak(b.amount) })),
      { label: "Net salary", value: lak(r.net), strong: true },
    ],
    p.in_progress ? `Month in progress — figures as of ${fmtDate(p.as_of)}.` : undefined,
  );
}
