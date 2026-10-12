"use client";

import { tr } from "@/lib/i18n";
import { Modal, StatusTag, Table, useDialogs } from "@/components/ui";
import { lak } from "@/lib/format";
import { useApprovalDetail, useDecideApproval } from "../api";
import { approvalChange, approvalLabel, decisionMessage, fmtStamp, groupByDept } from "../utils";
import { NeedsCell } from "./NeedsCell";

/**
 * Detail of one HR request (prototype approvalDetailModal / ptDayDetailModal).
 * Approve / Deny is shown only when the request is pending and the user may decide.
 */
export function ApprovalDetailModal({ id, canDecide, onClose }: { id: string | null; canDecide: boolean; onClose: () => void }) {
  const detail = useApprovalDetail(id);
  const decide = useDecideApproval();
  const dialogs = useDialogs();
  const a = detail.data?.approval;

  async function run(decision: "approved" | "denied") {
    if (!a) return;
    try {
      const r = await decide.mutateAsync({ id: a.id, decision });
      onClose();
      dialogs.success(...decisionMessage(a, r.status));
    } catch (err) {
      dialogs.error(tr("Could not complete", "ດຳເນີນການບໍ່ສຳເລັດ"), err);
    }
  }

  const rules = a?.type === "new_department" ? (a.payload as Record<string, number>) : null;
  const hires = detail.data?.hires ?? [];

  return (
    <Modal open={!!id} onClose={onClose} title={a ? `${approvalLabel(a.type)} — ${a.target}` : "…"}>
      {a && (
        <>
          <div className="stat-row">
            <span>{tr("Status", "ສະຖານະ")}</span>
            <StatusTag status={a.status} />
          </div>
          {a.status === "pending" && (
            <div className="stat-row">
              <span>{tr("Needs", "ຕ້ອງການ")}</span>
              <NeedsCell a={a} />
            </div>
          )}
          <div className="stat-row">
            <span>{tr("Change", "ການປ່ຽນ")}</span>
            <b style={{ fontSize: 11.5, textAlign: "right" }}>{approvalChange(a)}</b>
          </div>
          <div className="stat-row">
            <span>{tr("Requested", "ຂໍເມື່ອ")}</span>
            <b>
              {fmtStamp(a.requested_at)} · {a.requested_by || "—"}
            </b>
          </div>
          <div className="stat-row">
            <span>{tr("Reviewed", "ພິຈາລະນາເມື່ອ")}</span>
            <b>{a.reviewed_at ? `${fmtStamp(a.reviewed_at)} · ${a.reviewed_by}` : "—"}</b>
          </div>

          {rules && (
            <Table head={["", ""]}>
              <tr><td>{tr("Headcount quota", "ໂຄຕາຄົນ")}</td><td className="mono">{rules.quota}</td></tr>
              <tr><td>{tr("Base / minimum salary", "ເງິນເດືອນພື້ນຖານ / ຕ່ຳສຸດ")}</td><td className="mono">{lak(rules.base_salary)}</td></tr>
              <tr><td>{tr("Hours per day", "ຊົ່ວໂມງຕໍ່ມື້")}</td><td className="mono">{rules.hours_per_day}</td></tr>
              <tr><td>{tr("Days per week", "ມື້ຕໍ່ອາທິດ")}</td><td className="mono">{rules.days_per_week}</td></tr>
              <tr><td>{tr("OT rate", "ອັດຕາ OT")}</td><td className="mono">× {rules.ot_rate}</td></tr>
              <tr><td>{tr("Annual leave (days/yr)", "ລາພັກປະຈຳປີ (ມື້/ປີ)")}</td><td className="mono">{rules.annual_leave_quota}</td></tr>
              <tr><td>{tr("Sick leave (days/yr)", "ລາປ່ວຍ (ມື້/ປີ)")}</td><td className="mono">{rules.sick_leave_quota}</td></tr>
            </Table>
          )}

          {hires.length > 0 &&
            groupByDept(hires, (h) => h.department, []).map(([dept, rows]) => (
              <div key={dept}>
                <h4 style={{ fontSize: 12, margin: "10px 0 4px" }}>{dept}</h4>
                <Table head={[tr("Name", "ຊື່"), "Outlet", tr("Price/day", "ຄ່າຈ້າງ/ມື້")]}>
                  {rows.map((h) => (
                    <tr key={h.id}>
                      <td>{h.name}</td>
                      <td>{h.outlet || "—"}</td>
                      <td className="mono">{lak(h.price_per_day)}</td>
                    </tr>
                  ))}
                </Table>
              </div>
            ))}

          {canDecide && a.can_decide && (
            <div className="modal-actions">
              <button type="button" className="no" onClick={() => run("denied")} disabled={decide.isPending}>
                {tr("Deny", "ປະຕິເສດ")}
              </button>
              <button type="button" className="ok" onClick={() => run("approved")} disabled={decide.isPending}>
                {tr("Approve", "ອະນຸມັດ")}
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
