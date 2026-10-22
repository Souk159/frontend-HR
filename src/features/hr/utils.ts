import { daysUntil, fmtDate, lak } from "@/lib/format";
import { tr } from "@/lib/i18n";
import type { Approval, EmploymentType, Staff } from "./types";

/** Employment types with labels in the chosen language (call it while rendering). */
export const employmentTypes = (): { value: EmploymentType; label: string }[] => [
  { value: "permanent", label: tr("Permanent", "ພະນັກງານປະຈຳ") },
  { value: "probation", label: tr("Probation", "ທົດລອງງານ") },
  { value: "part_time", label: tr("Part-time", "ພາທາມ") },
  { value: "casual", label: tr("Casual", "ຊົ່ວຄາວ") },
  { value: "intern", label: tr("Intern", "ຝຶກງານ") },
];

export const employmentLabel = (v: string) => employmentTypes().find((t) => t.value === v)?.label ?? v;

const APPROVAL_LABELS: Record<string, [string, string]> = {
  new_department: ["New department", "ສ້າງພະແນກໃໝ່"],
  department_quota: ["Department quota", "ໂຄຕາຄົນຂອງພະແນກ"],
  department_base_salary: ["Department base salary", "ເງິນເດືອນພື້ນຖານຂອງພະແນກ"],
  department_edit: ["Rename / close department", "ປ່ຽນຊື່ / ປິດພະແນກ"],
  work_rules_change: ["Work rules change", "ປ່ຽນກົດລະບຽບການເຮັດວຽກ"],
  employee_profile_change: ["Employee profile change", "ແກ້ຂໍ້ມູນພະນັກງານ"],
  resignation: ["Resignation", "ລາອອກ"],
  meal_quota_change: ["Meal quota change", "ປ່ຽນໂຄຕາອາຫານ"],
  leave_request: ["Leave request", "ຄຳຂໍລາພັກ"],
  part_time_day: ["Part-time day", "ພາທາມປະຈຳມື້"],
  part_time_day_change: ["Part-time day change", "ແກ້ພາທາມປະຈຳມື້"],
  activities_bonus_rate: ["Activities bonus rate", "ອັດຕາໂບນັດກິດຈະກຳ"],
  approval_rule_change: ["Approval rule change", "ປ່ຽນກົດການອະນຸມັດ"],
  payroll_submission: ["Payroll submission", "ສົ່ງເງິນເດືອນອະນຸມັດ"],
  close_payroll_month: ["Close payroll month", "ປິດເດືອນເງິນເດືອນ"],
  public_holiday_payout: ["Public holiday payout", "ຈ່າຍເງິນແທນວັນພັກ"],
  hours_edit: ["Working hours edit", "ແກ້ຊົ່ວໂມງເຮັດວຽກ"],
  dept_cost_labels: ["Department cost labels", "ປ້າຍຕົ້ນທຶນພະແນກ"],
  benefit_eligibility_change: ["Benefit eligibility change", "ປ່ຽນສິດສະຫວັດດີການ"],
  employee_transfer: ["Employee transfer", "ຍ້າຍພະນັກງານ"],
  service_charge_eligibility_change: ["Service charge eligibility change", "ປ່ຽນສິດຄ່າບໍລິການ"],
  benefit_rule_change: ["Benefit rule change", "ປ່ຽນກົດສະຫວັດດີການ"],
};
/** Lao display for the built-in Approval Rule descriptions (the API sends English). */
const RULE_LABELS_LO: Record<string, string> = {
  hours_edit: "HR ແກ້ຊົ່ວໂມງເຮັດວຽກລວມຂອງພະນັກງານ (ບັນທຶກຊົ່ວໂມງດ້ວຍມື)",
  dept_cost_labels: "HR ກຳນົດວ່າເງິນເດືອນຂອງແຕ່ລະພະແນກ ລົງບັນຊີແຖວໃດ",
  public_holiday_payout: "ເພີ່ມເງິນແທນວັນພັກທີ່ບໍ່ໄດ້ໃຊ້ ເຂົ້າເງິນເດືອນ",
  payroll_submission: "HR ສົ່ງເງິນເດືອນປະຈຳເດືອນ ກ່ອນສົ່ງໃຫ້ບັນຊີ",
  close_payroll_month: "ປິດເດືອນເງິນເດືອນ ເພື່ອບໍ່ໃຫ້ແກ້ໄຂໄດ້ອີກ",
  employee_profile_change: "HR ແກ້ຂໍ້ມູນພະນັກງານ — ເງິນເດືອນ, ໂບນັດ, ສະຖານະ ແລະ ອື່ນໆ",
  resignation: "ບັນທຶກພະນັກງານລາອອກ ແລະ ກຳນົດຊົ່ວໂມງສຸດທ້າຍ",
  new_department: "ສ້າງພະແນກໃໝ່",
  department_edit: "ປ່ຽນຊື່ ຫຼື ປິດພະແນກ",
  department_quota: "ປ່ຽນໂຄຕາຈຳນວນຄົນຂອງພະແນກ",
  department_base_salary: "ປ່ຽນເງິນເດືອນພື້ນຖານ / ຂັ້ນຕ່ຳຂອງພະແນກ",
  work_rules_change: "ປ່ຽນຊົ່ວໂມງ, ອັດຕາ OT ຫຼື ໂຄຕາລາພັກຂອງພະແນກ",
  meal_quota_change: "ປ່ຽນໂຄຕາອາຫານພະນັກງານ",
  leave_request: "ອະນຸມັດຄຳຂໍລາພັກຂອງພະນັກງານ",
  part_time_day: "ອະນຸມັດລາຍຊື່ພາທາມປະຈຳມື້ (ຫຼື ການແກ້ໄຂ) ກ່ອນຈ່າຍ",
  employee_transfer: "ຍ້າຍພະນັກງານໄປພະແນກ ຫຼື ຣີສອດອື່ນ",
  service_charge_eligibility_change: "ປ່ຽນວ່າພະນັກງານໄດ້ຄ່າບໍລິການບໍ່, ຫຼື ໄດ້ສ່ວນເຕັມ / ຕາມຊົ່ວໂມງ",
  benefit_eligibility_change: "HR ໝາຍ / ຍົກເລີກ ສະຫວັດດີການ (ລາພັກປະຈຳປີ, ວັນພັກລັດຖະການ, ວັນພັກປະຈຳອາທິດ) ໃຫ້ພະນັກງານຄົນໜຶ່ງ",
  benefit_rule_change: "ປ່ຽນໄລຍະທີ່ພະນັກງານຕ້ອງເຮັດວຽກ ກ່ອນໄດ້ລາພັກປະຈຳປີ / ວັນພັກລັດຖະການ / ວັນພັກປະຈຳອາທິດ",
};
export const ruleLabel = (type: string, english: string) => tr(english, RULE_LABELS_LO[type] ?? english);

/** Built-in leave type names are stored in English; show them in Lao when Lao is chosen. */
const LEAVE_LO: Record<string, string> = { "Annual leave": "ລາພັກປະຈຳປີ", "Sick leave": "ລາປ່ວຍ" };
export const leaveTypeLabel = (name: string) => tr(name, LEAVE_LO[name] ?? name);

export const approvalLabel = (type: string) => {
  const l = APPROVAL_LABELS[type];
  return l ? tr(l[0], l[1]) : type;
};

const ROLES: Record<string, [string, string]> = {
  gm: ["GM", "GM"], coo: ["COO", "COO"], ceo: ["CEO", "CEO"], owner: ["Owner", "ເຈົ້າຂອງ"], admin: ["Admin", "Admin"],
  hr_manager: ["HR Manager", "ຜູ້ຈັດການ HR"], hr_coordinator: ["HR Coordinator", "ຜູ້ປະສານງານ HR"],
  cashier: ["Cashier", "ແຄັດເຊຍ"], cashier_manager: ["Cashier Manager", "ຫົວໜ້າແຄັດເຊຍ"], kitchen: ["Kitchen", "ຄົວ"],
  fnb_manager: ["F&B Manager", "ຜູ້ຈັດການ F&B"], inventory: ["Inventory", "ສາງ"], accountant: ["Accountant", "ບັນຊີ"],
  assistant: ["Assistant", "ຜູ້ຊ່ວຍ"], front_office: ["Front Office", "ໜ້າຮ້ານ"],
};
export const roleLabel = (r: string) => (ROLES[r] ? tr(ROLES[r][0], ROLES[r][1]) : r);
/** ROLE_LABELS[r] — kept for existing callers. */
export const ROLE_LABELS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_, r: string) => (ROLES[r] ? roleLabel(r) : undefined),
});
export const rolesText = (roles: string[]) => roles.map(roleLabel).join(" / ");

/** Dialog title + text after a change request: applied at once when its Approval Rule needs no approval. */
export function requestOutcome(res: { applied?: boolean } | undefined, what: string): [string, string] {
  return res?.applied
    ? [tr("Applied", "ບັນທຶກແລ້ວ"), tr(`${what} has been applied — this kind of change needs no approval (Approval Rule).`, `${what} — ມີຜົນແລ້ວ. ປະເພດນີ້ບໍ່ຕ້ອງອະນຸມັດ (ຕາມກົດການອະນຸມັດ).`)]
    : [tr("Request sent", "ສົ່ງຄຳຂໍແລ້ວ"), tr(`${what} has been sent for approval. It takes effect once the roles set in Approval Rule approve it.`, `${what} — ສົ່ງໄປລໍຖ້າອະນຸມັດແລ້ວ. ຈະມີຜົນເມື່ອຜູ້ອະນຸມັດຕາມກົດການອະນຸມັດ ອະນຸມັດ.`)];
}

/** Dialog after approving / denying; "pending" = this role signed, others still have to. */
export function decisionMessage(a: Approval, status: "approved" | "denied" | "pending"): [string, string] {
  const what = `${approvalLabel(a.type)} — ${a.target} (${approvalChange(a)})`;
  if (status === "pending") {
    const signed = new Set(a.approvals.map((s) => s.role));
    const waiting = rolesText(a.required_roles.filter((r) => !signed.has(r)));
    return [
      tr("Approval recorded", "ບັນທຶກການອະນຸມັດແລ້ວ"),
      tr(`${what} still needs ${waiting} — every ticked role must approve it.`, `${what} ຍັງລໍຖ້າ ${waiting} — ທຸກບົດບາດທີ່ກຳນົດຕ້ອງອະນຸມັດ.`),
    ];
  }
  return status === "approved"
    ? [tr("Approved", "ອະນຸມັດແລ້ວ"), tr(`${what} approved.`, `${what} — ອະນຸມັດແລ້ວ.`)]
    : [tr("Denied", "ປະຕິເສດແລ້ວ"), tr(`${what} denied.`, `${what} — ປະຕິເສດແລ້ວ.`)];
}

/** Same for a batch: "3 sent for approval, 1 applied". */
export function batchOutcome(res: { requests_created: number; applied?: number }, what: string): [string, string] {
  const parts = [];
  if (res.requests_created) parts.push(tr(`${res.requests_created} ${what} sent for approval`, `${what} ${res.requests_created} ລາຍການ ສົ່ງໄປລໍຖ້າອະນຸມັດ`));
  if (res.applied) parts.push(tr(`${res.applied} applied at once (no approval needed)`, `${res.applied} ລາຍການ ມີຜົນທັນທີ (ບໍ່ຕ້ອງອະນຸມັດ)`));
  return [
    res.requests_created ? tr("Requests sent", "ສົ່ງຄຳຂໍແລ້ວ") : tr("Applied", "ບັນທຶກແລ້ວ"),
    (parts.join(", ") || tr("Nothing changed", "ບໍ່ມີຫຍັງປ່ຽນ")) + ".",
  ];
}

/** "₭3,200,000 → ₭3,500,000" / "3 → 4" / "old → new" (prototype change column) */
export function approvalChange(a: Approval): string {
  const fmt = (v: string) => (a.value_format === "currency" && v.trim() !== "" && !isNaN(Number(v)) ? lak(Number(v)).replace(" ", "") : v);
  return `${fmt(a.old_value)} → ${fmt(a.new_value)}`;
}

/** "YYYY-MM-DD HH:MM" → "26 Aug 2026" */
export const fmtStamp = (s: string | null) => (s ? fmtDate(s.slice(0, 10)) : "—");

export type Warning = { kind: "ok" | "pending" | "low"; text: string };

/** Probation / contract warnings — same rules as prototype buildEmpStatusWarning. */
export function statusWarning(emp: Staff): Warning {
  const prob = daysUntil(emp.probation_end_date);
  const contract = daysUntil(emp.contract_end);
  let w: Warning = { kind: "ok", text: tr("OK", "ປົກກະຕິ") };
  const plural = (n: number) => tr(`${n} day${n === 1 ? "" : "s"}`, `${n} ມື້`);
  if (emp.employment_type !== "permanent" && contract !== null) {
    if (contract < 0) w = { kind: "low", text: tr("⚠ Contract overdue — needs renewal now", "⚠ ສັນຍາໝົດແລ້ວ — ຕ້ອງຕໍ່ດ່ວນ") };
    else if (contract <= 30) w = { kind: "pending", text: tr(`⚠ Contract ends in ${plural(contract)}`, `⚠ ສັນຍາໝົດໃນ ${plural(contract)}`) };
  }
  if (prob !== null && emp.employment_type === "probation") {
    if (prob < 0) w = { kind: "low", text: tr("⚠ Probation overdue — needs a decision now", "⚠ ໝົດທົດລອງງານແລ້ວ — ຕ້ອງຕັດສິນໃຈດ່ວນ") };
    else if (prob <= 30) w = { kind: "pending", text: tr(`⚠ Probation ends in ${plural(prob)}`, `⚠ ທົດລອງງານໝົດໃນ ${plural(prob)}`) };
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

/** Department names as shown; the API's "Unassigned" group is translated. */
export const deptLabel = (name: string) => (name === "Unassigned" || !name ? tr("Unassigned", "ບໍ່ມີພະແນກ") : name);
