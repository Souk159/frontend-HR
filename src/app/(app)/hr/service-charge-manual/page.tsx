"use client";

import { useState } from "react";
import { DataState, Field, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtMonth, lak, num, thisMonth } from "@/lib/format";
import { useProperties, useRecordScSplit, useRequestScEligibility, useScSplit, useServiceCharge, useSetManualServiceCharge } from "@/features/hr/api";
import type { ScSplit } from "@/features/hr/types";
import { batchOutcome } from "@/features/hr/utils";

const basisText = (b: string) =>
  b === "Not eligible"
    ? tr("Not eligible", "ບໍ່ມີສິດ")
    : b === "Full share"
      ? tr("Full share", "ສ່ວນເຕັມ")
      : tr(b, b.replace("By hours", "ຕາມຊົ່ວໂມງ").replace("h)", " ຊມ)"));

/**
 * Prototype v207 hr-scmanual, per resort: a manual total for a resort without
 * POS sales (or to override the POS), the staff's eligibility ticks (through
 * the Approval Rule) and a record of each month's split.
 */
export default function ManualServiceChargePage() {
  const { t } = useLang();
  const [month, setMonth] = useState(thisMonth());
  const properties = useProperties();
  const [picked, setPicked] = useState("");
  const propertyId = picked || properties.data?.[0]?.id || "";
  const split = useScSplit(month, propertyId);
  const sc = useServiceCharge(month);

  return (
    <div className="subview">
      <SectionHead title={t("sh_sc_manual")} />
      <Lede>
        {tr(
          "Use this when a resort has no POS sell history for the month, or when the real total needs to override what the POS shows. The resort's staff pool is split among its own eligible staff — a full share for those ticked \"Full share\", the rest by the hours they worked.",
          "ໃຊ້ເມື່ອຣີສອດບໍ່ມີປະຫວັດການຂາຍ POS ໃນເດືອນ ຫຼື ຍອດແທ້ຕ້ອງແທນຍອດຂອງ POS. ສ່ວນຂອງພະນັກງານຂອງຣີສອດ ແບ່ງໃຫ້ພະນັກງານທີ່ມີສິດຂອງຣີສອດນັ້ນ — ຄົນທີ່ tick \"ສ່ວນເຕັມ\" ໄດ້ສ່ວນເຕັມ, ຄົນອື່ນໄດ້ຕາມຊົ່ວໂມງທີ່ເຮັດ.",
        )}
      </Lede>
      <div className="land-row">
        <Field label={tr("Month", "ເດືອນ")} style={{ maxWidth: 220 }}>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
        <Field label={tr("Resort", "ຣີສອດ")} style={{ maxWidth: 260 }}>
          <select value={propertyId} onChange={(e) => setPicked(e.target.value)}>
            {properties.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <DataState loading={split.isLoading} error={split.error}>
        {split.data && (
          <>
            <TotalCard key={`${month}:${propertyId}:${split.data.pool.manual_total}`} data={split.data} staffPct={sc.data?.staff_pool_pct ?? 100} />
            <TicksCard key={`ticks:${month}:${propertyId}:${split.dataUpdatedAt}`} data={split.data} />
            <RecordsCard data={split.data} />
          </>
        )}
      </DataState>
    </div>
  );
}

function TotalCard({ data, staffPct }: { data: ScSplit; staffPct: number }) {
  const dialogs = useDialogs();
  const set = useSetManualServiceCharge();
  const record = useRecordScSplit();
  const p = data.pool;
  const [source, setSource] = useState<"pos" | "manual">(p.source);
  const [total, setTotal] = useState(p.manual_total !== null ? String(p.manual_total) : "");
  const eligible = data.rows.filter((r) => r.gets && r.status === "active");

  async function apply() {
    if (source === "manual" && (total === "" || isNaN(Number(total)) || Number(total) < 0))
      return dialogs.error(tr("Enter the total", "ໃສ່ຍອດລວມ"), new Error(tr("Type the month's total service charge in ₭ (0 or more).", "ໃສ່ຍອດຄ່າບໍລິການຂອງເດືອນເປັນ ₭ (0 ຂຶ້ນໄປ).")));
    try {
      await set.mutateAsync({ month: data.month, property_id: p.property_id!, total: source === "manual" ? Number(total) : null });
      dialogs.success(
        tr("Service charge split", "ແບ່ງຄ່າບໍລິການແລ້ວ"),
        source === "manual"
          ? tr(`Manual total of ${lak(Number(total))} for ${p.property}, ${fmtMonth(data.month)} — Payroll is updated.`, `ຍອດດ້ວຍມື ${lak(Number(total))} ຂອງ ${p.property}, ${fmtMonth(data.month)} — ອັບເດດເງິນເດືອນແລ້ວ.`)
          : tr(`Back to the POS total of ${lak(p.pos_total)} for ${p.property}.`, `ກັບໄປໃຊ້ຍອດ POS ${lak(p.pos_total)} ຂອງ ${p.property}.`),
      );
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  async function recordSplit() {
    try {
      const r = await record.mutateAsync({ month: data.month, property_id: p.property_id! });
      dialogs.success(
        tr("Split recorded", "ບັນທຶກການແບ່ງແລ້ວ"),
        tr(`${fmtMonth(data.month)}'s split for ${p.property} is recorded — ${r.employees} employees, with who got a full share and who was paid by hours.`, `ບັນທຶກການແບ່ງ ${fmtMonth(data.month)} ຂອງ ${p.property} ແລ້ວ — ${r.employees} ຄົນ.`),
      );
    } catch (err) {
      dialogs.error(tr("Could not record", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="card">
      {data.closed && <p className="hint warn">{tr(`${fmtMonth(data.month)} is closed — the service charge can no longer be changed.`, `${fmtMonth(data.month)} ປິດແລ້ວ — ປ່ຽນຄ່າບໍລິການບໍ່ໄດ້ອີກ.`)}</p>}
      <div className="land-row" style={{ alignItems: "flex-end" }}>
        <Field label={tr("Service charge source", "ທີ່ມາຂອງຄ່າບໍລິການ")}>
          <select value={source} onChange={(e) => setSource(e.target.value as "pos" | "manual")}>
            <option value="pos">{tr("From POS Sell History", "ຈາກປະຫວັດການຂາຍ POS")}</option>
            <option value="manual">{tr("Manual total", "ໃສ່ຍອດດ້ວຍມື")}</option>
          </select>
        </Field>
        {source === "manual" && (
          <Field label={tr("Manual total (₭) for this month", "ຍອດລວມ (₭) ຂອງເດືອນນີ້")}>
            <input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ""))} placeholder={tr("e.g. 18000000", "ເຊັ່ນ 18000000")} />
          </Field>
        )}
        <button type="button" className="submit-btn" style={{ flex: "0 0 auto" }} onClick={apply} disabled={set.isPending || data.closed}>
          {tr("Apply", "ນຳໃຊ້")}
        </button>
        <button type="button" className="mini-btn" onClick={recordSplit} disabled={record.isPending}>
          {tr("Record this month's split", "ບັນທຶກການແບ່ງຂອງເດືອນນີ້")}
        </button>
      </div>
      <div className="stat-row">
        <span>{tr("Now using", "ໃຊ້ຢູ່ຕອນນີ້")}</span>
        <b>{p.source === "manual" ? tr("Manual total", "ຍອດດ້ວຍມື") : tr(`POS Sell History (${lak(p.pos_total)})`, `ປະຫວັດການຂາຍ POS (${lak(p.pos_total)})`)}</b>
      </div>
      <div className="stat-row">
        <span>{tr("Total service charge", "ຄ່າບໍລິການລວມ")}</span>
        <b>{lak(p.total_service_charge)}</b>
      </div>
      <div className="stat-row">
        <span>{tr(`Staff pool (${num(staffPct)}% — set on the Service Charge page)`, `ສ່ວນພະນັກງານ (${num(staffPct)}% — ຕັ້ງໃນໜ້າ ຄ່າບໍລິການ)`)}</span>
        <b>{lak(p.staff_pool)}</b>
      </div>
      <div className="stat-row">
        <span>{tr("Eligible staff", "ພະນັກງານມີສິດ")}</span>
        <b>
          {tr(
            `${eligible.length} — ${eligible.filter((r) => r.full).length} full share, ${eligible.filter((r) => !r.full).length} by hours`,
            `${eligible.length} — ສ່ວນເຕັມ ${eligible.filter((r) => r.full).length}, ຕາມຊົ່ວໂມງ ${eligible.filter((r) => !r.full).length}`,
          )}
        </b>
      </div>
    </div>
  );
}

/** Who gets service charge, full share or by hours — changes go through the Approval Rule. */
function TicksCard({ data }: { data: ScSplit }) {
  const dialogs = useDialogs();
  const req = useRequestScEligibility();
  const [ticks, setTicks] = useState<Record<string, { gets: boolean; full: boolean }>>({});
  const tickOf = (r: ScSplit["rows"][number]) => ticks[r.user_id] ?? { gets: r.gets, full: r.full };
  const changed = data.rows.filter((r) => {
    const t = tickOf(r);
    return t.gets !== r.gets || t.full !== r.full;
  });
  const sum = data.rows.reduce((s, r) => s + r.amount, 0);

  async function save() {
    if (changed.length === 0) return dialogs.error(tr("No change", "ບໍ່ມີການປ່ຽນ"), new Error(tr("No ticks were changed.", "ບໍ່ມີ tick ໃດປ່ຽນ.")));
    try {
      const r = await req.mutateAsync(changed.map((row) => ({ user_id: row.user_id, ...tickOf(row) })));
      dialogs.success(...batchOutcome(r, tr("service charge eligibility change(s)", "ການປ່ຽນສິດຄ່າບໍລິການ")));
    } catch (err) {
      dialogs.error(tr("Could not send", "ສົ່ງບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 13 }}>{tr("Who gets it", "ໃຜໄດ້ຄ່າບໍລິການ")}</h3>
      <Table
        head={[
          tr("Employee", "ພະນັກງານ"),
          tr("Department", "ພະແນກ"),
          tr("Gets service charge", "ໄດ້ຄ່າບໍລິການ"),
          tr("Full share", "ສ່ວນເຕັມ"),
          tr("How it's split", "ແບ່ງແນວໃດ"),
          tr("Amount this month", "ຍອດເດືອນນີ້"),
        ]}
      >
        {data.rows.map((r) => {
          const t = tickOf(r);
          return (
            <tr key={r.user_id}>
              <td>
                {r.name}
                {r.status !== "active" && <span className="hint"> ({r.status})</span>}
              </td>
              <td>{r.department || "—"}</td>
              <td style={{ textAlign: "center" }}>
                <input type="checkbox" checked={t.gets} disabled={r.pending} onChange={(e) => setTicks({ ...ticks, [r.user_id]: { ...t, gets: e.target.checked } })} />
              </td>
              <td style={{ textAlign: "center" }}>
                <input type="checkbox" checked={t.full} disabled={r.pending} onChange={(e) => setTicks({ ...ticks, [r.user_id]: { ...t, full: e.target.checked } })} />
              </td>
              <td style={{ fontSize: 11 }}>
                {basisText(r.basis)}
                {r.pending && (
                  <>
                    {" "}
                    <Tag kind="pending">{tr("⏳ change awaiting approval", "⏳ ລໍຖ້າອະນຸມັດ")}</Tag>
                  </>
                )}
              </td>
              <td className="mono" style={{ fontWeight: 700 }}>
                {lak(r.amount)}
              </td>
            </tr>
          );
        })}
        <tr style={{ background: "var(--sand)", fontWeight: 700 }}>
          <td colSpan={5}>{tr("Total shared out", "ລວມທີ່ແບ່ງອອກ")}</td>
          <td className="mono">{lak(sum)}</td>
        </tr>
      </Table>
      <button type="button" className="mini-btn" style={{ marginTop: 8 }} onClick={save} disabled={req.isPending || changed.length === 0}>
        {tr("💾 Save eligibility ticks", "💾 ບັນທຶກ tick ສິດຄ່າບໍລິການ")}
      </button>
    </div>
  );
}

function RecordsCard({ data }: { data: ScSplit }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 13 }}>{tr("Recorded splits", "ການແບ່ງທີ່ບັນທຶກໄວ້")}</h3>
      {data.records.length === 0 && (
        <p className="hint">{tr("Nothing recorded yet — click \"Record this month's split\" once the month's figures are right.", "ຍັງບໍ່ມີ — ກົດ \"ບັນທຶກການແບ່ງຂອງເດືອນນີ້\" ເມື່ອຕົວເລກຂອງເດືອນຖືກຕ້ອງແລ້ວ.")}</p>
      )}
      {data.records.map((r) => (
        <details key={r.id} className="card" style={{ marginBottom: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 12 }}>
            <b>{fmtMonth(r.month)}</b> ·{" "}
            {tr(
              `recorded ${r.recorded_at} by ${r.recorded_by} · ${r.source === "manual" ? "Manual total" : "POS"} ${lak(r.total)} → staff pool ${lak(r.staff_pool)} · ${r.rows.length} employees`,
              `ບັນທຶກ ${r.recorded_at} ໂດຍ ${r.recorded_by} · ${r.source === "manual" ? "ຍອດດ້ວຍມື" : "POS"} ${lak(r.total)} → ສ່ວນພະນັກງານ ${lak(r.staff_pool)} · ${r.rows.length} ຄົນ`,
            )}
          </summary>
          <Table head={[tr("Employee", "ພະນັກງານ"), tr("Department", "ພະແນກ"), tr("Basis", "ວິທີແບ່ງ"), tr("Amount", "ຍອດ")]}>
            {r.rows.map((x, i) => (
              <tr key={i}>
                <td>{x.name}</td>
                <td>{x.department || "—"}</td>
                <td>{basisText(x.basis)}</td>
                <td className="mono">{lak(x.amount)}</td>
              </tr>
            ))}
          </Table>
        </details>
      ))}
    </div>
  );
}
