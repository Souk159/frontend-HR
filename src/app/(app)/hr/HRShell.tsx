"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LangToggle, useLang } from "@/lib/i18n";
import { DataState } from "@/components/ui";
import { useApprovals, useHRAccess } from "@/features/hr/api";
import { allowedNav } from "@/features/hr/nav";

/** Topbar + sub-tab bar of the HR module; tabs are filtered by role / coordinator grants. */
export function HRShell({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const access = useHRAccess();
  const nav = allowedNav(access.data);
  const pending = useApprovals("pending", !!access.data?.can_approve);
  const pendingCount = pending.data?.length ?? 0;

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
        <>
          <nav className="subtab-bar">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={pathname.startsWith(n.href) ? "active" : ""}>
                {t(n.label)}
                {n.href === "/hr/approvals" && pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
              </Link>
            ))}
          </nav>
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
        </>
      )}
    </>
  );
}
