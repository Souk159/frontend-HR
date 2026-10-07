"use client";

import { useState } from "react";
import { DataState, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useCostLines, useDepartments, useRequestCostLabels } from "@/features/hr/api";
import type { Department } from "@/features/hr/types";
import { requestOutcome } from "@/features/hr/utils";

const GROUP_NAMES: Record<string, string> = {
  Room: "Cost of Goods Sold — Room",
  "F&B": "Cost of Goods Sold — F&B",
  Activity: "Activity Cost",
  "Other Sales": "Cost of Other Sales",
};

/** Prototype v168 hr-costlabel: which Income Statement group each department's payroll posts to. */
export default function CostLabelsPage() {
  const { t } = useLang();
  const depts = useDepartments();
  const lines = useCostLines();
  return (
    <div className="subview">
      <SectionHead title={t("sh_cost_labels")} />
      <Lede>
        Pick which Income Statement group each department&apos;s payroll posts to as a &quot;Salaries&quot; line — e.g. Front Office and
        Housekeeping can both point to &quot;Room&quot;, so they land together as one combined Salaries line under Cost of Goods Sold — Room.
        Departments sharing the same label AND group are combined into one cost message when payroll is sent. Changes only affect what&apos;s
        sent from now on.
      </Lede>
      <DataState loading={depts.isLoading || lines.isLoading} error={depts.error || lines.error}>
        {depts.data && (
          <LabelsTable key={JSON.stringify(depts.data.map((d) => [d.id, d.cost_label, d.cogs_department]))} depts={depts.data} groups={lines.data?.groups ?? Object.keys(GROUP_NAMES)} />
        )}
      </DataState>
    </div>
  );
}

function LabelsTable({ depts, groups }: { depts: Department[]; groups: string[] }) {
  const dialogs = useDialogs();
  const save = useRequestCostLabels();
  const initial = Object.fromEntries(depts.map((d) => [d.id, { label: d.cost_label || d.name, group: d.cogs_department || "F&B" }]));
  const [draft, setDraft] = useState(initial);
  const changed = depts.filter((d) => draft[d.id].label.trim() !== initial[d.id].label || draft[d.id].group !== initial[d.id].group);

  async function submit() {
    try {
      const res = await save.mutateAsync(changed.map((d) => ({ department_id: d.id, label: draft[d.id].label.trim(), group: draft[d.id].group })));
      dialogs.success(...requestOutcome(res, "The cost label change"));
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }

  // preview: which cost messages payroll will send
  const combined = new Map<string, string[]>();
  for (const d of depts) {
    const key = `${draft[d.id].label.trim() || d.name} → Salaries — ${GROUP_NAMES[draft[d.id].group] ?? draft[d.id].group}`;
    combined.set(key, [...(combined.get(key) ?? []), d.name]);
  }

  return (
    <>
      <Table head={["Department", "Cost message label", "Income Statement group", "Posts as"]}>
        {depts.map((d) => (
          <tr key={d.id}>
            <td>{d.name}</td>
            <td>
              <input
                className="inline-input"
                value={draft[d.id].label}
                placeholder="e.g. Room Cost"
                onChange={(e) => setDraft({ ...draft, [d.id]: { ...draft[d.id], label: e.target.value } })}
              />
            </td>
            <td>
              <select className="inline-input" value={draft[d.id].group} onChange={(e) => setDraft({ ...draft, [d.id]: { ...draft[d.id], group: e.target.value } })}>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {GROUP_NAMES[g] ?? g}
                  </option>
                ))}
              </select>
            </td>
            <td className="mono" style={{ fontSize: 11 }}>
              Salaries — {GROUP_NAMES[draft[d.id].group] ?? draft[d.id].group}
            </td>
          </tr>
        ))}
      </Table>
      <button type="button" className="submit-btn" style={{ marginTop: 10 }} onClick={submit} disabled={changed.length === 0 || save.isPending}>
        💾 Save labels
      </button>
      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 13 }}>Payroll will be sent as {combined.size} cost message{combined.size === 1 ? "" : "s"}</h3>
        {[...combined.entries()].map(([k, names]) => (
          <div className="stat-row" key={k}>
            <span>{k}</span>
            <b style={{ fontSize: 11 }}>{names.join(" + ")}</b>
          </div>
        ))}
      </div>
    </>
  );
}
