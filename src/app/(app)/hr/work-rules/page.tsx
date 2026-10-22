"use client";

import { useState } from "react";
import Link from "next/link";
import { DataState, Field, Lede, SectionHead, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
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
        {tr("Each department can run its own schedule — e.g. Front Office works 5 days/week while Restaurant works 6. Changing any of them goes through the Approval Rule before it takes effect.", "ແຕ່ລະພະແນກມີຕາຕະລາງເຮັດວຽກຂອງຕົນ — ເຊັ່ນ ໜ້າຮ້ານ 5 ມື້/ອາທິດ, ຮ້ານອາຫານ 6 ມື້. ການປ່ຽນແປງຕ້ອງຜ່ານການອະນຸມັດກ່ອນມີຜົນ.")}
      </Lede>
      <Link href="/hr/directory" className="mini-btn" style={{ display: "inline-block", marginBottom: 12 }}>
        {tr("+ Create department", "+ ສ້າງພະແນກ")}
      </Link>
      <DataState loading={depts.isLoading} error={depts.error}>
        {depts.data?.length === 0 && <p className="empty">{tr("No departments yet.", "ຍັງບໍ່ມີພະແນກ.")}</p>}
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
    if (!days || days < 1 || days > 31) return dialogs.error(tr("Invalid days", "ຈຳນວນມື້ບໍ່ຖືກ"), new Error(tr("Days the salary is divided by must be 1–31.", "ຕົວຫານຕ້ອງຢູ່ລະຫວ່າງ 1–31.")));
    try {
      await save.mutateAsync({ ...f, salary_calc_days: days });
      dialogs.success(tr("Saved", "ບັນທຶກແລ້ວ"), tr("Organization-wide payroll settings updated — every department's payroll uses them immediately.", "ອັບເດດການຕັ້ງຄ່າເງິນເດືອນຂອງອົງກອນແລ້ວ — ທຸກພະແນກໃຊ້ທັນທີ."));
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 14 }}>{tr("Organization-wide settings", "ການຕັ້ງຄ່າຂອງອົງກອນ")}</h3>
      <p className="hint">{tr("These apply to every department's payroll calculation — set once for however this organization runs.", "ໃຊ້ກັບການຄິດເງິນເດືອນຂອງທຸກພະແນກ — ຕັ້ງຄັ້ງດຽວຕາມນະໂຍບາຍຂອງອົງກອນ.")}</p>
      <div className="land-row">
        <Field label={tr("Days salary is divided by (daily rate)", "ຕົວຫານເງິນເດືອນ (ຄ່າຈ້າງຕໍ່ມື້)")}>
          <input type="number" min={1} max={31} value={f.salary_calc_days} onChange={(e) => setF({ ...f, salary_calc_days: e.target.value })} style={{ width: 90 }} />
        </Field>
        <Field label={tr("Deduction counted in", "ນັບການຫັກເປັນ")}>
          <select value={f.deduction_unit} onChange={(e) => setF({ ...f, deduction_unit: e.target.value as OrgSettings["deduction_unit"] })}>
            <option value="hours">{tr("Hours", "ຊົ່ວໂມງ")}</option>
            <option value="minutes">{tr("Minutes", "ນາທີ")}</option>
          </select>
        </Field>
        <Field label={tr("OT counted in", "ນັບ OT ເປັນ")}>
          <select value={f.ot_unit} onChange={(e) => setF({ ...f, ot_unit: e.target.value as OrgSettings["ot_unit"] })}>
            <option value="hours">{tr("Hours (rounded down)", "ຊົ່ວໂມງ (ປັດລົງ)")}</option>
            <option value="hours_up">{tr("Hours (rounded up)", "ຊົ່ວໂມງ (ປັດຂຶ້ນ)")}</option>
            <option value="minutes">{tr("Minutes", "ນາທີ")}</option>
          </select>
        </Field>
        <Field label={tr("If no day off that week, OT is judged against", "ອາທິດທີ່ບໍ່ມີມື້ພັກ ຄິດ OT ທຽບກັບ")}>
          <select value={f.ot_basis} onChange={(e) => setF({ ...f, ot_basis: e.target.value as OrgSettings["ot_basis"] })}>
            <option value="monthly">{tr("The month's total", "ຍອດທັງເດືອນ")}</option>
            <option value="weekly">{tr("That week only", "ສະເພາະອາທິດນັ້ນ")}</option>
          </select>
        </Field>
        <Field
          label={tr("OT paid only once finalized, from", "ຈ່າຍ OT ສະເພາະທີ່ Finalize ແລ້ວ ຕັ້ງແຕ່ເດືອນ")}
          hint={tr("Empty = OT always comes from the scans.", "ປະຫວ່າງ = OT ມາຈາກການສະແກນສະເໝີ.")}
        >
          <input type="month" value={f.ot_finalize_from} onChange={(e) => setF({ ...f, ot_finalize_from: e.target.value })} />
        </Field>
      </div>
      <button type="button" className="mini-btn" onClick={submit} disabled={!dirty || save.isPending}>
        {tr("Save settings", "ບັນທຶກການຕັ້ງຄ່າ")}
      </button>
      <p className="hint" style={{ marginTop: 6 }}>
        {tr(
          'Daily rate = salary ÷ days above. Hourly rate = daily rate ÷ the department\'s hours per day below. "Hours" counts only whole hours (rounded down); "Minutes" counts to the minute.',
          'ຄ່າຈ້າງຕໍ່ມື້ = ເງິນເດືອນ ÷ ຈຳນວນມື້ຂ້າງເທິງ. ຄ່າຈ້າງຕໍ່ຊົ່ວໂມງ = ຄ່າຈ້າງຕໍ່ມື້ ÷ ຊົ່ວໂມງ/ມື້ ຂອງພະແນກຂ້າງລຸ່ມ. "ຊົ່ວໂມງ" ນັບສະເພາະຊົ່ວໂມງເຕັມ (ປັດລົງ); "ນາທີ" ນັບລະອຽດຮອດນາທີ.',
        )}
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
    help: String(dept.cross_help_rate),
    annual: String(dept.annual_leave_quota),
    sick: String(dept.sick_leave_quota),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const hours = parseFloat(f.hours) || dept.hours_per_day;
  const monthHours = hours * (parseInt(f.days) || dept.days_per_week) * 4;

  async function submit() {
    const otDaily = parseFloat(f.otDaily);
    const help = parseFloat(f.help);
    try {
      const res = await req.mutateAsync({
        id: dept.id,
        rules: {
          hours_per_day: hours,
          days_per_week: parseInt(f.days) || dept.days_per_week,
          ot_rate: parseFloat(f.ot) || dept.ot_rate,
          ot_rate_daily: isNaN(otDaily) ? dept.ot_rate_daily : otDaily,
          cross_help_rate: isNaN(help) ? dept.cross_help_rate : help,
          annual_leave_quota: parseInt(f.annual) || 0,
          sick_leave_quota: parseInt(f.sick) || 0,
        },
      });
      dialogs.success(...requestOutcome(res, tr(`Work rules change for ${dept.name}`, `ການປ່ຽນກົດລະບຽບຂອງ ${dept.name}`)));
    } catch (err) {
      dialogs.error(tr("Could not send request", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="card">
      <DeptHeader dept={dept} />
      <div className="land-row">
        <Field label={tr("Hours per day", "ຊົ່ວໂມງຕໍ່ມື້")}>
          <input value={f.hours} onChange={set("hours")} />
        </Field>
        <Field label={tr("Days per week", "ມື້ຕໍ່ອາທິດ")}>
          <input value={f.days} onChange={set("days")} />
        </Field>
        <Field label={tr("OT over the limit (× hourly)", "OT ເກີນມາດຕະຖານເດືອນ (× ຄ່າຈ້າງ/ຊມ)")}>
          <input value={f.ot} onChange={set("ot")} />
        </Field>
        <Field label={tr("OT within the day (× hourly)", "OT ເກີນໃນມື້ (× ຄ່າຈ້າງ/ຊມ)")}>
          <input value={f.otDaily} onChange={set("otDaily")} />
        </Field>
        <Field label={tr("Cross-help bonus (× hourly)", "ໂບນັດຊ່ວຍຂ້າມພະແນກ (× ຄ່າຈ້າງ/ຊມ)")}>
          <input value={f.help} onChange={set("help")} />
        </Field>
        <Field label={tr("Annual leave (days/yr)", "ລາພັກປະຈຳປີ (ມື້/ປີ)")}>
          <input value={f.annual} onChange={set("annual")} />
        </Field>
        <Field label={tr("Sick leave (days/yr)", "ລາປ່ວຍ (ມື້/ປີ)")}>
          <input value={f.sick} onChange={set("sick")} />
        </Field>
        <button type="button" className="submit-btn" onClick={submit} disabled={req.isPending}>
          {tr("Submit change", "ສົ່ງການປ່ຽນແປງ")}
        </button>
      </div>
      <p className="hint">
        {tr("Standard monthly hours:", "ຊົ່ວໂມງມາດຕະຖານຕໍ່ເດືອນ:")} <b>{num(monthHours)}</b>{" "}
        {tr(
          `(hours/day × days/week × 4 weeks). "OT over the limit" applies once total hours pass this; "OT within the day" applies to extra hours on a single day that are still inside this monthly limit. Hourly rate = base salary ÷ ${calcDays} ÷ ${num(hours)}h. Annual/sick leave here sets the default for employees in this department.`,
          `(ຊົ່ວໂມງ/ມື້ × ມື້/ອາທິດ × 4 ອາທິດ). "OT ເກີນມາດຕະຖານເດືອນ" ໃຊ້ເມື່ອຊົ່ວໂມງລວມເກີນນີ້; "OT ເກີນໃນມື້" ໃຊ້ກັບຊົ່ວໂມງເກີນໃນມື້ດຽວ ທີ່ຍັງຢູ່ໃນມາດຕະຖານເດືອນ. ຄ່າຈ້າງຕໍ່ຊົ່ວໂມງ = ເງິນເດືອນ ÷ ${calcDays} ÷ ${num(hours)} ຊມ. ລາພັກປະຈຳປີ/ລາປ່ວຍ ຢູ່ນີ້ແມ່ນຄ່າເລີ່ມຕົ້ນຂອງພະນັກງານໃນພະແນກ.`,
        )}
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
      dialogs.error(tr("Could not send request", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
      {renaming ? (
        <>
          <input className="inline-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ minWidth: 220 }} />
          <button type="button" className="mini-btn" disabled={edit.isPending || !name.trim() || name.trim() === dept.name}
            onClick={() => run({ name: name.trim() }, tr(`Renaming ${dept.name} to ${name.trim()}`, `ການປ່ຽນຊື່ ${dept.name} ເປັນ ${name.trim()}`))}>
            {tr("Save name", "ບັນທຶກຊື່")}
          </button>
          <button type="button" className="mini-btn" onClick={() => (setRenaming(false), setName(dept.name))}>
            {tr("Cancel", "ຍົກເລີກ")}
          </button>
        </>
      ) : (
        <>
          <h3 style={{ fontSize: 14, margin: 0 }}>{dept.name}</h3>
          <button type="button" className="mini-btn" onClick={() => setRenaming(true)}>
            {tr("✏️ Rename", "✏️ ປ່ຽນຊື່")}
          </button>
          <button
            type="button"
            className="mini-btn flag"
            disabled={edit.isPending}
            title={dept.filled > 0 ? tr("Move its employees to another department first", "ຍ້າຍພະນັກງານໄປພະແນກອື່ນກ່ອນ") : undefined}
            onClick={() => {
              if (dept.filled > 0)
                return dialogs.error(tr("Department not empty", "ພະແນກຍັງມີພະນັກງານ"), new Error(tr(`${dept.name} still has ${dept.filled} employee(s) — move them to another department first.`, `${dept.name} ຍັງມີພະນັກງານ ${dept.filled} ຄົນ — ຍ້າຍໄປພະແນກອື່ນກ່ອນ.`)));
              if (window.confirm(tr(`Close ${dept.name}? It disappears from every list once approved.`, `ປິດ ${dept.name}? ເມື່ອອະນຸມັດແລ້ວ ຈະຫາຍຈາກທຸກລາຍການ.`))) run({ close: true }, tr(`Closing ${dept.name}`, `ການປິດ ${dept.name}`));
            }}
          >
            {tr("Close department", "ປິດພະແນກ")}
          </button>
        </>
      )}
    </div>
  );
}
