"use client";

import { useState } from "react";
import { Field, useDialogs } from "@/components/ui";
import { useRequestNewDepartment } from "../api";

const initial = { name: "", quota: "5", base_salary: "", hours_per_day: "8", days_per_week: "6", ot_rate: "1.5", annual: "15", sick: "10" };

/** Prototype #newDeptForm — a new department needs GM + COO approval. */
export function NewDepartmentForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState(initial);
  const req = useRequestNewDepartment();
  const dialogs = useDialogs();
  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    if (!f.name.trim()) return dialogs.error("Missing name", new Error("Enter a department name first."));
    try {
      await req.mutateAsync({
        name: f.name.trim(),
        quota: parseInt(f.quota) || 0,
        base_salary: parseFloat(f.base_salary) || 0,
        hours_per_day: parseFloat(f.hours_per_day) || 8,
        days_per_week: parseInt(f.days_per_week) || 6,
        ot_rate: parseFloat(f.ot_rate) || 1.5,
        annual_leave_quota: parseInt(f.annual) || 15,
        sick_leave_quota: parseInt(f.sick) || 10,
      });
      dialogs.success("Request sent", `New department "${f.name}" has been sent for GM and COO approval. It won't be usable anywhere in the system until approved.`);
      setF(initial);
      onDone();
    } catch (err) {
      dialogs.error("Could not send request", err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 13 }}>New department</h3>
      <p className="hint">Creating a department needs GM and COO approval before it&apos;s usable across the system.</p>
      <div className="land-row">
        <Field label="Department name">
          <input value={f.name} onChange={set("name")} placeholder="e.g. Spa" />
        </Field>
        <Field label="Headcount quota">
          <input value={f.quota} onChange={set("quota")} />
        </Field>
        <Field label="Base salary (₭)">
          <input value={f.base_salary} onChange={set("base_salary")} placeholder="e.g. 3000000" />
        </Field>
      </div>
      <div className="land-row">
        <Field label="Hours per day">
          <input value={f.hours_per_day} onChange={set("hours_per_day")} />
        </Field>
        <Field label="Days per week">
          <input value={f.days_per_week} onChange={set("days_per_week")} />
        </Field>
        <Field label="OT rate (× hourly)">
          <input value={f.ot_rate} onChange={set("ot_rate")} />
        </Field>
        <Field label="Annual leave (days/yr)">
          <input value={f.annual} onChange={set("annual")} />
        </Field>
        <Field label="Sick leave (days/yr)">
          <input value={f.sick} onChange={set("sick")} />
        </Field>
      </div>
      <button type="button" className="add-line-btn" onClick={submit} disabled={req.isPending}>
        Submit for approval
      </button>
    </div>
  );
}
