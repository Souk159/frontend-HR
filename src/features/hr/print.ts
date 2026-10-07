/** Prints a small standalone document (payslips) through a hidden iframe, like the prototype's printViaHiddenFrame. */

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type SlipLine = { label: string; value: string; strong?: boolean; negative?: boolean };

export function printSlip(title: string, heading: string, meta: [string, string][], lines: SlipLine[], note?: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body { font-family: "Inter", "Noto Sans Lao", system-ui, sans-serif; color: #1d2b26; margin: 32px; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; } .sub { color: #6b7a73; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  td { padding: 7px 4px; border-bottom: 1px solid #e3e0d6; } td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .meta td { border: none; padding: 3px 4px; } .meta td:first-child { color: #6b7a73; width: 160px; }
  .strong td { font-weight: 700; border-top: 2px solid #1d2b26; } .neg td:last-child { color: #a34a2a; }
  .note { margin-top: 18px; color: #6b7a73; font-size: 11px; }
</style></head><body>
<h1>${esc(heading)}</h1><div class="sub">Yorsys HR</div>
<table class="meta">${meta.map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:left">${esc(v)}</td></tr>`).join("")}</table>
<table>${lines
    .map((l) => `<tr class="${l.strong ? "strong" : ""}${l.negative ? " neg" : ""}"><td>${esc(l.label)}</td><td>${esc(l.value)}</td></tr>`)
    .join("")}</table>
${note ? `<p class="note">${esc(note)}</p>` : ""}
</body></html>`;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    setTimeout(() => frame.remove(), 1000);
  }, 250);
}
