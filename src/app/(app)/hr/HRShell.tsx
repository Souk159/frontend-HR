"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LangToggle, useLang, tr } from "@/lib/i18n";
import { DataState } from "@/components/ui";
import { useApprovals, useHRAccess } from "@/features/hr/api";
import { allowedNav, homeHref, NAV_GROUPS, onPage } from "@/features/hr/nav";
import { ROLE_LABELS } from "@/features/hr/utils";
import { ChangePasswordModal } from "@/features/hr/components/ChangePasswordModal";

/** Dark full-height sidebar (brand, page search, grouped screens, signed-in user) + light page header. */
export function HRShell({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const access = useHRAccess();
  const nav = allowedNav(access.data);
  const pending = useApprovals("pending", !!access.data?.can_approve);
  const pendingCount = pending.data?.length ?? 0;
  // phones: the sidebar slides in from the left
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [find, setFind] = useState("");
  const current = nav.find((n) => onPage(pathname, n.href));
  const currentGroup = NAV_GROUPS.find((g) => g.id === current?.group);

  // /hr → the user's home (COO/CEO: Overview, others: first tab); a tab they may not open → home too
  useEffect(() => {
    if (!access.data || nav.length === 0) return;
    if (!nav.some((n) => onPage(pathname, n.href))) router.replace(homeHref(access.data, nav));
  }, [access.data, nav, pathname, router]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    qc.clear();
    router.replace("/login");
  }

  const user = access.data?.username ?? "";
  const role = access.data?.role ?? "";
  const q = find.trim().toLowerCase();
  const shown = q ? nav.filter((n) => t(n.label).toLowerCase().includes(q)) : nav;

  return (
    <div className="hr-app">
      {menuOpen && <div className="side-scrim" onClick={() => setMenuOpen(false)} aria-hidden />}
      <aside className={`side-nav${menuOpen ? " open" : ""}`} aria-label="HR">
        <div className="side-brand">
          <span className="side-mark">Y</span>
          <div>
            <div className="side-title">
              Yorsys <span>HR</span>
            </div>
            <div className="side-sub">{access.data?.property ? access.data.property.name : tr("Human Resources", "ບຸກຄະລາກອນ")}</div>
          </div>
        </div>
        <div className="side-search">
          <span aria-hidden>⌕</span>
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder={tr("Find a page…", "ຊອກຫາໜ້າ…")} aria-label={tr("Find a page", "ຊອກຫາໜ້າ")} />
        </div>
        <nav className="side-groups">
          {NAV_GROUPS.map((g) => {
            const items = shown.filter((n) => n.group === g.id);
            if (items.length === 0) return null;
            return (
              <div className="side-group" key={g.id}>
                <div className="side-group-label">{t(g.label)}</div>
                {items.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={onPage(pathname, n.href) ? "active" : ""}
                    aria-current={onPage(pathname, n.href) ? "page" : undefined}
                    onClick={() => {
                      setMenuOpen(false);
                      setFind("");
                    }}
                  >
                    <span className="side-icon" aria-hidden>
                      {n.icon}
                    </span>
                    <span className="side-label">{t(n.label)}</span>
                    {n.href === "/hr/approvals" && pendingCount > 0 && <span className="side-badge">{pendingCount}</span>}
                  </Link>
                ))}
              </div>
            );
          })}
          {q && shown.length === 0 && <p className="side-empty">{tr("No page matches.", "ບໍ່ພົບໜ້າ.")}</p>}
        </nav>
        {user && (
          <div className="side-user">
            <span className="avatar">{user.slice(0, 2)}</span>
            <div className="side-user-text">
              <b>{user}</b>
              <span>{ROLE_LABELS[role] ?? role}</span>
            </div>
            <button type="button" className="side-icon-btn" onClick={() => setPwOpen(true)} title={t("change_password")} aria-label={t("change_password")}>
              🔒
            </button>
            <button type="button" className="side-icon-btn" onClick={signOut} title={t("sign_out")} aria-label={t("sign_out")}>
              🚪
            </button>
          </div>
        )}
      </aside>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />

      <div className="hr-page">
        <header className="page-head">
          <button type="button" className="side-toggle" onClick={() => setMenuOpen(true)} aria-label={t("menu")}>
            ☰
          </button>
          <div className="page-head-title">
            <div className="page-kicker">{currentGroup ? t(currentGroup.label) : "Yorsys HR"}</div>
            <h1>{current ? t(current.label) : ""}</h1>
          </div>
          <div className="page-head-right">
            <div className="property-pill">
              <span className="dot" />
              {access.data?.property ? access.data.property.name : tr("Yorlapa Group — all properties", "Yorlapa Group — ທຸກຣີສອດ")}
            </div>
            {access.data?.can_approve && (
              <Link href="/hr/approvals" className="bell" title={tr("Waiting for approval", "ລໍຖ້າອະນຸມັດ")}>
                🔔{pendingCount > 0 && <span className="bell-count">{pendingCount}</span>}
              </Link>
            )}
            <LangToggle onLight />
          </div>
        </header>

        <main className="hr-main">
          {access.isError ? (
            <div className="subview">
              <DataState loading={false} error={access.error}>
                {null}
              </DataState>
            </div>
          ) : access.isLoading ? (
            <div className="subview">
              <DataState loading error={null}>
                {null}
              </DataState>
            </div>
          ) : nav.length === 0 ? (
            <div className="subview empty">
              {tr("No HR tab has been granted to you yet — ask the HR Manager (Manage HR Access).", "ທ່ານຍັງບໍ່ໄດ້ຮັບສິດເຂົ້າໜ້າໃດ — ຂໍ HR Manager (ໜ້າ ຈັດການສິດ HR).")}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
