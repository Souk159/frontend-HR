"use client";

import { useState } from "react";
import { DataState, Field, Lede, SectionHead, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
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
    if (!name.trim()) return dialogs.error(tr("Missing name", "ຂາດຊື່"), new Error(tr("Enter a branch name first.", "ໃສ່ຊື່ສາຂາກ່ອນ.")));
    try {
      await createBranch.mutateAsync(name.trim());
      dialogs.success(tr("Branch created", "ສ້າງສາຂາແລ້ວ"), tr(`"${name}" now has its own page in Organization Structure.`, `"${name}" ມີໜ້າຂອງຕົນເອງ ໃນ ໂຄງສ້າງອົງກອນ ແລ້ວ.`));
      setName("");
    } catch (err) {
      dialogs.error(tr("Could not create branch", "ສ້າງສາຂາບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="subview">
      <SectionHead title={t("sh_org_structure")} />
      <Lede>{tr("Each branch has its own page. Add positions starting from the top (CEO, then COO) and build down from there.", "ແຕ່ລະສາຂາມີໜ້າຂອງຕົນ. ເພີ່ມຕຳແໜ່ງຈາກເທິງລົງລຸ່ມ (CEO, ແລ້ວ COO, ...).")}</Lede>
      <div className="land-row">
        <Field label={tr("New branch name", "ຊື່ສາຂາໃໝ່")}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("e.g. Yorlapa Spa", "ເຊັ່ນ Yorlapa Spa")} />
        </Field>
        <button type="button" className="add-line-btn" onClick={addBranch} disabled={createBranch.isPending}>
          {tr("+ Create branch", "+ ສ້າງສາຂາ")}
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
        {branch ? <BranchPage branch={branch} /> : <p className="empty">{tr("No branch yet — create one above.", "ຍັງບໍ່ມີສາຂາ — ສ້າງຢູ່ເທິງ.")}</p>}
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
    if (!title.trim()) return dialogs.error(tr("Missing title", "ຂາດຊື່ຕຳແໜ່ງ"), new Error(tr("Enter a position title first.", "ໃສ່ຊື່ຕຳແໜ່ງກ່ອນ.")));
    try {
      await create.mutateAsync({ branch_id: branch.id, title: title.trim(), reports_to_id: reportsTo || null, user_id: null });
      setTitle("");
    } catch (err) {
      dialogs.error(tr("Could not add position", "ເພີ່ມຕຳແໜ່ງບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ fontSize: 14 }}>{branch.name} — {tr("org chart", "ແຜນຜັງອົງກອນ")}</h3>
        {top.length === 0 ? (
          <p className="empty">{tr("No positions yet — start by adding CEO with no \"reports to\".", "ຍັງບໍ່ມີຕຳແໜ່ງ — ເລີ່ມຈາກ CEO (ບໍ່ຕ້ອງເລືອກ \"ລາຍງານຫາ\").")}</p>
        ) : (
          top.map((p) => <Node key={p.id} pos={p} all={branch.positions} depth={0} />)
        )}
      </div>
      <div className="card">
        <h3 style={{ fontSize: 13 }}>{tr("Add position", "ເພີ່ມຕຳແໜ່ງ")}</h3>
        <div className="land-row">
          <Field label={tr("Position title", "ຊື່ຕຳແໜ່ງ")}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("e.g. CEO", "ເຊັ່ນ CEO")} />
          </Field>
          <Field label={tr("Reports to", "ລາຍງານຫາ")}>
            <select value={reportsTo} onChange={(e) => setReportsTo(e.target.value)}>
              <option value="">{tr("— Top level (e.g. CEO) —", "— ຂັ້ນສູງສຸດ (ເຊັ່ນ CEO) —")}</option>
              {branch.positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
          <button type="button" className="add-line-btn" onClick={add} disabled={create.isPending}>
            {tr("+ Add position", "+ ເພີ່ມຕຳແໜ່ງ")}
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
          onChange={(e) => assign.mutateAsync({ id: pos.id, user_id: e.target.value || null }).catch((err) => dialogs.error(tr("Could not assign", "ມອບໝາຍບໍ່ສຳເລັດ"), err))}
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
          onClick={() => window.confirm(tr(`Remove position "${pos.title}"? Positions under it move up one level.`, `ລຶບຕຳແໜ່ງ "${pos.title}"? ຕຳແໜ່ງທີ່ຢູ່ລຸ່ມ ຈະຍ້າຍຂຶ້ນໜຶ່ງຂັ້ນ.`)) && del.mutateAsync(pos.id).catch((err) => dialogs.error(tr("Could not remove", "ລົບບໍ່ສຳເລັດ"), err))}
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
