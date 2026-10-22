"use client";

import { Field } from "@/components/ui";
import { tr } from "@/lib/i18n";
import { useStaff } from "@/features/hr/api";
import type { HolidayEligibility } from "@/features/hr/types";

/** "Who gets it" for a holiday (prototype v207): everyone, a minimum tenure, or specific people. */
export function HolidayEligibilityFields({ value, onChange }: { value: HolidayEligibility; onChange: (v: HolidayEligibility) => void }) {
  const staff = useStaff();
  const years = Math.floor(value.tenure_months / 12);
  const months = value.tenure_months % 12;
  const setTenure = (y: number, m: number) => onChange({ ...value, tenure_months: Math.max(0, y) * 12 + Math.max(0, m) });
  const toggle = (id: string, on: boolean) =>
    onChange({ ...value, people: on ? [...value.people, id] : value.people.filter((p) => p !== id) });

  return (
    <>
      <div className="land-row" style={{ alignItems: "flex-end" }}>
        <Field label={tr("Who gets it", "ໃຜໄດ້ສິດ")}>
          <select value={value.eligibility} onChange={(e) => onChange({ ...value, eligibility: e.target.value as HolidayEligibility["eligibility"] })}>
            <option value="everyone">{tr("Everyone", "ທຸກຄົນ")}</option>
            <option value="tenure">{tr("People who worked with us for X years/months", "ຄົນທີ່ເຮັດວຽກກັບເຮົາຄົບ X ປີ/ເດືອນ")}</option>
            <option value="specific">{tr("Only specific people", "ສະເພາະບາງຄົນ")}</option>
          </select>
        </Field>
        {value.eligibility === "tenure" && (
          <>
            <Field label={tr("Years", "ປີ")}>
              <input type="number" min={0} value={years} onChange={(e) => setTenure(parseInt(e.target.value) || 0, months)} style={{ width: 70 }} />
            </Field>
            <Field label={tr("Months", "ເດືອນ")}>
              <input type="number" min={0} max={11} value={months} onChange={(e) => setTenure(years, parseInt(e.target.value) || 0)} style={{ width: 70 }} />
            </Field>
          </>
        )}
      </div>
      {value.eligibility === "specific" && (
        <div className="card" style={{ maxHeight: 220, overflowY: "auto", margin: "6px 0 10px" }}>
          <p className="hint" style={{ marginTop: 0 }}>{tr("Tick who this holiday applies to:", "ໝາຍຄົນທີ່ໄດ້ວັນພັກນີ້:")}</p>
          {(staff.data ?? [])
            .filter((s) => s.status !== "resigned")
            .map((s) => (
              <label key={s.user_id} className="check-label">
                <input type="checkbox" checked={value.people.includes(s.user_id)} onChange={(e) => toggle(s.user_id, e.target.checked)} />
                {s.full_name}
                <span className="c-soft" style={{ fontSize: 11 }}>
                  {s.department || "—"}
                  {s.property ? ` · ${s.property}` : ""}
                </span>
              </label>
            ))}
        </div>
      )}
    </>
  );
}

/** "Everyone" / "Worked at least 2 years 3 months" / "4 specific people" */
export function eligibilityText(e: HolidayEligibility): string {
  if (e.eligibility === "tenure") {
    const y = Math.floor(e.tenure_months / 12);
    const m = e.tenure_months % 12;
    const en = [y ? `${y} year${y > 1 ? "s" : ""}` : "", m ? `${m} month${m > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ");
    const lo = [y ? `${y} ປີ` : "", m ? `${m} ເດືອນ` : ""].filter(Boolean).join(" ");
    return tr(`People who worked with us at least ${en}`, `ຄົນທີ່ເຮັດວຽກກັບເຮົາຢ່າງໜ້ອຍ ${lo}`);
  }
  if (e.eligibility === "specific") return tr(`${e.people.length} specific people`, `ສະເພາະ ${e.people.length} ຄົນ`);
  return tr("Everyone", "ທຸກຄົນ");
}
