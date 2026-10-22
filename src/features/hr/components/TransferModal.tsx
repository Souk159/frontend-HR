"use client";

import { useState } from "react";
import { Field, Modal, useDialogs } from "@/components/ui";
import { tr } from "@/lib/i18n";
import { useDepartments, useProperties, useRequestTransfer } from "@/features/hr/api";
import type { Staff } from "@/features/hr/types";
import { requestOutcome } from "@/features/hr/utils";

/**
 * Prototype v207 employee transfer: another department and/or resort, through
 * the "Employee transfer" approval rule. The scanner PIN follows them to the
 * new resort's scanners once approved.
 */
export function TransferModal({ employee, onClose }: { employee: Staff | null; onClose: () => void }) {
  return (
    <Modal
      open={employee !== null}
      onClose={onClose}
      title={employee ? tr(`Transfer ${employee.full_name}`, `ຍ້າຍ ${employee.full_name}`) : ""}
    >
      {employee && <TransferForm key={employee.user_id} employee={employee} onClose={onClose} />}
    </Modal>
  );
}

function TransferForm({ employee, onClose }: { employee: Staff; onClose: () => void }) {
  const dialogs = useDialogs();
  const depts = useDepartments();
  // every resort: a resort account may transfer its staff out to another one
  const properties = useProperties(true);
  const req = useRequestTransfer();
  const [dept, setDept] = useState(employee.department_id ?? "");
  const [prop, setProp] = useState(employee.property_id ?? "");
  const unchanged = dept === (employee.department_id ?? "") && prop === (employee.property_id ?? "");

  async function submit() {
    if (!dept || !prop) return dialogs.error(tr("Missing", "ຂໍ້ມູນບໍ່ຄົບ"), new Error(tr("Pick the department and the resort.", "ເລືອກພະແນກ ແລະ ຣີສອດ.")));
    const to = `${depts.data?.find((d) => d.id === dept)?.name ?? ""} — ${properties.data?.find((p) => p.id === prop)?.name ?? ""}`;
    try {
      const res = await req.mutateAsync({ id: employee.user_id, department_id: dept, property_id: prop });
      onClose();
      dialogs.success(...requestOutcome(res, tr(`${employee.full_name}'s transfer to ${to}`, `ການຍ້າຍ ${employee.full_name} ໄປ ${to}`)));
    } catch (err) {
      dialogs.error(tr("Could not send request", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      <p className="hint">
        {tr(
          `Currently in ${employee.department || "—"} at ${employee.property || "—"}. A transfer goes through the Approval Rule; once approved, their scanner PIN moves to the new resort's scanners.`,
          `ປັດຈຸບັນຢູ່ ${employee.department || "—"} ທີ່ ${employee.property || "—"}. ການຍ້າຍຜ່ານກົດການອະນຸມັດ; ເມື່ອອະນຸມັດແລ້ວ PIN ສະແກນຈະຍ້າຍໄປເຄື່ອງຂອງຣີສອດໃໝ່.`,
        )}
      </p>
      <div className="land-row">
        <Field label={tr("Department", "ພະແນກ")}>
          <select value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">—</option>
            {depts.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr("Resort", "ຣີສອດ")}>
          <select value={prop} onChange={(e) => setProp(e.target.value)}>
            <option value="">—</option>
            {properties.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button type="button" className="submit-btn" onClick={submit} disabled={req.isPending || unchanged}>
        {tr("Request transfer", "ສົ່ງຄຳຂໍຍ້າຍ")}
      </button>
    </>
  );
}
