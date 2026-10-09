"use client";

import { useState } from "react";
import { DataState, EmptyRow, Field, Lede, Modal, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
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
          + Add account
        </button>
      </SectionHead>
      <Lede>
        Who can sign in, and with which role. Most employees don&apos;t need a login — HR records their attendance, leave and part-time
        days for them. Give a login to HR staff, managers and executives; an employee from the Directory keeps their profile when given a
        login. Disabling an account or changing its role signs that person out at once.
      </Lede>
      <DataState loading={accounts.isLoading} error={accounts.error}>
        <Table head={["Name", "Username", "Role", "Status", ""]}>
          {(accounts.data?.accounts ?? []).length === 0 && <EmptyRow cols={5}>No accounts yet.</EmptyRow>}
          {accounts.data?.accounts.map((a) => (
            <AccountRow key={a.id} a={a} roles={roles} onReset={() => setResetting(a)} />
          ))}
        </Table>
      </DataState>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add account">
        {adding && <AddAccountForm roles={roles} onDone={() => setAdding(false)} />}
      </Modal>
      <Modal open={resetting !== null} onClose={() => setResetting(null)} title={`Reset password — ${resetting?.full_name ?? ""}`}>
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
      dialogs.success("Saved", done);
    } catch (err) {
      setRole(a.role);
      dialogs.error("Could not save", err);
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
            {roleLabel(a.role)} {a.is_self && <Tag kind="muted">You</Tag>}
          </>
        )}
        {a.editable && role !== a.role && (
          <button
            type="button"
            className="mini-btn"
            style={{ marginLeft: 6 }}
            onClick={() => save({ role }, `${a.full_name} is now ${roleLabel(role)}. They have been signed out to pick up the new role.`)}
            disabled={update.isPending}
          >
            Save
          </button>
        )}
      </td>
      <td>{a.is_active ? <Tag kind="ok">Active</Tag> : <Tag kind="low">Disabled</Tag>}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        {a.editable && (
          <>
            <button type="button" className="mini-btn" onClick={onReset}>
              Reset password
            </button>
            <button
              type="button"
              className={`mini-btn${a.is_active ? " flag" : ""}`}
              onClick={() => {
                if (a.is_active && !window.confirm(`Disable ${a.full_name}'s login? They are signed out and can't sign in until enabled again.`)) return;
                save({ is_active: !a.is_active }, a.is_active ? `${a.full_name} can no longer sign in.` : `${a.full_name} can sign in again.`);
              }}
              disabled={update.isPending}
            >
              {a.is_active ? "Disable" : "Enable"}
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
      dialogs.success("Account added", `${emp?.full_name ?? f.full_name} can now sign in as ${f.username.trim().toLowerCase()} (${roleLabel(f.role)}).`);
    } catch (err) {
      dialogs.error("Could not add account", err);
    }
  }

  return (
    <>
      <Field label="Employee in the Directory" hint="Pick one to give an existing employee a login, or leave it on “New person”.">
        <select value={f.employee} onChange={(e) => setF({ ...f, employee: e.target.value })}>
          <option value="">— New person (not in the Directory) —</option>
          {noLogin.map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.full_name} ({s.employee_no || s.department})
            </option>
          ))}
        </select>
      </Field>
      {!emp && (
        <Field label="Full name">
          <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="e.g. Anong Vong" />
        </Field>
      )}
      <div className="land-row">
        <Field label="Username" hint="3–50 lowercase letters, digits, . _ -">
          <input className="mono" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} placeholder="e.g. anong" autoComplete="off" />
        </Field>
        <Field label="Role">
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Password" hint="At least 8 characters — give it to the person privately; they can change it after signing in.">
        <input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" />
      </Field>
      <button type="button" className="submit-btn" onClick={submit} disabled={create.isPending}>
        {create.isPending ? "…" : "+ Add account"}
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
      dialogs.success("Password reset", `${a.full_name} has been signed out; they sign in as ${a.username} with the new password.`);
    } catch (err) {
      dialogs.error("Could not reset", err);
    }
  }
  return (
    <>
      <Field label="New password" hint="At least 8 characters.">
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
      </Field>
      <button type="button" className="submit-btn" onClick={submit} disabled={reset.isPending || pw.length < 8}>
        Reset password
      </button>
    </>
  );
}
