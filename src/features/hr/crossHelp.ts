import { tr } from "@/lib/i18n";

/** 90 → "1h 30m" / "1 ຊມ 30 ນາທີ" */
export function hm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return tr([h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "0m", [h ? `${h} ຊມ` : "", m ? `${m} ນາທີ` : ""].filter(Boolean).join(" ") || "0 ນາທີ");
}
