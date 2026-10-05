"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LangToggle, useLang } from "@/lib/i18n";

function LoginForm() {
  const { t } = useLang();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/hr";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [business, setBusiness] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, business_slug: business }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sign-in failed");
      // only allow same-site relative redirects
      router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/hr");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <LangToggle onLight />
      </div>
      <div className="login-mark">Y</div>
      <h1>Yorsys</h1>
      <div className="sub">{t("login_sub")}</div>
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="biz">{t("business")}</label>
        <input id="biz" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="e.g. yorlapa-cafe" autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="user">{t("username")}</label>
        <input id="user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="pw">{t("password")}</label>
        <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      <button className="signin-btn" type="submit" disabled={busy}>
        {busy ? "…" : t("sign_in")}
      </button>
      <div className="role-note" dangerouslySetInnerHTML={{ __html: t("login_note") }} />
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
