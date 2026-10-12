"use client";

import { useState } from "react";
import { DataState, Field, Lede, SectionHead, useDialogs } from "@/components/ui";
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
        {tr("Pulled live from completed POS sales for the month. The staff pool is split across every employee with \"Gets service charge\" ticked in their profile, weighted by the hours they actually worked (capped at their required hours, so OT never increases a share). Employees marked \"Always gets full service charge\" get the full share below whatever their hours. Percentage-of-revenue and other bonuses now live under Bonus Types.", "ດຶງສົດຈາກການຂາຍ POS ຂອງເດືອນ. ສ່ວນຂອງພະນັກງານແບ່ງໃຫ້ທຸກຄົນທີ່ tick \"ໄດ້ຄ່າບໍລິການ\" ຕາມຊົ່ວໂມງທີ່ເຮັດແທ້ (ສູງສຸດເທົ່າມາດຕະຖານ — OT ບໍ່ເພີ່ມສ່ວນແບ່ງ). ຄົນທີ່ tick \"ໄດ້ຄ່າບໍລິການເຕັມສະເໝີ\" ໄດ້ສ່ວນເຕັມ ບໍ່ວ່າຈະເຮັດຈັກຊົ່ວໂມງ. ໂບນັດແບບ % ແລະ ອື່ນໆ ຢູ່ໃນໜ້າ ປະເພດໂບນັດ.")}
      </Lede>
      <Field label={tr("Month", "ເດືອນ")} style={{ maxWidth: 220 }}>
        <input type="month" value={month} onChange={(e) => e.target.value && (setMonth(e.target.value), setDraft(null))} />
      </Field>
      <DataState loading={pool.isLoading} error={pool.error}>
        {p && (
          <>
            <div className="card">
              <h3 style={{ fontSize: 14 }}>{tr("Service charge pool", "ຍອດຄ່າບໍລິການ")} — {fmtMonth(month)}</h3>
              <div className="stat-row">
                <span>{tr("Total service charge collected this month", "ຄ່າບໍລິການທີ່ເກັບໄດ້ເດືອນນີ້")}</span>
                <b>{lak(p.total_service_charge)}</b>
              </div>
              <div className="stat-row">
                <span>{tr(`Staff pool (${num(p.staff_pool_pct)}% of collected)`, `ສ່ວນຂອງພະນັກງານ (${num(p.staff_pool_pct)}% ຂອງທີ່ເກັບໄດ້)`)}</span>
                <b>{lak(p.staff_pool)}</b>
              </div>
              <div className="stat-row">
                <span>{tr("Eligible employees (Gets service charge ✓)", "ພະນັກງານທີ່ມີສິດ (ໄດ້ຄ່າບໍລິການ ✓)")}</span>
                <b>{p.service_eligible}</b>
              </div>
              <div className="stat-row">
                <span>{tr("Full share per eligible employee (pool ÷ eligible)", "ສ່ວນແບ່ງເຕັມຕໍ່ຄົນ (ຍອດ ÷ ຈຳນວນຄົນມີສິດ)")}</span>
                <b>{lak(p.service_share)}</b>
              </div>
              <div className="stat-row">
                <span>{tr("Always get the full share", "ໄດ້ສ່ວນແບ່ງເຕັມສະເໝີ")}</span>
                <b>{p.full_share_count}</b>
              </div>
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
