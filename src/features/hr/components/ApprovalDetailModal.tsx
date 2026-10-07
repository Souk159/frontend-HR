"use client";

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
      dialogs.error("Could not complete", err);
    }
  }

  const rules = a?.type === "new_department" ? (a.payload as Record<string, number>) : null;
  const hires = detail.data?.hires ?? [];

  return (
    <Modal open={!!id} onClose={onClose} title={a ? `${approvalLabel(a.type)} — ${a.target}` : "…"}>
      {a && (
        <>
          <div className="stat-row">
            <span>Status</span>
            <StatusTag status={a.status} />
          </div>
          {a.status === "pending" && (
            <div className="stat-row">
              <span>Needs</span>
              <NeedsCell a={a} />
            </div>
          )}
          <div className="stat-row">
            <span>Change</span>
            <b style={{ fontSize: 11.5, textAlign: "right" }}>{approvalChange(a)}</b>
          </div>
          <div className="stat-row">
            <span>Requested</span>
            <b>
              {fmtStamp(a.requested_at)} · {a.requested_by || "—"}
            </b>
          </div>
          <div className="stat-row">
            <span>Reviewed</span>
            <b>{a.reviewed_at ? `${fmtStamp(a.reviewed_at)} · ${a.reviewed_by}` : "—"}</b>
          </div>

          {rules && (
            <Table head={["", ""]}>
              <tr><td>Headcount quota</td><td className="mono">{rules.quota}</td></tr>
              <tr><td>Base / minimum salary</td><td className="mono">{lak(rules.base_salary)}</td></tr>
              <tr><td>Hours per day</td><td className="mono">{rules.hours_per_day}</td></tr>
              <tr><td>Days per week</td><td className="mono">{rules.days_per_week}</td></tr>
              <tr><td>OT rate</td><td className="mono">× {rules.ot_rate}</td></tr>
              <tr><td>Annual leave (days/yr)</td><td className="mono">{rules.annual_leave_quota}</td></tr>
              <tr><td>Sick leave (days/yr)</td><td className="mono">{rules.sick_leave_quota}</td></tr>
            </Table>
          )}

          {hires.length > 0 &&
            groupByDept(hires, (h) => h.department, []).map(([dept, rows]) => (
              <div key={dept}>
                <h4 style={{ fontSize: 12, margin: "10px 0 4px" }}>{dept}</h4>
                <Table head={["Name", "Outlet", "Price/day"]}>
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
                Deny
              </button>
              <button type="button" className="ok" onClick={() => run("approved")} disabled={decide.isPending}>
                Approve
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
