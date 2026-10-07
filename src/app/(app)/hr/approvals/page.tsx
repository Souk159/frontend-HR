"use client";

import { useState } from "react";
import { DataState, EmptyRow, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useApprovals, useDecideApproval } from "@/features/hr/api";
import { ApprovalDetailModal } from "@/features/hr/components/ApprovalDetailModal";
import type { Approval } from "@/features/hr/types";
import { approvalChange, approvalLabel, decisionMessage, fmtStamp } from "@/features/hr/utils";
import { NeedsCell } from "@/features/hr/components/NeedsCell";

/** Prototype screen-hrapprovals — GM / COO sign-off queue. */
export default function HRApprovalsPage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const pending = useApprovals("pending");
  const decide = useDecideApproval();
  const [open, setOpen] = useState<string | null>(null);

  async function run(a: Approval, decision: "approved" | "denied") {
    try {
      const r = await decide.mutateAsync({ id: a.id, decision });
      dialogs.success(...decisionMessage(a, r.status));
    } catch (err) {
      dialogs.error("Could not complete", err);
    }
  }

  return (
    <div className="dash-wrap">
      <SectionHead title={t("sh_pending_hr_approvals")} />
      <Lede>
        Requests waiting for sign-off. Who has to approve each kind of request — and whether one of them is enough or all of them are
        needed — is set on the Approval Rule page.
      </Lede>
      <DataState loading={pending.isLoading} error={pending.error}>
        <Table head={["Type", "Target", "Change", "Requested", "Needs", ""]}>
          {(pending.data ?? []).length === 0 && <EmptyRow cols={6}>No pending requests right now.</EmptyRow>}
          {pending.data?.map((a) => (
            <tr key={a.id}>
              <td>{approvalLabel(a.type)}</td>
              <td>{a.target}</td>
              <td className="mono" style={{ fontSize: 10.5, cursor: "pointer" }} onClick={() => setOpen(a.id)}>
                {approvalChange(a)}
              </td>
              <td>
                {fmtStamp(a.requested_at)}
                <div className="hint">{a.requested_by}</div>
              </td>
              <td>
                <NeedsCell a={a} />
              </td>
              <td>
                <span className="approve-actions">
                  <button type="button" className="mini-btn" onClick={() => setOpen(a.id)}>
                    View detail
                  </button>
                  {a.can_decide && (
                    <>
                      <button type="button" className="ok" onClick={() => run(a, "approved")} disabled={decide.isPending}>
                        {t("approve")}
                      </button>
                      <button type="button" className="no" onClick={() => run(a, "denied")} disabled={decide.isPending}>
                        {t("deny")}
                      </button>
                    </>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      </DataState>
      <ApprovalDetailModal id={open} canDecide onClose={() => setOpen(null)} />
    </div>
  );
}
