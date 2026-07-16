/**
 * Outbound email via Resend's REST API (no SDK dependency).
 *
 * All app mail sends from noreply@mail.bindersync.com — the subdomain keeps
 * the app's sending reputation separate from the human support@ mailbox.
 * Without RESEND_API_KEY configured, sends are skipped and logged so local
 * dev works without a key.
 */

const FROM = "Binder Sync <noreply@mail.bindersync.com>";

export async function sendEmail({
  to,
  subject,
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.warn(`[email skipped — no RESEND_API_KEY] to=${to} subject=${subject}\n${text}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        text,
        ...(replyTo ? { reply_to: [replyTo] } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`Resend send failed (${res.status}):`, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send failed:", err);
    return false;
  }
}
