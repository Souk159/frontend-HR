"use client";

import { useState } from "react";
import { DataState, Field, Lede, SectionHead, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { fmtMonth, lak, num, thisMonth } from "@/lib/format";
import { useSaveScAllocation, useServiceCharge } from "@/features/hr/api";
import type { ScAllocation } from "@/features/hr/types";

export default function ServiceChargePage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const [month, setMonth] = useState(thisMonth());
  const pool = useServiceCharge(month);
  const saveAlloc = useSaveScAllocation();
  // local edits; null = show what the server has
  const [draft, setDraft] = useState<ScAllocation[] | null>(null);
  const alloc = draft ?? pool.data?.allocation ?? [];
  const setAlloc = setDraft;

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

  const p = pool.data;
  return (
    <div className="subview">
      <SectionHead title={t("sh_service_charge_bonus")} />
      <Lede>
        Pulled live from completed POS sales for the month. The staff pool is split across every employee with &quot;Gets service
        charge&quot; ticked in their profile, weighted by the hours they actually worked (capped at their required hours, so OT never
        increases a share). Employees marked &quot;Always gets full service charge&quot; get the full share below whatever their hours.
        Percentage-of-revenue and other bonuses now live under Bonus Types.
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
                <span>Full share per eligible employee (pool ÷ eligible)</span>
                <b>{lak(p.service_share)}</b>
              </div>
              <div className="stat-row">
                <span>Always get the full share</span>
                <b>{p.full_share_count}</b>
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

          </>
        )}
      </DataState>
      <Lede>Each person&apos;s share flows straight into Payroll&apos;s Service charge column.</Lede>
    </div>
  );
}
