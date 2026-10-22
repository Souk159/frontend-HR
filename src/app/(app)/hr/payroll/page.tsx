"use client";

import { useState } from "react";
import { DataState, Field, Kpi, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtDate, fmtMonth, lak, num, thisMonth } from "@/lib/format";
import { useMyResort, usePayroll, usePayrollMonthAction, useSendPayroll } from "@/features/hr/api";
import type { MonthStatus, PayrollDept, PayrollPreview, PayrollRow } from "@/features/hr/types";
import { deptLabel, fmtStamp, requestOutcome } from "@/features/hr/utils";
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
  const mine = useMyResort(); // a resort account sees its own staff; month actions stay central
  const st = p?.status;
  const review = (p?.departments ?? []).flatMap((d) => d.rows.filter((r) => r.no_scans).map((r) => `${r.name} (${d.name})`));
  const warnings = [
    p?.in_progress ? tr(`${fmtMonth(month)} is not finished yet — hours are only counted up to ${fmtDate(p.as_of)}.`, `${fmtMonth(month)} ຍັງບໍ່ໝົດເດືອນ — ນັບຊົ່ວໂມງຮອດ ${fmtDate(p.as_of)} ເທົ່ານັ້ນ.`) : "",
    review.length ? tr(`${review.length} employee(s) have no scans at all: ${review.join(", ")}.`, `${review.length} ຄົນ ບໍ່ມີການສະແກນເລີຍ: ${review.join(", ")}.`) : "",
  ].filter(Boolean);

  async function submit() {
    const msg = [...warnings, tr(`Submit ${fmtMonth(month)}'s payroll (${lak(p?.grand_total)}) for approval?`, `ສົ່ງເງິນເດືອນ ${fmtMonth(month)} (${lak(p?.grand_total)}) ໄປອະນຸມັດ?`)].join("\n\n");
    if (!window.confirm(msg)) return;
    try {
      const res = await monthAction.mutateAsync({ month, action: "submit" });
      dialogs.success(...requestOutcome(res, tr(`${fmtMonth(month)}'s payroll`, `ເງິນເດືອນ ${fmtMonth(month)}`)));
    } catch (err) {
      dialogs.error(tr("Could not submit", "ສົ່ງບໍ່ສຳເລັດ"), err);
    }
  }

  async function sendToAccountant() {
    if (!window.confirm(tr(`Send ${fmtMonth(month)} payroll cost to the Accountant? This can only be done once per month.`, `ສົ່ງຕົ້ນທຶນເງິນເດືອນ ${fmtMonth(month)} ໃຫ້ບັນຊີ? ສົ່ງໄດ້ເທື່ອດຽວຕໍ່ເດືອນ.`))) return;
    try {
      const r = await send.mutateAsync(month);
      dialogs.success(
        tr("Sent to Accountant", "ສົ່ງໃຫ້ບັນຊີແລ້ວ"),
        tr(`Payroll cost sent, grouped into ${r.messages_sent} cost line(s) per your Department Cost Labeling. No individual salaries were included.`, `ສົ່ງຕົ້ນທຶນເງິນເດືອນແລ້ວ ເປັນ ${r.messages_sent} ລາຍການ ຕາມປ້າຍຕົ້ນທຶນ. ບໍ່ມີເງິນເດືອນລາຍຄົນ.`),
      );
    } catch (err) {
      dialogs.error(tr("Could not send", "ສົ່ງບໍ່ສຳເລັດ"), err);
    }
  }

  async function closeMonth() {
    if (!window.confirm(tr(`Close ${fmtMonth(month)}'s payroll? Once closed it is locked permanently — no more hours corrections.`, `ປິດເງິນເດືອນ ${fmtMonth(month)}? ປິດແລ້ວຈະລັອກຖາວອນ — ແກ້ຊົ່ວໂມງບໍ່ໄດ້ອີກ.`))) return;
    try {
      const res = await monthAction.mutateAsync({ month, action: "close" });
      dialogs.success(...requestOutcome(res, tr(`Closing ${fmtMonth(month)}'s payroll`, `ການປິດເງິນເດືອນ ${fmtMonth(month)}`)));
    } catch (err) {
      dialogs.error(tr("Could not request", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }

  const busy = send.isPending || monthAction.isPending;
  return (
    <div className="subview">
      <SectionHead title={`${t("sh_payroll")} — ${fmtMonth(month)}`} />
      <Lede>
        {tr(
          `Generated live from the Employee Directory and scanner attendance, grouped by department. Each department's standard month (hours/day × days/week × 4) comes from its Work Rules; hours short of it are deducted at the hourly rate (base salary ÷ ${p?.settings.salary_calc_days ?? 30} ÷ hours per day), and hours above it are paid as OT. Approved leave counts as worked. Bonus is the department's unfilled-quota savings minus part-time cost, shared across its staff; Other bonuses are Bonus Types and public holiday payouts.`,
          `ຄິດສົດຈາກສາລະບານພະນັກງານ ແລະ ການສະແກນ, ແຍກຕາມພະແນກ. ຊົ່ວໂມງມາດຕະຖານຂອງເດືອນ (ຊົ່ວໂມງ/ມື້ × ມື້/ອາທິດ × 4) ມາຈາກກົດລະບຽບຂອງພະແນກ; ຊົ່ວໂມງທີ່ຂາດ ຫັກຕາມຄ່າຈ້າງຕໍ່ຊົ່ວໂມງ (ເງິນເດືອນ ÷ ${p?.settings.salary_calc_days ?? 30} ÷ ຊົ່ວໂມງ/ມື້), ຊົ່ວໂມງທີ່ເກີນ ຈ່າຍເປັນ OT. ມື້ລາທີ່ອະນຸມັດ ນັບເປັນມື້ເຮັດວຽກ. ໂບນັດ = ເງິນທີ່ປະຢັດຈາກຕຳແໜ່ງວ່າງ ລົບຄ່າພາທາມ ແບ່ງໃຫ້ພະນັກງານໃນພະແນກ; ໂບນັດອື່ນ = ປະເພດໂບນັດ ແລະ ເງິນແທນວັນພັກ.`,
        )}
      </Lede>
      <div className="land-row" style={{ alignItems: "flex-end" }}>
        <Field label={tr("Month", "ເດືອນ")}>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
        <Field label={tr("Search", "ຄົ້ນຫາ")} grow={2}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("Search employee or department...", "ຄົ້ນຫາ ພະນັກງານ ຫຼື ພະແນກ...")} />
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
            🔒{" "}
            {tr(
              `${fmtMonth(month)} was closed on ${fmtStamp(p.status.closed_at)} — these are the figures saved at that moment; later scans or profile changes don't alter them.`,
              `${fmtMonth(month)} ປິດແລ້ວ ວັນທີ ${fmtStamp(p.status.closed_at)} — ນີ້ແມ່ນຕົວເລກທີ່ບັນທຶກຕອນປິດ; ການສະແກນ ຫຼື ການແກ້ຂໍ້ມູນພາຍຫຼັງ ບໍ່ປ່ຽນມັນ.`,
            )}
          </p>
        )}
        {!p?.closed_snapshot && p?.in_progress && (
          <p className="hint" style={{ marginBottom: 10 }}>
            ⏳{" "}
            {tr(
              `${fmtMonth(month)} is in progress — the requirement is pro-rated to ${fmtDate(p.as_of)}. Figures change daily until the month ends.`,
              `${fmtMonth(month)} ຍັງບໍ່ໝົດເດືອນ — ຊົ່ວໂມງມາດຕະຖານຄິດຮອດ ${fmtDate(p.as_of)}. ຕົວເລກຈະປ່ຽນທຸກມື້ ຈົນໝົດເດືອນ.`,
            )}
          </p>
        )}
        {review.length > 0 && (
          <div className="form-error">
            <b>{tr("Check before submitting —", "ກວດກ່ອນສົ່ງ —")}</b>{" "}
            {tr(
              `must scan, but no scans at all this month: ${review.join(", ")}. Fix the Scanner PIN, tick "No fingerprint scan needed" for staff who don't use the scanner, or enter the hours in Manual Hours Entry.`,
              `ຕ້ອງສະແກນ ແຕ່ບໍ່ມີການສະແກນເລີຍໃນເດືອນນີ້: ${review.join(", ")}. ແກ້ PIN ສະແກນ, tick "ບໍ່ຕ້ອງສະແກນ" ສຳລັບຄົນທີ່ບໍ່ສະແກນ, ຫຼື ໃສ່ຊົ່ວໂມງໃນ ບັນທຶກຊົ່ວໂມງດ້ວຍມື.`,
            )}
          </div>
        )}
        <div className="kpi-row" style={{ gridTemplateColumns: "1fr" }}>
          <Kpi
            dark
            label={mine ? tr(`${mine.name} total net payroll`, `ເງິນເດືອນສຸດທິ ລວມ ${mine.name}`) : tr("Group total net payroll", "ເງິນເດືອນສຸດທິ ລວມທັງກຸ່ມ")}
            value={lak(p?.grand_total)}
          />
        </div>
        {depts.map((d) => (
          <DeptCard key={d.name} dept={d} preview={p!} />
        ))}
        {depts.length === 0 && <p className="empty">No employees to pay for {fmtMonth(month)}.</p>}
        {st && mine && (
          <p className="hint">
            {tr(
              `Showing ${mine.name}'s staff only. Central HR submits, closes and sends the whole group's payroll each month.`,
              `ສະແດງສະເພາະພະນັກງານຂອງ ${mine.name}. HR ສູນກາງ ເປັນຜູ້ສົ່ງອະນຸມັດ, ປິດເດືອນ ແລະ ສົ່ງເງິນເດືອນທັງກຸ່ມ.`,
            )}
          </p>
        )}
        {st && !mine && (
          <>
            <div className="land-row">
              <button type="button" className="mini-btn" onClick={submit} disabled={busy || st.status !== "open"}>
                {tr("📝 Submit this month for approval", "📝 ສົ່ງເດືອນນີ້ໄປອະນຸມັດ")}
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={sendToAccountant}
                disabled={busy || st.status !== "approved" || !!st.sent_at}
              >
                {tr("📨 Send this month's cost to Accountant", "📨 ສົ່ງຕົ້ນທຶນເດືອນນີ້ໃຫ້ບັນຊີ")}
              </button>
              <button type="button" className="mini-btn" onClick={closeMonth} disabled={busy || st.status !== "approved" || st.close_pending}>
                {tr("🔒 Close this month", "🔒 ປິດເດືອນນີ້")}
              </button>
            </div>
            <p className={`hint${st.sent_at ? " match" : ""}`}>
              {st.sent_at
                ? tr(`✓ Sent to the Accountant on ${fmtStamp(st.sent_at)}.`, `✓ ສົ່ງໃຫ້ບັນຊີແລ້ວ ວັນທີ ${fmtStamp(st.sent_at)}.`)
                : tr("Sends each cost label's total payroll (Department Cost Labeling) to the Accountant's Cost Message tab as a Salaries line — never individual salaries. Submitting and closing follow the Approval Rule page.", "ສົ່ງຍອດເງິນເດືອນລວມຕາມປ້າຍຕົ້ນທຶນ ໃຫ້ບັນຊີເປັນລາຍການ Salaries — ບໍ່ສົ່ງເງິນເດືອນລາຍຄົນ. ການສົ່ງອະນຸມັດ ແລະ ການປິດເດືອນ ເປັນໄປຕາມກົດການອະນຸມັດ.")}
            </p>
            {st.close_pending && <p className="hint warn">{tr(`Closing ${fmtMonth(month)} is awaiting sign-off.`, `ການປິດ ${fmtMonth(month)} ກຳລັງລໍຖ້າອະນຸມັດ.`)}</p>}
          </>
        )}
        <p className="hint">{tr("Foundational view for now — tax brackets and social security deductions will come once payroll rules are confirmed.", "ສະບັບພື້ນຖານ — ພາສີ ແລະ ປະກັນສັງຄົມ ຈະເພີ່ມເມື່ອຢືນຢັນກົດເງິນເດືອນແລ້ວ.")}</p>
      </DataState>
    </div>
  );
}

function MonthTag({ status }: { status: MonthStatus }) {
  switch (status.status) {
    case "closed":
      return <Tag kind="ok">{tr("🔒 Closed — locked permanently", "🔒 ປິດແລ້ວ — ລັອກຖາວອນ")}</Tag>;
    case "approved":
      return <Tag kind="ok">✓ {tr("Approved", "ອະນຸມັດແລ້ວ")} {status.sent_at ? tr("— sent to Accountant", "— ສົ່ງໃຫ້ບັນຊີແລ້ວ") : tr("— ready to send to Accountant", "— ພ້ອມສົ່ງໃຫ້ບັນຊີ")}</Tag>;
    case "pending":
      return <Tag kind="pending">{tr("Awaiting approval", "ລໍຖ້າອະນຸມັດ")}</Tag>;
    default:
      return <Tag kind="pending">{tr("Not yet submitted for approval", "ຍັງບໍ່ໄດ້ສົ່ງອະນຸມັດ")}</Tag>;
  }
}

function DeptCard({ dept: d, preview }: { dept: PayrollDept; preview: PayrollPreview }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 14 }}>
        {deptLabel(d.name)}{" "}
        <span className="c-soft" style={{ fontWeight: 400, fontSize: 10.5, fontFamily: "var(--font-body)" }}>
          ({tr(`${num(d.hours_per_day)}h/day, ${d.days_per_week} days/week`, `${num(d.hours_per_day)} ຊມ/ມື້, ${d.days_per_week} ມື້/ອາທິດ`)})
        </span>
      </h3>
      <Table head={[tr("Employee", "ພະນັກງານ"), tr("Base salary", "ເງິນເດືອນ"), tr("Hours", "ຊົ່ວໂມງ"), tr("Deduction", "ຫັກ"), "OT", tr("Service charge", "ຄ່າບໍລິການ"), tr("Bonus", "ໂບນັດ"), tr("Other bonuses", "ໂບນັດອື່ນ"), tr("Net salary", "ເງິນເດືອນສຸດທິ"), ""]}>
        {d.rows.map((r) => (
          <tr key={r.user_id}>
            <td>{r.name}</td>
            <td className="mono">{lak(r.base_salary)}</td>
            <td className="mono">
              {r.requires_scan ? `${num(r.effective_hours)} / ${num(r.required_hours)}` : <span className="c-soft">{tr("no scan needed", "ບໍ່ຕ້ອງສະແກນ")}</span>}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                {r.no_scans && <Tag kind="low">{tr("No scans — check", "ບໍ່ມີການສະແກນ — ກວດ")}</Tag>}
                {r.manual_hours && <Tag kind="muted">{tr("Manual hours", "ຊົ່ວໂມງໃສ່ດ້ວຍມື")}</Tag>}
                {r.half_days > 0 && <Tag kind="pending">{tr(`${r.half_days} half day${r.half_days > 1 ? "s" : ""}`, `ເຄິ່ງມື້ ${r.half_days} ມື້`)}</Tag>}
                {r.leave_days > 0 && <Tag kind="muted">{tr(`${r.leave_days} leave day${r.leave_days > 1 ? "s" : ""}`, `ລາ ${r.leave_days} ມື້`)}</Tag>}
              </div>
            </td>
            <td className={`mono ${r.deduction > 0 ? "c-clay" : ""}`}>
              {lak(r.deduction)}
              {r.short_hours > 0 && <div className="hint">{tr(`${num(r.short_hours)}h short`, `ຂາດ ${num(r.short_hours)} ຊມ`)}</div>}
            </td>
            <td className="mono">
              {lak(r.ot_pay)}
              {(r.ot_hours > 0 || r.ot_hours_daily > 0) && (
                <div className="hint">
                  {r.ot_hours > 0 && tr(`${num(r.ot_hours)}h over`, `ເກີນເດືອນ ${num(r.ot_hours)} ຊມ`)}
                  {r.ot_hours > 0 && r.ot_hours_daily > 0 && " · "}
                  {r.ot_hours_daily > 0 && tr(`${num(r.ot_hours_daily)}h in day`, `ໃນມື້ ${num(r.ot_hours_daily)} ຊມ`)}
                </div>
              )}
              {r.ot_pending > 0 && (
                <div className="hint warn" title={tr("OT on the scans not yet finalized against the signed OT document — not paid until it is.", "OT ຈາກການສະແກນ ທີ່ຍັງບໍ່ Finalize ຕາມໃບ OT — ຍັງບໍ່ຈ່າຍ.")}>
                  {tr(`⏳ ${num(r.ot_pending)}h not finalized`, `⏳ ຍັງບໍ່ Finalize ${num(r.ot_pending)} ຊມ`)}
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
                {tr("📄 Payslip", "📄 ໃບເງິນເດືອນ")}
              </button>
            </td>
          </tr>
        ))}
        <tr className="total">
          <td colSpan={8}>{tr("Department total", "ລວມພະແນກ")}</td>
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
    tr(`Payslip — ${fmtMonth(p.month)}`, `ໃບເງິນເດືອນ — ${fmtMonth(p.month)}`),
    [
      [tr("Employee", "ພະນັກງານ"), `${r.name}${r.employee_no ? ` (${r.employee_no})` : ""}`],
      [tr("Department", "ພະແນກ"), deptLabel(d.name)],
      [tr("Position", "ຕຳແໜ່ງ"), r.position || "—"],
      [tr("Hours", "ຊົ່ວໂມງ"), r.requires_scan ? tr(`${num(r.effective_hours)} of ${num(r.required_hours)}`, `${num(r.effective_hours)} ຈາກ ${num(r.required_hours)}`) : tr("No scan needed", "ບໍ່ຕ້ອງສະແກນ")],
      [tr("Hourly rate", "ຄ່າຈ້າງຕໍ່ຊົ່ວໂມງ"), lak(r.hourly_rate)],
    ],
    [
      { label: tr("Base salary", "ເງິນເດືອນ"), value: lak(r.base_salary) },
      ...(r.deduction > 0 ? [{ label: tr(`Deduction (${num(r.short_hours)}h short)`, `ຫັກ (ຂາດ ${num(r.short_hours)} ຊມ)`), value: `− ${lak(r.deduction)}`, negative: true }] : []),
      ...(r.ot_pay > 0 ? [{ label: tr(`OT (${num(r.ot_hours)}h over the limit, ${num(r.ot_hours_daily)}h within the day)`, `OT (ເກີນເດືອນ ${num(r.ot_hours)} ຊມ, ໃນມື້ ${num(r.ot_hours_daily)} ຊມ)`), value: lak(r.ot_pay) }] : []),
      ...(r.service_charge > 0 ? [{ label: tr("Service charge", "ຄ່າບໍລິການ"), value: lak(r.service_charge) }] : []),
      ...(r.quota_bonus > 0 ? [{ label: tr("Bonus", "ໂບນັດ"), value: lak(r.quota_bonus) }] : []),
      ...r.bonuses.map((b) => ({ label: b.name, value: lak(b.amount) })),
      { label: tr("Net salary", "ເງິນເດືອນສຸດທິ"), value: lak(r.net), strong: true },
    ],
    p.in_progress ? tr(`Month in progress — figures as of ${fmtDate(p.as_of)}.`, `ເດືອນຍັງບໍ່ໝົດ — ຕົວເລກ ຮອດວັນທີ ${fmtDate(p.as_of)}.`) : undefined,
  );
}
