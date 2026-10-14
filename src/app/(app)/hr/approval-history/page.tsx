"use client";

import { useState } from "react";
import { DataState, EmptyRow, Lede, SectionHead, StatusTag, Table } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { useApprovals, useHRAccess } from "@/features/hr/api";
import { ApprovalDetailModal } from "@/features/hr/components/ApprovalDetailModal";
import { approvalChange, approvalLabel, fmtStamp } from "@/features/hr/utils";

export default function ApprovalHistoryPage() {
  const { t } = useLang();
  const all = useApprovals("all");
  const access = useHRAccess();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="subview">
      <SectionHead title={t("sh_approval_history")} />
      <Lede>{tr("Every salary, quota, and work-rules request ever submitted — approved, denied, or still pending — with the exact before/after values.", "ທຸກຄຳຂໍທີ່ເຄີຍສົ່ງ — ອະນຸມັດ, ປະຕິເສດ ຫຼື ຍັງລໍຖ້າ — ພ້ອມຄ່າກ່ອນ ແລະ ຫຼັງ.")}</Lede>
      <DataState loading={all.isLoading} error={all.error}>
        <Table head={[tr("Type", "ປະເພດ"), tr("Target", "ເປົ້າໝາຍ"), tr("Change", "ການປ່ຽນ"), tr("Requested", "ຂໍເມື່ອ"), tr("Status", "ສະຖານະ"), tr("Reviewed", "ພິຈາລະນາເມື່ອ")]}>
          {(all.data ?? []).length === 0 && <EmptyRow cols={6}>{tr("No requests submitted yet.", "ຍັງບໍ່ມີຄຳຂໍ.")}</EmptyRow>}
          {all.data?.map((a) => (
            <tr key={a.id} className="clickable" onClick={() => setOpen(a.id)}>
              <td>{approvalLabel(a.type)}</td>
              <td>
                {a.target}
                {a.property && <div className="hint">{a.property}</div>}
              </td>
              <td className="mono" style={{ fontSize: 10.5 }}>
                {approvalChange(a)}
              </td>
              <td>{fmtStamp(a.requested_at)}</td>
              <td>
                <StatusTag status={a.status} />
              </td>
              <td>{fmtStamp(a.reviewed_at)}</td>
            </tr>
          ))}
        </Table>
      </DataState>
      <ApprovalDetailModal id={open} canDecide={!!access.data?.can_approve} onClose={() => setOpen(null)} />
    </div>
  );
}
