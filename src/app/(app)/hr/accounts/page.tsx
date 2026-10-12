"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, Modal, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { useAccounts, useCreateAccount, useResetAccountPassword, useStaff, useUpdateAccount } from "@/features/hr/api";
import type { Account } from "@/features/hr/types";
import { ROLE_LABELS } from "@/features/hr/utils";

const roleLabel = (r: string) => ROLE_LABELS[r] ?? r;

/** Sign-in accounts. Owner / Admin manage every account; GM manages HR Manager and HR Coordinator accounts. */
export default function AccountsPage() {
  const { t } = useLang();
  const accounts = useAccounts();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<Account | null>(null);
  const roles = accounts.data?.assignable_roles ?? [];

  return (
    <div className="subview">
      <SectionHead title={t("sh_accounts")}>
        <button type="button" className="submit-btn" onClick={() => setAdding(true)} disabled={roles.length === 0}>
          {tr("+ Add account", "+ ເພີ່ມບັນຊີ")}
        </button>
      </SectionHead>
      <Lede>
        {tr("Who can sign in, and with which role. Most employees don't need a login — HR records their attendance, leave and part-time days for them. Give a login to HR staff, managers and executives; an employee from the Directory keeps their profile when given a login. Disabling an account or changing its role signs that person out at once.", "ໃຜເຂົ້າລະບົບໄດ້ ແລະ ດ້ວຍບົດບາດໃດ. ພະນັກງານສ່ວນຫຼາຍບໍ່ຕ້ອງມີບັນຊີ — HR ບັນທຶກການເຂົ້າວຽກ, ການລາ ແລະ ພາທາມແທນ. ໃຫ້ບັນຊີແກ່ HR, ຜູ້ຈັດການ ແລະ ຜູ້ບໍລິຫານ; ພະນັກງານທີ່ໄດ້ບັນຊີ ໂປຣໄຟລ໌ເກົ່າຢູ່ຄືເກົ່າ. ການປິດບັນຊີ ຫຼື ປ່ຽນບົດບາດ ຈະບັງຄັບໃຫ້ຄົນນັ້ນອອກຈາກລະບົບທັນທີ.")}
      </Lede>
      <DataState loading={accounts.isLoading} error={accounts.error}>
        <Table head={[tr("Name", "ຊື່"), tr("Username", "ຊື່ຜູ້ໃຊ້"), tr("Role", "ບົດບາດ"), tr("Status", "ສະຖານະ"), ""]}>
          {(accounts.data?.accounts ?? []).length === 0 && <EmptyRow cols={5}>{tr("No accounts yet.", "ຍັງບໍ່ມີບັນຊີ.")}</EmptyRow>}
          {accounts.data?.accounts.map((a) => (
            <AccountRow key={a.id} a={a} roles={roles} onReset={() => setResetting(a)} />
          ))}
        </Table>
      </DataState>
      <Modal open={adding} onClose={() => setAdding(false)} title={tr("Add account", "ເພີ່ມບັນຊີ")}>
        {adding && <AddAccountForm roles={roles} onDone={() => setAdding(false)} />}
      </Modal>
      <Modal open={resetting !== null} onClose={() => setResetting(null)} title={tr(`Reset password — ${resetting?.full_name ?? ""}`, `ຕັ້ງລະຫັດຜ່ານໃໝ່ — ${resetting?.full_name ?? ""}`)}>
        {resetting && <ResetForm key={resetting.id} a={resetting} onDone={() => setResetting(null)} />}
      </Modal>
    </div>
  );
}

function AccountRow({ a, roles, onReset }: { a: Account; roles: string[]; onReset: () => void }) {
  const dialogs = useDialogs();
  const update = useUpdateAccount();
  const [role, setRole] = useState(a.role);

  async function save(body: { role?: string; is_active?: boolean }, done: string) {
    try {
      await update.mutateAsync({ id: a.id, ...body });
      dialogs.success(tr("Saved", "ບັນທຶກແລ້ວ"), done);
    } catch (err) {
      setRole(a.role);
      dialogs.error(tr("Could not save", "ບັນທຶກບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <tr style={a.is_active ? undefined : { opacity: 0.6 }}>
      <td>
        {a.full_name}
        {a.employee_no && <div className="hint">{a.employee_no}</div>}
      </td>
      <td className="mono">{a.username}</td>
      <td>
        {a.editable ? (
          <select className="inline-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        ) : (
          <>
            {roleLabel(a.role)} {a.is_self && <Tag kind="muted">{tr("You", "ທ່ານ")}</Tag>}
          </>
        )}
        {a.editable && role !== a.role && (
          <button
            type="button"
            className="mini-btn"
            style={{ marginLeft: 6 }}
            onClick={() => save({ role }, tr(`${a.full_name} is now ${roleLabel(role)}. They have been signed out to pick up the new role.`, `${a.full_name} ເປັນ ${roleLabel(role)} ແລ້ວ. ລະບົບອອກຈາກລະບົບໃຫ້ ເພື່ອໃຊ້ບົດບາດໃໝ່.`))}
            disabled={update.isPending}
          >
            {tr("Save", "ບັນທຶກ")}
          </button>
        )}
      </td>
      <td>{a.is_active ? <Tag kind="ok">{tr("Active", "ເຮັດວຽກ")}</Tag> : <Tag kind="low">{tr("Disabled", "ປິດແລ້ວ")}</Tag>}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        {a.editable && (
          <>
            <button type="button" className="mini-btn" onClick={onReset}>
              {tr("Reset password", "ຣີເຊັດລະຫັດ")}
            </button>
            <button
              type="button"
              className={`mini-btn${a.is_active ? " flag" : ""}`}
              onClick={() => {
                if (a.is_active && !window.confirm(tr(`Disable ${a.full_name}'s login? They are signed out and can't sign in until enabled again.`, `ປິດການເຂົ້າລະບົບຂອງ ${a.full_name}? ຈະຖືກອອກຈາກລະບົບ ແລະ ເຂົ້າບໍ່ໄດ້ ຈົນກວ່າຈະເປີດຄືນ.`))) return;
                save({ is_active: !a.is_active }, a.is_active ? tr(`${a.full_name} can no longer sign in.`, `${a.full_name} ເຂົ້າລະບົບບໍ່ໄດ້ແລ້ວ.`) : tr(`${a.full_name} can sign in again.`, `${a.full_name} ເຂົ້າລະບົບໄດ້ອີກແລ້ວ.`));
              }}
              disabled={update.isPending}
            >
              {a.is_active ? tr("Disable", "ປິດບັນຊີ") : tr("Enable", "ເປີດບັນຊີ")}
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

function AddAccountForm({ roles, onDone }: { roles: string[]; onDone: () => void }) {
  const dialogs = useDialogs();
  const create = useCreateAccount();
  const staff = useStaff();
  const noLogin = (staff.data ?? []).filter((s) => !s.has_login);
  const [f, setF] = useState({ employee: "", full_name: "", username: "", role: roles[0] ?? "", password: "" });
  const emp = noLogin.find((s) => s.user_id === f.employee);

  async function submit() {
    try {
      await create.mutateAsync({
        username: f.username.trim().toLowerCase(), full_name: emp ? emp.full_name : f.full_name.trim(),
        role: f.role, password: f.password, employee_user_id: emp?.user_id ?? null,
      });
      onDone();
      dialogs.success(tr("Account added", "ເພີ່ມບັນຊີແລ້ວ"), tr(`${emp?.full_name ?? f.full_name} can now sign in as ${f.username.trim().toLowerCase()} (${roleLabel(f.role)}).`, `${emp?.full_name ?? f.full_name} ເຂົ້າລະບົບໄດ້ແລ້ວ ດ້ວຍ ${f.username.trim().toLowerCase()} (${roleLabel(f.role)}).`));
    } catch (err) {
      dialogs.error(tr("Could not add account", "ເພີ່ມບັນຊີບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      <Field label={tr("Employee in the Directory", "ພະນັກງານໃນສາລະບານ")} hint={tr("Pick one to give an existing employee a login, or leave it on “New person”.", "ເລືອກພະນັກງານທີ່ມີແລ້ວ ເພື່ອໃຫ້ບັນຊີເຂົ້າລະບົບ, ຫຼື ປະໄວ້ \"ຄົນໃໝ່\".")}>
        <select value={f.employee} onChange={(e) => setF({ ...f, employee: e.target.value })}>
          <option value="">{tr("— New person (not in the Directory) —", "— ຄົນໃໝ່ (ບໍ່ຢູ່ໃນສາລະບານ) —")}</option>
          {noLogin.map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.full_name} ({s.employee_no || s.department})
            </option>
          ))}
        </select>
      </Field>
      {!emp && (
        <Field label={tr("Full name", "ຊື່ ແລະ ນາມສະກຸນ")}>
          <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder={tr("e.g. Anong Vong", "ເຊັ່ນ Anong Vong")} />
        </Field>
      )}
      <div className="land-row">
        <Field label={tr("Username", "ຊື່ຜູ້ໃຊ້")} hint={tr("3–50 lowercase letters, digits, . _ -", "3–50 ຕົວ: ຕົວອັກສອນອັງກິດນ້ອຍ, ຕົວເລກ, . _ -")}>
          <input className="mono" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} placeholder={tr("e.g. anong", "ເຊັ່ນ anong")} autoComplete="off" />
        </Field>
        <Field label={tr("Role", "ບົດບາດ")}>
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={tr("Password", "ລະຫັດຜ່ານ")} hint={tr("At least 8 characters — give it to the person privately; they can change it after signing in.", "ຢ່າງໜ້ອຍ 8 ຕົວ — ແຈ້ງໃຫ້ເຈົ້າຂອງແບບສ່ວນຕົວ; ເຂົາປ່ຽນເອງໄດ້ຫຼັງເຂົ້າລະບົບ.")}>
        <input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" />
      </Field>
      <button type="button" className="submit-btn" onClick={submit} disabled={create.isPending}>
        {create.isPending ? "…" : tr("+ Add account", "+ ເພີ່ມບັນຊີ")}
      </button>
    </>
  );
}

function ResetForm({ a, onDone }: { a: Account; onDone: () => void }) {
  const dialogs = useDialogs();
  const reset = useResetAccountPassword();
  const [pw, setPw] = useState("");
  async function submit() {
    try {
      await reset.mutateAsync({ id: a.id, password: pw });
      onDone();
      dialogs.success(tr("Password reset", "ຣີເຊັດລະຫັດແລ້ວ"), tr(`${a.full_name} has been signed out; they sign in as ${a.username} with the new password.`, `${a.full_name} ຖືກອອກຈາກລະບົບແລ້ວ; ເຂົ້າໃໝ່ດ້ວຍ ${a.username} ແລະ ລະຫັດຜ່ານໃໝ່.`));
    } catch (err) {
      dialogs.error(tr("Could not reset", "ຣີເຊັດບໍ່ສຳເລັດ"), err);
    }
  }
  return (
    <>
      <Field label={tr("New password", "ລະຫັດຜ່ານໃໝ່")} hint={tr("At least 8 characters.", "ຢ່າງໜ້ອຍ 8 ຕົວ.")}>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
      </Field>
      <button type="button" className="submit-btn" onClick={submit} disabled={reset.isPending || pw.length < 8}>
        {tr("Reset password", "ຣີເຊັດລະຫັດ")}
      </button>
    </>
  );
}
