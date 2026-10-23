"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { fmtDate, fmtMonth, lak, thisMonth, today } from "@/lib/format";
import { hrKeys, useApprovals, useHRAccess, useStaff } from "@/features/hr/api";
import type { Approval, Attendance, LeaveRequest, OTDay, Overview, PayrollPreview } from "@/features/hr/types";
import { approvalLabel, approvalText, rolesText, statusWarning } from "@/features/hr/utils";

const prevMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
const lastDay = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};
const nowHM = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

type Item = { key: string; icon: string; tone: "leave" | "warn" | "low" | "info"; title: string; sub: string; href: string; action: string };

/** Prototype "Dashboard": headline numbers, what needs HR today, and where this month's payroll stands. */
export default function DashboardPage() {
  const access = useHRAccess().data;
  const tabs = new Set<string>(access?.tabs ?? []);
  const day = today();
  const staff = useStaff();
  const attendance = useQuery({ queryKey: hrKeys.attendance(day), queryFn: () => api.get<Attendance[]>(`/hr/attendance?date=${day}`), enabled: tabs.has("attendance") });
  const leaves = useQuery({ queryKey: hrKeys.leaveRequests, queryFn: () => api.get<LeaveRequest[]>("/hr/leave-requests"), enabled: tabs.has("leave") });
  const overview = useQuery({ queryKey: hrKeys.overview, queryFn: () => api.get<Overview>("/hr/overview"), enabled: tabs.has("overview") });
  const ot = useQuery({ queryKey: hrKeys.ot(day), queryFn: () => api.get<OTDay>(`/hr/ot?date=${day}`), enabled: tabs.has("overtime") });
  const approvals = useApprovals("pending", !!access?.can_approve);

  // payroll card: last month while it is still open, else this month
  const last = prevMonth(thisMonth());
  const lastPay = useQuery({ queryKey: hrKeys.payroll(last), queryFn: () => api.get<PayrollPreview>(`/hr/payroll-live?month=${last}`), enabled: tabs.has("payroll") });
  const payMonth = lastPay.data && lastPay.data.status.status !== "closed" ? last : thisMonth();
  const curPay = useQuery({ queryKey: hrKeys.payroll(thisMonth()), queryFn: () => api.get<PayrollPreview>(`/hr/payroll-live?month=${thisMonth()}`), enabled: tabs.has("payroll") && payMonth === thisMonth() });
  const pay = payMonth === last ? lastPay.data : curPay.data;

  const active = (staff.data ?? []).filter((s) => s.status !== "resigned");
  const byResort = new Map<string, number>();
  for (const s of active) byResort.set(s.property || tr("No resort", "ບໍ່ມີຣີສອດ"), (byResort.get(s.property || tr("No resort", "ບໍ່ມີຣີສອດ")) ?? 0) + 1);
  const resortText = [...byResort].map(([p, n]) => `${n} ${p.replace(/ Yorlapa$/, "")}`).join(" · ");

  const onShift = (attendance.data ?? []).filter((a) => a.check_in && !a.check_out).length;
  const onLeave = (leaves.data ?? []).filter((l) => l.status === "approved" && l.start_date <= day && l.end_date >= day);
  const leavePending = (leaves.data ?? []).filter((l) => l.status === "pending").length;

  // ── what needs attention ──
  const items: Item[] = [];
  for (const a of (approvals.data ?? []).filter((x: Approval) => x.can_decide).slice(0, 6)) {
    const leave = a.type === "leave_request";
    items.push({
      key: a.id,
      icon: leave ? "🌴" : "✅",
      tone: leave ? "leave" : "info",
      title: `${approvalText(a.target)} — ${approvalLabel(a.type)}`,
      sub: `${a.new_value ? `${approvalText(a.new_value)} · ` : ""}${tr(`waiting for ${rolesText(a.required_roles)}`, `ລໍຖ້າ ${rolesText(a.required_roles)}`)}`,
      href: "/hr/approvals",
      action: tr("Open", "ເປີດ"),
    });
  }
  if (tabs.has("employee_status")) {
    for (const s of active) {
      const w = statusWarning(s);
      if (w.kind === "ok") continue;
      items.push({
        key: "st" + s.user_id,
        icon: "📋",
        tone: w.kind === "low" ? "low" : "warn",
        title: `${s.full_name} — ${w.text.replace(/^⚠\s*/, "")}`,
        sub: `${s.position || "—"}${s.department ? ", " + s.department : ""} · ${tr("decide: confirm, extend or end", "ຕັດສິນໃຈ: ຢືນຢັນ, ຕໍ່ ຫຼື ຢຸດ")}`,
        href: "/hr/employee-status",
        action: tr("Decide", "ຕັດສິນ"),
      });
    }
  }
  if (ot.data?.active) {
    const open = ot.data.days.filter((d) => d.people > 0 && !d.finalized).length;
    if (open > 0)
      items.push({
        key: "ot",
        icon: "⏱️",
        tone: "warn",
        title: tr(`${open} day${open > 1 ? "s" : ""} of overtime not finalized`, `OT ${open} ມື້ ຍັງບໍ່ Finalize`),
        sub: tr("Scanner OT isn't paid until it matches the signed OT document", "OT ຈາກເຄື່ອງສະແກນ ຈະບໍ່ຈ່າຍ ຈົນກວ່າຈະກົງກັບໃບ OT ທີ່ເຊັນແລ້ວ"),
        href: "/hr/overtime",
        action: "Finalize",
      });
  }
  if (pay && pay.status.status === "open" && payMonth === last)
    items.push({
      key: "pay",
      icon: "💰",
      tone: "info",
      title: tr(`${fmtMonth(last)} payroll is ready to check`, `ເງິນເດືອນ ${fmtMonth(last)} ພ້ອມໃຫ້ກວດແລ້ວ`),
      sub: tr("Review it, then submit for approval", "ກວດແລ້ວ ສົ່ງຂໍອະນຸມັດ"),
      href: "/hr/payroll",
      action: tr("Review", "ກວດ"),
    });

  const loading = staff.isLoading;
  const steps: [string, boolean][] = pay
    ? [
        [tr("Calculated", "ຄິດໄລ່ແລ້ວ"), true],
        [tr("Submitted", "ສົ່ງແລ້ວ"), pay.status.status !== "open"],
        [tr("Approved", "ອະນຸມັດແລ້ວ"), pay.status.status === "approved" || pay.status.status === "closed"],
        [tr("Sent to Accountant", "ສົ່ງໃຫ້ບັນຊີແລ້ວ"), !!pay.status.sent_at],
        [tr("Month closed", "ປິດເດືອນແລ້ວ"), pay.status.status === "closed"],
      ]
    : [];
  const nextStep = steps.findIndex(([, done]) => !done);
  const payCount = pay ? pay.departments.reduce((n, d) => n + d.rows.length, 0) : 0;

  const quick: [string, string, string][] = [
    ["/hr/directory", "👥", tr("Add or find an employee", "ເພີ່ມ / ຊອກພະນັກງານ")],
    ["/hr/leave", "🌴", tr("Record a leave request", "ບັນທຶກຄຳຂໍລາພັກ")],
    ["/hr/attendance", "🕘", tr("Today's attendance", "ການເຂົ້າວຽກມື້ນີ້")],
    ["/hr/payroll", "💰", tr("Open payroll", "ເປີດເງິນເດືອນ")],
  ];
  const allowed = (href: string) => ({ "/hr/directory": "directory", "/hr/leave": "leave", "/hr/attendance": "attendance", "/hr/payroll": "payroll" } as Record<string, string>)[href];

  return (
    <div className="subview dash">
      <div className="kpi-row">
        <Kpi label={tr("Employees", "ພະນັກງານ")} value={loading ? "…" : active.length} sub={resortText || "—"} />
        <Kpi
          label={tr("On shift now", "ກຳລັງເຂົ້າກະ")}
          value={tabs.has("attendance") ? onShift : "—"}
          sub={tr(`of ${active.length} staff · as of ${nowHM()}`, `ຈາກ ${active.length} ຄົນ · ເວລາ ${nowHM()}`)}
        />
        <Kpi
          label={tr("On leave today", "ລາພັກມື້ນີ້")}
          value={tabs.has("leave") ? onLeave.length : "—"}
          sub={tr(`${leavePending} request${leavePending === 1 ? "" : "s"} waiting for approval`, `${leavePending} ຄຳຂໍ ລໍຖ້າອະນຸມັດ`)}
        />
        <Kpi
          label={tr("Open positions", "ຕຳແໜ່ງວ່າງ")}
          value={overview.data ? overview.data.total_openings : "—"}
          sub={tr("Seats left to reach every department quota", "ບ່ອນທີ່ຍັງຂາດ ຈຶ່ງຄົບໂຄຕາທຸກພະແນກ")}
        />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="dash-h">
            {tr("Needs your attention", "ສິ່ງທີ່ຕ້ອງເຮັດ")} <span>{tr(`${items.length} items`, `${items.length} ລາຍການ`)}</span>
          </h3>
          {items.length === 0 && <p className="empty">{tr("Nothing waiting — all caught up.", "ບໍ່ມີຫຍັງຄ້າງ — ຮຽບຮ້ອຍໝົດແລ້ວ.")}</p>}
          <ul className="attn-list">
            {items.map((it) => (
              <li key={it.key}>
                <span className={`attn-icon ${it.tone}`} aria-hidden>
                  {it.icon}
                </span>
                <div className="attn-text">
                  <b>{it.title}</b>
                  <span>{it.sub}</span>
                </div>
                <Link href={it.href} className="attn-btn">
                  {it.action} →
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="dash-side">
          {tabs.has("payroll") && (
            <div className="card">
              <h3 className="dash-h">{tr(`Payroll — ${fmtMonth(payMonth)}`, `ເງິນເດືອນ — ${fmtMonth(payMonth)}`)}</h3>
              {!pay ? (
                <p className="empty">{tr("Loading…", "ກຳລັງໂຫຼດ…")}</p>
              ) : (
                <>
                  <div className="pay-hero">
                    <div className="kpi-label">{access?.property ? tr("Net payroll", "ເງິນເດືອນສຸດທິ") : tr("Net payroll (all staff)", "ເງິນເດືອນສຸດທິ (ທຸກຄົນ)")}</div>
                    <div className="pay-total">{lak(pay.grand_total)}</div>
                    <div className="pay-sub">
                      {tr(`${payCount} employees · pays on ${fmtDate(lastDay(payMonth))}`, `${payCount} ຄົນ · ຈ່າຍວັນທີ ${fmtDate(lastDay(payMonth))}`)}
                    </div>
                  </div>
                  <ol className="pay-steps">
                    {steps.map(([label, done], i) => (
                      <li key={label} className={done ? "done" : i === nextStep ? "next" : ""}>
                        <span>{done ? "✓" : i + 1}</span>
                        {label}
                      </li>
                    ))}
                  </ol>
                  <Link href="/hr/payroll" className="pay-open">
                    {tr("Open payroll", "ເປີດເງິນເດືອນ")} →
                  </Link>
                </>
              )}
            </div>
          )}
          <div className="card">
            <h3 className="dash-h">{tr("Quick actions", "ທາງລັດ")}</h3>
            <div className="quick-grid">
              {quick
                .filter(([href]) => tabs.has(allowed(href) ?? ""))
                .map(([href, icon, label]) => (
                  <Link key={href} href={href} className="quick-btn">
                    <span aria-hidden>{icon}</span>
                    {label}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}
