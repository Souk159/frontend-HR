"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, Modal, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtMonth, lak, num, thisMonth } from "@/lib/format";
import {
  useBonusTypes,
  useCostLines,
  useCreateBonusType,
  useDeleteBonusType,
  useOutlets,
  useUpdateBonusType,
  type BonusTypeInput,
} from "@/features/hr/api";
import type { BonusKind, BonusType } from "@/features/hr/types";

/** Prototype v168 hr-bonustypes — replaces the activities bonus. */
export default function BonusTypesPage() {
  const { t } = useLang();
  const [month, setMonth] = useState(thisMonth());
  const list = useBonusTypes(month);
  const [editing, setEditing] = useState<BonusType | null>(null);
  return (
    <div className="subview">
      <SectionHead title={t("sh_bonus_types")} />
      <Lede>
        {tr("Create a bonus — a flat amount, a percentage of a revenue stream, or a team cost target. Every bonus appears as an unticked box in each employee's profile (Employee Directory → Edit); HR must tick it per person before it's included in Payroll. Percentage and target bonuses are pooled and split evenly across everyone ticked for that bonus.", "ສ້າງໂບນັດ — ຈຳນວນຄົງທີ່, % ຂອງລາຍຮັບ, ຫຼື ເປົ້າໝາຍຕົ້ນທຶນຂອງທີມ. ທຸກໂບນັດຈະເປັນຊ່ອງ tick ໃນໂປຣໄຟລ໌ພະນັກງານ (ສາລະບານພະນັກງານ → ແກ້ໄຂ); HR ຕ້ອງ tick ໃຫ້ແຕ່ລະຄົນ ຈຶ່ງເຂົ້າໃນເງິນເດືອນ. ໂບນັດແບບ % ແລະ ເປົ້າໝາຍ ລວມເປັນກ້ອນ ແລ້ວແບ່ງເທົ່າກັນໃຫ້ທຸກຄົນທີ່ tick.")}
      </Lede>
      <BonusForm />
      <Field label={tr("Show pools for", "ສະແດງຍອດຂອງເດືອນ")} style={{ maxWidth: 220 }}>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </Field>
      <DataState loading={list.isLoading} error={list.error}>
        <Table head={[tr("Bonus name", "ຊື່ໂບນັດ"), tr("Kind / rule", "ແບບ / ກົດ"), `Pool — ${fmtMonth(month)}`, tr("Employees ticked", "ຈຳນວນຄົນທີ່ tick"), ""]}>
          {(list.data ?? []).length === 0 && <EmptyRow cols={5}>{tr("No bonus types created yet.", "ຍັງບໍ່ມີປະເພດໂບນັດ.")}</EmptyRow>}
          {list.data?.map((b) => (
            <BonusRow key={b.id} b={b} onEdit={() => setEditing(b)} />
          ))}
        </Table>
      </DataState>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Edit bonus — ${editing?.name ?? ""}`} wide>
        {editing && <BonusForm key={editing.id} editing={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

function describeBonus(b: BonusType): string {
  const share = b.share_pct !== 100 ? tr(` (${num(b.share_pct)}% of the saving)`, ` (${num(b.share_pct)}% ຂອງເງິນທີ່ປະຢັດ)`) : tr(" (all of the saving)", " (ເງິນທີ່ປະຢັດທັງໝົດ)");
  const even = tr(", split evenly", ", ແບ່ງເທົ່າກັນ");
  switch (b.kind) {
    case "percent":
      return tr(`${num(b.pct)}% of ${b.revenue_outlet || "—"} revenue`, `${num(b.pct)}% ຂອງລາຍຮັບ ${b.revenue_outlet || "—"}`) + even;
    case "target":
      return b.target_scope === "overhead"
        ? tr(`Overhead "${b.cost_line}" under ${lak(b.target_amount)}`, `ຄ່າໃຊ້ຈ່າຍ "${b.cost_line}" ຕ່ຳກວ່າ ${lak(b.target_amount)}`) + share + even
        : tr(`${b.cost_group} "${b.cost_line}" under ${num(b.target_pct)}% of revenue`, `${b.cost_group} "${b.cost_line}" ຕ່ຳກວ່າ ${num(b.target_pct)}% ຂອງລາຍຮັບ`) + share + even;
    default:
      return tr(`${lak(b.amount)} flat, per employee`, `${lak(b.amount)} ຄົງທີ່ ຕໍ່ຄົນ`);
  }
}

function BonusRow({ b, onEdit }: { b: BonusType; onEdit: () => void }) {
  const dialogs = useDialogs();
  const del = useDeleteBonusType();
  const count = b.employee_ids.length;

  async function remove() {
    if (!window.confirm(tr(`Delete "${b.name}"? It is removed from every employee who had it ticked, and from Payroll.`, `ລຶບ "${b.name}"? ຈະຖືກເອົາອອກຈາກທຸກຄົນທີ່ tick ໄວ້ ແລະ ຈາກເງິນເດືອນ.`))) return;
    try {
      await del.mutateAsync(b.id);
    } catch (err) {
      dialogs.error(tr("Could not delete", "ລົບບໍ່ສຳເລັດ"), err);
    }
  }

  let pool: React.ReactNode = tr(`${lak(b.amount)} each`, `ຄົນລະ ${lak(b.amount)}`);
  if (b.pool !== null) {
    pool = (
      <>
        {tr(`${lak(b.pool)} pool ÷ ${count}`, `ກ້ອນ ${lak(b.pool)} ÷ ${count}`)}
        {count > 0 && b.pool > 0 && <div className="hint">= {tr(`${lak(Math.round(b.pool / count))} each`, `ຄົນລະ ${lak(Math.round(b.pool / count))}`)}</div>}
        {b.kind === "target" && (
          <div className="hint">
            {b.actual === null
              ? tr("No cost recorded this month yet", "ເດືອນນີ້ຍັງບໍ່ມີຕົ້ນທຶນ")
              : b.target_scope === "overhead"
                ? tr(`Actual ${lak(b.actual)}`, `ແທ້ ${lak(b.actual)}`)
                : tr(`Actual ${num(b.actual)}% of ${lak(b.revenue)} revenue`, `ແທ້ ${num(b.actual)}% ຂອງລາຍຮັບ ${lak(b.revenue)}`)}
          </div>
        )}
      </>
    );
  }
  return (
    <tr>
      <td>{b.name}</td>
      <td style={{ fontSize: 11 }}>{describeBonus(b)}</td>
      <td className="mono">{pool}</td>
      <td className="mono">{count}</td>
      <td>
        <span style={{ whiteSpace: "nowrap" }}>
          <button type="button" className="mini-btn" onClick={onEdit}>
            {tr("✏️ Edit", "✏️ ແກ້ໄຂ")}
          </button>
          <button type="button" className="mini-btn flag" onClick={remove} disabled={del.isPending}>
            {tr("🗑 Delete", "🗑 ລົບ")}
          </button>
        </span>
      </td>
    </tr>
  );
}

const empty = {
  name: "", kind: "flat" as BonusKind, amount: "", pct: "", outlet: "", scope: "cogs" as "cogs" | "overhead",
  group: "F&B", line: "", targetPct: "", targetAmount: "", share: "100",
};

const fromBonus = (b: BonusType) => ({
  name: b.name, kind: b.kind, amount: b.amount ? String(b.amount) : "", pct: b.pct ? String(b.pct) : "",
  outlet: b.revenue_outlet_id ?? "", scope: (b.target_scope || "cogs") as "cogs" | "overhead", group: b.cost_group || "F&B",
  line: b.cost_line, targetPct: b.target_pct ? String(b.target_pct) : "", targetAmount: b.target_amount ? String(b.target_amount) : "",
  share: String(b.share_pct || 100),
});

/** Create a bonus type, or edit one (editing). Employees who have it ticked keep it after an edit. */
function BonusForm({ editing, onDone }: { editing?: BonusType; onDone?: () => void }) {
  const dialogs = useDialogs();
  const create = useCreateBonusType();
  const update = useUpdateBonusType();
  const outlets = useOutlets();
  const lines = useCostLines();
  const [f, setF] = useState(() => (editing ? fromBonus(editing) : empty));
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const lineOptions = (lines.data?.lines ?? [])
    .filter((l) => (f.scope === "overhead" ? l.cost_type === "overhead" : l.cost_type === "cogs" && l.group === f.group))
    .map((l) => l.line);

  async function submit() {
    if (!f.name.trim()) return dialogs.error(tr("Missing name", "ຂາດຊື່"), new Error(tr("Enter a bonus name first.", "ໃສ່ຊື່ໂບນັດກ່ອນ.")));
    const body: BonusTypeInput = {
      name: f.name.trim(), kind: f.kind, amount: parseFloat(f.amount) || 0, pct: parseFloat(f.pct) || 0,
      revenue_outlet_id: f.kind === "percent" ? f.outlet || outlets.data?.[0]?.id || null : null,
      target_scope: f.kind === "target" ? f.scope : "", cost_group: f.kind === "target" && f.scope === "cogs" ? f.group : "",
      cost_line: f.kind === "target" ? f.line.trim() : "", target_pct: parseFloat(f.targetPct) || 0,
      target_amount: parseFloat(f.targetAmount) || 0, share_pct: parseFloat(f.share) || 100,
    };
    if (f.kind === "percent" && !body.revenue_outlet_id) return dialogs.error(tr("No revenue stream", "ບໍ່ມີແຫຼ່ງລາຍຮັບ"), new Error(tr("There is no outlet to base this bonus on yet.", "ຍັງບໍ່ມີ outlet ໃຫ້ອີງໃສ່.")));
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        onDone?.();
        dialogs.success(tr("Bonus type saved", "ບັນທຶກປະເພດໂບນັດແລ້ວ"), tr(`"${body.name}" is updated — everyone who has it ticked keeps it.`, `ອັບເດດ "${body.name}" ແລ້ວ — ຄົນທີ່ tick ໄວ້ຍັງໄດ້ຢູ່.`));
        return;
      }
      await create.mutateAsync(body);
      setF(empty);
      dialogs.success(tr("Bonus type created", "ສ້າງປະເພດໂບນັດແລ້ວ"), tr(`"${body.name}" is now available as a tick box in each employee's profile — nobody has it ticked yet.`, `"${body.name}" ເປັນຊ່ອງ tick ໃນໂປຣໄຟລ໌ພະນັກງານແລ້ວ — ຍັງບໍ່ມີໃຜຖືກ tick.`));
    } catch (err) {
      dialogs.error(editing ? tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ") : tr("Could not create", "ສ້າງບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className={editing ? undefined : "card"}>
      <div className="land-row">
        <Field label={tr("Bonus name", "ຊື່ໂບນັດ")}>
          <input value={f.name} onChange={set("name")} placeholder={tr("e.g. New Year bonus", "ເຊັ່ນ ໂບນັດປີໃໝ່")} />
        </Field>
        <Field label={tr("Bonus kind", "ແບບໂບນັດ")}>
          <select value={f.kind} onChange={set("kind")}>
            <option value="flat">{tr("Flat amount per employee", "ຈຳນວນຄົງທີ່ຕໍ່ຄົນ")}</option>
            <option value="percent">{tr("Percentage of a revenue stream", "% ຂອງລາຍຮັບ")}</option>
            <option value="target">{tr("Team cost target", "ເປົ້າໝາຍຕົ້ນທຶນຂອງທີມ")}</option>
          </select>
        </Field>
      </div>
      {f.kind === "flat" && (
        <div className="land-row">
          <Field label={tr("Amount per employee (₭)", "ຈຳນວນຕໍ່ຄົນ (₭)")}>
            <input inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d]/g, "") })} placeholder="e.g. 200000" />
          </Field>
        </div>
      )}
      {f.kind === "percent" && (
        <div className="land-row">
          <Field label={tr("Percentage", "ເປີເຊັນ")}>
            <input value={f.pct} onChange={set("pct")} placeholder="e.g. 1" style={{ width: 90 }} />
          </Field>
          <Field label={tr("Of which revenue stream (outlet)", "ຈາກລາຍຮັບຂອງ (outlet)")}>
            <select value={f.outlet} onChange={set("outlet")}>
              {(outlets.data ?? []).length === 0 && <option value="">{tr("No outlets yet", "ຍັງບໍ່ມີ outlet")}</option>}
              {outlets.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.property})
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {f.kind === "target" && (
        <>
          <div className="land-row">
            <Field label={tr("Target type", "ແບບເປົ້າໝາຍ")}>
              <select value={f.scope} onChange={set("scope")}>
                <option value="cogs">{tr("COGS — % of related revenue", "ຕົ້ນທຶນ — % ຂອງລາຍຮັບ")}</option>
                <option value="overhead">{tr("Overhead — fixed ₭ amount", "ຄ່າໃຊ້ຈ່າຍ — ຈຳນວນ ₭ ຄົງທີ່")}</option>
              </select>
            </Field>
            {f.scope === "cogs" && (
              <Field label={tr("COGS group", "ໝວດຕົ້ນທຶນ")}>
                <select value={f.group} onChange={set("group")}>
                  {(lines.data?.groups ?? ["Room", "F&B", "Activity", "Other Sales"]).map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={f.scope === "cogs" ? tr("Line", "ລາຍການ") : tr("Overhead line", "ລາຍການຄ່າໃຊ້ຈ່າຍ")} hint={tr("The cost message category, e.g. Food cost", "ໝວດຂອງລາຍການຕົ້ນທຶນ ເຊັ່ນ Food cost")}>
              <input list={editing ? "bonus-lines-edit" : "bonus-lines"} value={f.line} onChange={set("line")} placeholder={tr("e.g. Food cost", "ເຊັ່ນ Food cost")} />
              <datalist id={editing ? "bonus-lines-edit" : "bonus-lines"}>
                {lineOptions.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </Field>
            {f.scope === "cogs" ? (
              <Field label={tr("Target (don't go over, %)", "ເປົ້າໝາຍ (ບໍ່ເກີນ, %)")}>
                <input value={f.targetPct} onChange={set("targetPct")} placeholder="e.g. 12" style={{ width: 110 }} />
              </Field>
            ) : (
              <Field label={tr("Target (don't go over, ₭)", "ເປົ້າໝາຍ (ບໍ່ເກີນ, ₭)")}>
                <input inputMode="numeric" value={f.targetAmount} onChange={(e) => setF({ ...f, targetAmount: e.target.value.replace(/[^\d]/g, "") })} placeholder="e.g. 10000000" />
              </Field>
            )}
          </div>
          <div className="land-row">
            <Field label={tr("Share of the amount saved paid as bonus (%)", "ສ່ວນຂອງເງິນທີ່ປະຢັດ ທີ່ຈ່າຍເປັນໂບນັດ (%)")}>
              <input value={f.share} onChange={set("share")} style={{ width: 110 }} />
            </Field>
          </div>
          <p className="hint">
            {tr("Example: target 12%, the team actually lands at 11% → 1 point saved, turned into ₭ via that group's revenue, and the chosen share of it becomes the bonus pool. Actual cost comes from the cost messages sent to the Accountant that month.", "ຕົວຢ່າງ: ເປົ້າ 12%, ທີມເຮັດໄດ້ 11% → ປະຢັດ 1%, ຄິດເປັນເງິນຈາກລາຍຮັບຂອງໝວດ, ແລ້ວສ່ວນທີ່ເລືອກກາຍເປັນກ້ອນໂບນັດ. ຕົ້ນທຶນແທ້ມາຈາກລາຍການຕົ້ນທຶນທີ່ສົ່ງໃຫ້ບັນຊີໃນເດືອນນັ້ນ.")}
          </p>
        </>
      )}
      <button type="button" className="add-line-btn" style={{ marginTop: 8 }} onClick={submit} disabled={create.isPending || update.isPending}>
        {editing ? tr("💾 Save bonus type", "💾 ບັນທຶກປະເພດໂບນັດ") : tr("+ Create bonus type", "+ ສ້າງປະເພດໂບນັດ")}
      </button>
    </div>
  );
}
