/** Shapes returned by the Go HR API (backend/internal/handlers/hr). Dates are "YYYY-MM-DD". */

export type HRTab =
  | "directory"
  | "attendance"
  | "leave"
  | "leave_quota"
  | "employee_status"
  | "part_time"
  | "work_rules"
  | "service_charge"
  | "meal_quota"
  | "payroll"
  | "approval_history"
  | "org_structure"
  | "overview"
  | "resigned"
  | "approval_rule"
  | "manual_hours"
  | "cost_labels"
  | "bonus_types"
  | "public_holiday";

export type HRAccess = {
  role: string;
  username: string;
  tabs: HRTab[];
  can_approve: boolean;
  can_manage_access: boolean;
  /** owner / admin / GM: the User Accounts screen */
  can_manage_accounts: boolean;
};

export type Account = {
  id: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  /** the login belongs to this employee in the Directory */
  employee_no: string;
  editable: boolean;
  is_self: boolean;
};

export type PropertyAdmin = { id: string; name: string; is_active: boolean; employees: number; scanners: number };

export type Department = {
  id: string;
  name: string;
  quota: number;
  base_salary: number;
  hours_per_day: number;
  days_per_week: number;
  /** OT over the monthly limit (× hourly) */
  ot_rate: number;
  /** OT over a normal day but inside the monthly limit (× hourly) */
  ot_rate_daily: number;
  annual_leave_quota: number;
  sick_leave_quota: number;
  /** Income Statement group its payroll posts to: Room | F&B | Activity | Other Sales */
  cogs_department: string;
  /** cost message label ("" = department name) */
  cost_label: string;
  filled: number;
};

export type DeptRules = {
  name?: string;
  quota?: number;
  base_salary?: number;
  hours_per_day: number;
  days_per_week: number;
  ot_rate: number;
  ot_rate_daily?: number;
  annual_leave_quota: number;
  sick_leave_quota: number;
};

export type EmploymentType = "permanent" | "probation" | "part_time" | "casual" | "intern";
export type StaffStatus = "active" | "on_leave" | "resigned";

export type Staff = {
  user_id: string;
  employee_no: string;
  full_name: string;
  name_lao: string;
  gender: string;
  date_of_birth: string | null;
  nationality: string;
  national_id: string;
  phone: string;
  email: string;
  address: string;
  hire_date: string | null;
  probation_end_date: string | null;
  contract_start: string | null;
  contract_end: string | null;
  department_id: string | null;
  department: string;
  position: string;
  property_id: string | null;
  property: string;
  employment_type: EmploymentType;
  base_salary: number;
  bank_account: string;
  note: string;
  status: StaffStatus;
  last_salary_change: string | null;
  gets_service_charge: boolean;
  /** full service-charge share whatever the hours worked */
  always_full_service: boolean;
  /** appears on Leave Quota */
  gets_annual_leave: boolean;
  bonus_type_ids: string[];
  resigned_at: string | null;
  final_hours: number | null;
  meal_quota: number;
  meals_used: number;
  benefit_notes: string;
  role: string;
  has_login: boolean;
  scanner_pin: string;
  requires_scan: boolean;
  /** profile photo uploaded by HR ("" = none) */
  photo_url: string;
  /** enrolment photo the scanner sent for this employee's PIN */
  device_photo_url: string;
};

/** Add / Edit employee form body */
export type StaffInput = {
  employee_no: string;
  full_name: string;
  name_lao: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  national_id: string;
  phone: string;
  email: string;
  address: string;
  hire_date: string;
  probation_end_date: string;
  contract_start: string;
  contract_end: string;
  department_id: string | null;
  property_id: string | null;
  position: string;
  employment_type: EmploymentType;
  base_salary: number;
  bank_account: string;
  note: string;
  scanner_pin: string;
  requires_scan: boolean;
  gets_service_charge: boolean;
  always_full_service: boolean;
  gets_annual_leave: boolean;
  bonus_type_ids: string[];
};

export type Property = { id: string; name: string };
export type Outlet = { id: string; name: string; property: string };

export type Attendance = {
  id: string;
  user_id: string;
  full_name: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  overtime_hrs: number;
  note: string;
  photo_url: string;
  position: string;
  check_in_device: string;
  check_out_device: string;
  scan_property_id: string | null;
  scan_property: string;
  home_property_id: string | null;
  home_property: string;
  department_id: string | null;
  department: string;
  at_other_property: boolean;
  /** every face photo taken at a scan that day */
  photos: { url: string; taken_at: string; device: string }[];
  /** HR photo, else the scanner's enrolment photo ("" = none) */
  profile_photo_url: string;
  /** entered in Manual Hours Entry */
  is_manual: boolean;
};

export type LeaveType = { id: number; name: string; default_quota: number; is_paid: boolean; is_holiday: boolean };
export type LeaveRequest = {
  id: string;
  user_id: string;
  employee: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  created_at: string;
};
export type LeaveBalance = {
  user_id: string;
  leave_type_id: number;
  quota: number;
  used: number;
  remaining: number;
};

export type DailyHire = {
  id: string;
  work_date: string;
  name: string;
  department_id: string | null;
  department: string;
  outlet_id: string | null;
  outlet: string;
  price_per_day: number;
  /** reason for hiring */
  comment: string;
};
export type DayStatus = "draft" | "pending" | "approved" | "denied" | "unlocked";
export type DailyHireDay = {
  work_date: string;
  status: DayStatus;
  sent_to_accounting: string | null;
  total: number;
  hires: DailyHire[];
};

export type Approval = {
  id: string;
  type: string;
  target: string;
  old_value: string;
  new_value: string;
  value_format: "text" | "currency" | "number";
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "denied";
  requested_by: string;
  requested_at: string;
  reviewed_by: string;
  reviewed_at: string | null;
  /** roles from the Approval Rule when the request was made */
  required_roles: string[];
  mode: ApprovalMode;
  /** roles that already approved ("all" mode) */
  approvals: { role: string; by: string; at: string }[];
  /** the signed-in user may approve / deny it now */
  can_decide: boolean;
};

export type ApprovalMode = "any" | "all" | "none";
export type ApprovalRule = { type: string; label: string; roles: string[]; mode: ApprovalMode };

/** Response of a change request: applied = the rule needs no approval, already done. */
export type Accepted = { approval_id: string; applied: boolean };
export type Created = { requests_created: number; applied: number };

export type ScAllocation = { label: string; pct: number; is_staff_pool: boolean };
export type ServiceChargePool = {
  month: string;
  total_service_charge: number;
  staff_pool_pct: number;
  staff_pool: number;
  service_eligible: number;
  /** employees marked "always full service charge" */
  full_share_count: number;
  /** full share per eligible employee (pool ÷ eligible) */
  service_share: number;
  allocation: ScAllocation[];
};

export type OrgSettings = {
  salary_calc_days: number;
  deduction_unit: "hours" | "minutes";
  ot_unit: "hours" | "minutes";
  ot_basis: "monthly" | "weekly";
};

export type MonthStatus = {
  month: string;
  status: "open" | "pending" | "approved" | "closed";
  approved_at: string | null;
  closed_at: string | null;
  sent_at: string | null;
  submit_pending: boolean;
  close_pending: boolean;
};

export type BonusLine = { name: string; amount: number };
export type PayrollRow = {
  user_id: string;
  employee_no: string;
  name: string;
  position: string;
  base_salary: number;
  hourly_rate: number;
  hours_worked: number;
  leave_days: number;
  /** hours worked + leave days × hours/day */
  effective_hours: number;
  /** pro-rated while the month runs (and for new hires) */
  required_hours: number;
  /** hours/day × days/week × 4 */
  month_hours: number;
  requires_scan: boolean;
  /** must scan but nothing scanned → HR should check */
  no_scans: boolean;
  half_days: number;
  /** month total set in Manual Hours Entry */
  manual_hours: boolean;
  short_hours: number;
  deduction: number;
  /** OT over the limit */
  ot_hours: number;
  /** OT within the day */
  ot_hours_daily: number;
  ot_pay: number;
  service_charge: number;
  quota_bonus: number;
  /** bonus types + public holiday payouts */
  bonuses: BonusLine[];
  other_bonuses: number;
  net: number;
};
export type PayrollDept = {
  id: string | null;
  name: string;
  hours_per_day: number;
  days_per_week: number;
  cogs_department: string;
  cost_label: string;
  rows: PayrollRow[];
  total: number;
};
export type PayrollPreview = {
  month: string;
  as_of: string;
  in_progress: boolean;
  need_review: number;
  settings: OrgSettings;
  status: MonthStatus;
  /** figures saved when the month was closed (not recalculated) */
  closed_snapshot: boolean;
  departments: PayrollDept[];
  grand_total: number;
};

export type FinalPayRow = {
  user_id: string;
  employee_no: string;
  name: string;
  department: string;
  position: string;
  base_salary: number;
  resigned_at: string | null;
  /** final hours entered by HR at resignation (else counted from scans) */
  hours_entered: boolean;
  hours: number;
  month_hours: number;
  hourly_rate: number;
  base_pay: number;
  ot_pay: number;
  net: number;
};

export type BonusKind = "flat" | "percent" | "target";
export type BonusType = {
  id: string;
  name: string;
  kind: BonusKind;
  amount: number;
  pct: number;
  revenue_outlet_id: string | null;
  revenue_outlet: string;
  target_scope: "" | "cogs" | "overhead";
  cost_group: string;
  cost_line: string;
  target_pct: number;
  target_amount: number;
  share_pct: number;
  /** percent / target: pool before the split this month (null = flat) */
  pool: number | null;
  /** target: actual % (cogs) or ₭ (overhead) this month; null = no data yet */
  actual: number | null;
  revenue: number;
  employee_ids: string[];
};
export type CostLines = { groups: string[]; lines: { cost_type: "cogs" | "overhead"; group: string; line: string }[] };

export type PublicHoliday = {
  id: string;
  name: string;
  days: number;
  valid_from: string;
  valid_to: string;
  leave_type_id: number;
  window: "upcoming" | "open" | "closed";
  paid_out_month: string | null;
  paid_out_at: string | null;
  payout_pending: boolean;
  unused_count: number;
  unused_value: number;
};

export type ManualHours = {
  month: string;
  closed: boolean;
  employees: {
    user_id: string;
    name: string;
    department: string;
    hours_worked: number;
    ot_hours: number;
    ot_hours_daily: number;
    manual: boolean;
  }[];
  log: {
    id: string;
    created_at: string;
    employee: string;
    month: string;
    kind: "day" | "total";
    old_summary: string;
    new_summary: string;
    reason: string;
    created_by: string;
  }[];
};

export type OrgPosition = {
  id: string;
  branch_id: string;
  title: string;
  reports_to_id: string | null;
  user_id: string | null;
  employee: string | null;
};
export type OrgBranch = { id: string; name: string; positions: OrgPosition[] };

export type Overview = {
  total_employees: number;
  resignations: number;
  turnover_rate: number;
  total_openings: number;
  openings: { department: string; quota: number; filled: number; openings: number }[];
};

export type Coordinator = { user_id: string; full_name: string; username: string; tabs: string[] };

export type Scanner = {
  id: string;
  serial_no: string;
  label: string;
  property_id: string | null;
  property: string;
  linked_pins: number;
  last_scan: string | null;
};
