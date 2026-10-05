"use client";

import { useState } from "react";
import { DataState, Field, Lede, SectionHead, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useAssignPosition, useCreateBranch, useCreatePosition, useDeletePosition, useOrg, useStaff } from "@/features/hr/api";
import type { OrgBranch, OrgPosition } from "@/features/hr/types";

export default function OrgStructurePage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const org = useOrg();
  const createBranch = useCreateBranch();
  const [name, setName] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const branch = org.data?.find((b) => b.id === active) ?? org.data?.[0];

  async function addBranch() {
    if (!name.trim()) return dialogs.error("Missing name", new Error("Enter a branch name first."));
    try {
      await createBranch.mutateAsync(name.trim());
      dialogs.success("Branch created", `"${name}" now has its own page in Organization Structure.`);
      setName("");
    } catch (err) {
      dialogs.error("Could not create branch", err);
    }
  }

  return (
    <div className="subview">
      <SectionHead title={t("sh_org_structure")} />
      <Lede>Each branch has its own page. Add positions starting from the top (CEO, then COO) and build down from there.</Lede>
      <div className="land-row">
        <Field label="New branch name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yorlapa Spa" />
        </Field>
        <button type="button" className="add-line-btn" onClick={addBranch} disabled={createBranch.isPending}>
          + Create branch
        </button>
      </div>
      <DataState loading={org.isLoading} error={org.error}>
        <div className="todo-tabs">
          {org.data?.map((b) => (
            <button type="button" key={b.id} className={b.id === branch?.id ? "active" : ""} onClick={() => setActive(b.id)}>
              {b.name}
            </button>
          ))}
        </div>
        {branch ? <BranchPage branch={branch} /> : <p className="empty">No branch yet — create one above.</p>}
      </DataState>
    </div>
  );
}

function BranchPage({ branch }: { branch: OrgBranch }) {
  const dialogs = useDialogs();
  const create = useCreatePosition();
  const [title, setTitle] = useState("");
  const [reportsTo, setReportsTo] = useState("");
  const top = branch.positions.filter((p) => !p.reports_to_id);

  async function add() {
    if (!title.trim()) return dialogs.error("Missing title", new Error("Enter a position title first."));
    try {
      await create.mutateAsync({ branch_id: branch.id, title: title.trim(), reports_to_id: reportsTo || null, user_id: null });
      setTitle("");
    } catch (err) {
      dialogs.error("Could not add position", err);
    }
  }

  return (
    <>
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ fontSize: 14 }}>{branch.name} — org chart</h3>
        {top.length === 0 ? (
          <p className="empty">No positions yet — start by adding CEO with no &quot;reports to&quot;.</p>
        ) : (
          top.map((p) => <Node key={p.id} pos={p} all={branch.positions} depth={0} />)
        )}
      </div>
      <div className="card">
        <h3 style={{ fontSize: 13 }}>Add position</h3>
        <div className="land-row">
          <Field label="Position title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CEO" />
          </Field>
          <Field label="Reports to">
            <select value={reportsTo} onChange={(e) => setReportsTo(e.target.value)}>
              <option value="">— Top level (e.g. CEO) —</option>
              {branch.positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
          <button type="button" className="add-line-btn" onClick={add} disabled={create.isPending}>
            + Add position
          </button>
        </div>
      </div>
    </>
  );
}

function Node({ pos, all, depth }: { pos: OrgPosition; all: OrgPosition[]; depth: number }) {
  const staff = useStaff();
  const assign = useAssignPosition();
  const del = useDeletePosition();
  const dialogs = useDialogs();
  const children = all.filter((p) => p.reports_to_id === pos.id);
  return (
    <>
      <div className={`org-node${depth > 0 ? " child" : ""}`} style={{ marginLeft: depth * 22, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b>{pos.title}</b>
        <select
          className="inline-input"
          value={pos.user_id ?? ""}
          onChange={(e) => assign.mutateAsync({ id: pos.id, user_id: e.target.value || null }).catch((err) => dialogs.error("Could not assign", err))}
        >
          <option value="">(vacant)</option>
          {staff.data?.map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.full_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="mini-btn flag"
          onClick={() => window.confirm(`Remove position "${pos.title}"? Positions under it move up one level.`) && del.mutateAsync(pos.id).catch((err) => dialogs.error("Could not remove", err))}
        >
          ✕
        </button>
      </div>
      {children.map((c) => (
        <Node key={c.id} pos={c} all={all} depth={depth + 1} />
      ))}
    </>
  );
}
