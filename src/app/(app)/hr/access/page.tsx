"use client";

import { useState } from "react";
import { DataState, EmptyRow, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang, type TKey } from "@/lib/i18n";
import { useCoordinators, useSetCoordinatorTabs } from "@/features/hr/api";
import type { Coordinator } from "@/features/hr/types";

const TAB_LABEL: Record<string, TKey> = {
  directory: "tb_employee_directory",
  attendance: "tb_attendance",
  leave: "tb_leave_requests",
  leave_quota: "tb_leave_quota",
  employee_status: "tb_employee_status",
  part_time: "tb_part_time",
};

/** Prototype screen-managehraccess */
export default function ManageHRAccessPage() {
  const { t } = useLang();
  const co = useCoordinators();
  const tabs = co.data?.available_tabs ?? [];
  return (
    <div className="dash-wrap">
      <SectionHead title={t("sh_hr_coord_permissions")} />
      <Lede>
        Decide which specific HR tabs each coordinator can reach. Payroll, Approvals, and Manage HR Access itself are never available to a
        Coordinator, regardless of what&apos;s checked here — only the HR Manager and above can touch those.
      </Lede>
      <DataState loading={co.isLoading} error={co.error}>
        <Table head={["Coordinator", ...tabs.map((x) => t(TAB_LABEL[x] ?? "tb_employee_directory")), ""]}>
          {(co.data?.coordinators ?? []).length === 0 && (
            <EmptyRow cols={tabs.length + 2}>No HR Coordinator accounts yet.</EmptyRow>
          )}
          {co.data?.coordinators.map((c) => (
            // key includes saved tabs so the row resets after a save / refetch
            <CoordinatorRow key={`${c.user_id}:${c.tabs.join(",")}`} co={c} tabs={tabs} />
          ))}
        </Table>
      </DataState>
      <Lede>New coordinator accounts are created by Admin with the &quot;HR Coordinator&quot; role (hr_coordinator), then given access here.</Lede>
    </div>
  );
}

function CoordinatorRow({ co, tabs }: { co: Coordinator; tabs: string[] }) {
  const dialogs = useDialogs();
  const save = useSetCoordinatorTabs();
  const [checked, setChecked] = useState<Set<string>>(() => new Set(co.tabs));

  async function submit() {
    try {
      await save.mutateAsync({ id: co.user_id, tabs: [...checked] });
      dialogs.success("Access updated", `${co.full_name} can now reach: ${[...checked].join(", ") || "nothing yet"}.`);
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }

  return (
    <tr>
      <td>
        {co.full_name}
        <div className="hint">{co.username}</div>
      </td>
      {tabs.map((tab) => (
        <td key={tab} style={{ textAlign: "center" }}>
          <input
            type="checkbox"
            checked={checked.has(tab)}
            onChange={(e) => {
              const next = new Set(checked);
              if (e.target.checked) next.add(tab);
              else next.delete(tab);
              setChecked(next);
            }}
          />
        </td>
      ))}
      <td>
        <button type="button" className="mini-btn" onClick={submit} disabled={save.isPending}>
          Save
        </button>
      </td>
    </tr>
  );
}
