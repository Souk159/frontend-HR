"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { useLang } from "@/lib/i18n";
import { errorMessage } from "@/lib/api";

/**
 * The prototype's completion (✓) and error (✕) modals, available anywhere via
 * useDialogs().success(title, text) / .error(title, text | Error).
 */
type Dialog = { kind: "success" | "error"; title: string; text: string };
type Ctx = {
  success: (title: string, text?: string) => void;
  error: (title: string, err?: unknown) => void;
};

const DialogContext = createContext<Ctx | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { t } = useLang();

  const success = useCallback((title: string, text = "") => setDialog({ kind: "success", title, text }), []);
  const error = useCallback(
    (title: string, err?: unknown) =>
      setDialog({ kind: "error", title, text: err === undefined ? "" : errorMessage(err) }),
    [],
  );
  const close = useCallback(() => setDialog(null), []);

  return (
    <DialogContext.Provider value={{ success, error }}>
      {children}
      <Modal open={!!dialog} onClose={close} center>
        {dialog && (
          <>
            <div className={`modal-icon ${dialog.kind === "success" ? "c-moss" : "c-clay"}`}>
              {dialog.kind === "success" ? "✓" : "✕"}
            </div>
            <h3 className={dialog.kind === "error" ? "c-clay" : ""}>{dialog.title}</h3>
            {dialog.text && <p className="c-soft" style={{ fontSize: 12.5 }}>{dialog.text}</p>}
            <button
              type="button"
              className={`modal-wide-btn${dialog.kind === "error" ? " danger" : ""}`}
              onClick={close}
              autoFocus
            >
              {dialog.kind === "success" ? t("continue") : t("ok")}
            </button>
          </>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialogs() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialogs must be used inside DialogProvider");
  return ctx;
}
