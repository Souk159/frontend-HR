import { Tag } from "@/components/ui";
import type { Approval } from "../types";
import { ROLE_LABELS } from "../utils";

/** Who still has to sign a pending request (Approval Rule snapshot): "GM or COO" / "GM and COO ✓GM". */
export function NeedsCell({ a }: { a: Approval }) {
  const signed = new Set(a.approvals.map((s) => s.role));
  const sep = a.mode === "all" ? " and " : " or ";
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {a.required_roles.map((r, i) => (
        <span key={r}>
          {signed.has(r) ? <Tag kind="ok">✓ {ROLE_LABELS[r] ?? r}</Tag> : <Tag kind="pending">{ROLE_LABELS[r] ?? r}</Tag>}
          {i < a.required_roles.length - 1 && <span className="hint" style={{ margin: "0 2px" }}>{sep}</span>}
        </span>
      ))}
    </span>
  );
}
