"use client";

import { useState } from "react";
import { DataState, Field, Lede, Modal, SectionHead, Tag, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtDate, fmtMonth, lak, thisMonth } from "@/lib/format";
import { useCreateHoliday, useDeleteHoliday, useHolidayPayout, usePublicHolidays, useUpdateHoliday } from "@/features/hr/api";
import type { PublicHoliday } from "@/features/hr/types";
import { requestOutcome } from "@/features/hr/utils";

/** Prototype v168 hr-publicholiday. */
export default function PublicHolidayPage() {
  const { t } = useLang();
  const list = usePublicHolidays();
  return (
    <div className="subview">
      <SectionHead title={t("sh_public_holiday")} />
      <Lede>
        {tr("Log each public holiday, how many days it covers, and the window employees have to take it. It automatically becomes a Leave Type — appearing in every employee's Leave Quota and selectable from Leave Requests — and taking it deducts from that quota like any other leave. If someone doesn't use it (or only uses part of it), add its remaining cash value straight to their pay — calculated from each person's own daily rate, for the unused days only, once the window has closed, per the Approval Rule.", "ບັນທຶກວັນພັກລັດຖະການ, ຈຳນວນມື້ ແລະ ຊ່ວງທີ່ພັກໄດ້. ລະບົບສ້າງເປັນປະເພດລາໃຫ້ອັດຕະໂນມັດ — ມີໃນໂຄຕາການລາຂອງທຸກຄົນ ແລະ ເລືອກໄດ້ໃນຄຳຂໍລາ. ຖ້າໃຜບໍ່ໄດ້ໃຊ້ (ຫຼື ໃຊ້ບໍ່ໝົດ), ຈ່າຍເປັນເງິນແທນໄດ້ ຕາມຄ່າຈ້າງຕໍ່ມື້ຂອງແຕ່ລະຄົນ ສະເພາະມື້ທີ່ບໍ່ໄດ້ໃຊ້ ຫຼັງໝົດຊ່ວງວັນພັກ ຕາມກົດການອະນຸມັດ.")}
      </Lede>
      <NewHolidayForm />
      <DataState loading={list.isLoading} error={list.error}>
        {(list.data ?? []).length === 0 && <p className="empty">{tr("No public holidays added yet.", "ຍັງບໍ່ມີວັນພັກລັດຖະການ.")}</p>}
        {list.data?.map((h) => (
          <HolidayCard key={h.id} h={h} />
        ))}
      </DataState>
    </div>
  );
}

function NewHolidayForm() {
  const dialogs = useDialogs();
  const create = useCreateHoliday();
  const [f, setF] = useState({ name: "", days: "1", from: "", to: "" });

  async function submit() {
    const days = parseInt(f.days);
    if (!f.name.trim()) return dialogs.error(tr("Missing name", "ຂາດຊື່"), new Error(tr("Enter the holiday name first.", "ໃສ່ຊື່ວັນພັກກ່ອນ.")));
    if (!days || days < 1) return dialogs.error(tr("Invalid days", "ຈຳນວນມື້ບໍ່ຖືກ"), new Error(tr("Enter how many days the holiday covers (1 or more).", "ໃສ່ຈຳນວນມື້ຂອງວັນພັກ (1 ຂຶ້ນໄປ).")));
    if (!f.from || !f.to || f.to < f.from)
      return dialogs.error(tr("Missing dates", "ຂາດວັນທີ"), new Error(tr("Enter when this holiday is valid from and to — employees can only use it within that window.", "ໃສ່ວັນເລີ່ມ ແລະ ວັນສິ້ນສຸດ — ພະນັກງານພັກໄດ້ສະເພາະໃນຊ່ວງນີ້.")));
    try {
      await create.mutateAsync({ name: f.name.trim(), days, valid_from: f.from, valid_to: f.to });
      dialogs.success(
        tr("Added", "ເພີ່ມແລ້ວ"),
        tr(`${f.name.trim()} (${days} day${days > 1 ? "s" : ""}, valid ${fmtDate(f.from)} – ${fmtDate(f.to)}) is now in every employee's Leave Quota and selectable from Leave Requests.`, `${f.name.trim()} (${days} ມື້, ໃຊ້ໄດ້ ${fmtDate(f.from)} – ${fmtDate(f.to)}) ເຂົ້າໂຄຕາລາພັກຂອງທຸກຄົນແລ້ວ ແລະ ເລືອກໄດ້ໃນຄຳຂໍລາພັກ.`),
      );
      setF({ name: "", days: "1", from: "", to: "" });
    } catch (err) {
      dialogs.error(tr("Could not add", "ເພີ່ມບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="land-row" style={{ alignItems: "flex-end" }}>
      <Field label={tr("Holiday name", "ຊື່ວັນພັກ")}>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={tr("e.g. Lao New Year", "ເຊັ່ນ ປີໃໝ່ລາວ")} maxLength={50} />
      </Field>
      <Field label={tr("Days", "ມື້")}>
        <input type="number" min={1} max={30} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} style={{ width: 80 }} />
      </Field>
      <Field label={tr("Valid from", "ໃຊ້ໄດ້ແຕ່")}>
        <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
      </Field>
      <Field label={tr("Valid to", "ໃຊ້ໄດ້ຮອດ")}>
        <input type="date" value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
      </Field>
      <button type="button" className="add-line-btn" onClick={submit} disabled={create.isPending}>
        {tr("+ Add holiday", "+ ເພີ່ມວັນພັກ")}
      </button>
    </div>
  );
}

function HolidayCard({ h }: { h: PublicHoliday }) {
  const dialogs = useDialogs();
  const payout = useHolidayPayout();
  const del = useDeleteHoliday();
  const [month, setMonth] = useState(thisMonth());
  const [editing, setEditing] = useState(false);

  async function remove() {
    if (!window.confirm(tr(`Delete ${h.name}? It is removed from Leave Quota and Leave Requests. Only possible while nobody has taken it.`, `ລຶບ ${h.name}? ຈະຖືກເອົາອອກຈາກໂຄຕາລາພັກ ແລະ ຄຳຂໍລາພັກ. ລຶບໄດ້ສະເພາະຕອນຍັງບໍ່ມີໃຜໃຊ້.`))) return;
    try {
      await del.mutateAsync(h.id);
    } catch (err) {
      dialogs.error(tr("Could not delete", "ລົບບໍ່ສຳເລັດ"), err);
    }
  }

  async function pay() {
    if (!window.confirm(tr(`Add the unused days of ${h.name} to ${fmtMonth(month)}'s pay for ${h.unused_count} employee(s), about ${lak(h.unused_value)} in total?`, `ເພີ່ມມື້ທີ່ບໍ່ໄດ້ໃຊ້ຂອງ ${h.name} ເຂົ້າເງິນເດືອນ ${fmtMonth(month)} ໃຫ້ ${h.unused_count} ຄົນ, ລວມປະມານ ${lak(h.unused_value)}?`))) return;
    try {
      const res = await payout.mutateAsync({ id: h.id, month });
      dialogs.success(...requestOutcome(res, tr(`Paying out ${h.name}'s unused days in ${fmtMonth(month)}`, `ການຈ່າຍມື້ທີ່ບໍ່ໄດ້ໃຊ້ຂອງ ${h.name} ໃນ ${fmtMonth(month)}`)));
    } catch (err) {
      dialogs.error(tr("Could not request payout", "ຂໍຈ່າຍເງິນແທນບໍ່ສຳເລັດ"), err);
    }
  }

  const windowTag =
    h.window === "upcoming" ? <Tag kind="pending">{tr("Upcoming", "ຍັງບໍ່ເຖິງ")}</Tag> : h.window === "closed" ? <Tag kind="low">{tr("Window closed", "ໝົດຊ່ວງແລ້ວ")}</Tag> : <Tag kind="ok">{tr("Open now", "ກຳລັງເປີດ")}</Tag>;
  return (
    <div className="card">
      <div className="land-row" style={{ alignItems: "center", marginBottom: 0 }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>{h.name}</h3>
        {h.paid_out_month ? <Tag kind="ok">✓ {tr("Added to salary", "ເພີ່ມເຂົ້າເງິນເດືອນແລ້ວ")} — {fmtMonth(h.paid_out_month)}</Tag> : windowTag}
        {h.payout_pending && <Tag kind="pending">{tr("Payout awaiting approval", "ການຈ່າຍລໍຖ້າອະນຸມັດ")}</Tag>}
        {!h.paid_out_month && (
          <span style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
            <button type="button" className="mini-btn" onClick={() => setEditing(true)}>
              {tr("✏️ Edit", "✏️ ແກ້ໄຂ")}
            </button>
            <button type="button" className="mini-btn flag" onClick={remove} disabled={del.isPending}>
              {tr("🗑 Delete", "🗑 ລົບ")}
            </button>
          </span>
        )}
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title={tr(`Edit holiday — ${h.name}`, `ແກ້ວັນພັກ — ${h.name}`)}>
        {editing && <EditHolidayForm h={h} onDone={() => setEditing(false)} />}
      </Modal>
      <p className="hint">
        {tr(
          `${h.days} day${h.days > 1 ? "s" : ""} · valid ${fmtDate(h.valid_from)} – ${fmtDate(h.valid_to)} · also a Leave Type, so it's in every employee's Leave Quota and pickable from Leave Requests.`,
          `${h.days} ມື້ · ໃຊ້ໄດ້ ${fmtDate(h.valid_from)} – ${fmtDate(h.valid_to)} · ເປັນປະເພດລາພັກນຳ, ຈຶ່ງຢູ່ໃນໂຄຕາລາພັກຂອງທຸກຄົນ ແລະ ເລືອກໄດ້ໃນຄຳຂໍລາພັກ.`,
        )}
      </p>
      {!h.paid_out_month && !h.payout_pending && (
        <>
          <p className="hint">
            {tr("Only employees who haven't used (all of) this holiday are paid out, and only for the days they didn't use — at their own daily rate (base salary ÷ the salary days in Work Rules).", "ຈ່າຍສະເພາະຄົນທີ່ຍັງບໍ່ໄດ້ໃຊ້ (ຄົບ) ແລະ ສະເພາະມື້ທີ່ບໍ່ໄດ້ໃຊ້ — ຕາມຄ່າຈ້າງຕໍ່ມື້ຂອງຕົນ (ເງິນເດືອນ ÷ ຕົວຫານໃນກົດລະບຽບການເຮັດວຽກ).")}
          </p>
          <div className="land-row" style={{ alignItems: "flex-end" }}>
            <Field label={tr("Add to the pay of", "ເພີ່ມເຂົ້າເງິນເດືອນຂອງເດືອນ")}>
              <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </Field>
            <button type="button" className="submit-btn" onClick={pay} disabled={payout.isPending || h.unused_count === 0 || h.window !== "closed"}>
              {tr(`💰 Pay out unused days (${h.unused_count} employee${h.unused_count === 1 ? "" : "s"}, ~${lak(h.unused_value)})`, `💰 ຈ່າຍມື້ທີ່ບໍ່ໄດ້ໃຊ້ (${h.unused_count} ຄົນ, ~${lak(h.unused_value)})`)}
            </button>
          </div>
          {h.window !== "closed" && (
            <p className="hint">{tr(`Payout opens after ${fmtDate(h.valid_to)} — until then employees can still take the holiday.`, `ຈ່າຍໄດ້ຫຼັງວັນທີ ${fmtDate(h.valid_to)} — ກ່ອນນັ້ນ ພະນັກງານຍັງພັກໄດ້.`)}</p>
          )}
        </>
      )}
    </div>
  );
}

function EditHolidayForm({ h, onDone }: { h: PublicHoliday; onDone: () => void }) {
  const dialogs = useDialogs();
  const update = useUpdateHoliday();
  const [f, setF] = useState({ name: h.name, days: String(h.days), from: h.valid_from, to: h.valid_to });
  async function submit() {
    try {
      await update.mutateAsync({ id: h.id, name: f.name.trim(), days: parseInt(f.days) || 0, valid_from: f.from, valid_to: f.to });
      onDone();
      dialogs.success(tr("Saved", "ບັນທຶກແລ້ວ"), tr(`${f.name.trim()} updated — everyone's Leave Quota follows the new number of days.`, `ອັບເດດ ${f.name.trim()} ແລ້ວ — ໂຄຕາລາພັກຂອງທຸກຄົນປ່ຽນຕາມຈຳນວນມື້ໃໝ່.`));
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }
  return (
    <>
      <Field label={tr("Holiday name", "ຊື່ວັນພັກ")}>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={50} />
      </Field>
      <div className="land-row">
        <Field label={tr("Days", "ມື້")}>
          <input type="number" min={1} max={30} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} style={{ width: 80 }} />
        </Field>
        <Field label={tr("Valid from", "ໃຊ້ໄດ້ແຕ່")}>
          <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        </Field>
        <Field label={tr("Valid to", "ໃຊ້ໄດ້ຮອດ")}>
          <input type="date" value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
        </Field>
      </div>
      <button type="button" className="submit-btn" onClick={submit} disabled={update.isPending}>
        {tr("💾 Save holiday", "💾 ບັນທຶກວັນພັກ")}
      </button>
    </>
  );
}
