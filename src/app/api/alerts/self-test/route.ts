import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { EMAIL_CONFIGURED, sendEmail } from "@/lib/email";

/**
 * "Does the alert plumbing work for me?", answered from a signed-in browser.
 *
 * The cron endpoint is protected by a shared secret, which is right for a
 * machine caller and miserable for a person: it means pasting a 32-character
 * string into a shell, where a wrong shell, a dropped quote or a stale copy all
 * produce the same opaque 401. This route asks a different question — "is the
 * person making this request signed in?" — which the browser already knows the
 * answer to.
 *
 * Deliberately narrower than the cron endpoint. It only ever looks at, and
 * emails, the caller's own account, so it cannot be used to probe anyone else
 * or to send mail to a stranger.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return json({ ok: false, problem: "Sync is not configured on this deployment." });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // Read-only request: nothing here should mint or refresh a session.
      setAll: () => {},
    },
  });

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user?.email) {
    return json({
      ok: false,
      problem: "You are not signed in on this device. Sign in first, then try again.",
    });
  }

  // Everything below concerns this user only, read through their own session,
  // so row-level security is doing the access control rather than a key.
  const { data: state, error } = await supabase
    .from("user_state")
    .select("state")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return json({ ok: false, problem: `Could not read your saved settings: ${error.message}` });
  }

  const saved = (state?.state ?? {}) as {
    watchlist?: unknown[];
    notifyPrefs?: { email?: boolean };
  };
  const watching = saved.watchlist?.length ?? 0;
  const optedIn = saved.notifyPrefs?.email === true;

  const problems: string[] = [];
  if (!optedIn) {
    problems.push(
      "Email alerts are switched off for your account. Turn them on above, then press Sync now so the setting reaches the server.",
    );
  }
  if (watching === 0) {
    problems.push("Your watchlist is empty, so there would be nothing to check.");
  }
  if (!EMAIL_CONFIGURED) {
    problems.push("The server has no email provider configured (RESEND_API_KEY).");
  }

  if (problems.length) {
    return json({ ok: false, email: user.email, watching, optedIn, problem: problems.join(" ") });
  }

  const sent = await sendEmail({
    to: user.email,
    subject: "QuantPulse setup test — not a signal",
    text: [
      "This is a setup test, not a trading signal. Nothing has triggered.",
      "",
      "If you are reading this, the scheduled alert job can reach you.",
      "",
      `It is watching ${watching} ${watching === 1 ? "position" : "positions"} and will email you`,
      "only inside the pre-close window, when a rule would actually trigger.",
      "A real alert always names a ticker, a strategy, and the minutes left",
      "to place the order.",
    ].join("\n"),
    html:
      '<pre style="font:13px ui-monospace,Menlo,monospace;white-space:pre-wrap">' +
      "This is a setup test, not a trading signal. Nothing has triggered.\n\n" +
      "If you are reading this, the scheduled alert job can reach you.\n\n" +
      `It is watching ${watching} ${watching === 1 ? "position" : "positions"} and will email you\n` +
      "only inside the pre-close window, when a rule would actually trigger.\n" +
      "A real alert always names a ticker, a strategy, and the minutes left\n" +
      "to place the order.</pre>",
  });

  if (!sent.ok) {
    return json({ ok: false, email: user.email, watching, optedIn, problem: `Sending failed: ${sent.error}` });
  }

  return json({ ok: true, email: user.email, watching, optedIn });
}

function json(body: unknown) {
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
