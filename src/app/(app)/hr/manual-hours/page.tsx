"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtMonth, num, thisMonth, today } from "@/lib/format";
import { useManualClock, useManualHours, useManualTotal } from "@/features/hr/api";
import type { ManualHours } from "@/features/hr/types";
import { requestOutcome } from "@/features/hr/utils";

/** Prototype v168 hr-manualhours — for when the fingerprint scanner is down. */
export default function ManualHoursPage() {
  const { t } = useLang();
  const [month, setMonth] = useState(thisMonth());
  const data = useManualHours(month);
  return (
    <div className="subview">
      <SectionHead title={t("sh_manual_hours")} />
      <Lede>
        {tr("For when the fingerprint scanner is down and someone's hours didn't get logged. Use \"Clock in / out for a day\" for a single missed day — it counts like a scan for that day. Use \"Set total hours directly\" to correct the whole month's total at once. Either way it updates Payroll (unless the Approval Rule asks for sign-off first); the month's Payroll still needs its own approval before it's sent to the Accountant. A closed payroll month can't be corrected.", "ໃຊ້ເມື່ອເຄື່ອງສະແກນເສຍ ຫຼື ພະນັກງານລືມສະແກນ. ໃຊ້ \"ໃສ່ເວລາເຂົ້າ / ອອກ ຂອງ 1 ມື້\" ສຳລັບມື້ດຽວ — ນັບຄືກັບການສະແກນ. ໃຊ້ \"ກຳນົດຊົ່ວໂມງລວມໂດຍກົງ\" ເພື່ອແກ້ຍອດທັງເດືອນ. ທັງສອງແບບອັບເດດເງິນເດືອນ (ຖ້າກົດການອະນຸມັດບໍ່ຕ້ອງການອະນຸມັດກ່ອນ); ເງິນເດືອນຂອງເດືອນຍັງຕ້ອງອະນຸມັດກ່ອນສົ່ງບັນຊີ. ເດືອນທີ່ປິດແລ້ວແກ້ບໍ່ໄດ້.")}
      </Lede>
      <Field label={tr("Payroll month", "ເດືອນເງິນເດືອນ")} style={{ maxWidth: 220 }}>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </Field>
      <DataState loading={data.isLoading} error={data.error}>
        {data.data && (
          <>
            {data.data.closed && <p className="hint warn">{tr(`${fmtMonth(month)}'s payroll is closed — pick an open month to correct hours.`, `ເງິນເດືອນ ${fmtMonth(month)} ປິດແລ້ວ — ເລືອກເດືອນທີ່ຍັງເປີດເພື່ອແກ້ຊົ່ວໂມງ.`)}</p>}
            <DayForm key={`day-${month}`} employees={data.data.employees} month={month} closed={data.data.closed} />
            <TotalForm key={`total-${month}`} data={data.data} />
            <h3 style={{ fontSize: 13, marginTop: 20 }}>{tr("Correction log", "ບັນທຶກການແກ້ໄຂ")}</h3>
            <Table head={[tr("Date", "ວັນທີ"), tr("Employee", "ພະນັກງານ"), tr("Month", "ເດືອນ"), tr("Change", "ການປ່ຽນ"), tr("Reason", "ເຫດຜົນ"), tr("By", "ໂດຍ")]}>
              {data.data.log.length === 0 && <EmptyRow cols={6}>{tr("No corrections logged yet.", "ຍັງບໍ່ມີການແກ້ໄຂ.")}</EmptyRow>}
              {data.data.log.map((l) => (
                <tr key={l.id}>
                  <td className="mono">{l.created_at}</td>
                  <td>{l.employee}</td>
                  <td>{fmtMonth(l.month)}</td>
                  <td style={{ fontSize: 11 }}>
                    {l.old_summary} → <b>{l.new_summary}</b>
                  </td>
                  <td>{l.reason || "—"}</td>
                  <td>{l.created_by}</td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </DataState>
    </div>
  );
}

const clockHours = (a: string, b: string) => {
  if (!a || !b) return null;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let m = bh * 60 + bm - (ah * 60 + am);
  if (m <= 0) m += 24 * 60; // overnight shift
  return Math.round((m / 60) * 100) / 100;
};

function DayForm({ employees, month, closed }: { employees: ManualHours["employees"]; month: string; closed: boolean }) {
  const dialogs = useDialogs();
  const save = useManualClock();
  const [f, setF] = useState({ user_id: "", date: month === thisMonth() ? today() : `${month}-01`, in: "", out: "", reason: "" });
  const hours = clockHours(f.in, f.out);

  async function submit() {
    const userID = f.user_id || employees[0]?.user_id;
    if (!userID) return dialogs.error(tr("No employee", "ບໍ່ມີພະນັກງານ"), new Error(tr("There is no active employee to correct.", "ບໍ່ມີພະນັກງານໃຫ້ແກ້.")));
    if (!f.date || hours === null) return dialogs.error(tr("Invalid times", "ເວລາບໍ່ຖືກ"), new Error(tr("Enter the date and both a clock-in and a clock-out time.", "ໃສ່ວັນທີ ແລະ ທັງເວລາເຂົ້າ ແລະ ເວລາອອກ.")));
    if (!f.reason.trim()) return dialogs.error(tr("Reason needed", "ຕ້ອງມີເຫດຜົນ"), new Error(tr("Enter a short reason, e.g. which day the scanner was down.", "ໃສ່ເຫດຜົນສັ້ນໆ ເຊັ່ນ ເຄື່ອງສະແກນເສຍມື້ໃດ.")));
    try {
      const res = await save.mutateAsync({ user_id: userID, date: f.date, clock_in: f.in, clock_out: f.out, reason: f.reason.trim() });
      setF((p) => ({ ...p, in: "", out: "", reason: "" }));
      const name = employees.find((e) => e.user_id === userID)?.name ?? tr("the employee", "ພະນັກງານ");
      dialogs.success(...requestOutcome(res, tr(`${num(hours)} hours for ${name} on ${f.date}`, `${num(hours)} ຊົ່ວໂມງ ຂອງ ${name} ວັນທີ ${f.date}`)));
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 14 }}>{tr("Clock in / out for a day", "ໃສ່ເວລາເຂົ້າ / ອອກ ຂອງ 1 ມື້")}</h3>
      <p className="hint">{tr("For one missed day — enter the times worked; a shift past midnight ends the next day.", "ສຳລັບ 1 ມື້ທີ່ຂາດ — ໃສ່ເວລາທີ່ເຮັດ; ກະທີ່ເລີກຫຼັງທ່ຽງຄືນ ນັບເປັນມື້ຖັດໄປ.")}</p>
      <div className="land-row">
        <Field label={tr("Employee", "ພະນັກງານ")}>
          <select value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })}>
            {employees.map((e) => (
              <option key={e.user_id} value={e.user_id}>
                {e.name} ({e.department})
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr("Date", "ວັນທີ")}>
          <input type="date" value={f.date} max={today()} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label={tr("Clock in", "ເວລາເຂົ້າ")}>
          <input type="time" value={f.in} onChange={(e) => setF({ ...f, in: e.target.value })} />
        </Field>
        <Field label={tr("Clock out", "ເວລາອອກ")}>
          <input type="time" value={f.out} onChange={(e) => setF({ ...f, out: e.target.value })} />
        </Field>
      </div>
      <Field label={tr("Reason", "ເຫດຜົນ")} style={{ maxWidth: 420 }}>
        <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder={tr("e.g. Scanner was down all morning on 3 Oct", "ເຊັ່ນ ເຄື່ອງເສຍທັງເຊົ້າ ວັນທີ 3 ຕຸລາ")} />
      </Field>
      {hours !== null && <p className="hint">= {tr(`${num(hours)} hours that day.`, `${num(hours)} ຊົ່ວໂມງ ໃນມື້ນັ້ນ.`)}</p>}
      <button type="button" className="submit-btn" onClick={submit} disabled={closed || save.isPending}>
        {tr("💾 Add this day's hours", "💾 ເພີ່ມຊົ່ວໂມງຂອງມື້ນີ້")}
      </button>
    </div>
  );
}

function TotalForm({ data }: { data: ManualHours }) {
  const dialogs = useDialogs();
  const save = useManualTotal();
  const [userID, setUserID] = useState(data.employees[0]?.user_id ?? "");
  const cur = data.employees.find((e) => e.user_id === userID);
  const [f, setF] = useState(() => ({
    hours: String(cur?.hours_worked ?? ""),
    ot: String(cur?.ot_hours ?? 0),
    otDaily: String(cur?.ot_hours_daily ?? 0),
    reason: "",
  }));
  const pick = (id: string) => {
    const e = data.employees.find((x) => x.user_id === id);
    setUserID(id);
    setF({ hours: String(e?.hours_worked ?? ""), ot: String(e?.ot_hours ?? 0), otDaily: String(e?.ot_hours_daily ?? 0), reason: "" });
  };

  async function submit() {
    const hours = parseFloat(f.hours);
    if (!cur || isNaN(hours) || hours < 0) return dialogs.error(tr("Invalid hours", "ຊົ່ວໂມງບໍ່ຖືກ"), new Error(tr("Enter a valid number of hours worked.", "ໃສ່ຈຳນວນຊົ່ວໂມງໃຫ້ຖືກ.")));
    if (!f.reason.trim()) return dialogs.error(tr("Reason needed", "ຕ້ອງມີເຫດຜົນ"), new Error(tr("Enter a short reason for this correction.", "ໃສ່ເຫດຜົນສັ້ນໆ ຂອງການແກ້ໄຂ.")));
    try {
      const res = await save.mutateAsync({
        user_id: cur.user_id, month: data.month, hours_worked: hours,
        ot_hours: parseFloat(f.ot) || 0, ot_hours_daily: parseFloat(f.otDaily) || 0, reason: f.reason.trim(),
      });
      setF((p) => ({ ...p, reason: "" }));
      dialogs.success(...requestOutcome(res, tr(`The hours correction for ${cur.name} (${fmtMonth(data.month)})`, `ການແກ້ຊົ່ວໂມງຂອງ ${cur.name} (${fmtMonth(data.month)})`)));
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 14 }}>{tr("Set total hours directly", "ກຳນົດຊົ່ວໂມງລວມໂດຍກົງ")}</h3>
      <p className="hint">{tr(`Overwrites the employee's whole total for ${fmtMonth(data.month)} — use this for a bigger correction, not a single day.`, `ແທນຍອດລວມທັງໝົດຂອງພະນັກງານໃນ ${fmtMonth(data.month)} — ໃຊ້ສຳລັບການແກ້ໃຫຍ່, ບໍ່ແມ່ນມື້ດຽວ.`)}</p>
      <div className="land-row">
        <Field label={tr("Employee", "ພະນັກງານ")}>
          <select value={userID} onChange={(e) => pick(e.target.value)}>
            {data.employees.map((e) => (
              <option key={e.user_id} value={e.user_id}>
                {e.name} ({e.department})
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr("Total working hours this month", "ຊົ່ວໂມງເຮັດວຽກລວມເດືອນນີ້")}>
          <input type="number" min={0} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} style={{ width: 120 }} />
        </Field>
        <Field label={tr("OT — over the limit (hrs)", "OT — ເກີນເດືອນ (ຊມ)")}>
          <input type="number" min={0} value={f.ot} onChange={(e) => setF({ ...f, ot: e.target.value })} style={{ width: 100 }} />
        </Field>
        <Field label={tr("OT — within the day (hrs)", "OT — ໃນມື້ (ຊມ)")}>
          <input type="number" min={0} value={f.otDaily} onChange={(e) => setF({ ...f, otDaily: e.target.value })} style={{ width: 100 }} />
        </Field>
      </div>
      <Field label={tr("Reason for the correction", "ເຫດຜົນຂອງການແກ້ໄຂ")} style={{ maxWidth: 420 }}>
        <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder={tr("e.g. Scanner was down on 3 Oct, confirmed with supervisor", "ເຊັ່ນ ເຄື່ອງເສຍວັນທີ 3 ຕຸລາ, ຫົວໜ້າຢືນຢັນແລ້ວ")} />
      </Field>
      {cur && (
        <p className="hint">
          {tr(
            `Currently on file: ${num(cur.hours_worked)} hours worked, ${num(cur.ot_hours)}h OT over limit, ${num(cur.ot_hours_daily)}h OT within day${cur.manual ? " (already set by hand)" : " (from scans)"}.`,
            `ຂໍ້ມູນປັດຈຸບັນ: ເຮັດວຽກ ${num(cur.hours_worked)} ຊມ, OT ເກີນເດືອນ ${num(cur.ot_hours)} ຊມ, OT ໃນມື້ ${num(cur.ot_hours_daily)} ຊມ${cur.manual ? " (ແກ້ດ້ວຍມືແລ້ວ)" : " (ຈາກການສະແກນ)"}.`,
          )}
        </p>
      )}
      <button type="button" className="submit-btn" onClick={submit} disabled={data.closed || save.isPending}>
        {tr("💾 Save correction", "💾 ບັນທຶກການແກ້ໄຂ")}
      </button>
    </div>
  );
}
