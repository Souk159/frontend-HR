"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api";
import type {
  Approval,
  Attendance,
  Coordinator,
  DailyHire,
  DailyHireDay,
  Department,
  DeptRules,
  HRAccess,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  OrgBranch,
  Outlet,
  Overview,
  PayrollPreview,
  Property,
  ScAllocation,
  Scanner,
  ServiceChargePool,
  Staff,
  StaffInput,
} from "./types";

/** Query keys — one place so mutations can invalidate precisely. */
export const hrKeys = {
  me: ["hr", "me"] as const,
  departments: ["hr", "departments"] as const,
  staff: (includeResigned = false) => ["hr", "staff", includeResigned] as const,
  properties: ["hr", "properties"] as const,
  outlets: ["hr", "outlets"] as const,
  attendance: (date: string) => ["hr", "attendance", date] as const,
  leaveTypes: ["hr", "leave-types"] as const,
  leaveRequests: ["hr", "leave-requests"] as const,
  leaveQuota: ["hr", "leave-quota"] as const,
  dailyHires: (date: string) => ["hr", "daily-hires", date] as const,
  dailyHireDays: ["hr", "daily-hire-days"] as const,
  approvals: (status: "pending" | "all") => ["hr", "approvals", status] as const,
  approval: (id: string) => ["hr", "approval", id] as const,
  serviceCharge: (month: string) => ["hr", "service-charge", month] as const,
  payroll: (month: string) => ["hr", "payroll", month] as const,
  org: ["hr", "org"] as const,
  overview: ["hr", "overview"] as const,
  coordinators: ["hr", "coordinators"] as const,
  scanners: ["hr", "scanners"] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────
export const useHRAccess = () => useQuery({ queryKey: hrKeys.me, queryFn: () => api.get<HRAccess>("/hr/me") });
export const useDepartments = () =>
  useQuery({ queryKey: hrKeys.departments, queryFn: () => api.get<Department[]>("/hr/departments") });
export const useStaff = (includeResigned = false) =>
  useQuery({
    queryKey: hrKeys.staff(includeResigned),
    queryFn: () => api.get<Staff[]>(`/hr/staff${includeResigned ? "?include_resigned=1" : ""}`),
  });
export const useProperties = () =>
  useQuery({ queryKey: hrKeys.properties, queryFn: () => api.get<Property[]>("/hr/properties"), staleTime: 300_000 });
export const useOutlets = () =>
  useQuery({ queryKey: hrKeys.outlets, queryFn: () => api.get<Outlet[]>("/hr/outlets"), staleTime: 300_000 });
export const useAttendance = (date: string) =>
  useQuery({ queryKey: hrKeys.attendance(date), queryFn: () => api.get<Attendance[]>(`/hr/attendance?date=${date}`) });
export const useLeaveTypes = () =>
  useQuery({ queryKey: hrKeys.leaveTypes, queryFn: () => api.get<LeaveType[]>("/hr/leave-types") });
export const useLeaveRequests = () =>
  useQuery({ queryKey: hrKeys.leaveRequests, queryFn: () => api.get<LeaveRequest[]>("/hr/leave-requests") });
export const useLeaveQuota = () =>
  useQuery({
    queryKey: hrKeys.leaveQuota,
    queryFn: () => api.get<{ leave_types: LeaveType[]; balances: LeaveBalance[] }>("/hr/leave-quota"),
  });
export const useDailyHires = (date: string) =>
  useQuery({
    queryKey: hrKeys.dailyHires(date),
    queryFn: () =>
      api.get<{ hires: DailyHire[]; status: DailyHireDay["status"]; sent_to_accounting: string | null }>(
        `/hr/daily-hires?date=${date}`,
      ),
  });
export const useDailyHireDays = () =>
  useQuery({ queryKey: hrKeys.dailyHireDays, queryFn: () => api.get<DailyHireDay[]>("/hr/daily-hire-days") });
export const useApprovals = (status: "pending" | "all", enabled = true) =>
  useQuery({
    queryKey: hrKeys.approvals(status),
    queryFn: () => api.get<Approval[]>(`/hr/approvals?status=${status}`),
    enabled,
    refetchInterval: status === "pending" ? 60_000 : false,
  });
export const useApprovalDetail = (id: string | null) =>
  useQuery({
    queryKey: hrKeys.approval(id ?? ""),
    queryFn: () => api.get<{ approval: Approval; hires?: DailyHire[] }>(`/hr/approvals/${id}`),
    enabled: !!id,
  });
export const useServiceCharge = (month: string) =>
  useQuery({
    queryKey: hrKeys.serviceCharge(month),
    queryFn: () => api.get<ServiceChargePool>(`/hr/service-charge?month=${month}`),
  });
export const usePayroll = (month: string) =>
  useQuery({ queryKey: hrKeys.payroll(month), queryFn: () => api.get<PayrollPreview>(`/hr/payroll-live?month=${month}`) });
export const useOrg = () => useQuery({ queryKey: hrKeys.org, queryFn: () => api.get<OrgBranch[]>("/hr/org") });
export const useOverview = () => useQuery({ queryKey: hrKeys.overview, queryFn: () => api.get<Overview>("/hr/overview") });
export const useCoordinators = () =>
  useQuery({
    queryKey: hrKeys.coordinators,
    queryFn: () => api.get<{ coordinators: Coordinator[]; available_tabs: string[] }>("/hr/coordinators"),
  });
export const useScanners = () => useQuery({ queryKey: hrKeys.scanners, queryFn: () => api.get<Scanner[]>("/hr/scanners") });

// ── Mutations ────────────────────────────────────────────────────────────────

/** Mutation that refreshes the given query groups (prefix match) on success. */
function useHRMutation<TVars, TRes = unknown>(fn: (v: TVars) => Promise<TRes>, invalidate: QueryKey[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of invalidate) qc.invalidateQueries({ queryKey: key });
    },
  });
}

const APPROVALS: QueryKey = ["hr", "approvals"];
type Accepted = { approval_id: string };
type Created = { requests_created: number };

export const useRequestNewDepartment = () =>
  useHRMutation((body: DeptRules) => api.post<Accepted>("/hr/departments", body), [APPROVALS]);
export const useRequestDepartmentChanges = () =>
  useHRMutation(
    (body: { department_id: string; quota?: number; base_salary?: number }[]) =>
      api.post<Created>("/hr/departments/changes", body),
    [APPROVALS],
  );
export const useRequestWorkRules = () =>
  useHRMutation(
    ({ id, rules }: { id: string; rules: DeptRules }) => api.post<Accepted>(`/hr/departments/${id}/work-rules`, rules),
    [APPROVALS],
  );

export const fetchNextEmployeeNo = () => api.get<{ employee_no: string }>("/hr/staff/next-id");
export const useCreateStaff = () =>
  useHRMutation((body: StaffInput) => api.post<Staff>("/hr/staff", body), [["hr", "staff"], hrKeys.departments, ["hr", "attendance"]]);
export const useRequestStaffChange = () =>
  useHRMutation(({ id, body }: { id: string; body: StaffInput }) => api.put<Accepted>(`/hr/staff/${id}`, body), [APPROVALS]);
export const useRequestResignation = () =>
  useHRMutation((id: string) => api.post<Accepted>(`/hr/staff/${id}/resign`), [APPROVALS]);
export const useRequestMealQuotas = () =>
  useHRMutation(
    (body: { user_id: string; meal_quota: number }[]) => api.post<Created>("/hr/staff/meal-quotas", body),
    [APPROVALS],
  );
/** Profile photo — applies immediately (no approval). */
async function sendPhoto(id: string, file: File) {
  const body = new FormData();
  body.append("photo", file);
  const res = await fetch(`/api/v1/hr/staff/${id}/photo`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Upload failed", res.status);
  return data as { photo_url: string };
}
export const useUploadStaffPhoto = () =>
  useHRMutation(({ id, file }: { id: string; file: File }) => sendPhoto(id, file), [["hr", "staff"], ["hr", "attendance"]]);
export const useDeleteStaffPhoto = () =>
  useHRMutation((id: string) => api.del(`/hr/staff/${id}/photo`), [["hr", "staff"], ["hr", "attendance"]]);

export const useUpdateBenefits = () =>
  useHRMutation(
    ({ id, ...body }: { id: string; benefit_notes?: string; gets_service_charge?: boolean; gets_activities_bonus?: boolean }) =>
      api.patch(`/hr/staff/${id}/benefits`, body),
    [["hr", "staff"], ["hr", "service-charge"], ["hr", "payroll"]],
  );

export const useCreateLeaveType = () =>
  useHRMutation((body: { name: string; default_quota: number }) => api.post<LeaveType>("/hr/leave-types", body), [
    hrKeys.leaveTypes,
    hrKeys.leaveQuota,
  ]);
export const useCreateLeaveRequest = () =>
  useHRMutation(
    (body: { user_id: string; leave_type_id: number; start_date: string; end_date: string; days: number; reason: string }) =>
      api.post<Accepted>("/hr/leave-requests", body),
    [hrKeys.leaveRequests, APPROVALS],
  );
export const useSetCustomLeaveQuota = () =>
  useHRMutation((body: { user_id: string; leave_type_id: number; quota: number }) => api.put("/hr/leave-quota", body), [
    hrKeys.leaveQuota,
  ]);

const PART_TIME: QueryKey[] = [["hr", "daily-hires"], hrKeys.dailyHireDays, ["hr", "payroll"]];
export const useCreateDailyHire = () =>
  useHRMutation(
    (body: { work_date: string; name: string; department_id: string; outlet_id: string | null; price_per_day: number }) =>
      api.post("/hr/daily-hires", body),
    PART_TIME,
  );
export const useUpdateDailyHire = () =>
  useHRMutation(({ id, ...body }: { id: string; name?: string; price_per_day?: number }) => api.patch(`/hr/daily-hires/${id}`, body), PART_TIME);
export const useDeleteDailyHire = () => useHRMutation((id: string) => api.del(`/hr/daily-hires/${id}`), PART_TIME);
export const useDailyHireDayAction = () =>
  useHRMutation(
    ({ date, action }: { date: string; action: "submit" | "unlock" | "send-to-accounting" }) =>
      api.post<{ approval_id?: string; messages_sent?: number }>(`/hr/daily-hire-days/${date}/${action}`),
    [...PART_TIME, APPROVALS],
  );

export const useDecideApproval = () =>
  useHRMutation(
    ({ id, decision }: { id: string; decision: "approved" | "denied" }) => api.post(`/hr/approvals/${id}/decide`, { decision }),
    [["hr"]], // an approval can change almost anything in HR
  );

export const useSaveScAllocation = () =>
  useHRMutation((body: ScAllocation[]) => api.put("/hr/service-charge/allocation", body), [["hr", "service-charge"], ["hr", "payroll"]]);
export const useRequestActivitiesBonus = () =>
  useHRMutation((pct: number) => api.post<Accepted>("/hr/service-charge/activities-bonus", { pct }), [
    ["hr", "service-charge"],
    APPROVALS,
  ]);
export const useSendPayroll = () =>
  useHRMutation((month: string) => api.post<{ messages_sent: number }>("/hr/payroll-live/send-to-accounting", { month }), [
    ["hr", "payroll"],
  ]);

export const useCreateBranch = () => useHRMutation((name: string) => api.post("/hr/org/branches", { name }), [hrKeys.org]);
export const useCreatePosition = () =>
  useHRMutation(
    (body: { branch_id: string; title: string; reports_to_id: string | null; user_id: string | null }) =>
      api.post("/hr/org/positions", body),
    [hrKeys.org],
  );
export const useAssignPosition = () =>
  useHRMutation(({ id, user_id }: { id: string; user_id: string | null }) => api.patch(`/hr/org/positions/${id}`, { user_id }), [
    hrKeys.org,
  ]);
export const useDeletePosition = () => useHRMutation((id: string) => api.del(`/hr/org/positions/${id}`), [hrKeys.org]);

export const useSetCoordinatorTabs = () =>
  useHRMutation(({ id, tabs }: { id: string; tabs: string[] }) => api.put(`/hr/coordinators/${id}/tabs`, { tabs }), [
    hrKeys.coordinators,
  ]);
export const useUpdateScanner = () =>
  useHRMutation(({ id, ...body }: { id: string; property_id: string | null; label?: string }) => api.patch(`/hr/scanners/${id}`, body), [
    hrKeys.scanners,
    ["hr", "attendance"],
  ]);
/** Registers a scanner by serial number (admin / GM / owner), then assigns its property. */
export const useRegisterScanner = () =>
  useHRMutation(
    async ({ serial_no, label, property_id }: { serial_no: string; label: string; property_id: string | null }) => {
      const { id } = await api.post<{ id: string }>("/hr/devices", { serial_no, label });
      if (property_id) await api.patch(`/hr/scanners/${id}`, { property_id, label });
      return id;
    },
    [hrKeys.scanners],
  );
