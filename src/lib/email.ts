import "server-only";

/**
 * Transactional email via Resend.
 *
 * Called straight over REST rather than through their SDK: it is one POST, and
 * a dependency that exists to wrap one POST is a dependency to keep updated
 * for no gain.
 *
 * Absent configuration is not an error. The alert job reports that delivery is
 * switched off and still does everything else, so the feature can be developed
 * and tested before an email account exists.
 */

const API = "https://api.resend.com/emails";

const apiKey = process.env.RESEND_API_KEY;
/**
 * Resend's shared sandbox sender works with no domain set up, which is what
 * makes first-run possible. It is rate limited and lands in spam more often,
 * so a verified domain is worth doing before anyone else relies on this.
 */
const from = process.env.ALERT_FROM_EMAIL || "QuantPulse <onboarding@resend.dev>";

export const EMAIL_CONFIGURED = Boolean(apiKey);

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendResult> {
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set" };

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.subject,
        text: args.text,
        html: args.html,
      }),
      // A hung mail provider must not eat the whole window.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }

    const body = (await res.json()) as { id?: string };
    return { ok: true, id: body.id ?? "sent" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
