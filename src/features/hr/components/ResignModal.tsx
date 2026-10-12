"use client";

import { tr } from "@/lib/i18n";
import { useState } from "react";
import { Field, Modal, useDialogs } from "@/components/ui";
import { useRequestResignation } from "../api";
import type { Staff } from "../types";
import { requestOutcome } from "../utils";

/**
 * Prototype v168: resigning asks for the hours actually worked this period —
 * final pay is worked out from them, not from a full month's salary.
 */
export function ResignModal({ employee, onClose }: { employee: Staff | null; onClose: () => void }) {
  return (
    <Modal open={employee !== null} onClose={onClose} title={tr(`Resignation — ${employee?.full_name ?? ""}`, `ລາອອກ — ${employee?.full_name ?? ""}`)}>
      {employee && <ResignForm key={employee.user_id} employee={employee} onClose={onClose} />}
    </Modal>
  );
}

function ResignForm({ employee, onClose }: { employee: Staff; onClose: () => void }) {
  const dialogs = useDialogs();
  const resign = useRequestResignation();
  const [hours, setHours] = useState("");

  async function submit() {
    const final = hours.trim() === "" ? null : parseFloat(hours);
    if (final !== null && (isNaN(final) || final < 0)) {
      return dialogs.error(tr("Invalid hours", "ຊົ່ວໂມງບໍ່ຖືກ"), new Error(tr("Enter a valid number of hours, or leave it empty.", "ໃສ່ຈຳນວນຊົ່ວໂມງໃຫ້ຖືກ ຫຼື ປະຫວ່າງໄວ້.")));
    }
    try {
      const res = await resign.mutateAsync({ id: employee.user_id, final_hours: final });
      onClose();
      dialogs.success(...requestOutcome(res, tr(`Resignation for ${employee.full_name}`, `ການລາອອກຂອງ ${employee.full_name}`)));
    } catch (err) {
      dialogs.error(tr("Could not send request", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      <p className="hint">
        {tr(
          "Final pay is calculated from the hours actually worked this period (up to the month's standard hours, plus OT above them) — not a full month's base salary. The employee moves to",
          "ເງິນສຸດທ້າຍ ຄິດຈາກຊົ່ວໂມງທີ່ເຮັດແທ້ໃນງວດນີ້ (ສູງສຸດເທົ່າມາດຕະຖານເດືອນ, ບວກ OT ທີ່ເກີນ) — ບໍ່ແມ່ນເງິນເດືອນເຕັມເດືອນ. ພະນັກງານຈະຍ້າຍໄປ",
        )}{" "}
        <b>{tr("Resigned / Final Pay", "ລາອອກ / ເງິນສຸດທ້າຍ")}</b> {tr("once the resignation is approved.", "ເມື່ອການລາອອກໄດ້ຮັບອະນຸມັດ.")}
      </p>
      <Field
        label={tr("Final hours actually worked this period", "ຊົ່ວໂມງທີ່ເຮັດແທ້ໃນງວດສຸດທ້າຍ")}
        hint={tr("Leave empty to count the hours scanned in the month of resignation, up to the resignation date.", "ປະຫວ່າງໄວ້ ເພື່ອນັບຊົ່ວໂມງທີ່ສະແກນໃນເດືອນລາອອກ ຈົນຮອດວັນລາອອກ.")}
      >
        <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d.]/g, ""))} placeholder="e.g. 142" autoFocus />
      </Field>
      <button type="button" className="submit-btn" onClick={submit} disabled={resign.isPending}>
        {resign.isPending ? "…" : tr("Send resignation", "ສົ່ງການລາອອກ")}
      </button>
    </>
  );
}
