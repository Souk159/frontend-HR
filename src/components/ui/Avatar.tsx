"use client";

import { useState } from "react";

/** "/uploads/staff_photos/x.jpg" (as stored by the API) → URL served by our BFF */
export function photoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/^\/uploads\/(.+)$/);
  return m ? `/api/files/${m[1]}` : null;
}

function initials(name: string) {
  const parts = name.replace(/\(.*\)/, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Round staff photo with an initials fallback (also used when the image fails to load). */
export function Avatar({ name, url, size = 32, onClick }: { name: string; url?: string | null; size?: number; onClick?: () => void }) {
  const [failed, setFailed] = useState(false);
  const src = photoSrc(url);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  const content =
    src && !failed ? (
      // eslint-disable-next-line @next/next/no-img-element -- private, session-gated images; next/image would cache them publicly
      <img src={src} alt={name} className="avatar-img" style={style} onError={() => setFailed(true)} />
    ) : (
      <span className="avatar-initials" style={style} aria-label={name}>
        {initials(name)}
      </span>
    );
  return onClick ? (
    <button type="button" className="avatar-btn" onClick={onClick} title={name}>
      {content}
    </button>
  ) : (
    content
  );
}
