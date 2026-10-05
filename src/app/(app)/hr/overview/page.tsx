"use client";

import { DataState, EmptyRow, Kpi, Lede, SectionHead, Table } from "@/components/ui";
import { useLang } from "@/lib/i18n";
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
              <Kpi label="Total employees" value={d.total_employees} />
              <Kpi label="Resignations (all time)" value={d.resignations} />
              <Kpi label="Turnover rate" value={`${num(d.turnover_rate)}%`} />
              <Kpi label="Total job openings" value={d.total_openings} />
            </div>
            <div className="card">
              <h3>Job openings by department</h3>
              <Lede>How many more people each department needs to reach its quota.</Lede>
              <Table head={["Department", "Quota", "Filled", "Openings"]}>
                {d.openings.length === 0 && <EmptyRow cols={4}>No departments yet.</EmptyRow>}
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
