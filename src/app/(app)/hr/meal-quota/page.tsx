"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, Modal, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtDate, fmtMonth, thisMonth, today } from "@/lib/format";
import {
  useDeleteMeal,
  useMealLog,
  useMeals,
  useOrgSettings,
  useRecordMeal,
  useRequestMealQuotas,
  useSaveOrgSettings,
  useStaff,
  useUpdateBenefits,
} from "@/features/hr/api";
import type { MealUse, Staff } from "@/features/hr/types";
import { batchOutcome } from "@/features/hr/utils";

type Draft = { month?: string; day?: string };

/**
 * Prototype v207 hr-mealquota: a monthly quota and an optional per-day quota.
 * Unused daily meals expire at the end of the day or carry over within the
 * month. HR records the meals here until the POS records staff meals itself.
 */
export default function MealQuotaPage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const staff = useStaff();
  const meals = useMeals();
  const request = useRequestMealQuotas();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [recording, setRecording] = useState<Staff | null>(null);
  const useOf = new Map((meals.data?.rows ?? []).map((r) => [r.user_id, r]));

  async function send(rows: Staff[]) {
    const body = rows
      .filter((s) => {
        const d = drafts[s.user_id];
        return d && ((d.month !== undefined && Number(d.month) !== s.meal_quota) || (d.day !== undefined && Number(d.day) !== s.meal_quota_per_day));
      })
      .map((s) => ({
        user_id: s.user_id,
        meal_quota: drafts[s.user_id].month !== undefined ? parseInt(drafts[s.user_id].month!) || 0 : s.meal_quota,
        meal_quota_per_day: drafts[s.user_id].day !== undefined ? parseInt(drafts[s.user_id].day!) || 0 : s.meal_quota_per_day,
      }));
    if (body.length === 0) return dialogs.error(tr("No change", "ບໍ່ມີການປ່ຽນແປງ"), new Error(tr("No changes to save.", "ບໍ່ມີຫຍັງໃຫ້ບັນທຶກ.")));
    try {
      const r = await request.mutateAsync(body);
      setDrafts((d) => {
        const next = { ...d };
        body.forEach((b) => delete next[b.user_id]);
        return next;
      });
      dialogs.success(...batchOutcome(r, tr("meal quota change(s)", "ການປ່ຽນໂຄຕາອາຫານ")));
    } catch (err) {
      dialogs.error(tr("Could not send requests", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="subview">
      <SectionHead title={t("sh_staff_meal_quota")} />
      <Lede>
        {tr(
          "Resets on the 1st of each month. A per-day quota (0 = no daily limit) caps how many meals someone can have each day, on top of the monthly quota. Changing a quota goes through the Approval Rule before it applies. Record each staff meal with \"+ Meal\" — it counts against today's and the month's quota.",
          "ເລີ່ມໃໝ່ທຸກວັນທີ 1. ໂຄຕາຕໍ່ມື້ (0 = ບໍ່ຈຳກັດຕໍ່ມື້) ຈຳກັດຈຳນວນຄາບໃນແຕ່ລະມື້ ນອກຈາກໂຄຕາຕໍ່ເດືອນ. ການປ່ຽນໂຄຕາຕ້ອງຜ່ານການອະນຸມັດກ່ອນມີຜົນ. ບັນທຶກຄາບອາຫານດ້ວຍປຸ່ມ \"+ ຄາບອາຫານ\" — ນັບເຂົ້າໂຄຕາຂອງມື້ນີ້ ແລະ ຂອງເດືອນ.",
        )}
      </Lede>
      <div className="land-row" style={{ alignItems: "flex-end" }}>
        <UnusedRule />
        <button type="button" className="submit-btn" style={{ flex: "0 0 auto" }} onClick={() => send(staff.data ?? [])} disabled={request.isPending}>
          {t("save_all")}
        </button>
      </div>
      <DataState loading={staff.isLoading || meals.isLoading} error={staff.error || meals.error}>
        <div style={{ overflowX: "auto" }}>
          <Table
            head={[
              tr("Employee", "ພະນັກງານ"),
              tr("Department", "ພະແນກ"),
              tr("Per-day quota", "ໂຄຕາຕໍ່ມື້"),
              tr("Monthly quota", "ໂຄຕາຕໍ່ເດືອນ"),
              tr("Used today", "ໃຊ້ມື້ນີ້"),
              tr("Used this month", "ໃຊ້ເດືອນນີ້"),
              tr("Left today", "ເຫຼືອມື້ນີ້"),
              tr("Left this month", "ເຫຼືອເດືອນນີ້"),
              tr("Unused (lost)", "ບໍ່ໄດ້ໃຊ້ (ເສຍໄປ)"),
              tr("Benefit notes", "ໝາຍເຫດສະຫວັດດີການ"),
              "",
            ]}
          >
            {(staff.data ?? []).length === 0 && <EmptyRow cols={11}>{tr("No employees yet.", "ຍັງບໍ່ມີພະນັກງານ.")}</EmptyRow>}
            {staff.data?.map((s) => (
              <MealRow
                key={s.user_id}
                staff={s}
                use={useOf.get(s.user_id)}
                draft={drafts[s.user_id] ?? {}}
                onDraft={(d) => setDrafts((all) => ({ ...all, [s.user_id]: { ...all[s.user_id], ...d } }))}
                onSave={() => send([s])}
                onMeal={() => setRecording(s)}
              />
            ))}
          </Table>
        </div>
      </DataState>
      <MealLog />
      <Modal open={recording !== null} onClose={() => setRecording(null)} title={recording ? tr(`Record a meal — ${recording.full_name}`, `ບັນທຶກຄາບອາຫານ — ${recording.full_name}`) : ""}>
        {recording && <RecordMealForm key={recording.user_id} emp={recording} onDone={() => setRecording(null)} />}
      </Modal>
    </div>
  );
}

/** Unused daily meals: lost at the end of the day, or carried over within the month (organisation rule). */
function UnusedRule() {
  const dialogs = useDialogs();
  const settings = useOrgSettings();
  const save = useSaveOrgSettings();
  if (!settings.data) return null;
  const current = settings.data;
  async function change(v: "expire" | "carry") {
    try {
      await save.mutateAsync({ ...current, meal_unused_daily: v });
      dialogs.success(
        tr("Saved", "ບັນທຶກແລ້ວ"),
        v === "carry"
          ? tr("Unused daily meals now carry over to later days in the same month (still capped by the monthly quota).", "ຄາບທີ່ບໍ່ໄດ້ກິນ ສະສົມໄປມື້ຕໍ່ໄປພາຍໃນເດືອນດຽວກັນ (ບໍ່ເກີນໂຄຕາຕໍ່ເດືອນ).")
          : tr("Unused daily meals are now lost at the end of each day — they do not carry over.", "ຄາບທີ່ບໍ່ໄດ້ກິນ ຈະເສຍໄປເມື່ອໝົດມື້ — ບໍ່ສະສົມ."),
      );
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }
  return (
    <Field label={tr("Unused daily meals", "ຄາບທີ່ບໍ່ໄດ້ກິນໃນມື້")} style={{ maxWidth: 300 }}>
      <select value={current.meal_unused_daily} onChange={(e) => change(e.target.value as "expire" | "carry")} disabled={save.isPending}>
        <option value="expire">{tr("Lost at end of day", "ເສຍໄປເມື່ອໝົດມື້")}</option>
        <option value="carry">{tr("Carry over within the month", "ສະສົມໄປພາຍໃນເດືອນ")}</option>
      </select>
    </Field>
  );
}

function MealRow({
  staff: s,
  use,
  draft,
  onDraft,
  onSave,
  onMeal,
}: {
  staff: Staff;
  use?: MealUse;
  draft: Draft;
  onDraft: (d: Draft) => void;
  onSave: () => void;
  onMeal: () => void;
}) {
  const dialogs = useDialogs();
  const benefits = useUpdateBenefits();
  const [notes, setNotes] = useState(s.benefit_notes);
  const patch = (body: { benefit_notes?: string }) =>
    benefits.mutateAsync({ id: s.user_id, ...body }).catch((err) => dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err));
  const u = use ?? { used_today: 0, used_month: 0, left_today: 0, left_month: 0, lost: 0 };

  return (
    <tr>
      <td>{s.full_name}</td>
      <td>{s.department || "—"}</td>
      <td>
        <input className="inline-input" style={{ width: 50, textAlign: "center" }} value={draft.day ?? String(s.meal_quota_per_day)} onChange={(e) => onDraft({ day: e.target.value.replace(/\D/g, "") })} />
      </td>
      <td>
        <input className="inline-input" style={{ width: 56, textAlign: "center" }} value={draft.month ?? String(s.meal_quota)} onChange={(e) => onDraft({ month: e.target.value.replace(/\D/g, "") })} />
      </td>
      <td className="mono">{u.used_today}</td>
      <td className="mono">{u.used_month}</td>
      <td className={`mono ${s.meal_quota > 0 && u.left_today === 0 ? "c-clay bold" : ""}`}>{s.meal_quota_per_day > 0 ? u.left_today : "—"}</td>
      <td className={`mono ${s.meal_quota > 0 && u.left_month === 0 ? "c-clay bold" : ""}`}>{u.left_month}</td>
      <td className="mono">{u.lost || "—"}</td>
      <td>
        <input
          className="inline-input"
          style={{ width: 150 }}
          value={notes}
          placeholder={tr("e.g. Free meal x2/week", "ເຊັ່ນ ອາຫານຟຣີ 2 ຄາບ/ອາທິດ")}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== s.benefit_notes && patch({ benefit_notes: notes })}
        />
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <button type="button" className="mini-btn" onClick={onMeal} disabled={s.status === "resigned" || u.left_month === 0}>
          {tr("+ Meal", "+ ຄາບອາຫານ")}
        </button>
        <button type="button" className="mini-btn" onClick={onSave}>
          {tr("Save", "ບັນທຶກ")}
        </button>
      </td>
    </tr>
  );
}

function RecordMealForm({ emp, onDone }: { emp: Staff; onDone: () => void }) {
  const dialogs = useDialogs();
  const rec = useRecordMeal();
  const [f, setF] = useState({ date: today(), meals: "1", note: "" });
  async function submit() {
    try {
      await rec.mutateAsync({ user_id: emp.user_id, date: f.date, meals: parseInt(f.meals) || 1, note: f.note.trim() });
      onDone();
    } catch (err) {
      dialogs.error(tr("Could not record", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }
  return (
    <>
      <div className="land-row">
        <Field label={tr("Date", "ວັນທີ")}>
          <input type="date" value={f.date} min={`${thisMonth()}-01`} max={today()} onChange={(e) => e.target.value && setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label={tr("Meals", "ຈຳນວນຄາບ")} style={{ maxWidth: 110 }}>
          <input type="number" min={1} max={10} value={f.meals} onChange={(e) => setF({ ...f, meals: e.target.value })} />
        </Field>
      </div>
      <Field label={tr("Note (optional)", "ໝາຍເຫດ (ບໍ່ບັງຄັບ)")}>
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={tr("e.g. lunch, Riverside", "ເຊັ່ນ ອາຫານທ່ຽງ")} />
      </Field>
      <button type="button" className="submit-btn" onClick={submit} disabled={rec.isPending}>
        {tr("Record", "ບັນທຶກ")}
      </button>
    </>
  );
}

function MealLog() {
  const dialogs = useDialogs();
  const month = thisMonth();
  const log = useMealLog(month);
  const del = useDeleteMeal();
  return (
    <div className="card">
      <h3 style={{ fontSize: 13 }}>{tr(`Meals recorded — ${fmtMonth(month)}`, `ຄາບອາຫານທີ່ບັນທຶກ — ${fmtMonth(month)}`)}</h3>
      <DataState loading={log.isLoading} error={log.error}>
        <Table head={[tr("Date", "ວັນທີ"), tr("Employee", "ພະນັກງານ"), tr("Meals", "ຄາບ"), tr("Note", "ໝາຍເຫດ"), tr("By", "ໂດຍ"), ""]}>
          {(log.data ?? []).length === 0 && <EmptyRow cols={6}>{tr("No meals recorded this month.", "ເດືອນນີ້ຍັງບໍ່ມີການບັນທຶກ.")}</EmptyRow>}
          {log.data?.map((m) => (
            <tr key={m.id}>
              <td className="mono">{fmtDate(m.date)}</td>
              <td>{m.name}</td>
              <td className="mono">{m.meals}</td>
              <td>{m.note || "—"}</td>
              <td>{m.created_by}</td>
              <td>
                <button
                  type="button"
                  className="mini-btn flag"
                  disabled={del.isPending}
                  onClick={() =>
                    window.confirm(tr(`Remove ${m.meals} meal(s) of ${m.name} on ${fmtDate(m.date)}?`, `ລຶບ ${m.meals} ຄາບ ຂອງ ${m.name} ວັນທີ ${fmtDate(m.date)}?`)) &&
                    del.mutateAsync(m.id).catch((err) => dialogs.error(tr("Could not remove", "ລຶບບໍ່ສຳເລັດ"), err))
                  }
                >
                  {tr("Remove", "ລຶບ")}
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </DataState>
    </div>
  );
}
