"use client";

import { useState } from "react";
import { DataState, Field, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtMonth, lak, num, thisMonth } from "@/lib/format";
import { useSaveScAllocation, useServiceCharge } from "@/features/hr/api";
import type { ScAllocation } from "@/features/hr/types";

export default function ServiceChargePage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const [month, setMonth] = useState(thisMonth());
  const pool = useServiceCharge(month);
  const saveAlloc = useSaveScAllocation();
  // local edits; null = show what the server has
  const [draft, setDraft] = useState<ScAllocation[] | null>(null);
  const alloc = draft ?? pool.data?.allocation ?? [];
  const setAlloc = setDraft;

  const total = alloc.reduce((s, a) => s + (Number(a.pct) || 0), 0);
  const dirty = draft !== null;

  async function save() {
    try {
      await saveAlloc.mutateAsync(alloc.map((a) => ({ ...a, pct: Number(a.pct) || 0 })));
      setDraft(null);
      dialogs.success(tr("Saved", "ບັນທຶກແລ້ວ"), tr("Service charge allocation updated.", "ອັບເດດການແບ່ງຄ່າບໍລິການແລ້ວ."));
    } catch (err) {
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  const p = pool.data;
  return (
    <div className="subview">
      <SectionHead title={t("sh_service_charge_bonus")} />
      <Lede>
        {tr("Pulled live from each resort's completed POS sales for the month (or the manual total entered for it). Each resort's staff pool is split across its own employees with \"Gets service charge\" ticked in their profile, weighted by the hours they actually worked (capped at their required hours, so OT never increases a share). Employees marked \"Always gets full service charge\" get the full share below whatever their hours. Percentage-of-revenue and other bonuses now live under Bonus Types.", "ດຶງສົດຈາກການຂາຍ POS ຂອງແຕ່ລະຣີສອດໃນເດືອນ (ຫຼື ຍອດທີ່ໃສ່ດ້ວຍມື). ສ່ວນຂອງພະນັກງານຂອງແຕ່ລະຣີສອດ ແບ່ງໃຫ້ພະນັກງານຂອງຣີສອດນັ້ນ ທຸກຄົນທີ່ tick \"ໄດ້ຄ່າບໍລິການ\" ຕາມຊົ່ວໂມງທີ່ເຮັດແທ້ (ສູງສຸດເທົ່າມາດຕະຖານ — OT ບໍ່ເພີ່ມສ່ວນແບ່ງ). ຄົນທີ່ tick \"ໄດ້ຄ່າບໍລິການເຕັມສະເໝີ\" ໄດ້ສ່ວນເຕັມ ບໍ່ວ່າຈະເຮັດຈັກຊົ່ວໂມງ. ໂບນັດແບບ % ແລະ ອື່ນໆ ຢູ່ໃນໜ້າ ປະເພດໂບນັດ.")}
      </Lede>
      <Field label={tr("Month", "ເດືອນ")} style={{ maxWidth: 220 }}>
        <input type="month" value={month} onChange={(e) => e.target.value && (setMonth(e.target.value), setDraft(null))} />
      </Field>
      <DataState loading={pool.isLoading} error={pool.error}>
        {p && (
          <>
            <div className="card">
              <h3 style={{ fontSize: 14 }}>
                {tr("Service charge by resort", "ຄ່າບໍລິການແຍກຕາມຣີສອດ")} — {fmtMonth(month)}
              </h3>
              <p className="hint">
                {tr(
                  "Each resort's service charge is split among its own eligible staff only. A resort without POS sales (or whose real total differs) can be given a manual total on the Manual Service Charge page.",
                  "ຄ່າບໍລິການຂອງແຕ່ລະຣີສອດ ແບ່ງໃຫ້ພະນັກງານທີ່ມີສິດຂອງຣີສອດນັ້ນເທົ່ານັ້ນ. ຣີສອດທີ່ບໍ່ມີການຂາຍ POS (ຫຼື ຍອດແທ້ຕ່າງກັນ) ໃສ່ຍອດດ້ວຍມືໄດ້ໃນໜ້າ ຄ່າບໍລິການດ້ວຍມື.",
                )}
              </p>
              <Table
                head={[
                  tr("Resort", "ຣີສອດ"),
                  tr("Collected", "ເກັບໄດ້"),
                  tr(`Staff pool (${num(p.staff_pool_pct)}%)`, `ສ່ວນພະນັກງານ (${num(p.staff_pool_pct)}%)`),
                  tr("Eligible staff", "ພະນັກງານມີສິດ"),
                  tr("Full share each", "ສ່ວນເຕັມຕໍ່ຄົນ"),
                ]}
              >
                {p.pools.map((pl) => (
                  <tr key={pl.property_id ?? "none"}>
                    <td>{pl.property}</td>
                    <td className="mono">
                      {lak(pl.total_service_charge)}
                      <div className="hint">
                        {pl.source === "manual" ? tr(`manual (POS ${lak(pl.pos_total)})`, `ໃສ່ດ້ວຍມື (POS ${lak(pl.pos_total)})`) : tr("from POS", "ຈາກ POS")}
                      </div>
                    </td>
                    <td className="mono">{lak(pl.staff_pool)}</td>
                    <td className="mono">
                      {pl.service_eligible}
                      {pl.full_share_count > 0 && <div className="hint">{tr(`${pl.full_share_count} always full`, `ເຕັມສະເໝີ ${pl.full_share_count}`)}</div>}
                    </td>
                    <td className="mono">{lak(pl.service_share)}</td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="card">
              <h3 style={{ fontSize: 13, marginTop: 14 }}>{tr("Where the collected service charge % goes", "ຄ່າບໍລິການທີ່ເກັບໄດ້ ແບ່ງໄປໃສ")}</h3>
              <p className="hint">{tr("Not all of the service charge collected on a bill necessarily goes to the staff pool above — split it out here.", "ຄ່າບໍລິການທີ່ເກັບໄດ້ ບໍ່ຈຳເປັນຕ້ອງໃຫ້ພະນັກງານທັງໝົດ — ແບ່ງສ່ວນຢູ່ນີ້.")}</p>
              {alloc.map((a, i) => (
                <div className="stat-row" key={i}>
                  <span style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                    <input className="inline-input" style={{ flex: 1, maxWidth: 260 }} value={a.label} onChange={(e) => setAlloc(alloc.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <label className="hint" style={{ margin: 0, display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="checkbox" checked={a.is_staff_pool} onChange={(e) => setAlloc(alloc.map((x, j) => (j === i ? { ...x, is_staff_pool: e.target.checked } : x)))} />
                      {tr("paid to staff", "ແບ່ງໃຫ້ພະນັກງານ")}
                    </label>
                  </span>
                  <span>
                    <input className="inline-input" type="number" style={{ width: 64, textAlign: "right" }} value={a.pct} onChange={(e) => setAlloc(alloc.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} />%
                    <button type="button" className="mini-btn flag" style={{ marginLeft: 6 }} onClick={() => setAlloc(alloc.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </span>
                </div>
              ))}
              <div className="stat-row" style={{ borderTop: "1px solid var(--line)" }}>
                <span>
                  <b>{tr("Total allocated", "ລວມທີ່ແບ່ງ")}</b>
                </span>
                <b className={total === 100 ? "" : "c-clay"}>{num(total)}%</b>
              </div>
              {total !== 100 && <p className="hint warn">{tr("Should add up to 100% of the service charge collected.", "ລວມກັນຄວນໄດ້ 100% ຂອງຄ່າບໍລິການ.")}</p>}
              <button type="button" className="mini-btn" style={{ marginTop: 8 }} onClick={() => setAlloc([...alloc, { label: tr("New portion", "ສ່ວນແບ່ງໃໝ່"), pct: 0, is_staff_pool: false }])}>
                {tr("+ Add a portion", "+ ເພີ່ມສ່ວນແບ່ງ")}
              </button>
              {dirty && (
                <button type="button" className="submit-btn" style={{ marginTop: 8 }} onClick={save} disabled={saveAlloc.isPending}>
                  {tr("Save allocation", "ບັນທຶກການແບ່ງ")}
                </button>
              )}
            </div>

          </>
        )}
      </DataState>
      <Lede>{tr("Each person's share flows straight into Payroll's Service charge column.", "ສ່ວນແບ່ງຂອງແຕ່ລະຄົນ ເຂົ້າໄປໃນຖັນ ຄ່າບໍລິການ ຂອງໜ້າເງິນເດືອນໂດຍກົງ.")}</Lede>
    </div>
  );
}
