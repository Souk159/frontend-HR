/** Prints a small standalone document (payslips) through a hidden iframe, like the prototype's printViaHiddenFrame. */

import type { PayrollPreview } from "./types";
import { tr } from "@/lib/i18n";
import { fmtMonth, lak, money, num } from "@/lib/format";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type SlipLine = { label: string; value: string; strong?: boolean; negative?: boolean };

export function printSlip(title: string, heading: string, meta: [string, string][], lines: SlipLine[], note?: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body { font-family: "Inter", "Noto Sans Lao", system-ui, sans-serif; color: #1d2b26; margin: 32px; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; } .sub { color: #6b7a73; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  td { padding: 7px 4px; border-bottom: 1px solid #e3e0d6; } td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .meta td { border: none; padding: 3px 4px; } .meta td:first-child { color: #6b7a73; width: 160px; }
  .strong td { font-weight: 700; border-top: 2px solid #1d2b26; } .neg td:last-child { color: #a34a2a; }
  .note { margin-top: 18px; color: #6b7a73; font-size: 11px; }
</style></head><body>
<h1>${esc(heading)}</h1><div class="sub">Yorsys HR</div>
<table class="meta">${meta.map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:left">${esc(v)}</td></tr>`).join("")}</table>
<table>${lines
    .map((l) => `<tr class="${l.strong ? "strong" : ""}${l.negative ? " neg" : ""}"><td>${esc(l.label)}</td><td>${esc(l.value)}</td></tr>`)
    .join("")}</table>
${note ? `<p class="note">${esc(note)}</p>` : ""}
</body></html>`;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    setTimeout(() => frame.remove(), 1000);
  }, 250);
}


/**
 * The whole month's payroll on A4 landscape (prototype v207 printPayroll):
 * per department, a DRAFT / APPROVED / CLOSED stamp, totals per currency and
 * signature lines for HR, GM, COO and CEO.
 */
export function printPayrollSheet(p: PayrollPreview, resort: string | null) {
  const st = p.status?.status;
  const stamp = st === "closed" ? tr("CLOSED", "ປິດແລ້ວ") : st === "approved" ? tr("APPROVED", "ອະນຸມັດແລ້ວ") : tr("DRAFT — NOT YET APPROVED", "ຮ່າງ — ຍັງບໍ່ອະນຸມັດ");
  const ok = st === "closed" || st === "approved";
  const byCur: Record<string, { lak: number; inCur: number; count: number }> = {};
  const rate = (cur: string) => (cur === "USD" ? p.fx?.usd || 1 : cur === "THB" ? p.fx?.thb || 1 : 1);
  const depts = p.departments
    .map((d) => {
      const rows = d.rows
        .map((r) => {
          const cur = r.salary_currency || "LAK";
          const c = (byCur[cur] ??= { lak: 0, inCur: 0, count: 0 });
          c.lak += r.net;
          c.inCur += r.net / rate(cur);
          c.count++;
          const base = cur === "LAK" ? lak(r.base_salary) : `${money(r.salary_original, cur)}<br><small>≈ ${lak(r.base_salary)}</small>`;
          const net = lak(r.net) + (cur !== "LAK" ? `<br><small>≈ ${money(r.net / rate(cur), cur)}</small>` : "");
          const hours = r.requires_scan ? `${num(r.effective_hours)} / ${num(r.required_hours)}h` : "—";
          return `<tr><td>${esc(r.employee_no)}</td><td>${esc(r.name)}</td><td class="r">${base}</td><td class="r">${hours}</td>
            <td class="r">${r.deduction ? "− " + lak(r.deduction) : "0"}</td><td class="r">${lak(r.ot_pay)}</td><td class="r">${lak(r.service_charge)}</td>
            <td class="r">${lak(r.quota_bonus)}</td><td class="r">${lak(r.other_bonuses)}</td><td class="r"><b>${net}</b></td><td></td></tr>`;
        })
        .join("");
      return `<h3>${esc(d.name)} <small>(${num(d.hours_per_day)}h/day, ${d.days_per_week} days/week)</small></h3>
        <table><tr><th>ID</th><th>${tr("Employee", "ພະນັກງານ")}</th><th>${tr("Base salary", "ເງິນເດືອນ")}</th><th>${tr("Hours", "ຊົ່ວໂມງ")}</th>
        <th>${tr("Deduction", "ຫັກ")}</th><th>OT</th><th>${tr("Service charge", "ຄ່າບໍລິການ")}</th><th>${tr("Bonus", "ໂບນັດ")}</th>
        <th>${tr("Other bonuses", "ໂບນັດອື່ນ")}</th><th>${tr("Net salary", "ເງິນເດືອນສຸດທິ")}</th><th>${tr("Signature", "ລາຍເຊັນ")}</th></tr>${rows}
        <tr class="tot"><td colspan="9">${tr("Department total", "ລວມພະແນກ")}</td><td class="r">${lak(d.total)}</td><td></td></tr></table>`;
    })
    .join("");
  const curLines = Object.entries(byCur)
    .map(([cur, v]) =>
      cur === "LAK"
        ? `<div>${tr("Paid in ₭", "ຈ່າຍເປັນ ₭")}: <b>${lak(v.lak)}</b> (${v.count} ${tr("staff", "ຄົນ")})</div>`
        : `<div>${tr(`Paid in ${cur}`, `ຈ່າຍເປັນ ${cur}`)}: <b>${money(v.inCur, cur)}</b> ≈ ${lak(v.lak)} (${v.count} ${tr("staff", "ຄົນ")}, 1 ${cur} = ${lak(rate(cur))})</div>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(tr(`Payroll — ${fmtMonth(p.month)}`, `ເງິນເດືອນ — ${fmtMonth(p.month)}`))}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: "Inter", "Noto Sans Lao", Arial, sans-serif; font-size: 11px; color: #222; }
  h1 { font-size: 17px; margin: 0; } h3 { font-size: 12.5px; margin: 14px 0 4px; } h3 small { font-weight: normal; color: #666; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 6px; }
  .stamp { border: 2px solid ${ok ? "#2e7d32" : "#b23c17"}; color: ${ok ? "#2e7d32" : "#b23c17"}; font-weight: bold; padding: 4px 10px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #444; padding: 4px 6px; font-size: 10px; vertical-align: top; }
  th { background: #eee; text-align: left; } .r { text-align: right; } small { color: #555; }
  .tot td { font-weight: bold; background: #f5f5f5; } .grand { margin-top: 12px; font-size: 12px; border-top: 2px solid #333; padding-top: 6px; }
  .signs { display: flex; justify-content: space-between; margin-top: 40px; gap: 18px; } .sign { flex: 1; text-align: center; font-size: 10.5px; }
  .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; }
</style></head><body>
<div class="head"><div><h1>${esc(tr(`Payroll — ${fmtMonth(p.month)}`, `ເງິນເດືອນ — ${fmtMonth(p.month)}`))}</h1>
<div style="color:#666">${esc(resort ?? tr("All resorts", "ທຸກຣີສອດ"))} · ${tr("amounts in ₭ unless shown", "ຈຳນວນເປັນ ₭ ຖ້າບໍ່ໄດ້ລະບຸ")}${p.in_progress ? " · " + tr(`as of ${p.as_of}`, `ຮອດ ${p.as_of}`) : ""}</div></div>
<div class="stamp">${stamp}</div></div>
${depts || `<p>${tr("No employees on payroll.", "ບໍ່ມີພະນັກງານໃນເງິນເດືອນ.")}</p>`}
<div class="grand"><div>${tr("Total net payroll", "ເງິນເດືອນສຸດທິລວມ")}: <b>${lak(p.grand_total)}</b></div>${curLines}</div>
<div class="signs">
  <div class="sign"><div class="line">${tr("Prepared by — HR", "ຜູ້ກະກຽມ — HR")}</div></div>
  <div class="sign"><div class="line">${tr("Checked — GM", "ກວດ — GM")}</div></div>
  <div class="sign"><div class="line">${tr("Approved — COO", "ອະນຸມັດ — COO")}</div></div>
  <div class="sign"><div class="line">${tr("Approved — CEO", "ອະນຸມັດ — CEO")}</div></div>
</div>
</body></html>`;
  printHtml(html);
}

function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    setTimeout(() => frame.remove(), 1000);
  }, 250);
}
