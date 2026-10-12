"use client";

import { DataState, EmptyRow, Kpi, Lede, SectionHead, Table } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { num } from "@/lib/format";
import { useOverview } from "@/features/hr/api";

export default function OverviewPage() {
  const { t } = useLang();
  const ov = useOverview();
  const d = ov.data;
  return (
    <div className="subview">
      <SectionHead title={t("sh_hr_overview")} />
      <DataState loading={ov.isLoading} error={ov.error}>
        {d && (
          <>
            <div className="kpi-row">
              <Kpi label={tr("Total employees", "ພະນັກງານທັງໝົດ")} value={d.total_employees} />
              <Kpi label={tr("Resignations (all time)", "ຈຳນວນຄົນລາອອກ (ທັງໝົດ)")} value={d.resignations} />
              <Kpi label={tr("Turnover rate", "ອັດຕາການລາອອກ")} value={`${num(d.turnover_rate)}%`} />
              <Kpi label={tr("Total job openings", "ຕຳແໜ່ງວ່າງທັງໝົດ")} value={d.total_openings} />
            </div>
            <div className="card">
              <h3>{tr("Job openings by department", "ຕຳແໜ່ງວ່າງ ຕາມພະແນກ")}</h3>
              <Lede>{tr("How many more people each department needs to reach its quota.", "ແຕ່ລະພະແນກຍັງຕ້ອງການອີກຈັກຄົນ ຈຶ່ງຄົບໂຄຕາ.")}</Lede>
              <Table head={[tr("Department", "ພະແນກ"), tr("Quota", "ໂຄຕາ"), tr("Filled", "ມີແລ້ວ"), tr("Openings", "ຕຳແໜ່ງວ່າງ")]}>
                {d.openings.length === 0 && <EmptyRow cols={4}>{tr("No departments yet.", "ຍັງບໍ່ມີພະແນກ.")}</EmptyRow>}
                {d.openings.map((o) => (
                  <tr key={o.department}>
                    <td>{o.department}</td>
                    <td className="mono">{o.quota}</td>
                    <td className="mono">{o.filled}</td>
                    <td className={`mono ${o.openings > 0 ? "c-clay bold" : ""}`}>{o.openings}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}
