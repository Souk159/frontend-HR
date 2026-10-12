"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtDate, lak, today } from "@/lib/format";
import {
  useCreateDailyHire,
  useDailyHireDayAction,
  useDailyHireDays,
  useDailyHires,
  useDeleteDailyHire,
  useDepartments,
  useOutlets,
  useUpdateDailyHire,
} from "@/features/hr/api";
import type { DailyHire, DailyHireDay, DayStatus } from "@/features/hr/types";
import { groupByDept, requestOutcome } from "@/features/hr/utils";

const editable = (s: DayStatus) => s === "draft" || s === "unlocked" || s === "denied";

function DayStatusTag({ status }: { status: DayStatus }) {
  if (status === "pending") return <Tag kind="pending">{tr("Pending", "ລໍຖ້າອະນຸມັດ")}</Tag>;
  if (status === "approved") return <Tag kind="ok">{tr("Approved", "ອະນຸມັດແລ້ວ")}</Tag>;
  if (status === "denied") return <Tag kind="low">{tr("Denied", "ປະຕິເສດ")}</Tag>;
  if (status === "unlocked") return <Tag kind="pending">{tr("Editing — not yet sent", "ກຳລັງແກ້ — ຍັງບໍ່ສົ່ງ")}</Tag>;
  return <Tag kind="muted">{tr("Not sent", "ຍັງບໍ່ສົ່ງ")}</Tag>;
}

export default function PartTimePage() {
  const { t } = useLang();
  const [tab, setTab] = useState<"add" | "history">("add");
  const days = useDailyHireDays();
  const notSent = (days.data ?? []).filter((d) => d.status === "draft").length;

  return (
    <div className="subview">
      <SectionHead title={t("sh_part_time")} />
      <div className="todo-tabs">
        <button type="button" className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}>
          {tr("Add", "ເພີ່ມ")}
        </button>
        <button type="button" className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
          {tr("Approval and History", "ອະນຸມັດ ແລະ ປະຫວັດ")}
          {notSent > 0 && <span className="tab-badge">{notSent}</span>}
        </button>
      </div>
      {tab === "add" ? <AddPanel /> : <HistoryPanel days={days.data ?? []} loading={days.isLoading} error={days.error} />}
    </div>
  );
}

function AddPanel() {
  const dialogs = useDialogs();
  const [date, setDate] = useState(today());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", department_id: "", outlet_id: "", price: "", comment: "" });
  const hires = useDailyHires(date);
  const allDays = useDailyHireDays();
  // reasons used before, offered as suggestions (prototype dhCommentList)
  const pastComments = [...new Set((allDays.data ?? []).flatMap((d) => d.hires.map((h) => h.comment)).filter(Boolean))];
  const depts = useDepartments();
  const outlets = useOutlets();
  const create = useCreateDailyHire();
  const status = hires.data?.status ?? "draft";

  async function save() {
    const price = parseFloat(form.price) || 0;
    const dept = form.department_id || depts.data?.[0]?.id || "";
    if (!form.name.trim() || !price || !dept)
      return dialogs.error(tr("Missing information", "ຂໍ້ມູນບໍ່ຄົບ"), new Error(tr("Enter at least a name, department and price per day.", "ໃສ່ຢ່າງໜ້ອຍ ຊື່, ພະແນກ ແລະ ຄ່າຈ້າງຕໍ່ມື້.")));
    try {
      await create.mutateAsync({
        work_date: date, name: form.name.trim(), department_id: dept, outlet_id: form.outlet_id || null, price_per_day: price,
        comment: form.comment.trim(),
      });
      setForm((f) => ({ ...f, name: "", price: "", comment: "" }));
      setShowForm(false);
    } catch (err) {
      dialogs.error(tr("Could not add", "ເພີ່ມບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      <Lede>
        {tr("Covers gaps in a department without adding to headcount quota. Their daily cost is factored against that department's payroll bonus pool. Pick a date first — you'll see who's already logged for that day before adding more.", "ໃຊ້ຈ້າງຄົນລາຍວັນມາຊ່ວຍພະແນກ ໂດຍບໍ່ນັບເຂົ້າໂຄຕາຄົນ. ຄ່າຈ້າງຈະຫັກອອກຈາກໂບນັດຂອງພະແນກນັ້ນ. ເລືອກວັນທີກ່ອນ — ຈະເຫັນວ່າມື້ນັ້ນມີໃຜແລ້ວ ກ່ອນເພີ່ມ.")}
      </Lede>
      <Field label={tr("Date", "ວັນທີ")} style={{ maxWidth: 220 }}>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      {!editable(status) && (
        <p className="hint warn">
          {fmtDate(date)} is {status === "pending" ? tr("waiting for approval", "ລໍຖ້າອະນຸມັດ") : tr("already approved", "ອະນຸມັດແລ້ວ")}{" "}
          {tr(
            '— new part-time staff can\'t be added to it. Use "Request a change" in Approval and History instead.',
            '— ເພີ່ມພາທາມໃໝ່ບໍ່ໄດ້. ໃຊ້ "ຂໍແກ້ໄຂ" ໃນໜ້າ ອະນຸມັດ ແລະ ປະຫວັດ ແທນ.',
          )}
        </p>
      )}
      <DataState loading={hires.isLoading} error={hires.error}>
        <Table head={[tr("Name", "ຊື່"), tr("Department", "ພະແນກ"), tr("Outlet", "Outlet"), tr("Price / day", "ຄ່າຈ້າງ / ມື້"), tr("Comment", "ເຫດຜົນ")]}>
          {(hires.data?.hires ?? []).length === 0 && <EmptyRow cols={5}>{tr(`No part-time staff logged for ${fmtDate(date)} yet.`, `ຍັງບໍ່ມີພາທາມວັນທີ ${fmtDate(date)}.`)}</EmptyRow>}
          {hires.data?.hires.map((h) => (
            <tr key={h.id}>
              <td>{h.name}</td>
              <td>{h.department}</td>
              <td>{h.outlet || "—"}</td>
              <td className="mono">{lak(h.price_per_day)}</td>
              <td>{h.comment || <span className="c-soft">—</span>}</td>
            </tr>
          ))}
        </Table>
      </DataState>
      {editable(status) && (
        <button type="button" className="mini-btn" style={{ marginTop: 8 }} onClick={() => setShowForm((v) => !v)}>
          {tr("+ Add part-time for this day", "+ ເພີ່ມພາທາມສຳລັບມື້ນີ້")}
        </button>
      )}
      {showForm && editable(status) && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="land-row">
            <Field label={tr("Name", "ຊື່")}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tr("e.g. Keo N.", "ເຊັ່ນ ແກ້ວ ນ.")} />
            </Field>
            <Field label={tr("Department", "ພະແນກ")}>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                {depts.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Outlet">
              <select value={form.outlet_id} onChange={(e) => setForm({ ...form, outlet_id: e.target.value })}>
                <option value="">—</option>
                {outlets.data?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.property})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("Price per day (₭)", "ຄ່າຈ້າງຕໍ່ມື້ (₭)")}>
              <input inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d]/g, "") })} placeholder="e.g. 120000" />
            </Field>
            <Field label={tr("Comment (reason for hiring)", "ເຫດຜົນທີ່ຈ້າງ")} grow={2}>
              <input list="dh-comments" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder={tr("e.g. covering for staff on leave", "ເຊັ່ນ ແທນຄົນລາພັກ")} />
              <datalist id="dh-comments">
                {pastComments.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <button type="button" className="submit-btn" onClick={save} disabled={create.isPending}>
              {tr("Save", "ບັນທຶກ")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function HistoryPanel({ days, loading, error }: { days: DailyHireDay[]; loading: boolean; error: unknown }) {
  const [filter, setFilter] = useState("");
  const shown = filter ? days.filter((d) => d.work_date === filter) : days;
  return (
    <>
      <Lede>
        {tr("One entry per day worked. Editable — name, price, and removing someone — only until you send it for approval; it locks the moment it's sent. Once it is approved (Approval Rule), \"Send to Accountant\" appears.", "1 ລາຍການຕໍ່ມື້. ແກ້ ຊື່, ຄ່າຈ້າງ ຫຼື ລົບຄົນ ໄດ້ຈົນກວ່າຈະສົ່ງອະນຸມັດ — ສົ່ງແລ້ວຈະລັອກ. ເມື່ອອະນຸມັດແລ້ວ ຈະມີປຸ່ມ \"ສົ່ງໃຫ້ບັນຊີ\".")}
      </Lede>
      <Field label={tr("Filter by date", "ກອງຕາມວັນທີ")} style={{ maxWidth: 220 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">{tr("All dates", "ທຸກວັນທີ")}</option>
          {days.map((d) => (
            <option key={d.work_date} value={d.work_date}>
              {fmtDate(d.work_date)}
            </option>
          ))}
        </select>
      </Field>
      <DataState loading={loading} error={error}>
        {shown.length === 0 && <p className="empty">{tr("No part-time days logged yet.", "ຍັງບໍ່ມີການບັນທຶກພາທາມ.")}</p>}
        {shown.map((d) => (
          <DayCard key={d.work_date} day={d} />
        ))}
      </DataState>
    </>
  );
}

function DayCard({ day }: { day: DailyHireDay }) {
  const dialogs = useDialogs();
  const action = useDailyHireDayAction();
  const canEdit = editable(day.status);
  const date = fmtDate(day.work_date);
  const groups = groupByDept(day.hires, (h) => h.department, []);

  async function run(kind: "submit" | "unlock" | "send-to-accounting") {
    try {
      const r = await action.mutateAsync({ date: day.work_date, action: kind });
      if (kind === "submit") dialogs.success(...requestOutcome(r, tr(`Part-time list for ${date} (${day.hires.length} staff)`, `ລາຍຊື່ພາທາມວັນທີ ${date} (${day.hires.length} ຄົນ)`)));
      if (kind === "unlock")
        dialogs.success(tr("Unlocked for editing", "ປົດລັອກໃຫ້ແກ້ແລ້ວ"), tr(`${date}'s part-time list is now editable. Make your corrections, then send them for approval.`, `ລາຍຊື່ພາທາມວັນທີ ${date} ແກ້ໄດ້ແລ້ວ. ແກ້ໃຫ້ຮຽບຮ້ອຍ ແລ້ວສົ່ງອະນຸມັດ.`));
      if (kind === "send-to-accounting")
        dialogs.success(tr("Sent to Accountant", "ສົ່ງໃຫ້ບັນຊີແລ້ວ"), tr(`Part-time cost for ${date} sent as ${r.messages_sent} department message(s).`, `ສົ່ງຄ່າພາທາມວັນທີ ${date} ແລ້ວ ເປັນ ${r.messages_sent} ລາຍການ.`));
    } catch (err) {
      dialogs.error(tr("Could not complete", "ດຳເນີນການບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="card">
      <h3 className="card-head">
        <span>
          {date} — {day.hires.length} part-time, {lak(day.total)}
        </span>
        <span className="approve-actions">
          <DayStatusTag status={day.status} />
          {(day.status === "draft" || day.status === "denied") && (
            <button type="button" className="mini-btn" onClick={() => run("submit")} disabled={action.isPending}>
              {tr("Send for approval", "ສົ່ງອະນຸມັດ")}
            </button>
          )}
          {day.status === "unlocked" && (
            <button type="button" className="submit-btn" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => run("submit")} disabled={action.isPending}>
              {tr("Send correction for approval", "ສົ່ງການແກ້ໄຂໄປອະນຸມັດ")}
            </button>
          )}
          {day.status === "approved" && !day.sent_to_accounting && (
            <>
              <button type="button" className="mini-btn flag" onClick={() => run("unlock")} disabled={action.isPending}>
                {tr("Request a change", "ຂໍແກ້ໄຂ")}
              </button>
              <button type="button" className="mini-btn" onClick={() => run("send-to-accounting")} disabled={action.isPending}>
                {tr("Send to Accountant", "ສົ່ງໃຫ້ບັນຊີ")}
              </button>
            </>
          )}
          {day.sent_to_accounting && (
            <button type="button" className="mini-btn" disabled>
              {tr("✓ Sent to Accountant", "✓ ສົ່ງໃຫ້ບັນຊີແລ້ວ")}
            </button>
          )}
        </span>
      </h3>
      {groups.map(([dept, hires]) => (
        <div key={dept}>
          <h4 style={{ fontSize: 12, margin: "8px 0 4px" }}>{dept}</h4>
          <Table head={[tr("Name", "ຊື່"), tr("Outlet", "Outlet"), tr("Price/day", "ຄ່າຈ້າງ/ມື້"), ""]}>
            {hires.map((h) => (
              <HireRow key={h.id} hire={h} editable={canEdit} />
            ))}
          </Table>
        </div>
      ))}
    </div>
  );
}

function HireRow({ hire, editable }: { hire: DailyHire; editable: boolean }) {
  const dialogs = useDialogs();
  const update = useUpdateDailyHire();
  const del = useDeleteDailyHire();
  const [name, setName] = useState(hire.name);
  const [price, setPrice] = useState(String(hire.price_per_day));

  const commit = (body: { name?: string; price_per_day?: number }) =>
    update.mutateAsync({ id: hire.id, ...body }).catch((err) => dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err));

  if (!editable)
    return (
      <tr>
        <td>{hire.name}</td>
        <td>{hire.outlet || "—"}</td>
        <td className="mono">{lak(hire.price_per_day)}</td>
        <td>—</td>
      </tr>
    );
  return (
    <tr>
      <td>
        <input className="inline-input" style={{ width: 130 }} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== hire.name && commit({ name })} />
      </td>
      <td>{hire.outlet || "—"}</td>
      <td>
        <input
          className="inline-input"
          style={{ width: 100, textAlign: "right" }}
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={() => Number(price) !== hire.price_per_day && commit({ price_per_day: Number(price) })}
        />
      </td>
      <td>
        <button type="button" className="mini-btn flag" onClick={() => del.mutateAsync(hire.id).catch((err) => dialogs.error(tr("Could not delete", "ລົບບໍ່ສຳເລັດ"), err))}>
          {tr("Delete", "ລົບ")}
        </button>
      </td>
    </tr>
  );
}
