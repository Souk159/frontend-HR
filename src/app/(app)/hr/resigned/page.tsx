"use client";

import { DataState, EmptyRow, Lede, SectionHead, Table, Tag } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
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
        {tr("Calculated from actual hours worked at resignation, not a full month's base salary: hours up to the department's standard month are paid at the hourly rate, hours above it as OT. An employee lands here once their resignation request is approved.", "ຄິດຈາກຊົ່ວໂມງທີ່ເຮັດແທ້ໃນງວດສຸດທ້າຍ ບໍ່ແມ່ນເງິນເດືອນເຕັມ: ຊົ່ວໂມງບໍ່ເກີນມາດຕະຖານຂອງເດືອນ ຈ່າຍຕາມຄ່າຈ້າງຕໍ່ຊົ່ວໂມງ, ສ່ວນທີ່ເກີນເປັນ OT. ພະນັກງານຈະມາຢູ່ນີ້ ເມື່ອການລາອອກໄດ້ຮັບອະນຸມັດ.")}
      </Lede>
      <DataState loading={list.isLoading} error={list.error}>
        <div className="card">
          <Table head={[tr("Employee", "ພະນັກງານ"), tr("Department", "ພະແນກ"), tr("Resigned", "ວັນລາອອກ"), tr("Final hours", "ຊົ່ວໂມງສຸດທ້າຍ"), tr("Final net pay", "ເງິນສຸດທ້າຍ"), ""]}>
            {(list.data ?? []).length === 0 && <EmptyRow cols={6}>{tr("No resigned employees yet.", "ຍັງບໍ່ມີຄົນລາອອກ.")}</EmptyRow>}
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
                  <div>{r.hours_entered ? <Tag kind="muted">{tr("Entered by HR", "HR ໃສ່")}</Tag> : <Tag kind="pending">{tr("From scans", "ຈາກການສະແກນ")}</Tag>}</div>
                </td>
                <td className="mono bold">{lak(r.net)}</td>
                <td>
                  <button type="button" className="mini-btn" onClick={() => finalSlip(r)}>
                    {tr("📄 Final payslip", "📄 ໃບເງິນເດືອນສຸດທ້າຍ")}
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
    tr("Final payslip", "ໃບເງິນເດືອນສຸດທ້າຍ"),
    [
      [tr("Employee", "ພະນັກງານ"), `${r.name}${r.employee_no ? ` (${r.employee_no})` : ""}`],
      [tr("Department", "ພະແນກ"), r.department],
      [tr("Position", "ຕຳແໜ່ງ"), r.position || "—"],
      [tr("Resigned", "ວັນລາອອກ"), fmtDate(r.resigned_at)],
      [tr("Final hours", "ຊົ່ວໂມງສຸດທ້າຍ"), tr(`${num(r.hours)} of ${num(r.month_hours)} standard`, `${num(r.hours)} ຈາກມາດຕະຖານ ${num(r.month_hours)}`)],
      [tr("Hourly rate", "ຄ່າຈ້າງຕໍ່ຊົ່ວໂມງ"), lak(r.hourly_rate)],
    ],
    [
      { label: tr(`Pay for ${num(Math.min(r.hours, r.month_hours))} hours`, `ຄ່າຈ້າງ ${num(Math.min(r.hours, r.month_hours))} ຊົ່ວໂມງ`), value: lak(r.base_pay) },
      ...(r.ot_pay > 0 ? [{ label: tr(`OT (${num(r.hours - r.month_hours)} hours above the standard month)`, `OT (ເກີນມາດຕະຖານເດືອນ ${num(r.hours - r.month_hours)} ຊົ່ວໂມງ)`), value: lak(r.ot_pay) }] : []),
      { label: tr("Final net pay", "ເງິນສຸດທ້າຍ"), value: lak(r.net), strong: true },
    ],
    tr(`Base salary ${lak(r.base_salary)} — final pay is worked out from the hours actually worked, not a full month.`, `ເງິນເດືອນພື້ນຖານ ${lak(r.base_salary)} — ເງິນສຸດທ້າຍ ຄິດຈາກຊົ່ວໂມງທີ່ເຮັດແທ້, ບໍ່ແມ່ນເຕັມເດືອນ.`),
  );
}
