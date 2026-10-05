import { daysUntil, fmtDate, lak } from "@/lib/format";
import type { Approval, EmploymentType, Staff } from "./types";

export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "permanent", label: "Permanent" },
  { value: "probation", label: "Probation" },
  { value: "part_time", label: "Part-time" },
  { value: "casual", label: "Casual" },
  { value: "intern", label: "Intern" },
];

export const employmentLabel = (v: string) => EMPLOYMENT_TYPES.find((t) => t.value === v)?.label ?? v;

const APPROVAL_LABELS: Record<string, string> = {
  new_department: "New department",
  department_quota: "Department quota",
  department_base_salary: "Department base salary",
  work_rules_change: "Work rules change",
  employee_profile_change: "Employee profile change",
  resignation: "Resignation",
  meal_quota_change: "Meal quota change",
  leave_request: "Leave request",
  part_time_day: "Part-time day",
  part_time_day_change: "Part-time day change",
  activities_bonus_rate: "Activities bonus rate",
};
export const approvalLabel = (type: string) => APPROVAL_LABELS[type] ?? type;

/** "₭3,200,000 → ₭3,500,000" / "3 → 4" / "old → new" (prototype change column) */
export function approvalChange(a: Approval): string {
  const fmt = (v: string) => (a.value_format === "currency" ? lak(Number(v)).replace(" ", "") : v);
  return `${fmt(a.old_value)} → ${fmt(a.new_value)}`;
}

/** "YYYY-MM-DD HH:MM" → "26 Aug 2026" */
export const fmtStamp = (s: string | null) => (s ? fmtDate(s.slice(0, 10)) : "—");

export type Warning = { kind: "ok" | "pending" | "low"; text: string };

/** Probation / contract warnings — same rules as prototype buildEmpStatusWarning. */
export function statusWarning(emp: Staff): Warning {
  const prob = daysUntil(emp.probation_end_date);
  const contract = daysUntil(emp.contract_end);
  let w: Warning = { kind: "ok", text: "OK" };
  const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
  if (emp.employment_type !== "permanent" && contract !== null) {
    if (contract < 0) w = { kind: "low", text: "⚠ Contract overdue — needs renewal now" };
    else if (contract <= 30) w = { kind: "pending", text: `⚠ Contract ends in ${plural(contract)}` };
  }
  if (prob !== null && emp.employment_type === "probation") {
    if (prob < 0) w = { kind: "low", text: "⚠ Probation overdue — needs a decision now" };
    else if (prob <= 30) w = { kind: "pending", text: `⚠ Probation ends in ${plural(prob)}` };
  }
  return w;
}

/** Group items by department name, keeping department order from the API. */
export function groupByDept<T>(items: T[], deptOf: (t: T) => string, order: string[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const name of order) map.set(name, []);
  for (const it of items) {
    const d = deptOf(it) || "Unassigned";
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(it);
  }
  return [...map.entries()];
}

export function matchesSearch(emp: Staff, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  return [emp.full_name, emp.name_lao, emp.department, emp.position, emp.employee_no, emp.property].some((v) =>
    (v || "").toLowerCase().includes(s),
  );
}
