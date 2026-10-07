"use client";

import { DataState, EmptyRow, Lede, SectionHead, Table, Tag } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { fmtDate, lak, num } from "@/lib/format";
import { useResigned } from "@/features/hr/api";
import type { FinalPayRow } from "@/features/hr/types";
import { printSlip } from "@/features/hr/print";

/** Prototype v168 hr-resigned: final pay from the hours actually worked, not a full month's salary. */
export default function ResignedPage() {
  const { t } = useLang();
  const list = useResigned();
  return (
    <div className="subview">
      <SectionHead title={t("sh_resigned")} />
      <Lede>
        Calculated from actual hours worked at resignation, not a full month&apos;s base salary: hours up to the department&apos;s standard
        month are paid at the hourly rate, hours above it as OT. An employee lands here once their resignation request is approved.
      </Lede>
      <DataState loading={list.isLoading} error={list.error}>
        <div className="card">
          <Table head={["Employee", "Department", "Resigned", "Final hours", "Final net pay", ""]}>
            {(list.data ?? []).length === 0 && <EmptyRow cols={6}>No resigned employees yet.</EmptyRow>}
            {list.data?.map((r) => (
              <tr key={r.user_id}>
                <td>
                  {r.name}
                  <div className="hint">{r.position}</div>
                </td>
                <td>{r.department}</td>
                <td>{fmtDate(r.resigned_at)}</td>
                <td className="mono">
                  {num(r.hours)} / {num(r.month_hours)}
                  <div>{r.hours_entered ? <Tag kind="muted">Entered by HR</Tag> : <Tag kind="pending">From scans</Tag>}</div>
                </td>
                <td className="mono bold">{lak(r.net)}</td>
                <td>
                  <button type="button" className="mini-btn" onClick={() => finalSlip(r)}>
                    📄 Final payslip
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </DataState>
    </div>
  );
}

function finalSlip(r: FinalPayRow) {
  printSlip(
    `Final payslip — ${r.name}`,
    "Final payslip",
    [
      ["Employee", `${r.name}${r.employee_no ? ` (${r.employee_no})` : ""}`],
      ["Department", r.department],
      ["Position", r.position || "—"],
      ["Resigned", fmtDate(r.resigned_at)],
      ["Final hours", `${num(r.hours)} of ${num(r.month_hours)} standard`],
      ["Hourly rate", lak(r.hourly_rate)],
    ],
    [
      { label: `Pay for ${num(Math.min(r.hours, r.month_hours))} hours`, value: lak(r.base_pay) },
      ...(r.ot_pay > 0 ? [{ label: `OT (${num(r.hours - r.month_hours)} hours above the standard month)`, value: lak(r.ot_pay) }] : []),
      { label: "Final net pay", value: lak(r.net), strong: true },
    ],
    `Base salary ${lak(r.base_salary)} — final pay is worked out from the hours actually worked, not a full month.`,
  );
}
