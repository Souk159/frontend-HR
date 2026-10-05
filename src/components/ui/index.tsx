"use client";

import type { ReactNode } from "react";
import { errorMessage } from "@/lib/api";
import { useLang } from "@/lib/i18n";

export { Modal } from "./Modal";
export { DialogProvider, useDialogs } from "./Dialogs";
export { Avatar, photoSrc } from "./Avatar";

/** Prototype .field — uppercase label over an input/select. */
export function Field({
  label,
  children,
  hint,
  grow,
  style,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  grow?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div className="field" style={{ ...(grow ? { flex: grow } : {}), ...style }}>
      <label>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function SectionHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return <p className="lede">{children}</p>;
}

export type TagKind = "ok" | "low" | "pending" | "muted";
export function Tag({ kind, children }: { kind: TagKind; children: ReactNode }) {
  return <span className={`tag-${kind}`}>{children}</span>;
}

/** Approval status → coloured tag */
export function StatusTag({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "approved") return <Tag kind="ok">Approved</Tag>;
  if (s === "denied" || s === "rejected") return <Tag kind="low">Denied</Tag>;
  if (s === "cancelled") return <Tag kind="muted">Cancelled</Tag>;
  return <Tag kind="pending">Pending</Tag>;
}

export function Kpi({ label, value, dark }: { label: ReactNode; value: ReactNode; dark?: boolean }) {
  return (
    <div className={`kpi-card${dark ? " dark" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">{value}</div>
    </div>
  );
}

/** Loading / error / content switch used by every data view. */
export function DataState({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: unknown;
  children: ReactNode;
}) {
  const { t } = useLang();
  if (loading) return <div className="loading-bar" aria-label={t("loading")} />;
  if (error) return <div className="form-error">{errorMessage(error)}</div>;
  return <>{children}</>;
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="c-soft">
        {children}
      </td>
    </tr>
  );
}
