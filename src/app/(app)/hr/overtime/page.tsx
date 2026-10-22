"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtDate, fmtMonth, num, today } from "@/lib/format";
import { useFinalizeOTDay, useOT, useSaveOTDay, useStaff } from "@/features/hr/api";
import type { OTDay, OTKind, OTLine } from "@/features/hr/types";

const kindLabel = (k: OTKind) => (k === "over" ? tr("Over the monthly limit", "ເກີນມາດຕະຖານເດືອນ") : tr("Within the day", "ໃນມື້"));

/**
 * Prototype v207 hr-overtime: the scanner's OT is only a draft. HR checks each
 * date against the signed OT document, corrects it and finalizes it with the
 * document's reference; only finalized OT reaches Payroll. A resort account
 * sees its own resort's staff only.
 */
export default function OvertimePage() {
  const { t } = useLang();
  const [date, setDate] = useState(today());
  const ot = useOT(date);
  return (
    <div className="subview">
      <SectionHead title={t("sh_overtime")} />
      <Lede>
        {tr(
          "The scanner's OT is a draft. Nothing reaches Payroll until you finalize a date against the signed OT document's reference number. Correct the hours or the type, add someone who is on the document, or take someone off — then finalize. Editing a finalized date puts it back to draft; Payroll keeps the finalized figures until you finalize it again.",
          "OT ຈາກເຄື່ອງສະແກນເປັນພຽງຮ່າງ. ບໍ່ມີຫຍັງເຂົ້າເງິນເດືອນ ຈົນກວ່າຈະ Finalize ແຕ່ລະວັນ ດ້ວຍເລກອ້າງອີງຂອງໃບ OT ທີ່ເຊັນແລ້ວ. ແກ້ຊົ່ວໂມງ ຫຼື ປະເພດ, ເພີ່ມຄົນທີ່ມີຊື່ໃນໃບ, ຫຼື ເອົາຄົນອອກ — ແລ້ວ Finalize. ການແກ້ວັນທີ່ Finalize ແລ້ວ ຈະກັບເປັນຮ່າງ; ເງິນເດືອນຍັງໃຊ້ຕົວເລກເກົ່າ ຈົນກວ່າຈະ Finalize ໃໝ່.",
        )}
      </Lede>
      <Field label={tr("Date", "ວັນທີ")} style={{ maxWidth: 220 }}>
        <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      <DataState loading={ot.isLoading} error={ot.error}>
        {ot.data && (
          <>
            {!ot.data.active && (
              <p className="hint warn">
                {ot.data.finalize_from
                  ? tr(
                      `${fmtMonth(ot.data.month)}'s OT is still worked out from the scans — finalizing starts in ${fmtMonth(ot.data.finalize_from)} (Work Rules). This list is for information only.`,
                      `OT ຂອງ ${fmtMonth(ot.data.month)} ຍັງຄິດຈາກການສະແກນ — ການ Finalize ເລີ່ມ ${fmtMonth(ot.data.finalize_from)} (ກົດລະບຽບການເຮັດວຽກ). ລາຍການນີ້ເບິ່ງຢ່າງດຽວ.`,
                    )
                  : tr(
                      "Finalizing OT is turned off in Work Rules — OT comes from the scans. This list is for information only.",
                      "ການ Finalize OT ປິດຢູ່ໃນກົດລະບຽບການເຮັດວຽກ — OT ມາຈາກການສະແກນ. ລາຍການນີ້ເບິ່ງຢ່າງດຽວ.",
                    )}
              </p>
            )}
            {ot.data.closed && (
              <p className="hint warn">
                {tr(`${fmtMonth(ot.data.month)}'s payroll is closed — OT can no longer be changed.`, `ເງິນເດືອນ ${fmtMonth(ot.data.month)} ປິດແລ້ວ — ແກ້ OT ບໍ່ໄດ້ອີກ.`)}
              </p>
            )}
            <DayChips data={ot.data} current={date} onPick={setDate} />
            <DayCard key={`${date}:${ot.dataUpdatedAt}`} data={ot.data} />
            <MonthTotals data={ot.data} />
          </>
        )}
      </DataState>
    </div>
  );
}

function DayChips({ data, current, onPick }: { data: OTDay; current: string; onPick: (d: string) => void }) {
  if (data.days.length === 0) return null;
  return (
    <div className="land-row" style={{ flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      <span className="hint">{tr(`OT dates in ${fmtMonth(data.month)}:`, `ວັນທີ່ມີ OT ໃນ ${fmtMonth(data.month)}:`)}</span>
      {data.days.map((d) => (
        <button
          key={d.date}
          type="button"
          className="mini-btn"
          style={d.date === current ? { background: "var(--jade)", color: "var(--sand)" } : undefined}
          onClick={() => onPick(d.date)}
        >
          {fmtDate(d.date)} · {d.people} {d.finalized ? "✓" : "…"}
        </button>
      ))}
    </div>
  );
}

type Edit = { final: string; kind: OTKind; removed: boolean };

function DayCard({ data }: { data: OTDay }) {
  const dialogs = useDialogs();
  const save = useSaveOTDay();
  const finalize = useFinalizeOTDay();
  const staff = useStaff();
  const lines = data.lines;
  const docRefs = [...new Set(lines.filter((l) => l.doc_ref).map((l) => l.doc_ref))];
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [added, setAdded] = useState<{ user_id: string; final: string; kind: OTKind }[]>([]);
  const [docRef, setDocRef] = useState("");
  // finalizing touches draft lines only — finalized ones keep their own document
  const drafts = lines.filter((l) => l.status === "draft");
  const canWrite = data.active && !data.closed;
  const listed = lines.filter((l) => !l.removed);
  const allFinal = lines.length > 0 && lines.every((l) => l.status === "finalized");
  const editOf = (l: OTLine): Edit => edits[l.user_id] ?? { final: String(l.final_hours), kind: l.kind, removed: l.removed };
  const inList = new Set([...lines.map((l) => l.user_id), ...added.map((a) => a.user_id)]);
  const addable = (staff.data ?? []).filter((s) => s.status !== "resigned" && s.requires_scan && !inList.has(s.user_id));
  const [pick, setPick] = useState({ user_id: "", final: "1", kind: "daily" as OTKind });

  function startEdit() {
    setEdits({});
    setAdded([]);
    setEditing(true);
  }

  async function saveEdits() {
    const changed = lines
      .map((l) => ({ l, e: editOf(l) }))
      .filter(({ l, e }) => Number(e.final) !== l.final_hours || e.kind !== l.kind || e.removed !== l.removed)
      .map(({ l, e }) => ({ user_id: l.user_id, final_hours: Number(e.final) || 0, kind: e.kind, removed: e.removed }));
    const body = [...changed, ...added.map((a) => ({ user_id: a.user_id, final_hours: Number(a.final) || 0, kind: a.kind, removed: false }))];
    if (body.length === 0) {
      setEditing(false);
      return dialogs.error(tr("No change", "ບໍ່ມີການປ່ຽນ"), new Error(tr("Nothing was changed.", "ບໍ່ມີຫຍັງປ່ຽນ.")));
    }
    try {
      const r = await save.mutateAsync({ date: data.date, lines: body });
      setEditing(false);
      dialogs.success(
        tr("Edits saved", "ບັນທຶກການແກ້ແລ້ວ"),
        tr(
          `${r.changed} OT line(s) changed for ${fmtDate(data.date)}. Payroll keeps the finalized figures until you finalize this date per the signed document.`,
          `ແກ້ OT ${r.changed} ແຖວ ຂອງວັນທີ ${fmtDate(data.date)}. ເງິນເດືອນຍັງໃຊ້ຕົວເລກທີ່ Finalize ແລ້ວ ຈົນກວ່າຈະ Finalize ວັນນີ້ຕາມໃບ OT.`,
        ),
      );
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  async function doFinalize() {
    const ref = docRef.trim();
    if (!ref)
      return dialogs.error(
        tr("Document reference needed", "ຕ້ອງມີເລກເອກະສານ"),
        new Error(tr("Enter the number or reference of the signed OT document you checked these hours against.", "ໃສ່ເລກ ຫຼື ເລກອ້າງອີງຂອງໃບ OT ທີ່ເຊັນແລ້ວ ທີ່ໃຊ້ກວດຊົ່ວໂມງເຫຼົ່ານີ້.")),
      );
    const toPay = drafts.filter((l) => !l.removed);
    const total = toPay.reduce((s, l) => s + l.final_hours, 0);
    if (
      !window.confirm(
        tr(
          `Finalize ${fmtDate(data.date)}: ${toPay.length} people, ${num(total)}h per document ${ref}? Payroll's OT for this date becomes exactly this list.`,
          `Finalize ວັນທີ ${fmtDate(data.date)}: ${toPay.length} ຄົນ, ${num(total)} ຊມ ຕາມເອກະສານ ${ref}? OT ຂອງວັນນີ້ໃນເງິນເດືອນ ຈະເປັນຕາມລາຍການນີ້.`,
        ),
      )
    )
      return;
    try {
      const r = await finalize.mutateAsync({ date: data.date, doc_ref: ref });
      dialogs.success(
        tr("OT finalized", "Finalize OT ແລ້ວ"),
        tr(
          `${fmtDate(data.date)}'s OT now matches document ${ref} — ${r.people} people, ${num(r.hours)}h — and is in Payroll.`,
          `OT ວັນທີ ${fmtDate(data.date)} ຕົງກັບເອກະສານ ${ref} ແລ້ວ — ${r.people} ຄົນ, ${num(r.hours)} ຊມ — ແລະ ເຂົ້າເງິນເດືອນແລ້ວ.`,
        ),
      );
    } catch (err) {
      dialogs.error(tr("Could not finalize", "Finalize ບໍ່ສຳເລັດ"), err);
    }
  }

  const head = [
    tr("Employee", "ພະນັກງານ"),
    tr("Clock in", "ເວລາເຂົ້າ"),
    tr("Clock out", "ເວລາອອກ"),
    tr("Scanner OT", "OT ຈາກເຄື່ອງສະແກນ"),
    tr("Final OT (per document)", "OT ສຸດທ້າຍ (ຕາມໃບ)"),
    tr("OT type", "ປະເພດ OT"),
    tr("Status", "ສະຖານະ"),
    ...(editing ? [""] : []),
  ];

  return (
    <div className="card">
      <h3 className="card-head">
        <span>
          {tr(
            `OT on ${fmtDate(data.date)} — ${listed.length} people, ${num(listed.reduce((s, l) => s + l.final_hours, 0))}h`,
            `OT ວັນທີ ${fmtDate(data.date)} — ${listed.length} ຄົນ, ${num(listed.reduce((s, l) => s + l.final_hours, 0))} ຊມ`,
          )}
        </span>
        {lines.length > 0 &&
          (allFinal ? (
            <Tag kind="ok">{tr(`✓ Finalized — document ${docRefs.join(", ") || "—"}`, `✓ Finalize ແລ້ວ — ເອກະສານ ${docRefs.join(", ") || "—"}`)}</Tag>
          ) : (
            <Tag kind="pending">{tr("Not finalized yet", "ຍັງບໍ່ Finalize")}</Tag>
          ))}
      </h3>
      <Table head={head}>
        {lines.length === 0 && added.length === 0 && (
          <EmptyRow cols={head.length}>{tr(`No OT on ${fmtDate(data.date)}.`, `ບໍ່ມີ OT ວັນທີ ${fmtDate(data.date)}.`)}</EmptyRow>
        )}
        {lines.map((l) => {
          const e = editOf(l);
          return (
            <tr key={l.user_id} style={e.removed ? { opacity: 0.55, textDecoration: "line-through" } : undefined}>
              <td>
                {l.name}
                <div className="hint">
                  {l.department}
                  {l.property ? ` · ${l.property}` : ""}
                </div>
              </td>
              <td className="mono">{l.clock_in || "—"}</td>
              <td className="mono">{l.clock_out || "—"}</td>
              <td className="mono">{l.scanner_hours === null ? <span className="c-soft">{tr("added by HR", "HR ເພີ່ມ")}</span> : `${num(l.scanner_hours)}h`}</td>
              <td className="mono">
                {editing ? (
                  <input
                    className="inline-input"
                    style={{ width: 70, textAlign: "right" }}
                    inputMode="decimal"
                    value={e.final}
                    onChange={(ev) => setEdits({ ...edits, [l.user_id]: { ...e, final: ev.target.value.replace(/[^\d.]/g, "") } })}
                  />
                ) : (
                  <b>{num(l.final_hours)}h</b>
                )}
              </td>
              <td>
                {editing ? (
                  <select className="inline-input" value={e.kind} onChange={(ev) => setEdits({ ...edits, [l.user_id]: { ...e, kind: ev.target.value as OTKind } })}>
                    <option value="daily">{kindLabel("daily")}</option>
                    <option value="over">{kindLabel("over")}</option>
                  </select>
                ) : (
                  kindLabel(l.kind)
                )}
              </td>
              <td>
                <StatusCell l={l} />
              </td>
              {editing && (
                <td>
                  <label style={{ fontSize: 11 }}>
                    <input type="checkbox" checked={e.removed} onChange={(ev) => setEdits({ ...edits, [l.user_id]: { ...e, removed: ev.target.checked } })} />{" "}
                    {tr("Remove", "ເອົາອອກ")}
                  </label>
                </td>
              )}
            </tr>
          );
        })}
        {added.map((a) => {
          const s = staff.data?.find((x) => x.user_id === a.user_id);
          return (
            <tr key={`add-${a.user_id}`}>
              <td>
                {s?.full_name}
                <div className="hint">{s?.department}</div>
              </td>
              <td className="mono">—</td>
              <td className="mono">—</td>
              <td className="c-soft">{tr("added by HR", "HR ເພີ່ມ")}</td>
              <td className="mono">
                <b>{num(Number(a.final) || 0)}h</b>
              </td>
              <td>{kindLabel(a.kind)}</td>
              <td>
                <Tag kind="pending">{tr("New — save to keep", "ໃໝ່ — ກົດບັນທຶກ")}</Tag>
              </td>
              <td>
                <button type="button" className="mini-btn flag" onClick={() => setAdded(added.filter((x) => x.user_id !== a.user_id))}>
                  {tr("Undo", "ຍົກເລີກ")}
                </button>
              </td>
            </tr>
          );
        })}
      </Table>

      {canWrite && editing && (
        <>
          {data.unit === "hours" && (
            <p className="hint" style={{ marginTop: 8 }}>
              {tr(
                "OT is counted in whole hours (Work Rules) — 1.5 is saved as 1. Switch \"OT counted in\" to Minutes to keep minutes.",
                "OT ນັບເປັນຊົ່ວໂມງເຕັມ (ກົດລະບຽບການເຮັດວຽກ) — 1.5 ຈະບັນທຶກເປັນ 1. ປ່ຽນ \"ນັບ OT ເປັນ\" ເປັນ ນາທີ ຖ້າຢາກເກັບນາທີ.",
              )}
            </p>
          )}
          <div className="card" style={{ marginTop: 10, background: "var(--sand)" }}>
            <h4 style={{ fontSize: 12, margin: "0 0 6px" }}>{tr("+ Add someone who is on the OT document but not in the list", "+ ເພີ່ມຄົນທີ່ມີໃນໃບ OT ແຕ່ບໍ່ຢູ່ໃນລາຍການ")}</h4>
            <div className="land-row" style={{ alignItems: "flex-end" }}>
              <Field label={tr("Employee", "ພະນັກງານ")}>
                <select value={pick.user_id} onChange={(e) => setPick({ ...pick, user_id: e.target.value })}>
                  <option value="">—</option>
                  {addable.map((s) => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.full_name} ({s.department || "—"})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tr("OT hours", "ຊົ່ວໂມງ OT")} style={{ maxWidth: 110 }}>
                <input inputMode="decimal" value={pick.final} onChange={(e) => setPick({ ...pick, final: e.target.value.replace(/[^\d.]/g, "") })} />
              </Field>
              <Field label={tr("OT type", "ປະເພດ OT")} style={{ maxWidth: 200 }}>
                <select value={pick.kind} onChange={(e) => setPick({ ...pick, kind: e.target.value as OTKind })}>
                  <option value="daily">{kindLabel("daily")}</option>
                  <option value="over">{kindLabel("over")}</option>
                </select>
              </Field>
              <button
                type="button"
                className="mini-btn"
                disabled={!pick.user_id || !(Number(pick.final) > 0)}
                onClick={() => {
                  setAdded([...added, pick]);
                  setPick({ user_id: "", final: "1", kind: "daily" });
                }}
              >
                {tr("Add", "ເພີ່ມ")}
              </button>
            </div>
          </div>
          <div className="land-row" style={{ marginTop: 8 }}>
            <button type="button" className="submit-btn" style={{ flex: "0 0 auto" }} onClick={saveEdits} disabled={save.isPending}>
              {tr("💾 Save edits", "💾 ບັນທຶກການແກ້")}
            </button>
            <button type="button" className="mini-btn" onClick={() => setEditing(false)}>
              {tr("Cancel", "ຍົກເລີກ")}
            </button>
          </div>
        </>
      )}

      {canWrite && !editing && (
        <div className="land-row" style={{ marginTop: 8, alignItems: "flex-end" }}>
          <button type="button" className="mini-btn" onClick={startEdit}>
            {tr("✏️ Edit OT", "✏️ ແກ້ OT")}
          </button>
          <Field label={tr("Signed OT document no. / reference", "ເລກ / ເລກອ້າງອີງ ໃບ OT ທີ່ເຊັນແລ້ວ")} style={{ maxWidth: 260 }}>
            <input value={docRef} onChange={(e) => setDocRef(e.target.value)} placeholder={tr("e.g. OT-2026-11-03", "ເຊັ່ນ OT-2026-11-03")} />
          </Field>
          <button type="button" className="submit-btn" style={{ flex: "0 0 auto" }} onClick={doFinalize} disabled={drafts.length === 0 || finalize.isPending}>
            {tr("✅ Finalize per the signed document", "✅ Finalize ຕາມໃບ OT ທີ່ເຊັນແລ້ວ")}
          </button>
        </div>
      )}
    </div>
  );
}

function StatusCell({ l }: { l: OTLine }) {
  const inPayroll =
    l.applied_hours > 0 ? (
      <div className="hint">
        {tr(`In payroll now: ${num(l.applied_hours)}h ${l.applied_kind === "over" ? "over the limit" : "within the day"}`, `ໃນເງິນເດືອນຕອນນີ້: ${num(l.applied_hours)} ຊມ ${l.applied_kind === "over" ? "ເກີນເດືອນ" : "ໃນມື້"}`)}
      </div>
    ) : null;
  if (l.removed) return <Tag kind="low">{tr("Will be removed on finalize", "ຈະຖືກເອົາອອກ ຕອນ Finalize")}</Tag>;
  if (l.status === "finalized") return <Tag kind="ok">{tr("✓ Finalized", "✓ Finalize ແລ້ວ")}</Tag>;
  return (
    <>
      <Tag kind="pending">{tr("Draft — not in payroll yet", "ຮ່າງ — ຍັງບໍ່ເຂົ້າເງິນເດືອນ")}</Tag>
      {inPayroll}
    </>
  );
}

function MonthTotals({ data }: { data: OTDay }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 13 }}>{tr(`OT by employee — ${fmtMonth(data.month)}`, `OT ລາຍຄົນ — ${fmtMonth(data.month)}`)}</h3>
      <Table
        head={[
          tr("Employee", "ພະນັກງານ"),
          tr("Days with OT", "ມື້ທີ່ມີ OT"),
          tr("Finalized — over the limit", "Finalize ແລ້ວ — ເກີນເດືອນ"),
          tr("Finalized — within the day", "Finalize ແລ້ວ — ໃນມື້"),
          tr("Not finalized yet", "ຍັງບໍ່ Finalize"),
        ]}
      >
        {data.totals.length === 0 && <EmptyRow cols={5}>{tr("No OT this month.", "ເດືອນນີ້ບໍ່ມີ OT.")}</EmptyRow>}
        {data.totals.map((t) => (
          <tr key={t.user_id}>
            <td>
              {t.name}
              <div className="hint">{t.department}</div>
            </td>
            <td className="mono">{t.days}</td>
            <td className="mono">{num(t.over)}h</td>
            <td className="mono">{num(t.daily)}h</td>
            <td className="mono" style={t.pending > 0 ? { color: "#8A6A1F", fontWeight: 700 } : undefined}>
              {num(t.pending)}h
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
