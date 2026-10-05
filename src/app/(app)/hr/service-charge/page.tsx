"use client";

import { useState } from "react";
import { DataState, Field, Lede, SectionHead, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { fmtMonth, lak, num, thisMonth } from "@/lib/format";
import { useRequestActivitiesBonus, useSaveScAllocation, useServiceCharge } from "@/features/hr/api";
import type { ScAllocation } from "@/features/hr/types";

export default function ServiceChargePage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const [month, setMonth] = useState(thisMonth());
  const pool = useServiceCharge(month);
  const saveAlloc = useSaveScAllocation();
  const requestPct = useRequestActivitiesBonus();
  // local edits; null = show what the server has
  const [draft, setDraft] = useState<ScAllocation[] | null>(null);
  const alloc = draft ?? pool.data?.allocation ?? [];
  const setAlloc = setDraft;
  const [newPct, setNewPct] = useState("");

  const total = alloc.reduce((s, a) => s + (Number(a.pct) || 0), 0);
  const dirty = draft !== null;

  async function save() {
    try {
      await saveAlloc.mutateAsync(alloc.map((a) => ({ ...a, pct: Number(a.pct) || 0 })));
      setDraft(null);
      dialogs.success("Saved", "Service charge allocation updated.");
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }

  async function request() {
    const pct = parseFloat(newPct);
    if (isNaN(pct) || pct < 0) return dialogs.error("Invalid %", new Error("Enter a valid percentage first."));
    try {
      await requestPct.mutateAsync(pct);
      setNewPct("");
      dialogs.success("Sent for approval", `Changing the Activities bonus to ${num(pct)}% has been sent for GM/COO approval — it won't take effect until then.`);
    } catch (err) {
      dialogs.error("Could not send request", err);
    }
  }

  const p = pool.data;
  return (
    <div className="subview">
      <SectionHead title={t("sh_service_charge_bonus")} />
      <Lede>
        Pulled live from completed POS sales for the month. Each pool is split automatically across every employee marked eligible (Meal
        Quota tab → eligibility flags).
      </Lede>
      <Field label="Month" style={{ maxWidth: 220 }}>
        <input type="month" value={month} onChange={(e) => e.target.value && (setMonth(e.target.value), setDraft(null))} />
      </Field>
      <DataState loading={pool.isLoading} error={pool.error}>
        {p && (
          <>
            <div className="card">
              <h3 style={{ fontSize: 14 }}>Service charge pool — {fmtMonth(month)}</h3>
              <div className="stat-row">
                <span>Total service charge collected this month</span>
                <b>{lak(p.total_service_charge)}</b>
              </div>
              <div className="stat-row">
                <span>Staff pool ({num(p.staff_pool_pct)}% of collected)</span>
                <b>{lak(p.staff_pool)}</b>
              </div>
              <div className="stat-row">
                <span>Eligible employees (Gets service charge ✓)</span>
                <b>{p.service_eligible}</b>
              </div>
              <div className="stat-row">
                <span>Share per eligible employee</span>
                <b>{lak(p.service_share)}</b>
              </div>
              <h3 style={{ fontSize: 13, marginTop: 14 }}>Where the collected service charge % goes</h3>
              <p className="hint">Not all of the service charge collected on a bill necessarily goes to the staff pool above — split it out here.</p>
              {alloc.map((a, i) => (
                <div className="stat-row" key={i}>
                  <span style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                    <input className="inline-input" style={{ flex: 1, maxWidth: 260 }} value={a.label} onChange={(e) => setAlloc(alloc.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <label className="hint" style={{ margin: 0, display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="checkbox" checked={a.is_staff_pool} onChange={(e) => setAlloc(alloc.map((x, j) => (j === i ? { ...x, is_staff_pool: e.target.checked } : x)))} />
                      paid to staff
                    </label>
                  </span>
                  <span>
                    <input className="inline-input" type="number" style={{ width: 64, textAlign: "right" }} value={a.pct} onChange={(e) => setAlloc(alloc.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} />%
                    <button type="button" className="mini-btn flag" style={{ marginLeft: 6 }} onClick={() => setAlloc(alloc.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </span>
                </div>
              ))}
              <div className="stat-row" style={{ borderTop: "1px solid var(--line)" }}>
                <span>
                  <b>Total allocated</b>
                </span>
                <b className={total === 100 ? "" : "c-clay"}>{num(total)}%</b>
              </div>
              {total !== 100 && <p className="hint warn">Should add up to 100% of the service charge collected.</p>}
              <button type="button" className="mini-btn" style={{ marginTop: 8 }} onClick={() => setAlloc([...alloc, { label: "New portion", pct: 0, is_staff_pool: false }])}>
                + Add a portion
              </button>
              {dirty && (
                <button type="button" className="submit-btn" style={{ marginTop: 8 }} onClick={save} disabled={saveAlloc.isPending}>
                  Save allocation
                </button>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 14 }}>Activities bonus pool — {num(p.activities_bonus_pct)}% of activities revenue</h3>
              <div className="stat-row">
                <span>Total activities revenue this month</span>
                <b>{lak(p.activities_revenue)}</b>
              </div>
              <div className="stat-row">
                <span>Bonus pool</span>
                <b>{lak(p.activities_pool)}</b>
              </div>
              <div className="stat-row">
                <span>Eligible employees (Gets activities bonus ✓)</span>
                <b>{p.activities_eligible}</b>
              </div>
              <div className="stat-row">
                <span>Share per eligible employee</span>
                <b>{lak(p.activities_share)}</b>
              </div>
              <div className="land-row" style={{ marginTop: 10 }}>
                <Field label="New Activities bonus %">
                  <input type="number" value={newPct} onChange={(e) => setNewPct(e.target.value)} placeholder="e.g. 1.5" style={{ width: 120 }} />
                </Field>
                <button type="button" className="mini-btn" onClick={request} disabled={requestPct.isPending || !!p.pending_activities_bonus}>
                  Request change
                </button>
              </div>
              {p.pending_activities_bonus && (
                <p className="hint warn">Change to {p.pending_activities_bonus}% requested — awaiting GM/COO approval.</p>
              )}
              <p className="hint">Any change here needs GM/COO approval before it takes effect. Activities revenue = sales of products whose outlet is in the &quot;Activity&quot; department.</p>
            </div>
          </>
        )}
      </DataState>
      <Lede>Both shares flow straight into Payroll&apos;s Service charge and Activities bonus columns for every eligible employee.</Lede>
    </div>
  );
}
