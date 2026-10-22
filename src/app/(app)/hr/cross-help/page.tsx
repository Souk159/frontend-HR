"use client";

import { useState } from "react";
import { DataState, Field, Lede, Modal, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtDate, lak, thisMonth, today } from "@/lib/format";
import { useCreateCrossHelp, useCrossHelp, useDepartments, useOrgSettings, useStaff } from "@/features/hr/api";
import type { Department, Staff } from "@/features/hr/types";
import { groupByDept } from "@/features/hr/utils";
import { hm } from "@/features/hr/crossHelp";

/**
 * Prototype v207 hr-crosshelp: when someone covers another department for a
 * while, log it on their name — it's paid as a bonus on top of their salary
 * (their hourly rate × their department's cross-help rate in Work Rules).
 */
export default function CrossHelpPage() {
  const { t } = useLang();
  const staff = useStaff();
  const depts = useDepartments();
  const log = useCrossHelp(today().slice(0, 4));
  const [calling, setCalling] = useState<Staff | null>(null);
  const active = (staff.data ?? []).filter((s) => s.status === "active");
  const groups = groupByDept(active, (s) => s.department, (depts.data ?? []).map((d) => d.name)).filter(([, r]) => r.length > 0);
  const minutes = (userId: string, match: (date: string) => boolean) =>
    (log.data ?? []).filter((r) => r.user_id === userId && match(r.date)).reduce((s, r) => s + r.minutes, 0);

  return (
    <div className="subview">
      <SectionHead title={t("sh_cross_help")} />
      <Lede>
        {tr(
          'When someone from one department covers another for a while — click "Call cross-help" on their name, say which department they went to and for how long, and it\'s logged and paid as a bonus on top of their normal salary. The bonus rate (× their hourly rate) is set per department in Work Rules.',
          'ເມື່ອພະນັກງານພະແນກໜຶ່ງໄປຊ່ວຍອີກພະແນກໜຶ່ງ — ກົດ "ເອີ້ນຊ່ວຍຂ້າມພະແນກ" ທີ່ຊື່ຂອງເຂົາ, ເລືອກພະແນກທີ່ໄປຊ່ວຍ ແລະ ເວລາ. ລະບົບບັນທຶກ ແລະ ຈ່າຍເປັນໂບນັດ ເພີ່ມຈາກເງິນເດືອນປົກກະຕິ. ອັດຕາໂບນັດ (× ຄ່າຈ້າງ/ຊມ ຂອງເຂົາ) ຕັ້ງແຍກຕາມພະແນກ ໃນກົດລະບຽບການເຮັດວຽກ.',
        )}
      </Lede>
      <DataState loading={staff.isLoading || log.isLoading} error={staff.error || log.error}>
        {groups.map(([dept, rows]) => (
          <div className="card" key={dept}>
            <h3 style={{ fontSize: 14 }}>{dept}</h3>
            <Table head={[tr("Employee", "ພະນັກງານ"), tr("Today", "ມື້ນີ້"), tr("This month", "ເດືອນນີ້"), ""]}>
              {rows.map((s) => {
                const day = minutes(s.user_id, (d) => d === today());
                const month = minutes(s.user_id, (d) => d.startsWith(thisMonth()));
                return (
                  <tr key={s.user_id}>
                    <td>
                      {s.full_name}
                      {s.property && <div className="hint">{s.property}</div>}
                    </td>
                    <td className="mono">{day ? hm(day) : "—"}</td>
                    <td className="mono">{month ? hm(month) : "—"}</td>
                    <td>
                      <button type="button" className="mini-btn" onClick={() => setCalling(s)}>
                        {tr("📞 Call cross-help", "📞 ເອີ້ນຊ່ວຍຂ້າມພະແນກ")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </div>
        ))}
      </DataState>
      <Modal
        open={calling !== null}
        onClose={() => setCalling(null)}
        title={calling ? tr(`Call cross-department help — ${calling.full_name}`, `ເອີ້ນຊ່ວຍຂ້າມພະແນກ — ${calling.full_name}`) : ""}
      >
        {calling && <CallForm key={calling.user_id} emp={calling} depts={depts.data ?? []} onDone={() => setCalling(null)} />}
      </Modal>
    </div>
  );
}

function CallForm({ emp, depts, onDone }: { emp: Staff; depts: Department[]; onDone: () => void }) {
  const dialogs = useDialogs();
  const create = useCreateCrossHelp();
  const settings = useOrgSettings();
  const others = depts.filter((d) => d.id !== emp.department_id);
  const [f, setF] = useState({ date: today(), dept: others[0]?.id ?? "", hours: "0", minutes: "0", note: "" });
  const total = Math.round((parseFloat(f.hours) || 0) * 60 + (parseFloat(f.minutes) || 0));
  const home = depts.find((d) => d.id === emp.department_id);
  const rate = home?.cross_help_rate ?? 1;
  const hourly = emp.base_salary / (settings.data?.salary_calc_days || 30) / (home?.hours_per_day || 8);
  const bonus = Math.round((hourly * rate * total) / 60);

  async function submit() {
    if (!f.dept) return dialogs.error(tr("Missing department", "ຂາດພະແນກ"), new Error(tr("Choose which department they went to help.", "ເລືອກພະແນກທີ່ໄປຊ່ວຍ.")));
    if (total <= 0) return dialogs.error(tr("No time entered", "ບໍ່ໄດ້ໃສ່ເວລາ"), new Error(tr("Enter the hours and/or minutes they spent helping.", "ໃສ່ຊົ່ວໂມງ ແລະ/ຫຼື ນາທີທີ່ໄປຊ່ວຍ.")));
    try {
      const r = await create.mutateAsync({ user_id: emp.user_id, date: f.date, help_department_id: f.dept, minutes: total, note: f.note.trim() });
      onDone();
      const help = depts.find((d) => d.id === f.dept)?.name ?? "";
      dialogs.success(
        tr("Recorded", "ບັນທຶກແລ້ວ"),
        tr(
          `${emp.full_name} helped ${help} for ${hm(total)} on ${fmtDate(f.date)} — a ${lak(r.bonus)} bonus has been added to their Payroll.`,
          `${emp.full_name} ໄປຊ່ວຍ ${help} ${hm(total)} ວັນທີ ${fmtDate(f.date)} — ເພີ່ມໂບນັດ ${lak(r.bonus)} ເຂົ້າເງິນເດືອນແລ້ວ.`,
        ),
      );
    } catch (err) {
      dialogs.error(tr("Could not record", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      <div className="land-row">
        <Field label={tr("Date", "ວັນທີ")}>
          <input type="date" value={f.date} max={today()} onChange={(e) => e.target.value && setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label={tr("Went to help which department", "ໄປຊ່ວຍພະແນກໃດ")}>
          <select value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })}>
            {others.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="land-row">
        <Field label={tr("Hours", "ຊົ່ວໂມງ")} style={{ maxWidth: 110 }}>
          <input type="number" min={0} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} />
        </Field>
        <Field label={tr("Minutes", "ນາທີ")} style={{ maxWidth: 110 }}>
          <input type="number" min={0} max={59} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} />
        </Field>
      </div>
      <Field label={tr("Note (optional)", "ໝາຍເຫດ (ບໍ່ບັງຄັບ)")}>
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={tr("e.g. covered the bar during the wedding", "ເຊັ່ນ ໄປຊ່ວຍບາຕອນງານແຕ່ງ")} />
      </Field>
      {total > 0 && (
        <p className="hint">
          {tr(
            `= ${hm(total)} → bonus ≈ ${lak(bonus)} (× ${rate} of ${home?.name ?? "their department"}'s hourly rate)`,
            `= ${hm(total)} → ໂບນັດ ≈ ${lak(bonus)} (× ${rate} ຂອງຄ່າຈ້າງ/ຊມ ຂອງ ${home?.name ?? "ພະແນກຂອງເຂົາ"})`,
          )}
        </p>
      )}
      <button type="button" className="submit-btn" onClick={submit} disabled={create.isPending}>
        {tr("Record", "ບັນທຶກ")}
      </button>
    </>
  );
}
