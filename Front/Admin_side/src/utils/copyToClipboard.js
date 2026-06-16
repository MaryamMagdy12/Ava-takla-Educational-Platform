/**
 * Copy text to the clipboard. Uses the Clipboard API when available; otherwise
 * falls back to execCommand so copy works on HTTP and older browsers.
 */
export async function copyToClipboard(text) {
  const value = String(text ?? "");
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      /* fall through to legacy path */
    }
  }

  await new Promise((resolve, reject) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.width = "1px";
      ta.style.height = "1px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) resolve();
      else reject(new Error("لم يُدعم النسخ في هذا المتصفح. انسخ النص يدويًا."));
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
