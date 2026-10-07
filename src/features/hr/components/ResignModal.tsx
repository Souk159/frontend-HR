"use client";

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
    <Modal open={employee !== null} onClose={onClose} title={`Resignation — ${employee?.full_name ?? ""}`}>
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
      return dialogs.error("Invalid hours", new Error("Enter a valid number of hours, or leave it empty."));
    }
    try {
      const res = await resign.mutateAsync({ id: employee.user_id, final_hours: final });
      onClose();
      dialogs.success(...requestOutcome(res, `Resignation for ${employee.full_name}`));
    } catch (err) {
      dialogs.error("Could not send request", err);
    }
  }

  return (
    <>
      <p className="hint">
        Final pay is calculated from the hours actually worked this period (up to the month&apos;s standard hours, plus OT above them) — not
        a full month&apos;s base salary. The employee moves to <b>Resigned / Final Pay</b> once the resignation is approved.
      </p>
      <Field
        label="Final hours actually worked this period"
        hint="Leave empty to count the hours scanned in the month of resignation, up to the resignation date."
      >
        <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d.]/g, ""))} placeholder="e.g. 142" autoFocus />
      </Field>
      <button type="button" className="submit-btn" onClick={submit} disabled={resign.isPending}>
        {resign.isPending ? "…" : "Send resignation"}
      </button>
    </>
  );
}
