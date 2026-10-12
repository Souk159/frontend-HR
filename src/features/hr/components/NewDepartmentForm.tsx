"use client";

import { tr } from "@/lib/i18n";
import { useState } from "react";
import { Field, useDialogs } from "@/components/ui";
import { useRequestNewDepartment } from "../api";
import { requestOutcome } from "../utils";

const initial = { name: "", quota: "5", base_salary: "", hours_per_day: "8", days_per_week: "6", ot_rate: "1.5", ot_rate_daily: "0.5", annual: "15", sick: "10" };

/** Prototype #newDeptForm — a new department goes through the Approval Rule. */
export function NewDepartmentForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState(initial);
  const req = useRequestNewDepartment();
  const dialogs = useDialogs();
  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    if (!f.name.trim()) return dialogs.error(tr("Missing name", "ຂາດຊື່"), new Error(tr("Enter a department name first.", "ໃສ່ຊື່ພະແນກກ່ອນ.")));
    try {
      const res = await req.mutateAsync({
        name: f.name.trim(),
        quota: parseInt(f.quota) || 0,
        base_salary: parseFloat(f.base_salary) || 0,
        hours_per_day: parseFloat(f.hours_per_day) || 8,
        days_per_week: parseInt(f.days_per_week) || 6,
        ot_rate: parseFloat(f.ot_rate) || 1.5,
        ot_rate_daily: parseFloat(f.ot_rate_daily) || 0,
        annual_leave_quota: parseInt(f.annual) || 15,
        sick_leave_quota: parseInt(f.sick) || 10,
      });
      dialogs.success(...requestOutcome(res, `New department "${f.name}"`));
      setF(initial);
      onDone();
    } catch (err) {
      dialogs.error(tr("Could not send request", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 13 }}>{tr("New department", "ພະແນກໃໝ່")}</h3>
      <p className="hint">{tr("A new department goes through the Approval Rule before it's usable across the system.", "ພະແນກໃໝ່ຕ້ອງຜ່ານການອະນຸມັດກ່ອນ ຈຶ່ງໃຊ້ໄດ້ໃນລະບົບ.")}</p>
      <div className="land-row">
        <Field label={tr("Department name", "ຊື່ພະແນກ")}>
          <input value={f.name} onChange={set("name")} placeholder={tr("e.g. Spa", "ເຊັ່ນ ສະປາ")} />
        </Field>
        <Field label={tr("Headcount quota", "ໂຄຕາຄົນ")}>
          <input value={f.quota} onChange={set("quota")} />
        </Field>
        <Field label={tr("Base salary (₭)", "ເງິນເດືອນ (₭)")}>
          <input value={f.base_salary} onChange={set("base_salary")} placeholder="e.g. 3000000" />
        </Field>
      </div>
      <div className="land-row">
        <Field label={tr("Hours per day", "ຊົ່ວໂມງຕໍ່ມື້")}>
          <input value={f.hours_per_day} onChange={set("hours_per_day")} />
        </Field>
        <Field label={tr("Days per week", "ມື້ຕໍ່ອາທິດ")}>
          <input value={f.days_per_week} onChange={set("days_per_week")} />
        </Field>
        <Field label={tr("OT over the limit (× hourly)", "OT ເກີນມາດຕະຖານເດືອນ (× ຄ່າຈ້າງ/ຊມ)")}>
          <input value={f.ot_rate} onChange={set("ot_rate")} />
        </Field>
        <Field label={tr("OT within the day (× hourly)", "OT ເກີນໃນມື້ (× ຄ່າຈ້າງ/ຊມ)")}>
          <input value={f.ot_rate_daily} onChange={set("ot_rate_daily")} />
        </Field>
        <Field label={tr("Annual leave (days/yr)", "ລາພັກປະຈຳປີ (ມື້/ປີ)")}>
          <input value={f.annual} onChange={set("annual")} />
        </Field>
        <Field label={tr("Sick leave (days/yr)", "ລາປ່ວຍ (ມື້/ປີ)")}>
          <input value={f.sick} onChange={set("sick")} />
        </Field>
      </div>
      <button type="button" className="add-line-btn" onClick={submit} disabled={req.isPending}>
        {tr("Submit", "ສົ່ງ")}
      </button>
    </div>
  );
}
