"use client";

import { useState } from "react";
import { Field, Modal, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useChangeOwnPassword } from "../api";

/** The signed-in user changes their own password. */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  return (
    <Modal open={open} onClose={onClose} title={t("change_password")}>
      {open && <Form onClose={onClose} />}
    </Modal>
  );
}

function Form({ onClose }: { onClose: () => void }) {
  const dialogs = useDialogs();
  const change = useChangeOwnPassword();
  const [f, setF] = useState({ current: "", next: "", again: "" });

  async function submit() {
    if (f.next.length < 8) return dialogs.error("Password too short", new Error("The new password must be at least 8 characters."));
    if (f.next !== f.again) return dialogs.error("Passwords don't match", new Error("Type the same new password twice."));
    try {
      await change.mutateAsync({ current_password: f.current, new_password: f.next });
      onClose();
      dialogs.success("Password changed", "Use the new password the next time you sign in.");
    } catch (err) {
      dialogs.error("Could not change password", err);
    }
  }

  return (
    <>
      <Field label="Current password">
        <input type="password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" autoFocus />
      </Field>
      <Field label="New password" hint="At least 8 characters.">
        <input type="password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" />
      </Field>
      <Field label="New password again">
        <input type="password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} autoComplete="new-password" />
      </Field>
      <button type="button" className="submit-btn" onClick={submit} disabled={change.isPending || !f.current || !f.next}>
        Change password
      </button>
    </>
  );
}
