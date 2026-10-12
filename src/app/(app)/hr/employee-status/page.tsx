"use client";

import { useState } from "react";
import { DataState, Lede, SectionHead, Table, Tag } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
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
  const [expiringOnly, setExpiringOnly] = useState(false);
  const staff = useStaff();
  const depts = useDepartments();
  // prototype v168 "Contracts/probation expiring soon": within 30 days or overdue
  const shown = (staff.data ?? []).filter((e) => !expiringOnly || statusWarning(e).kind !== "ok");
  const groups = groupByDept(shown, (e) => e.department, (depts.data ?? []).map((d) => d.name)).filter(([, r]) => r.length > 0);

  return (
    <div className="subview">
      <SectionHead title={t("sh_employee_status")} />
      <Lede>{tr("Probation and contract end dates, grouped by department. Warns when a decision is needed soon (within 30 days) or overdue.", "ວັນໝົດທົດລອງງານ ແລະ ວັນໝົດສັນຍາ ແຍກຕາມພະແນກ. ເຕືອນເມື່ອຕ້ອງຕັດສິນໃຈ (ພາຍໃນ 30 ວັນ) ຫຼື ກາຍກຳນົດແລ້ວ.")}</Lede>
      <div className="land-row">
        <button type="button" className="mini-btn" onClick={() => setSort("probation")}>
          {tr("Sort by Probation", "ຮຽງຕາມທົດລອງງານ")}
        </button>
        <button type="button" className="mini-btn" onClick={() => setSort("contract")}>
          {tr("Sort by Contract", "ຮຽງຕາມສັນຍາ")}
        </button>
        <button type="button" className={`mini-btn${expiringOnly ? " flag" : ""}`} onClick={() => setExpiringOnly((v) => !v)}>
          {tr("⚠ Contracts/probation expiring soon", "⚠ ສັນຍາ / ທົດລອງງານ ໃກ້ໝົດ")}{expiringOnly ? " ✓" : ""}
        </button>
        <button type="button" className="mini-btn" onClick={() => setSort(null)}>
          {tr("Clear sort", "ລ້າງການຮຽງ")}
        </button>
      </div>
      <DataState loading={staff.isLoading} error={staff.error}>
        {groups.map(([dept, rows]) => {
          const sorted =
            sort === "probation" ? [...rows].sort(byDays("probation_end_date")) : sort === "contract" ? [...rows].sort(byDays("contract_end")) : rows;
          return (
            <div className="card" key={dept}>
              <h3 style={{ fontSize: 14 }}>{dept}</h3>
              <Table head={[tr("Employee", "ພະນັກງານ"), tr("Property", "ຣີສອດ"), tr("Employment type", "ປະເພດການຈ້າງ"), tr("Probation end", "ໝົດທົດລອງງານ"), tr("Contract end", "ສິ້ນສຸດສັນຍາ"), tr("Warning", "ແຈ້ງເຕືອນ")]}>
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
        {expiringOnly && groups.length === 0 && <p className="empty">{tr("No contracts or probations expiring within the next 30 days.", "ບໍ່ມີສັນຍາ ຫຼື ທົດລອງງານ ທີ່ໝົດພາຍໃນ 30 ວັນ.")}</p>}
      </DataState>
    </div>
  );
}
