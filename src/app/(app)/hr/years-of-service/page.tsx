"use client";

import { DataState, Lede, SectionHead, Table } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtDate, today } from "@/lib/format";
import { useDepartments, useStaff } from "@/features/hr/api";
import type { Staff } from "@/features/hr/types";
import { groupByDept } from "@/features/hr/utils";

/** Whole months from the hire date to today (a month counts once its day is reached). */
function monthsOfService(hire: string | null): number | null {
  if (!hire) return null;
  const [hy, hm, hd] = hire.split("-").map(Number);
  const [ty, tm, td] = today().split("-").map(Number);
  let m = (ty - hy) * 12 + (tm - hm);
  if (td < hd) m--;
  return Math.max(0, m);
}

const tenureText = (m: number) => {
  const y = Math.floor(m / 12);
  const r = m % 12;
  return tr([y ? `${y} yr${y > 1 ? "s" : ""}` : "", `${r} mo${r === 1 ? "" : "s"}`].filter(Boolean).join(" "), [y ? `${y} ປີ` : "", `${r} ເດືອນ`].filter(Boolean).join(" "));
};

/** Prototype v207 hr-yearsofservice: how long each active employee has worked for us, by department. */
export default function YearsOfServicePage() {
  const { t } = useLang();
  const staff = useStaff();
  const depts = useDepartments();
  const active = (staff.data ?? []).filter((s) => s.status !== "resigned");
  const groups = groupByDept(active, (s) => s.department, (depts.data ?? []).map((d) => d.name)).filter(([, r]) => r.length > 0);

  return (
    <div className="subview">
      <SectionHead title={t("sh_years_of_service")} />
      <Lede>{tr("How long each active employee has worked for us, calculated from their hire date, grouped by department.", "ແຕ່ລະຄົນເຮັດວຽກກັບເຮົາດົນປານໃດ ຄິດຈາກວັນເຂົ້າວຽກ, ແຍກຕາມພະແນກ.")}</Lede>
      <DataState loading={staff.isLoading} error={staff.error}>
        {groups.length === 0 && <p className="empty">{tr("No employees yet.", "ຍັງບໍ່ມີພະນັກງານ.")}</p>}
        {groups.map(([dept, rows]) => {
          const withMonths = rows.map((s: Staff) => ({ s, m: monthsOfService(s.hire_date) }));
          const known = withMonths.filter((x) => x.m !== null) as { s: Staff; m: number }[];
          const avg = known.length ? known.reduce((sum, x) => sum + x.m, 0) / known.length / 12 : null;
          const sorted = [...withMonths].sort((a, b) => (b.m ?? -1) - (a.m ?? -1));
          return (
            <div className="card" key={dept}>
              <h3 style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>{dept}</span>
                {avg !== null && (
                  <span className="hint" style={{ margin: 0 }}>
                    {tr(`Avg. tenure ${avg.toFixed(1)} yrs`, `ອາຍຸງານສະເລ່ຍ ${avg.toFixed(1)} ປີ`)}
                  </span>
                )}
              </h3>
              <Table head={[tr("Name", "ຊື່"), tr("Position", "ຕຳແໜ່ງ"), tr("Resort", "ຣີສອດ"), tr("Hire date", "ວັນເຂົ້າວຽກ"), tr("Tenure", "ອາຍຸງານ")]}>
                {sorted.map(({ s, m }) => (
                  <tr key={s.user_id}>
                    <td>{s.full_name}</td>
                    <td>{s.position || "—"}</td>
                    <td>{s.property || "—"}</td>
                    <td>{fmtDate(s.hire_date)}</td>
                    <td className="mono">{m === null ? "—" : tenureText(m)}</td>
                  </tr>
                ))}
              </Table>
            </div>
          );
        })}
      </DataState>
    </div>
  );
}
