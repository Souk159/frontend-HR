"use client";

import { useState } from "react";
import { DataState, Lede, SectionHead, Table, Tag } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { daysUntil, fmtDate } from "@/lib/format";
import { useDepartments, useStaff } from "@/features/hr/api";
import type { Staff } from "@/features/hr/types";
import { employmentLabel, groupByDept, statusWarning } from "@/features/hr/utils";

type Sort = "probation" | "contract" | null;

const byDays = (key: "probation_end_date" | "contract_end") => (a: Staff, b: Staff) => {
  const da = daysUntil(a[key]);
  const db = daysUntil(b[key]);
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
};

export default function EmployeeStatusPage() {
  const { t } = useLang();
  const [sort, setSort] = useState<Sort>(null);
  const staff = useStaff();
  const depts = useDepartments();
  const groups = groupByDept(staff.data ?? [], (e) => e.department, (depts.data ?? []).map((d) => d.name)).filter(([, r]) => r.length > 0);

  return (
    <div className="subview">
      <SectionHead title={t("sh_employee_status")} />
      <Lede>Probation and contract end dates, grouped by department. Warns when a decision is needed soon (within 30 days) or overdue.</Lede>
      <div className="land-row">
        <button type="button" className="mini-btn" onClick={() => setSort("probation")}>
          Sort by Probation
        </button>
        <button type="button" className="mini-btn" onClick={() => setSort("contract")}>
          Sort by Contract
        </button>
        <button type="button" className="mini-btn" onClick={() => setSort(null)}>
          Clear sort
        </button>
      </div>
      <DataState loading={staff.isLoading} error={staff.error}>
        {groups.map(([dept, rows]) => {
          const sorted =
            sort === "probation" ? [...rows].sort(byDays("probation_end_date")) : sort === "contract" ? [...rows].sort(byDays("contract_end")) : rows;
          return (
            <div className="card" key={dept}>
              <h3 style={{ fontSize: 14 }}>{dept}</h3>
              <Table head={["Employee", "Property", "Employment type", "Probation end", "Contract end", "Warning"]}>
                {sorted.map((e) => {
                  const w = statusWarning(e);
                  return (
                    <tr key={e.user_id}>
                      <td>{e.full_name}</td>
                      <td>{e.property || "—"}</td>
                      <td>{employmentLabel(e.employment_type)}</td>
                      <td>{fmtDate(e.probation_end_date)}</td>
                      <td>{e.contract_end ? fmtDate(e.contract_end) : "Permanent"}</td>
                      <td>
                        <Tag kind={w.kind}>{w.text}</Tag>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          );
        })}
      </DataState>
    </div>
  );
}
