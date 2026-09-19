import { NextResponse } from "next/server";

import { probePreClose, runPreClosePass } from "@/lib/cron/pre-close";

/**
 * Scheduled pre-close alert pass.
 *
 * Called every few minutes across a broad band by Supabase pg_cron. The job
 * itself decides whether the market is genuinely inside the action window, so
 * a call landing outside it is cheap and expected rather than a mistake.
 *
 * GET rather than POST-only so it can be triggered from a browser or curl
 * while testing; the bearer secret is what actually protects it.
 */

export const dynamic = "force-dynamic";
/**
 * One pass fetches up to 40 symbols. They are shared across users and the
 * history route is edge-cached, but a cold run with a slow provider needs
 * room — and a truncated pass would send a partial set of alerts.
 */
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  // Refuse rather than run open. An unprotected endpoint here sends real email
  // to real people on demand.
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  // Constant-time-ish: compare full length regardless of where they differ.
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

async function handle(request: Request) {
  /**
   * Unauthenticated setup check. Reports ONLY whether each variable is
   * present — never a value, never any user data.
   *
   * Worth the small disclosure because a 401 has three very different causes:
   * the secret is missing from the deployment, the deployment predates the
   * variables being set, or the caller simply typed it wrong. Without this
   * they are indistinguishable, and the natural conclusion — "my machine is
   * not allowed to do this" — sends you looking in entirely the wrong place.
   */
  if (new URL(request.url).searchParams.has("health")) {
    return NextResponse.json(
      {
        cronSecretSet: Boolean(process.env.CRON_SECRET),
        supabaseAdminSet: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        emailSet: Boolean(process.env.RESEND_API_KEY),
        note: "true means the deployment has that variable. Values are never returned.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!authorised(request)) {
    return NextResponse.json(
      { error: "unauthorised" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    // Setup diagnostics. `probe` exercises every dependency without sending
    // anything; `test-email` additionally puts one clearly-marked sample
    // through the real delivery path. Both sit behind the same secret, and
    // both exist because the real pass returns early outside the window — so
    // without them a typo in a key is only discovered during the ten minutes
    // it matters.
    const url = new URL(request.url);
    if (url.searchParams.has("probe") || url.searchParams.has("test-email")) {
      const result = await probePreClose(url.searchParams.has("test-email"));
      return NextResponse.json(result, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const result = await runPreClosePass();
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    // Never 500 silently: the scheduler records the response, and an opaque
    // failure here is a day of missed alerts nobody hears about.
    return NextResponse.json(
      { ran: false, reason: e instanceof Error ? e.message : "pass failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const GET = handle;
export const POST = handle;
