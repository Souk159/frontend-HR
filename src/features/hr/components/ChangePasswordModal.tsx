"use client";

import { useState } from "react";
import { Field, Modal, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
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
    if (f.next.length < 8) return dialogs.error(tr("Password too short", "ລະຫັດສັ້ນໂພດ"), new Error(tr("The new password must be at least 8 characters.", "ລະຫັດໃໝ່ຕ້ອງມີຢ່າງໜ້ອຍ 8 ຕົວ.")));
    if (f.next !== f.again) return dialogs.error(tr("Passwords don't match", "ລະຫັດບໍ່ກົງກັນ"), new Error(tr("Type the same new password twice.", "ພິມລະຫັດໃໝ່ໃຫ້ຄືກັນ 2 ເທື່ອ.")));
    try {
      await change.mutateAsync({ current_password: f.current, new_password: f.next });
      onClose();
      dialogs.success(tr("Password changed", "ປ່ຽນລະຫັດແລ້ວ"), tr("Use the new password the next time you sign in.", "ໃຊ້ລະຫັດໃໝ່ ເທື່ອໜ້າທີ່ເຂົ້າລະບົບ."));
    } catch (err) {
      dialogs.error(tr("Could not change password", "ປ່ຽນລະຫັດບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      <Field label={tr("Current password", "ລະຫັດປັດຈຸບັນ")}>
        <input type="password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" autoFocus />
      </Field>
      <Field label={tr("New password", "ລະຫັດຜ່ານໃໝ່")} hint={tr("At least 8 characters.", "ຢ່າງໜ້ອຍ 8 ຕົວ.")}>
        <input type="password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" />
      </Field>
      <Field label={tr("New password again", "ລະຫັດໃໝ່ອີກຄັ້ງ")}>
        <input type="password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} autoComplete="new-password" />
      </Field>
      <button type="button" className="submit-btn" onClick={submit} disabled={change.isPending || !f.current || !f.next}>
        {tr("Change password", "ປ່ຽນລະຫັດຜ່ານ")}
      </button>
    </>
  );
}
