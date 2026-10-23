import type { TKey } from "@/lib/i18n";
import type { HRAccess, HRTab } from "./types";

export type NavGroup = "home" | "people" | "time" | "pay" | "settings";

type NavItem = {
  href: string;
  label: TKey;
  icon: string;
  group: NavGroup;
  /** a granted HR tab, or a capability flag from /hr/me */
  needs: HRTab | "can_approve" | "can_manage_access" | "can_manage_accounts" | "central_access";
};

/** Sidebar sections, in display order. */
export const NAV_GROUPS: { id: NavGroup; label: TKey }[] = [
  { id: "home", label: "ng_home" },
  { id: "people", label: "ng_people" },
  { id: "time", label: "ng_time" },
  { id: "pay", label: "ng_pay" },
  { id: "settings", label: "ng_settings" },
];

/** Every HR screen of prototype v168 plus our additions, grouped for the sidebar. */
export const HR_NAV: NavItem[] = [
  { href: "/hr/dashboard", label: "tb_dashboard", icon: "🏠", group: "home", needs: "directory" },

  { href: "/hr/directory", label: "tb_employee_directory", icon: "👥", group: "people", needs: "directory" },
  { href: "/hr/employee-status", label: "tb_employee_status", icon: "📋", group: "people", needs: "employee_status" },
  { href: "/hr/resigned", label: "tb_resigned", icon: "🚪", group: "people", needs: "resigned" },
  { href: "/hr/years-of-service", label: "tb_years_of_service", icon: "📆", group: "people", needs: "directory" },
  { href: "/hr/org-structure", label: "tb_org_structure", icon: "🏢", group: "people", needs: "org_structure" },
  { href: "/hr/overview", label: "tb_hr_overview", icon: "📊", group: "people", needs: "overview" },

  { href: "/hr/attendance", label: "tb_attendance", icon: "🕘", group: "time", needs: "attendance" },
  { href: "/hr/overtime", label: "tb_overtime", icon: "⏳", group: "time", needs: "overtime" },
  { href: "/hr/cross-help", label: "tb_cross_help", icon: "📞", group: "time", needs: "cross_help" },
  { href: "/hr/cross-help-history", label: "tb_cross_help_history", icon: "🗂️", group: "time", needs: "cross_help" },
  { href: "/hr/manual-hours", label: "tb_manual_hours", icon: "✍️", group: "time", needs: "manual_hours" },
  { href: "/hr/part-time", label: "tb_part_time", icon: "🧑‍🍳", group: "time", needs: "part_time" },
  { href: "/hr/leave", label: "tb_leave_requests", icon: "🌴", group: "time", needs: "leave" },
  { href: "/hr/leave-quota", label: "tb_leave_quota", icon: "📆", group: "time", needs: "leave_quota" },
  { href: "/hr/public-holiday", label: "tb_public_holiday", icon: "🎉", group: "time", needs: "public_holiday" },

  { href: "/hr/payroll", label: "tb_payroll", icon: "💰", group: "pay", needs: "payroll" },
  { href: "/hr/service-charge", label: "tb_service_charge_bonus", icon: "🧾", group: "pay", needs: "service_charge" },
  { href: "/hr/service-charge-manual", label: "tb_sc_manual", icon: "💵", group: "pay", needs: "service_charge" },
  { href: "/hr/bonus-types", label: "tb_bonus_types", icon: "🎁", group: "pay", needs: "bonus_types" },
  { href: "/hr/meal-quota", label: "tb_meal_quota", icon: "🍱", group: "pay", needs: "meal_quota" },
  { href: "/hr/cost-labels", label: "tb_cost_labels", icon: "🏷️", group: "pay", needs: "cost_labels" },

  { href: "/hr/approvals", label: "tb_hr_approvals", icon: "✅", group: "settings", needs: "can_approve" },
  { href: "/hr/approval-history", label: "tb_approval_history", icon: "🗂️", group: "settings", needs: "approval_history" },
  { href: "/hr/approval-rule", label: "tb_approval_rule", icon: "⚖️", group: "settings", needs: "approval_rule" },
  { href: "/hr/work-rules", label: "tb_work_rules", icon: "⏱️", group: "settings", needs: "work_rules" },
  { href: "/hr/accounts", label: "tb_accounts", icon: "👤", group: "settings", needs: "can_manage_accounts" },
  { href: "/hr/access", label: "tb_hr_access", icon: "🔑", group: "settings", needs: "can_manage_access" },
  { href: "/hr/scanners", label: "tb_scanners", icon: "📟", group: "settings", needs: "central_access" },
];

/** True when the path is this screen or a page under it — "/hr/leave" must not match "/hr/leave-quota". */
export const onPage = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/** Roles that land on the HR Overview dashboard after signing in. */
const OVERVIEW_FIRST = ["coo", "ceo"];

/** Where /hr sends the signed-in user: COO/CEO see the overview first, others the dashboard (else their first tab). */
export function homeHref(access: HRAccess, nav: NavItem[]): string {
  if (OVERVIEW_FIRST.includes(access.role) && nav.some((n) => n.href === "/hr/overview")) return "/hr/overview";
  if (nav.some((n) => n.href === "/hr/dashboard")) return "/hr/dashboard";
  return nav[0].href;
}

export function allowedNav(access: HRAccess | undefined): NavItem[] {
  if (!access) return [];
  return HR_NAV.filter((n) =>
    n.needs === "can_approve"
      ? access.can_approve
      : n.needs === "can_manage_access"
        ? access.can_manage_access
        : n.needs === "central_access" // resorts and scanners: central HR only
          ? access.can_manage_access && !access.property
        : n.needs === "can_manage_accounts"
          ? access.can_manage_accounts
          : access.tabs.includes(n.needs),
  );
}
