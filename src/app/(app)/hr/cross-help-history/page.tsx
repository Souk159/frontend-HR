"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtDate, fmtMonth, lak, thisMonth, today } from "@/lib/format";
import { useCrossHelp, useDeleteCrossHelp } from "@/features/hr/api";
import type { CrossHelp } from "@/features/hr/types";
import { hm } from "@/features/hr/crossHelp";

type Mode = "" | "day" | "month" | "year";

/** Prototype v207 hr-crosshelphistory: the log, filtered by day / month / year, and totals per employee. */
export default function CrossHelpHistoryPage() {
  const { t } = useLang();
  const [mode, setMode] = useState<Mode>("");
  const [day, setDay] = useState(today());
  const [month, setMonth] = useState(thisMonth());
  const [year, setYear] = useState(today().slice(0, 4));
  const ref = { day: mode === "day" ? day : today(), month: mode === "month" ? month : mode === "day" ? day.slice(0, 7) : thisMonth(), year };
  const fetchYear = mode === "day" ? day.slice(0, 4) : mode === "month" ? month.slice(0, 4) : year;
  const log = useCrossHelp(fetchYear);
  const all = log.data ?? [];
  const shown = all.filter((r) => (mode === "day" ? r.date === day : mode === "month" ? r.date.startsWith(month) : true));

  return (
    <div className="subview">
      <SectionHead title={t("sh_cross_help_history")} />
      <Lede>
        {tr(
          "Every cross-department help logged, with the bonus it added to Payroll. Filter by day, month or year; the totals below follow the same date.",
          "ທຸກການຊ່ວຍຂ້າມພະແນກທີ່ບັນທຶກ ພ້ອມໂບນັດທີ່ເພີ່ມເຂົ້າເງິນເດືອນ. ກອງຕາມ ມື້, ເດືອນ ຫຼື ປີ; ຍອດລວມຂ້າງລຸ່ມໃຊ້ວັນທີດຽວກັນ.",
        )}
      </Lede>
      <div className="land-row" style={{ alignItems: "flex-end" }}>
        <Field label={tr("Filter by", "ກອງຕາມ")}>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="">{tr("All dates (this year)", "ທຸກວັນທີ (ປີນີ້)")}</option>
            <option value="day">{tr("Day", "ມື້")}</option>
            <option value="month">{tr("Month", "ເດືອນ")}</option>
            <option value="year">{tr("Year", "ປີ")}</option>
          </select>
        </Field>
        {mode === "day" && (
          <Field label={tr("Date", "ວັນທີ")}>
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
          </Field>
        )}
        {mode === "month" && (
          <Field label={tr("Month", "ເດືອນ")}>
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </Field>
        )}
        {mode === "year" && (
          <Field label={tr("Year", "ປີ")}>
            <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} style={{ width: 90 }} />
          </Field>
        )}
        {mode && (
          <button type="button" className="mini-btn" onClick={() => setMode("")}>
            {tr("Clear filter", "ລ້າງການກອງ")}
          </button>
        )}
      </div>
      <DataState loading={log.isLoading} error={log.error}>
        <div className="card">
          <h3 style={{ fontSize: 13 }}>{tr("Log", "ບັນທຶກ")}</h3>
          <Table
            head={[
              tr("Date", "ວັນທີ"),
              tr("Employee", "ພະນັກງານ"),
              tr("Home dept", "ພະແນກຕົ້ນສັງກັດ"),
              tr("Helped", "ໄປຊ່ວຍ"),
              tr("Time", "ເວລາ"),
              tr("Bonus", "ໂບນັດ"),
              tr("Note", "ໝາຍເຫດ"),
              "",
            ]}
          >
            {shown.length === 0 && <EmptyRow cols={8}>{tr("No cross-department help logged yet.", "ຍັງບໍ່ມີການຊ່ວຍຂ້າມພະແນກ.")}</EmptyRow>}
            {shown.map((r) => (
              <LogRow key={r.id} r={r} />
            ))}
          </Table>
        </div>
        <Totals all={all} ref_={ref} />
      </DataState>
    </div>
  );
}

function LogRow({ r }: { r: CrossHelp }) {
  const dialogs = useDialogs();
  const del = useDeleteCrossHelp();
  async function remove() {
    if (!window.confirm(tr(`Remove ${r.name}'s cross-help on ${fmtDate(r.date)}? The ${lak(r.bonus)} bonus comes off their Payroll.`, `ລຶບການຊ່ວຍຂ້າມພະແນກຂອງ ${r.name} ວັນທີ ${fmtDate(r.date)}? ໂບນັດ ${lak(r.bonus)} ຈະຖືກຫັກອອກຈາກເງິນເດືອນ.`))) return;
    try {
      await del.mutateAsync(r.id);
    } catch (err) {
      dialogs.error(tr("Could not remove", "ລຶບບໍ່ສຳເລັດ"), err);
    }
  }
  return (
    <tr>
      <td className="mono">{fmtDate(r.date)}</td>
      <td>
        {r.name}
        {r.property && <div className="hint">{r.property}</div>}
      </td>
      <td>{r.home_department || "—"}</td>
      <td>{r.help_department}</td>
      <td className="mono">{hm(r.minutes)}</td>
      <td className="mono">
        {lak(r.bonus)}
        <div className="hint">× {r.rate}</div>
      </td>
      <td style={{ fontSize: 11 }}>
        {r.note || "—"}
        <div className="hint">{r.created_by}</div>
      </td>
      <td>
        <button type="button" className="mini-btn flag" onClick={remove} disabled={del.isPending}>
          {tr("Remove", "ລຶບ")}
        </button>
      </td>
    </tr>
  );
}

/** Totals by employee — the day, month and year of the active filter (or today). */
function Totals({ all, ref_ }: { all: CrossHelp[]; ref_: { day: string; month: string; year: string } }) {
  const people = [...new Map(all.map((r) => [r.user_id, r.name])).entries()];
  const sum = (id: string, match: (d: string) => boolean) => {
    const rows = all.filter((r) => r.user_id === id && match(r.date));
    return { minutes: rows.reduce((s, r) => s + r.minutes, 0), bonus: rows.reduce((s, r) => s + r.bonus, 0) };
  };
  const cell = (v: { minutes: number; bonus: number }) => (
    <td className="mono">
      {v.minutes ? hm(v.minutes) : "—"}
      <div className="hint">{lak(v.bonus)}</div>
    </td>
  );
  return (
    <div className="card">
      <h3 style={{ fontSize: 13 }}>{tr("Totals by employee — day, month, year", "ຍອດລວມລາຍຄົນ — ມື້, ເດືອນ, ປີ")}</h3>
      <Table
        head={[
          tr("Employee", "ພະນັກງານ"),
          tr(`${fmtDate(ref_.day)} (day)`, `${fmtDate(ref_.day)} (ມື້)`),
          tr(`${fmtMonth(ref_.month)} (month)`, `${fmtMonth(ref_.month)} (ເດືອນ)`),
          tr(`${ref_.year} (year)`, `${ref_.year} (ປີ)`),
        ]}
      >
        {people.length === 0 && <EmptyRow cols={4}>{tr("No cross-department help logged yet.", "ຍັງບໍ່ມີການຊ່ວຍຂ້າມພະແນກ.")}</EmptyRow>}
        {people.map(([id, name]) => (
          <tr key={id}>
            <td>{name}</td>
            {cell(sum(id, (d) => d === ref_.day))}
            {cell(sum(id, (d) => d.startsWith(ref_.month)))}
            {cell(sum(id, (d) => d.startsWith(ref_.year)))}
          </tr>
        ))}
      </Table>
    </div>
  );
}
