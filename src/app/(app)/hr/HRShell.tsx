"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LangToggle, useLang } from "@/lib/i18n";
import { DataState } from "@/components/ui";
import { useApprovals, useHRAccess } from "@/features/hr/api";
import { allowedNav, NAV_GROUPS } from "@/features/hr/nav";

/** Topbar + grouped left sidebar of the HR module; screens are filtered by role / coordinator grants. */
export function HRShell({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const access = useHRAccess();
  const nav = allowedNav(access.data);
  const pending = useApprovals("pending", !!access.data?.can_approve);
  const pendingCount = pending.data?.length ?? 0;
  // phones: the sidebar folds into a "Menu" button
  const [menuOpen, setMenuOpen] = useState(false);
  const current = nav.find((n) => pathname.startsWith(n.href));

  // /hr → first tab this user may open; a tab they may not open → first allowed
  useEffect(() => {
    if (!access.data || nav.length === 0) return;
    if (!nav.some((n) => pathname.startsWith(n.href))) router.replace(nav[0].href);
  }, [access.data, nav, pathname, router]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    qc.clear();
    router.replace("/login");
  }

  const user = access.data?.username ?? "";
  return (
    <>
      <div className="app-topbar">
        <div className="left">
          <div className="app-title">
            Yorsys <span>HR</span>
          </div>
          <div className="property-pill">
            <span className="dot" />
            {t("hr_pill")}
          </div>
        </div>
        <div className="right">
          <LangToggle />
          {user && (
            <div className="staff-chip">
              <span className="avatar">{user.slice(0, 2)}</span>
              {user}
              <span className="c-gold" style={{ fontSize: 10.5, color: "var(--gold-light)" }}>
                {access.data?.role}
              </span>
            </div>
          )}
          <button type="button" className="back-link" onClick={signOut}>
            {t("sign_out")} →
          </button>
        </div>
      </div>

      {access.isError ? (
        <div className="subview">
          <DataState loading={false} error={access.error}>
            {null}
          </DataState>
        </div>
      ) : (
        <div className="hr-body">
          <button type="button" className="side-toggle" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
            ☰ {t("menu")}
            {current && <b>· {t(current.label)}</b>}
            {pendingCount > 0 && <span className="side-badge">{pendingCount}</span>}
          </button>
          <nav className={`side-nav${menuOpen ? " open" : ""}`} aria-label="HR">
            {NAV_GROUPS.map((g) => {
              const items = nav.filter((n) => n.group === g.id);
              if (items.length === 0) return null;
              return (
                <div className="side-group" key={g.id}>
                  <div className="side-group-label">{t(g.label)}</div>
                  {items.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={pathname.startsWith(n.href) ? "active" : ""}
                      aria-current={pathname.startsWith(n.href) ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
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
          </nav>
          <main className="hr-main">
          {access.isLoading ? (
            <div className="subview">
              <DataState loading error={null}>
                {null}
              </DataState>
            </div>
          ) : nav.length === 0 ? (
            <div className="subview empty">
              No HR tab has been granted to you yet — ask the HR Manager (Manage HR Access).
            </div>
          ) : (
            children
          )}
          </main>
        </div>
      )}
    </>
  );
}
