"use client";

import { useState } from "react";
import { DataState, EmptyRow, Lede, SectionHead, Table, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useRequestMealQuotas, useStaff, useUpdateBenefits } from "@/features/hr/api";
import type { Staff } from "@/features/hr/types";
import { batchOutcome } from "@/features/hr/utils";

export default function MealQuotaPage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const staff = useStaff();
  const request = useRequestMealQuotas();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function send(rows: Staff[]) {
    const body = rows
      .filter((s) => drafts[s.user_id] !== undefined && Number(drafts[s.user_id]) !== s.meal_quota)
      .map((s) => ({ user_id: s.user_id, meal_quota: parseInt(drafts[s.user_id]) || 0 }));
    if (body.length === 0) return dialogs.error("No change", new Error("No changes to save."));
    try {
      const r = await request.mutateAsync(body);
      setDrafts((d) => {
        const next = { ...d };
        body.forEach((b) => delete next[b.user_id]);
        return next;
      });
      dialogs.success(...batchOutcome(r, "meal quota change(s)"));
    } catch (err) {
      dialogs.error("Could not send requests", err);
    }
  }

  return (
    <div className="subview">
      <SectionHead title={t("sh_staff_meal_quota")} />
      <Lede>
        Resets on the 1st of each month. Changing a quota goes through the Approval Rule before it applies. Service charge and bonus
        eligibility are set in each employee&apos;s profile (Employee Directory → Edit).
      </Lede>
      <button type="button" className="submit-btn" style={{ marginBottom: 12 }} onClick={() => send(staff.data ?? [])} disabled={request.isPending}>
        {t("save_all")}
      </button>
      <DataState loading={staff.isLoading} error={staff.error}>
        <Table head={["Employee", "Department", "Monthly quota", "Used this month", "Remaining", "Benefit notes", ""]}>
          {(staff.data ?? []).length === 0 && <EmptyRow cols={7}>No employees yet.</EmptyRow>}
          {staff.data?.map((s) => (
            <MealRow
              key={s.user_id}
              staff={s}
              draft={drafts[s.user_id]}
              onDraft={(v) => setDrafts((d) => ({ ...d, [s.user_id]: v }))}
              onSave={() => send([s])}
            />
          ))}
        </Table>
      </DataState>
    </div>
  );
}

function MealRow({ staff: s, draft, onDraft, onSave }: { staff: Staff; draft?: string; onDraft: (v: string) => void; onSave: () => void }) {
  const dialogs = useDialogs();
  const benefits = useUpdateBenefits();
  const [notes, setNotes] = useState(s.benefit_notes);
  const remaining = Math.max(0, s.meal_quota - s.meals_used);
  const patch = (body: { benefit_notes?: string }) =>
    benefits.mutateAsync({ id: s.user_id, ...body }).catch((err) => dialogs.error("Could not save", err));

  return (
    <tr>
      <td>{s.full_name}</td>
      <td>{s.department || "—"}</td>
      <td>
        <input className="inline-input" style={{ width: 60, textAlign: "center" }} value={draft ?? String(s.meal_quota)} onChange={(e) => onDraft(e.target.value.replace(/\D/g, ""))} />
      </td>
      <td className="mono">{s.meals_used}</td>
      <td className={`mono ${remaining === 0 ? "c-clay bold" : ""}`}>{remaining}</td>
      <td>
        <input className="inline-input" style={{ width: 160 }} value={notes} placeholder="e.g. Free meal x2/week" onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== s.benefit_notes && patch({ benefit_notes: notes })} />
      </td>
      <td>
        <button type="button" className="mini-btn" onClick={onSave}>
          Save
        </button>
      </td>
    </tr>
  );
}
