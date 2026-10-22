"use client";

import { useState } from "react";
import { DataState, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { daysUntil, fmtDate, num } from "@/lib/format";
import { useBenefits, useDepartments, useMyResort, useRequestBenefitOverride, useRequestBenefitRules, useStaff } from "@/features/hr/api";
import type { BenefitKey, Benefits, Staff } from "@/features/hr/types";
import { employmentLabel, groupByDept, requestOutcome, statusWarning } from "@/features/hr/utils";

type Sort = "probation" | "contract" | null;
type EmpBenefits = Benefits["employees"][number];

const BENEFITS: BenefitKey[] = ["annual", "public_holiday", "weekly"];
const benefitLabel = (k: BenefitKey) =>
  k === "annual" ? tr("Annual leave", "ລາພັກປະຈຳປີ") : k === "public_holiday" ? tr("Public holiday", "ວັນພັກລັດຖະການ") : tr("Weekly holiday", "ວັນພັກປະຈຳອາທິດ");

/** 0 → "from day one", 12 → "after 1 year", 3 → "after 3 months" */
const periodText = (m: number) =>
  m <= 0
    ? tr("from day one", "ຕັ້ງແຕ່ມື້ທຳອິດ")
    : m % 12 === 0
      ? tr(`after ${m / 12} year${m === 12 ? "" : "s"}`, `ຫຼັງ ${m / 12} ປີ`)
      : tr(`after ${m} month${m === 1 ? "" : "s"}`, `ຫຼັງ ${m} ເດືອນ`);

const serviceText = (m: number | null) => {
  if (m === null) return "—";
  const y = Math.floor(m / 12);
  const r = m % 12;
  return tr([y ? `${y} yr` : "", `${r} mo`].filter(Boolean).join(" "), [y ? `${y} ປີ` : "", `${r} ເດືອນ`].filter(Boolean).join(" "));
};

const byDays = (key: "probation_end_date" | "contract_end") => (a: Staff, b: Staff) => {
  const da = daysUntil(a[key]);
  const db = daysUntil(b[key]);
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
};

export default function EmployeeStatusPage() {
  const { t } = useLang();
  const [sort, setSort] = useState<Sort>(null);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const staff = useStaff();
  const depts = useDepartments();
  const benefits = useBenefits();
  const byUser = new Map((benefits.data?.employees ?? []).map((e) => [e.user_id, e]));
  // prototype v168 "Contracts/probation expiring soon": within 30 days or overdue
  const shown = (staff.data ?? []).filter((e) => !expiringOnly || statusWarning(e).kind !== "ok");
  const groups = groupByDept(shown, (e) => e.department, (depts.data ?? []).map((d) => d.name)).filter(([, r]) => r.length > 0);

  return (
    <div className="subview">
      <SectionHead title={t("sh_employee_status")} />
      <Lede>
        {tr(
          "Probation and contract end dates, grouped by department. Warns when a decision is needed soon (within 30 days) or overdue — plus how long each person has worked with us, and the annual leave / public holiday / weekly holiday they get by the length-of-service rules.",
          "ວັນໝົດທົດລອງງານ ແລະ ວັນໝົດສັນຍາ ແຍກຕາມພະແນກ. ເຕືອນເມື່ອຕ້ອງຕັດສິນໃຈ (ພາຍໃນ 30 ວັນ) ຫຼື ກາຍກຳນົດແລ້ວ — ພ້ອມອາຍຸງານ ແລະ ລາພັກປະຈຳປີ / ວັນພັກລັດຖະການ / ວັນພັກປະຈຳອາທິດ ທີ່ໄດ້ຕາມກົດອາຍຸງານ.",
        )}
      </Lede>
      {benefits.data && <RulesCard key={JSON.stringify(benefits.data.rules)} data={benefits.data} />}
      <div className="land-row">
        <button type="button" className="mini-btn" onClick={() => setSort("probation")}>
          {tr("Sort by Probation", "ຮຽງຕາມທົດລອງງານ")}
        </button>
        <button type="button" className="mini-btn" onClick={() => setSort("contract")}>
          {tr("Sort by Contract", "ຮຽງຕາມສັນຍາ")}
        </button>
        <button type="button" className={`mini-btn${expiringOnly ? " flag" : ""}`} onClick={() => setExpiringOnly((v) => !v)}>
          {tr("⚠ Contracts/probation expiring soon", "⚠ ສັນຍາ / ທົດລອງງານ ໃກ້ໝົດ")}
          {expiringOnly ? " ✓" : ""}
        </button>
        <button type="button" className="mini-btn" onClick={() => setSort(null)}>
          {tr("Clear sort", "ລ້າງການຮຽງ")}
        </button>
      </div>
      <DataState loading={staff.isLoading || benefits.isLoading} error={staff.error || benefits.error}>
        {groups.map(([dept, rows]) => {
          const sorted =
            sort === "probation" ? [...rows].sort(byDays("probation_end_date")) : sort === "contract" ? [...rows].sort(byDays("contract_end")) : rows;
          return (
            <div className="card" key={dept}>
              <h3 style={{ fontSize: 14 }}>{dept}</h3>
              <div style={{ overflowX: "auto" }}>
                <Table
                  head={[
                    tr("Employee", "ພະນັກງານ"),
                    tr("Worked with us", "ອາຍຸງານ"),
                    tr("Employment type", "ປະເພດການຈ້າງ"),
                    tr("Probation end", "ໝົດທົດລອງງານ"),
                    tr("Contract end", "ສິ້ນສຸດສັນຍາ"),
                    ...BENEFITS.map(benefitLabel),
                    tr("Warning", "ແຈ້ງເຕືອນ"),
                  ]}
                >
                  {sorted.map((e) => {
                    const w = statusWarning(e);
                    const b = byUser.get(e.user_id);
                    return (
                      <tr key={e.user_id}>
                        <td>
                          {e.full_name}
                          {e.property && <div className="hint">{e.property}</div>}
                        </td>
                        <td>
                          {serviceText(b?.months_of_service ?? null)}
                          <div className="hint">{e.hire_date ? fmtDate(e.hire_date) : tr("no hire date", "ບໍ່ມີວັນເຂົ້າວຽກ")}</div>
                        </td>
                        <td>{employmentLabel(e.employment_type)}</td>
                        <td>{fmtDate(e.probation_end_date)}</td>
                        <td>{e.contract_end ? fmtDate(e.contract_end) : tr("Permanent", "ຖາວອນ")}</td>
                        {BENEFITS.map((k) => (
                          <td key={k}>{b ? <BenefitCell e={e} b={b} k={k} /> : "—"}</td>
                        ))}
                        <td>
                          <Tag kind={w.kind}>{w.text}</Tag>
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              </div>
            </div>
          );
        })}
        {expiringOnly && groups.length === 0 && (
          <p className="empty">{tr("No contracts or probations expiring within the next 30 days.", "ບໍ່ມີສັນຍາ ຫຼື ທົດລອງງານ ທີ່ໝົດພາຍໃນ 30 ວັນ.")}</p>
        )}
      </DataState>
    </div>
  );
}

/** One benefit for one employee: tick = granted. Changing it goes through "Benefit eligibility change". */
function BenefitCell({ e, b, k }: { e: Staff; b: EmpBenefits; k: BenefitKey }) {
  const dialogs = useDialogs();
  const req = useRequestBenefitOverride();
  const s = b.benefits[k];

  async function change(granted: boolean | null) {
    const what = granted === null ? tr("follow the rule", "ໃຫ້ຕາມກົດ") : granted ? tr("granted", "ໃຫ້ສິດ") : tr("not granted", "ບໍ່ໃຫ້ສິດ");
    try {
      const res = await req.mutateAsync({ user_id: e.user_id, benefit: k, granted });
      dialogs.success(...requestOutcome(res, tr(`${benefitLabel(k)} for ${e.full_name} (${what})`, `${benefitLabel(k)} ຂອງ ${e.full_name} (${what})`)));
    } catch (err) {
      dialogs.error(tr("Could not send", "ສົ່ງບໍ່ສຳເລັດ"), err);
    }
  }

  const note =
    s.override === true
      ? tr("Ticked by HR", "HR ໝາຍໃຫ້")
      : s.override === false
        ? tr("Unticked by HR", "HR ຍົກເລີກ")
        : s.starts
          ? s.granted
            ? tr(`Auto — since ${fmtDate(s.starts)}`, `ອັດຕະໂນມັດ — ຕັ້ງແຕ່ ${fmtDate(s.starts)}`)
            : tr(`Auto — starts ${fmtDate(s.starts)}`, `ອັດຕະໂນມັດ — ເລີ່ມ ${fmtDate(s.starts)}`)
          : tr("Auto", "ອັດຕະໂນມັດ");
  const quota =
    k === "annual"
      ? s.granted
        ? tr(`${num(b.annual_quota)} d · ${num(b.annual_used)} used · ${num(Math.max(0, b.annual_quota - b.annual_used))} left`, `${num(b.annual_quota)} ມື້ · ໃຊ້ ${num(b.annual_used)} · ເຫຼືອ ${num(Math.max(0, b.annual_quota - b.annual_used))}`)
        : tr("0 days", "0 ມື້")
      : k === "public_holiday"
        ? // which holidays someone gets is set per holiday (Holidays page), so show the real quota
          tr(`${num(b.holiday_quota)} d · ${num(b.holiday_used)} used`, `${num(b.holiday_quota)} ມື້ · ໃຊ້ ${num(b.holiday_used)}`)
        : s.granted
          ? tr(`${b.weekly_days_off} d/week`, `${b.weekly_days_off} ມື້/ອາທິດ`)
          : tr("0 days", "0 ມື້");

  return (
    <div style={{ minWidth: 150 }}>
      <label style={{ fontSize: 11.5, whiteSpace: "nowrap", cursor: s.pending ? "default" : "pointer" }}>
        <input type="checkbox" checked={s.granted} disabled={s.pending || req.isPending} onChange={(ev) => change(ev.target.checked)} />{" "}
        <b style={{ color: s.granted ? "var(--moss)" : "var(--ink-soft)" }}>{s.granted ? tr("Gets it", "ໄດ້ສິດ") : tr("Not yet", "ຍັງບໍ່ໄດ້")}</b>
      </label>
      <div className="hint" style={{ margin: 0 }}>
        {note}
        {s.pending && tr(" · ⏳ awaiting approval", " · ⏳ ລໍຖ້າອະນຸມັດ")}
        {s.override !== null && !s.pending && (
          <>
            {" · "}
            <button type="button" className="link-btn" style={{ fontSize: 10.5, padding: 0, border: "none", background: "none", color: "var(--jade)", textDecoration: "underline", cursor: "pointer" }} onClick={() => change(null)}>
              {tr("follow rule", "ໃຫ້ຕາມກົດ")}
            </button>
          </>
        )}
      </div>
      <div className="mono" style={{ fontSize: 10.5 }}>
        {quota}
      </div>
    </div>
  );
}

/** How long staff must work before each benefit starts. Changing it: central HR, "Benefit rule change" (COO/CEO). */
function RulesCard({ data }: { data: Benefits }) {
  const dialogs = useDialogs();
  const req = useRequestBenefitRules();
  const central = useMyResort() === null;
  const init = (m: number) => (m > 0 && m % 12 === 0 ? { v: String(m / 12), unit: "years" } : { v: String(m), unit: "months" });
  const [f, setF] = useState(() => Object.fromEntries(BENEFITS.map((k) => [k, init(data.rules[k])])) as Record<BenefitKey, { v: string; unit: string }>);
  const months = (k: BenefitKey) => Math.round((parseFloat(f[k].v) || 0) * (f[k].unit === "years" ? 12 : 1));
  const dirty = BENEFITS.some((k) => months(k) !== data.rules[k]);

  async function save() {
    if (BENEFITS.some((k) => !(parseFloat(f[k].v) >= 0)))
      return dialogs.error(tr("Invalid period", "ໄລຍະບໍ່ຖືກ"), new Error(tr("Enter 0 or more for each benefit.", "ໃສ່ 0 ຂຶ້ນໄປ ໃຫ້ທຸກສະຫວັດດີການ.")));
    try {
      const res = await req.mutateAsync({ annual: months("annual"), public_holiday: months("public_holiday"), weekly: months("weekly") });
      dialogs.success(...requestOutcome(res, tr("The benefit rules change", "ການປ່ຽນກົດສະຫວັດດີການ")));
    } catch (err) {
      dialogs.error(tr("Could not send", "ສົ່ງບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 13 }}>{tr("Benefit eligibility rules", "ກົດສິດສະຫວັດດີການຕາມອາຍຸງານ")}</h3>
      <p className="hint">
        {tr(
          "How long someone must have worked before each benefit starts automatically. HR can still tick or untick a benefit for one employee below, overriding the rule (GM/COO sign-off). Changing these rules needs COO/CEO sign-off.",
          "ຕ້ອງເຮັດວຽກດົນປານໃດ ກ່ອນສະຫວັດດີການແຕ່ລະຢ່າງເລີ່ມອັດຕະໂນມັດ. HR ຍັງໝາຍ ຫຼື ຍົກເລີກ ໃຫ້ລາຍຄົນໄດ້ຂ້າງລຸ່ມ ແທນກົດ (GM/COO ອະນຸມັດ). ການປ່ຽນກົດເຫຼົ່ານີ້ ຕ້ອງໃຫ້ COO/CEO ອະນຸມັດ.",
        )}
      </p>
      <div className="land-row" style={{ alignItems: "flex-end" }}>
        {BENEFITS.map((k) => (
          <div className="field" key={k} style={{ maxWidth: 240 }}>
            <label>{tr(`${benefitLabel(k)} — must work at least`, `${benefitLabel(k)} — ຕ້ອງເຮັດວຽກຢ່າງໜ້ອຍ`)}</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number"
                min={0}
                step="any"
                value={f[k].v}
                disabled={!central}
                onChange={(e) => setF({ ...f, [k]: { ...f[k], v: e.target.value } })}
                style={{ width: 70 }}
              />
              <select value={f[k].unit} disabled={!central} onChange={(e) => setF({ ...f, [k]: { ...f[k], unit: e.target.value } })}>
                <option value="months">{tr("months", "ເດືອນ")}</option>
                <option value="years">{tr("years", "ປີ")}</option>
              </select>
            </div>
            <div className="hint" style={{ margin: "2px 0 0" }}>
              {tr("Now:", "ຕອນນີ້:")} {periodText(data.rules[k])}
            </div>
          </div>
        ))}
        {central && (
          <button type="button" className="mini-btn" onClick={save} disabled={!dirty || req.isPending || !!data.rule_change_pending}>
            {tr("Save rules", "ບັນທຶກກົດ")}
          </button>
        )}
      </div>
      {data.rule_change_pending && (
        <p className="hint warn">
          {tr("⏳ A change to these rules is waiting for approval:", "⏳ ການປ່ຽນກົດລໍຖ້າອະນຸມັດ:")} {data.rule_change_pending}
        </p>
      )}
      {!central && <p className="hint">{tr("These rules are set by central HR.", "ກົດເຫຼົ່ານີ້ ກຳນົດໂດຍ HR ສູນກາງ.")}</p>}
    </div>
  );
}
