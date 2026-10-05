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
  | "overview";

export type HRAccess = {
  role: string;
  username: string;
  tabs: HRTab[];
  can_approve: boolean;
  can_manage_access: boolean;
};

export type Department = {
  id: string;
  name: string;
  quota: number;
  base_salary: number;
  hours_per_day: number;
  days_per_week: number;
  ot_rate: number;
  annual_leave_quota: number;
  sick_leave_quota: number;
  cogs_department: string;
  /** weekdays a rest day may NOT be taken (0 = Sunday … 6 = Saturday) */
  no_rest_weekdays: number[];
  filled: number;
};

export type DeptRules = {
  name?: string;
  quota?: number;
  base_salary?: number;
  hours_per_day: number;
  days_per_week: number;
  ot_rate: number;
  annual_leave_quota: number;
  sick_leave_quota: number;
  no_rest_weekdays?: number[];
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
  gets_activities_bonus: boolean;
  meal_quota: number;
  meals_used: number;
  benefit_notes: string;
  role: string;
  has_login: boolean;
  scanner_pin: string;
  requires_scan: boolean;
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
};

export type LeaveType = { id: number; name: string; default_quota: number; is_paid: boolean };
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
};

export type ScAllocation = { label: string; pct: number; is_staff_pool: boolean };
export type ServiceChargePool = {
  month: string;
  total_service_charge: number;
  staff_pool_pct: number;
  staff_pool: number;
  service_eligible: number;
  service_share: number;
  activities_revenue: number;
  activities_bonus_pct: number;
  activities_pool: number;
  activities_eligible: number;
  activities_share: number;
  allocation: ScAllocation[];
  pending_activities_bonus: string | null;
};

export type PayrollRow = {
  user_id: string;
  name: string;
  base_salary: number;
  hours_worked: number;
  /** hours expected so far this month (pro-rated, leave excluded) */
  required_hours: number;
  requires_scan: boolean;
  /** must scan but nothing scanned → HR should check */
  no_scans: boolean;
  half_days: number;
  leave_days: number;
  rest_days: number;
  absent_days: number;
  deduction: number;
  ot_hours: number;
  ot_pay: number;
  service_charge: number;
  quota_bonus: number;
  activities_bonus: number;
  net: number;
};
export type PayrollDept = {
  id: string | null;
  name: string;
  hours_per_day: number;
  days_per_week: number;
  rows: PayrollRow[];
  total: number;
};
export type PayrollPreview = {
  month: string;
  as_of: string;
  in_progress: boolean;
  need_review: number;
  departments: PayrollDept[];
  grand_total: number;
  sent_at: string | null;
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
