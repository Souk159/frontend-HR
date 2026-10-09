"use client";

import { useState } from "react";
import { DataState, Field, Lede, Modal, SectionHead, Tag, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
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
        Log each public holiday, how many days it covers, and the window employees have to take it. It automatically becomes a Leave Type —
        appearing in every employee&apos;s Leave Quota and selectable from Leave Requests — and taking it deducts from that quota like any
        other leave. If someone doesn&apos;t use it (or only uses part of it), add its remaining cash value straight to their pay —
        calculated from each person&apos;s own daily rate, for the unused days only, once the window has closed, per the Approval Rule.
      </Lede>
      <NewHolidayForm />
      <DataState loading={list.isLoading} error={list.error}>
        {(list.data ?? []).length === 0 && <p className="empty">No public holidays added yet.</p>}
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
    if (!f.name.trim()) return dialogs.error("Missing name", new Error("Enter the holiday name first."));
    if (!days || days < 1) return dialogs.error("Invalid days", new Error("Enter how many days the holiday covers (1 or more)."));
    if (!f.from || !f.to || f.to < f.from)
      return dialogs.error("Missing dates", new Error("Enter when this holiday is valid from and to — employees can only use it within that window."));
    try {
      await create.mutateAsync({ name: f.name.trim(), days, valid_from: f.from, valid_to: f.to });
      dialogs.success(
        "Added",
        `${f.name.trim()} (${days} day${days > 1 ? "s" : ""}, valid ${fmtDate(f.from)} – ${fmtDate(f.to)}) is now in every employee's Leave Quota and selectable from Leave Requests.`,
      );
      setF({ name: "", days: "1", from: "", to: "" });
    } catch (err) {
      dialogs.error("Could not add", err);
    }
  }

  return (
    <div className="land-row" style={{ alignItems: "flex-end" }}>
      <Field label="Holiday name">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Lao New Year" maxLength={50} />
      </Field>
      <Field label="Days">
        <input type="number" min={1} max={30} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} style={{ width: 80 }} />
      </Field>
      <Field label="Valid from">
        <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
      </Field>
      <Field label="Valid to">
        <input type="date" value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
      </Field>
      <button type="button" className="add-line-btn" onClick={submit} disabled={create.isPending}>
        + Add holiday
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
    if (!window.confirm(`Delete ${h.name}? It is removed from Leave Quota and Leave Requests. Only possible while nobody has taken it.`)) return;
    try {
      await del.mutateAsync(h.id);
    } catch (err) {
      dialogs.error("Could not delete", err);
    }
  }

  async function pay() {
    if (!window.confirm(`Add the unused days of ${h.name} to ${fmtMonth(month)}'s pay for ${h.unused_count} employee(s), about ${lak(h.unused_value)} in total?`)) return;
    try {
      const res = await payout.mutateAsync({ id: h.id, month });
      dialogs.success(...requestOutcome(res, `Paying out ${h.name}'s unused days in ${fmtMonth(month)}`));
    } catch (err) {
      dialogs.error("Could not request payout", err);
    }
  }

  const windowTag =
    h.window === "upcoming" ? <Tag kind="pending">Upcoming</Tag> : h.window === "closed" ? <Tag kind="low">Window closed</Tag> : <Tag kind="ok">Open now</Tag>;
  return (
    <div className="card">
      <div className="land-row" style={{ alignItems: "center", marginBottom: 0 }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>{h.name}</h3>
        {h.paid_out_month ? <Tag kind="ok">✓ Added to salary — {fmtMonth(h.paid_out_month)}</Tag> : windowTag}
        {h.payout_pending && <Tag kind="pending">Payout awaiting approval</Tag>}
        {!h.paid_out_month && (
          <span style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
            <button type="button" className="mini-btn" onClick={() => setEditing(true)}>
              ✏️ Edit
            </button>
            <button type="button" className="mini-btn flag" onClick={remove} disabled={del.isPending}>
              🗑 Delete
            </button>
          </span>
        )}
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit holiday — ${h.name}`}>
        {editing && <EditHolidayForm h={h} onDone={() => setEditing(false)} />}
      </Modal>
      <p className="hint">
        {h.days} day{h.days > 1 ? "s" : ""} · valid {fmtDate(h.valid_from)} – {fmtDate(h.valid_to)} · also a Leave Type, so it&apos;s in every
        employee&apos;s Leave Quota and pickable from Leave Requests.
      </p>
      {!h.paid_out_month && !h.payout_pending && (
        <>
          <p className="hint">
            Only employees who haven&apos;t used (all of) this holiday are paid out, and only for the days they didn&apos;t use — at their
            own daily rate (base salary ÷ the salary days in Work Rules).
          </p>
          <div className="land-row" style={{ alignItems: "flex-end" }}>
            <Field label="Add to the pay of">
              <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </Field>
            <button type="button" className="submit-btn" onClick={pay} disabled={payout.isPending || h.unused_count === 0 || h.window !== "closed"}>
              💰 Pay out unused days ({h.unused_count} employee{h.unused_count === 1 ? "" : "s"}, ~{lak(h.unused_value)})
            </button>
          </div>
          {h.window !== "closed" && (
            <p className="hint">Payout opens after {fmtDate(h.valid_to)} — until then employees can still take the holiday.</p>
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
      dialogs.success("Saved", `${f.name.trim()} updated — everyone's Leave Quota follows the new number of days.`);
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }
  return (
    <>
      <Field label="Holiday name">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={50} />
      </Field>
      <div className="land-row">
        <Field label="Days">
          <input type="number" min={1} max={30} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} style={{ width: 80 }} />
        </Field>
        <Field label="Valid from">
          <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        </Field>
        <Field label="Valid to">
          <input type="date" value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
        </Field>
      </div>
      <button type="button" className="submit-btn" onClick={submit} disabled={update.isPending}>
        💾 Save holiday
      </button>
    </>
  );
}
