import type { TKey } from "@/lib/i18n";
import type { HRAccess, HRTab } from "./types";

type NavItem = {
  href: string;
  label: TKey;
  /** a granted HR tab, or a capability flag from /hr/me */
  needs: HRTab | "can_approve" | "can_manage_access";
};

/** Tab order follows the prototype's HR screen (v168). The last three were separate screens there. */
export const HR_NAV: NavItem[] = [
  { href: "/hr/directory", label: "tb_employee_directory", needs: "directory" },
  { href: "/hr/part-time", label: "tb_part_time", needs: "part_time" },
  { href: "/hr/attendance", label: "tb_attendance", needs: "attendance" },
  { href: "/hr/leave", label: "tb_leave_requests", needs: "leave" },
  { href: "/hr/employee-status", label: "tb_employee_status", needs: "employee_status" },
  { href: "/hr/resigned", label: "tb_resigned", needs: "resigned" },
  { href: "/hr/leave-quota", label: "tb_leave_quota", needs: "leave_quota" },
  { href: "/hr/work-rules", label: "tb_work_rules", needs: "work_rules" },
  { href: "/hr/approval-rule", label: "tb_approval_rule", needs: "approval_rule" },
  { href: "/hr/manual-hours", label: "tb_manual_hours", needs: "manual_hours" },
  { href: "/hr/cost-labels", label: "tb_cost_labels", needs: "cost_labels" },
  { href: "/hr/bonus-types", label: "tb_bonus_types", needs: "bonus_types" },
  { href: "/hr/public-holiday", label: "tb_public_holiday", needs: "public_holiday" },
  { href: "/hr/service-charge", label: "tb_service_charge_bonus", needs: "service_charge" },
  { href: "/hr/meal-quota", label: "tb_meal_quota", needs: "meal_quota" },
  { href: "/hr/payroll", label: "tb_payroll", needs: "payroll" },
  { href: "/hr/approval-history", label: "tb_approval_history", needs: "approval_history" },
  { href: "/hr/org-structure", label: "tb_org_structure", needs: "org_structure" },
  { href: "/hr/overview", label: "tb_hr_overview", needs: "overview" },
  { href: "/hr/approvals", label: "tb_hr_approvals", needs: "can_approve" },
  { href: "/hr/access", label: "tb_hr_access", needs: "can_manage_access" },
  { href: "/hr/scanners", label: "tb_scanners", needs: "can_manage_access" },
];

export function allowedNav(access: HRAccess | undefined): NavItem[] {
  if (!access) return [];
  return HR_NAV.filter((n) =>
    n.needs === "can_approve"
      ? access.can_approve
      : n.needs === "can_manage_access"
        ? access.can_manage_access
        : access.tabs.includes(n.needs),
  );
}
