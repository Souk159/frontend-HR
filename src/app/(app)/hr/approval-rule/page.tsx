"use client";

import { useState } from "react";
import { DataState, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { useApprovalRules, useRequestApprovalRules } from "@/features/hr/api";
import type { ApprovalMode, ApprovalRule } from "@/features/hr/types";
import { requestOutcome, ruleLabel } from "@/features/hr/utils";

const SIGNERS = [
  { role: "gm", label: "GM" },
  { role: "coo", label: "COO" },
  { role: "ceo", label: "CEO" },
];
// a function so the labels follow the chosen language
const MODES = (): { value: ApprovalMode; label: string }[] => [
  { value: "any", label: tr("Any one ticked role is enough", "ຄົນໃດຄົນໜຶ່ງທີ່ tick ອະນຸມັດກໍພໍ") },
  { value: "all", label: tr("All ticked roles must approve", "ທຸກບົດບາດທີ່ tick ຕ້ອງອະນຸມັດ") },
  { value: "none", label: tr("No approval needed — applies immediately", "ບໍ່ຕ້ອງອະນຸມັດ — ມີຜົນທັນທີ") },
];

/** Prototype v168 hr-approvalrule. Changing the rules needs COO or CEO sign-off. */
export default function ApprovalRulePage() {
  const { t } = useLang();
  const rules = useApprovalRules();
  return (
    <div className="subview">
      <SectionHead title={t("sh_approval_rule")} />
      <Lede>
        {tr("For each kind of request, tick which role(s) must approve it — GM, COO, and/or CEO — and whether one of them is enough or all of them are needed. New requests of that type route to exactly the roles ticked here; requests already waiting keep the rule they were sent with. Changing anything on this page needs COO or CEO sign-off before it takes effect. Owner and Admin can always decide.", "ແຕ່ລະປະເພດຄຳຂໍ ໃຫ້ tick ບົດບາດທີ່ຕ້ອງອະນຸມັດ — GM, COO ແລະ/ຫຼື CEO — ແລະ ເລືອກວ່າຄົນດຽວພໍ ຫຼື ຕ້ອງທຸກຄົນ. ຄຳຂໍໃໝ່ຈະໄປຫາບົດບາດທີ່ tick ນີ້; ຄຳຂໍທີ່ລໍຖ້າຢູ່ໃຊ້ກົດເກົ່າ. ການປ່ຽນໃນໜ້ານີ້ຕ້ອງໃຫ້ COO ຫຼື CEO ອະນຸມັດ. ເຈົ້າຂອງ ແລະ Admin ອະນຸມັດໄດ້ສະເໝີ.")}
      </Lede>
      <DataState loading={rules.isLoading} error={rules.error}>
        {rules.data && <RulesTable key={JSON.stringify(rules.data.rules)} rules={rules.data.rules} pending={rules.data.pending_change} />}
      </DataState>
    </div>
  );
}

function RulesTable({ rules, pending }: { rules: ApprovalRule[]; pending: string | null }) {
  const dialogs = useDialogs();
  const submit = useRequestApprovalRules();
  const [draft, setDraft] = useState(rules);
  const changed = draft.filter((d, i) => d.mode !== rules[i].mode || [...d.roles].sort().join() !== [...rules[i].roles].sort().join());

  const update = (i: number, patch: Partial<ApprovalRule>) => setDraft((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const toggle = (i: number, role: string, on: boolean) =>
    update(i, { roles: on ? [...draft[i].roles, role] : draft[i].roles.filter((r) => r !== role) });

  async function send() {
    const empty = changed.find((r) => r.mode !== "none" && r.roles.length === 0);
    if (empty) return dialogs.error(tr("At least one role needed", "ຕ້ອງມີຢ່າງໜ້ອຍ 1 ບົດບາດ"), new Error(tr(`"${empty.label}" needs at least one approving role (or no approval).`, `"${ruleLabel(empty.type, empty.label)}" ຕ້ອງມີຢ່າງໜ້ອຍ 1 ບົດບາດທີ່ອະນຸມັດ (ຫຼື ເລືອກບໍ່ຕ້ອງອະນຸມັດ).`)));
    try {
      const res = await submit.mutateAsync(changed.map(({ type, roles, mode }) => ({ type, roles, mode })));
      dialogs.success(...requestOutcome(res, tr(`The approval rule change (${changed.length} rule${changed.length > 1 ? "s" : ""})`, `ການປ່ຽນກົດອະນຸມັດ (${changed.length} ກົດ)`)));
    } catch (err) {
      dialogs.error(tr("Could not send", "ສົ່ງບໍ່ສຳເລັດ"), err);
    }
  }

  return (
    <>
      {pending && <p className="hint warn">{tr("A change is awaiting COO/CEO sign-off — the rules below still show the current setting.", "ມີການປ່ຽນແປງລໍຖ້າ COO/CEO ອະນຸມັດ — ກົດຂ້າງລຸ່ມຍັງສະແດງຄ່າປັດຈຸບັນ.")}</p>}
      <div className="card">
        <Table head={[tr("Request", "ຄຳຂໍ"), ...SIGNERS.map((s) => s.label), tr("Approval needed?", "ຕ້ອງອະນຸມັດບໍ?")]}>
          {draft.map((r, i) => (
            <tr key={r.type} style={changed.includes(r) ? { background: "var(--sand)" } : undefined}>
              <td style={{ maxWidth: 380 }}>{ruleLabel(r.type, r.label)}</td>
              {SIGNERS.map((s) => (
                <td key={s.role} style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    aria-label={`${s.label} approves ${r.label}`}
                    checked={r.roles.includes(s.role)}
                    disabled={r.mode === "none"}
                    onChange={(e) => toggle(i, s.role, e.target.checked)}
                  />
                </td>
              ))}
              <td>
                <select className="inline-input" value={r.mode} onChange={(e) => update(i, { mode: e.target.value as ApprovalMode })}>
                  {MODES().map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </Table>
        <div className="land-row" style={{ marginTop: 10 }}>
          <button type="button" className="submit-btn" onClick={send} disabled={changed.length === 0 || !!pending || submit.isPending}>
            {tr(`Send ${changed.length || ""} change${changed.length === 1 ? "" : "s"} for COO/CEO sign-off`, `ສົ່ງ ${changed.length || ""} ການປ່ຽນ ໃຫ້ COO/CEO ອະນຸມັດ`)}
          </button>
          {changed.length > 0 && (
            <button type="button" className="mini-btn" onClick={() => setDraft(rules)}>
              {tr("Undo changes", "ຍົກເລີກການປ່ຽນ")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
