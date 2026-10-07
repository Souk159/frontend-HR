"use client";

import { Fragment, useState } from "react";
import { DataState, Lede, SectionHead, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { num } from "@/lib/format";
import { useLeaveQuota, useSetCustomLeaveQuota, useStaff } from "@/features/hr/api";
import type { LeaveBalance } from "@/features/hr/types";

const BUILT_IN = ["Annual leave", "Sick leave"];

export default function LeaveQuotaPage() {
  const { t } = useLang();
  const quota = useLeaveQuota();
  const staff = useStaff();
  const types = quota.data?.leave_types ?? [];
  const bal = new Map((quota.data?.balances ?? []).map((b) => [`${b.user_id}:${b.leave_type_id}`, b]));
  // only employees with "Gets annual leave quota" ticked are returned (prototype v168)
  const listed = new Set((quota.data?.balances ?? []).map((b) => b.user_id));

  return (
    <div className="subview">
      <SectionHead title={t("sh_leave_quota")} />
      <Lede>
        Leave remaining for each employee this year. Annual and sick quotas come from the department&apos;s Work Rules; custom leave types
        and public holidays can be set per person here. Only employees with &quot;Gets annual leave quota&quot; ticked in their profile
        appear — tick it there to grant someone a leave quota.
      </Lede>
      <DataState loading={quota.isLoading || staff.isLoading} error={quota.error || staff.error}>
        <div className="table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                {types.map((lt) => (
                  <Fragment key={lt.id}>
                    <th>{lt.name} quota</th>
                    <th>Used</th>
                    <th>Remaining</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.data?.filter((e) => listed.has(e.user_id)).map((e) => (
                <tr key={e.user_id}>
                  <td>{e.full_name}</td>
                  <td>{e.department || "—"}</td>
                  {types.map((lt) => {
                    const b = bal.get(`${e.user_id}:${lt.id}`);
                    return (
                      <Fragment key={lt.id}>
                        <td className="mono">
                          {BUILT_IN.includes(lt.name) || !b ? num(b?.quota ?? 0) : <QuotaInput balance={b} />}
                        </td>
                        <td className="mono">{num(b?.used ?? 0)}</td>
                        <td className={`mono ${b && b.remaining === 0 ? "c-clay bold" : ""}`}>{num(b?.remaining ?? 0)}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </div>
  );
}

function QuotaInput({ balance }: { balance: LeaveBalance }) {
  const [v, setV] = useState(String(balance.quota));
  const save = useSetCustomLeaveQuota();
  const dialogs = useDialogs();
  return (
    <input
      className="inline-input"
      style={{ width: 56, textAlign: "center" }}
      value={v}
      onChange={(e) => setV(e.target.value.replace(/\D/g, ""))}
      onBlur={() =>
        Number(v) !== balance.quota &&
        save
          .mutateAsync({ user_id: balance.user_id, leave_type_id: balance.leave_type_id, quota: Number(v) || 0 })
          .catch((err) => dialogs.error("Could not save quota", err))
      }
    />
  );
}
