"use client";

import { useState } from "react";
import Link from "next/link";
import { DataState, Field, Lede, SectionHead, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { num } from "@/lib/format";
import { useDepartments, useRequestWorkRules } from "@/features/hr/api";
import type { Department } from "@/features/hr/types";

export default function WorkRulesPage() {
  const { t } = useLang();
  const depts = useDepartments();
  return (
    <div className="subview">
      <SectionHead title={t("sh_work_rules_dept")} />
      <Lede>
        Each department can run its own schedule — e.g. Front Office works 5 days/week while Restaurant works 6. Changing any of them needs
        GM and COO approval before it takes effect.
      </Lede>
      <Link href="/hr/directory" className="mini-btn" style={{ display: "inline-block", marginBottom: 12 }}>
        + Create department
      </Link>
      <DataState loading={depts.isLoading} error={depts.error}>
        {depts.data?.length === 0 && <p className="empty">No departments yet.</p>}
        {depts.data?.map((d) => (
          <RulesCard key={d.id} dept={d} />
        ))}
      </DataState>
    </div>
  );
}

// Monday-first display order; values are JS/Go weekday numbers (0 = Sunday)
const WEEK = [
  { wd: 1, label: "Mon" }, { wd: 2, label: "Tue" }, { wd: 3, label: "Wed" }, { wd: 4, label: "Thu" },
  { wd: 5, label: "Fri" }, { wd: 6, label: "Sat" }, { wd: 0, label: "Sun" },
];

function RulesCard({ dept }: { dept: Department }) {
  const dialogs = useDialogs();
  const req = useRequestWorkRules();
  const [f, setF] = useState({
    hours: String(dept.hours_per_day),
    days: String(dept.days_per_week),
    ot: String(dept.ot_rate),
    annual: String(dept.annual_leave_quota),
    sick: String(dept.sick_leave_quota),
  });
  const [noRest, setNoRest] = useState<Set<number>>(() => new Set(dept.no_rest_weekdays ?? [0, 6]));
  const restPerWeek = Math.max(0, 7 - (parseInt(f.days) || dept.days_per_week));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    try {
      await req.mutateAsync({
        id: dept.id,
        rules: {
          hours_per_day: parseFloat(f.hours) || dept.hours_per_day,
          days_per_week: parseInt(f.days) || dept.days_per_week,
          ot_rate: parseFloat(f.ot) || dept.ot_rate,
          annual_leave_quota: parseInt(f.annual) || 0,
          sick_leave_quota: parseInt(f.sick) || 0,
          no_rest_weekdays: [...noRest].sort(),
        },
      });
      dialogs.success("Request sent", `Work rules change for ${dept.name} has been sent for GM and COO approval.`);
    } catch (err) {
      dialogs.error("Could not send request", err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 14 }}>{dept.name}</h3>
      <div className="land-row">
        <Field label="Hours per day">
          <input value={f.hours} onChange={set("hours")} />
        </Field>
        <Field label="Days per week">
          <input value={f.days} onChange={set("days")} />
        </Field>
        <Field label="OT rate (× hourly)">
          <input value={f.ot} onChange={set("ot")} />
        </Field>
        <Field label="Annual leave (days/yr)">
          <input value={f.annual} onChange={set("annual")} />
        </Field>
        <Field label="Sick leave (days/yr)">
          <input value={f.sick} onChange={set("sick")} />
        </Field>
        <button type="button" className="submit-btn" onClick={submit} disabled={req.isPending}>
          Submit for approval
        </button>
      </div>
      <div className="land-row" style={{ alignItems: "center" }}>
        <span className="hint" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>No rest day on</span>
        {WEEK.map(({ wd, label }) => (
          <label key={wd} className="check-pill">
            <input
              type="checkbox"
              checked={noRest.has(wd)}
              onChange={(e) => {
                const next = new Set(noRest);
                if (e.target.checked) next.add(wd);
                else next.delete(wd);
                setNoRest(next);
              }}
            />
            {label}
          </label>
        ))}
      </div>
      <p className="hint">
        {restPerWeek} rest day{restPerWeek === 1 ? "" : "s"} per week (7 − days/week), taken on any day not ticked above — absence on a
        ticked day is always deducted. Daily rate = base salary ÷ 26; hourly rate = daily rate ÷ {num(parseFloat(f.hours) || dept.hours_per_day)}h.
        Annual/sick leave here sets the default for employees in this department.
      </p>
    </div>
  );
}
