"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { fmtMonth, lak, num, thisMonth } from "@/lib/format";
import { useBonusTypes, useCostLines, useCreateBonusType, useDeleteBonusType, useOutlets, type BonusTypeInput } from "@/features/hr/api";
import type { BonusKind, BonusType } from "@/features/hr/types";

/** Prototype v168 hr-bonustypes — replaces the activities bonus. */
export default function BonusTypesPage() {
  const { t } = useLang();
  const [month, setMonth] = useState(thisMonth());
  const list = useBonusTypes(month);
  return (
    <div className="subview">
      <SectionHead title={t("sh_bonus_types")} />
      <Lede>
        Create a bonus — a flat amount, a percentage of a revenue stream, or a team cost target. Every bonus appears as an unticked box in
        each employee&apos;s profile (Employee Directory → Edit); HR must tick it per person before it&apos;s included in Payroll.
        Percentage and target bonuses are pooled and split evenly across everyone ticked for that bonus.
      </Lede>
      <NewBonusForm />
      <Field label="Show pools for" style={{ maxWidth: 220 }}>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </Field>
      <DataState loading={list.isLoading} error={list.error}>
        <Table head={["Bonus name", "Kind / rule", `Pool — ${fmtMonth(month)}`, "Employees ticked", ""]}>
          {(list.data ?? []).length === 0 && <EmptyRow cols={5}>No bonus types created yet.</EmptyRow>}
          {list.data?.map((b) => (
            <BonusRow key={b.id} b={b} />
          ))}
        </Table>
      </DataState>
    </div>
  );
}

function describeBonus(b: BonusType): string {
  const share = b.share_pct !== 100 ? ` (${num(b.share_pct)}% of the saving)` : " (all of the saving)";
  switch (b.kind) {
    case "percent":
      return `${num(b.pct)}% of ${b.revenue_outlet || "—"} revenue, split evenly`;
    case "target":
      return b.target_scope === "overhead"
        ? `Overhead "${b.cost_line}" under ${lak(b.target_amount)}${share}, split evenly`
        : `${b.cost_group} "${b.cost_line}" under ${num(b.target_pct)}% of revenue${share}, split evenly`;
    default:
      return `${lak(b.amount)} flat, per employee`;
  }
}

function BonusRow({ b }: { b: BonusType }) {
  const dialogs = useDialogs();
  const del = useDeleteBonusType();
  const count = b.employee_ids.length;

  async function remove() {
    if (!window.confirm(`Delete "${b.name}"? It is removed from every employee who had it ticked, and from Payroll.`)) return;
    try {
      await del.mutateAsync(b.id);
    } catch (err) {
      dialogs.error("Could not delete", err);
    }
  }

  let pool: React.ReactNode = `${lak(b.amount)} each`;
  if (b.pool !== null) {
    pool = (
      <>
        {lak(b.pool)} pool ÷ {count}
        {count > 0 && b.pool > 0 && <div className="hint">= {lak(Math.round(b.pool / count))} each</div>}
        {b.kind === "target" && (
          <div className="hint">
            {b.actual === null
              ? "No cost recorded this month yet"
              : b.target_scope === "overhead"
                ? `Actual ${lak(b.actual)}`
                : `Actual ${num(b.actual)}% of ${lak(b.revenue)} revenue`}
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
        <button type="button" className="mini-btn flag" onClick={remove} disabled={del.isPending}>
          🗑 Delete
        </button>
      </td>
    </tr>
  );
}

const empty = {
  name: "", kind: "flat" as BonusKind, amount: "", pct: "", outlet: "", scope: "cogs" as "cogs" | "overhead",
  group: "F&B", line: "", targetPct: "", targetAmount: "", share: "100",
};

function NewBonusForm() {
  const dialogs = useDialogs();
  const create = useCreateBonusType();
  const outlets = useOutlets();
  const lines = useCostLines();
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const lineOptions = (lines.data?.lines ?? [])
    .filter((l) => (f.scope === "overhead" ? l.cost_type === "overhead" : l.cost_type === "cogs" && l.group === f.group))
    .map((l) => l.line);

  async function submit() {
    if (!f.name.trim()) return dialogs.error("Missing name", new Error("Enter a bonus name first."));
    const body: BonusTypeInput = {
      name: f.name.trim(), kind: f.kind, amount: parseFloat(f.amount) || 0, pct: parseFloat(f.pct) || 0,
      revenue_outlet_id: f.kind === "percent" ? f.outlet || outlets.data?.[0]?.id || null : null,
      target_scope: f.kind === "target" ? f.scope : "", cost_group: f.kind === "target" && f.scope === "cogs" ? f.group : "",
      cost_line: f.kind === "target" ? f.line.trim() : "", target_pct: parseFloat(f.targetPct) || 0,
      target_amount: parseFloat(f.targetAmount) || 0, share_pct: parseFloat(f.share) || 100,
    };
    if (f.kind === "percent" && !body.revenue_outlet_id) return dialogs.error("No revenue stream", new Error("There is no outlet to base this bonus on yet."));
    try {
      await create.mutateAsync(body);
      setF(empty);
      dialogs.success("Bonus type created", `"${body.name}" is now available as a tick box in each employee's profile — nobody has it ticked yet.`);
    } catch (err) {
      dialogs.error("Could not create", err);
    }
  }

  return (
    <div className="card">
      <div className="land-row">
        <Field label="Bonus name">
          <input value={f.name} onChange={set("name")} placeholder="e.g. New Year bonus" />
        </Field>
        <Field label="Bonus kind">
          <select value={f.kind} onChange={set("kind")}>
            <option value="flat">Flat amount per employee</option>
            <option value="percent">Percentage of a revenue stream</option>
            <option value="target">Team cost target</option>
          </select>
        </Field>
      </div>
      {f.kind === "flat" && (
        <div className="land-row">
          <Field label="Amount per employee (₭)">
            <input inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d]/g, "") })} placeholder="e.g. 200000" />
          </Field>
        </div>
      )}
      {f.kind === "percent" && (
        <div className="land-row">
          <Field label="Percentage">
            <input value={f.pct} onChange={set("pct")} placeholder="e.g. 1" style={{ width: 90 }} />
          </Field>
          <Field label="Of which revenue stream (outlet)">
            <select value={f.outlet} onChange={set("outlet")}>
              {(outlets.data ?? []).length === 0 && <option value="">No outlets yet</option>}
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
            <Field label="Target type">
              <select value={f.scope} onChange={set("scope")}>
                <option value="cogs">COGS — % of related revenue</option>
                <option value="overhead">Overhead — fixed ₭ amount</option>
              </select>
            </Field>
            {f.scope === "cogs" && (
              <Field label="COGS group">
                <select value={f.group} onChange={set("group")}>
                  {(lines.data?.groups ?? ["Room", "F&B", "Activity", "Other Sales"]).map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={f.scope === "cogs" ? "Line" : "Overhead line"} hint="The cost message category, e.g. Food cost">
              <input list="bonus-lines" value={f.line} onChange={set("line")} placeholder="e.g. Food cost" />
              <datalist id="bonus-lines">
                {lineOptions.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </Field>
            {f.scope === "cogs" ? (
              <Field label="Target (don't go over, %)">
                <input value={f.targetPct} onChange={set("targetPct")} placeholder="e.g. 12" style={{ width: 110 }} />
              </Field>
            ) : (
              <Field label="Target (don't go over, ₭)">
                <input inputMode="numeric" value={f.targetAmount} onChange={(e) => setF({ ...f, targetAmount: e.target.value.replace(/[^\d]/g, "") })} placeholder="e.g. 10000000" />
              </Field>
            )}
          </div>
          <div className="land-row">
            <Field label="Share of the amount saved paid as bonus (%)">
              <input value={f.share} onChange={set("share")} style={{ width: 110 }} />
            </Field>
          </div>
          <p className="hint">
            Example: target 12%, the team actually lands at 11% → 1 point saved, turned into ₭ via that group&apos;s revenue, and the chosen
            share of it becomes the bonus pool. Actual cost comes from the cost messages sent to the Accountant that month.
          </p>
        </>
      )}
      <button type="button" className="add-line-btn" style={{ marginTop: 8 }} onClick={submit} disabled={create.isPending}>
        + Create bonus type
      </button>
    </div>
  );
}
