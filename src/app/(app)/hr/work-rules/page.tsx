"use client";

import { useState } from "react";
import Link from "next/link";
import { DataState, Field, Lede, SectionHead, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { num } from "@/lib/format";
import { useDepartments, useOrgSettings, useRequestDepartmentEdit, useRequestWorkRules, useSaveOrgSettings } from "@/features/hr/api";
import type { Department, OrgSettings } from "@/features/hr/types";
import { requestOutcome } from "@/features/hr/utils";

export default function WorkRulesPage() {
  const { t } = useLang();
  const depts = useDepartments();
  const settings = useOrgSettings();
  return (
    <div className="subview">
      <SectionHead title={t("sh_work_rules_dept")} />
      <DataState loading={settings.isLoading} error={settings.error}>
        {settings.data && <OrgSettingsCard key={JSON.stringify(settings.data)} current={settings.data} />}
      </DataState>
      <Lede>
        Each department can run its own schedule — e.g. Front Office works 5 days/week while Restaurant works 6. Changing any of them goes
        through the Approval Rule before it takes effect.
      </Lede>
      <Link href="/hr/directory" className="mini-btn" style={{ display: "inline-block", marginBottom: 12 }}>
        + Create department
      </Link>
      <DataState loading={depts.isLoading} error={depts.error}>
        {depts.data?.length === 0 && <p className="empty">No departments yet.</p>}
        {depts.data?.map((d) => (
          <RulesCard key={d.id} dept={d} calcDays={settings.data?.salary_calc_days ?? 30} />
        ))}
      </DataState>
    </div>
  );
}

/** Organisation-wide payroll settings (prototype v168) — apply to every department at once. */
function OrgSettingsCard({ current }: { current: OrgSettings }) {
  const dialogs = useDialogs();
  const save = useSaveOrgSettings();
  const [f, setF] = useState({ ...current, salary_calc_days: String(current.salary_calc_days) });
  const dirty = JSON.stringify({ ...f, salary_calc_days: Number(f.salary_calc_days) }) !== JSON.stringify(current);

  async function submit() {
    const days = parseInt(f.salary_calc_days);
    if (!days || days < 1 || days > 31) return dialogs.error("Invalid days", new Error("Days the salary is divided by must be 1–31."));
    try {
      await save.mutateAsync({ ...f, salary_calc_days: days });
      dialogs.success("Saved", "Organization-wide payroll settings updated — every department's payroll uses them immediately.");
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 14 }}>Organization-wide settings</h3>
      <p className="hint">These apply to every department&apos;s payroll calculation — set once for however this organization runs.</p>
      <div className="land-row">
        <Field label="Days salary is divided by (daily rate)">
          <input type="number" min={1} max={31} value={f.salary_calc_days} onChange={(e) => setF({ ...f, salary_calc_days: e.target.value })} style={{ width: 90 }} />
        </Field>
        <Field label="Deduction counted in">
          <select value={f.deduction_unit} onChange={(e) => setF({ ...f, deduction_unit: e.target.value as OrgSettings["deduction_unit"] })}>
            <option value="hours">Hours</option>
            <option value="minutes">Minutes</option>
          </select>
        </Field>
        <Field label="OT counted in">
          <select value={f.ot_unit} onChange={(e) => setF({ ...f, ot_unit: e.target.value as OrgSettings["ot_unit"] })}>
            <option value="hours">Hours</option>
            <option value="minutes">Minutes</option>
          </select>
        </Field>
        <Field label="If no day off that week, OT is judged against">
          <select value={f.ot_basis} onChange={(e) => setF({ ...f, ot_basis: e.target.value as OrgSettings["ot_basis"] })}>
            <option value="monthly">The month&apos;s total</option>
            <option value="weekly">That week only</option>
          </select>
        </Field>
      </div>
      <button type="button" className="mini-btn" onClick={submit} disabled={!dirty || save.isPending}>
        Save settings
      </button>
      <p className="hint" style={{ marginTop: 6 }}>
        Daily rate = salary ÷ days above. Hourly rate = daily rate ÷ the department&apos;s hours per day below. &quot;Hours&quot; counts only
        whole hours (rounded down); &quot;Minutes&quot; counts to the minute.
      </p>
    </div>
  );
}

function RulesCard({ dept, calcDays }: { dept: Department; calcDays: number }) {
  const dialogs = useDialogs();
  const req = useRequestWorkRules();
  const [f, setF] = useState({
    hours: String(dept.hours_per_day),
    days: String(dept.days_per_week),
    ot: String(dept.ot_rate),
    otDaily: String(dept.ot_rate_daily),
    annual: String(dept.annual_leave_quota),
    sick: String(dept.sick_leave_quota),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const hours = parseFloat(f.hours) || dept.hours_per_day;
  const monthHours = hours * (parseInt(f.days) || dept.days_per_week) * 4;

  async function submit() {
    const otDaily = parseFloat(f.otDaily);
    try {
      const res = await req.mutateAsync({
        id: dept.id,
        rules: {
          hours_per_day: hours,
          days_per_week: parseInt(f.days) || dept.days_per_week,
          ot_rate: parseFloat(f.ot) || dept.ot_rate,
          ot_rate_daily: isNaN(otDaily) ? dept.ot_rate_daily : otDaily,
          annual_leave_quota: parseInt(f.annual) || 0,
          sick_leave_quota: parseInt(f.sick) || 0,
        },
      });
      dialogs.success(...requestOutcome(res, `Work rules change for ${dept.name}`));
    } catch (err) {
      dialogs.error("Could not send request", err);
    }
  }

  return (
    <div className="card">
      <DeptHeader dept={dept} />
      <div className="land-row">
        <Field label="Hours per day">
          <input value={f.hours} onChange={set("hours")} />
        </Field>
        <Field label="Days per week">
          <input value={f.days} onChange={set("days")} />
        </Field>
        <Field label="OT over the limit (× hourly)">
          <input value={f.ot} onChange={set("ot")} />
        </Field>
        <Field label="OT within the day (× hourly)">
          <input value={f.otDaily} onChange={set("otDaily")} />
        </Field>
        <Field label="Annual leave (days/yr)">
          <input value={f.annual} onChange={set("annual")} />
        </Field>
        <Field label="Sick leave (days/yr)">
          <input value={f.sick} onChange={set("sick")} />
        </Field>
        <button type="button" className="submit-btn" onClick={submit} disabled={req.isPending}>
          Submit change
        </button>
      </div>
      <p className="hint">
        Standard monthly hours: <b>{num(monthHours)}</b> (hours/day × days/week × 4 weeks). &quot;OT over the limit&quot; applies once total
        hours pass this; &quot;OT within the day&quot; applies to extra hours on a single day that are still inside this monthly limit.
        Hourly rate = base salary ÷ {calcDays} ÷ {num(hours)}h. Annual/sick leave here sets the default for employees in this department.
      </p>
    </div>
  );
}

/** Rename or close a department (per the Approval Rule "Renaming or closing a department"). */
function DeptHeader({ dept }: { dept: Department }) {
  const dialogs = useDialogs();
  const edit = useRequestDepartmentEdit();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(dept.name);

  async function run(body: { name?: string; close?: boolean }, what: string) {
    try {
      const res = await edit.mutateAsync({ id: dept.id, ...body });
      setRenaming(false);
      dialogs.success(...requestOutcome(res, what));
    } catch (err) {
      dialogs.error("Could not send request", err);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
      {renaming ? (
        <>
          <input className="inline-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ minWidth: 220 }} />
          <button type="button" className="mini-btn" disabled={edit.isPending || !name.trim() || name.trim() === dept.name}
            onClick={() => run({ name: name.trim() }, `Renaming ${dept.name} to ${name.trim()}`)}>
            Save name
          </button>
          <button type="button" className="mini-btn" onClick={() => (setRenaming(false), setName(dept.name))}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <h3 style={{ fontSize: 14, margin: 0 }}>{dept.name}</h3>
          <button type="button" className="mini-btn" onClick={() => setRenaming(true)}>
            ✏️ Rename
          </button>
          <button
            type="button"
            className="mini-btn flag"
            disabled={edit.isPending}
            title={dept.filled > 0 ? "Move its employees to another department first" : undefined}
            onClick={() => {
              if (dept.filled > 0)
                return dialogs.error("Department not empty", new Error(`${dept.name} still has ${dept.filled} employee(s) — move them to another department first.`));
              if (window.confirm(`Close ${dept.name}? It disappears from every list once approved.`)) run({ close: true }, `Closing ${dept.name}`);
            }}
          >
            Close department
          </button>
        </>
      )}
    </div>
  );
}
