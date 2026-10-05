"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  wide?: boolean;
  center?: boolean;
  children: ReactNode;
};

/** Prototype .modal-overlay / .modal-box. Closes on Escape and backdrop click. */
export function Modal({ open, onClose, title, wide, center, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal-box${wide ? " wide" : ""}${center ? " center" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        {!center && (
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
