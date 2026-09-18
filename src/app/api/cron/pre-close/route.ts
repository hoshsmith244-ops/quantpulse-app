import { NextResponse } from "next/server";

import { runPreClosePass } from "@/lib/cron/pre-close";

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
  if (!authorised(request)) {
    return NextResponse.json(
      { error: "unauthorised" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
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
