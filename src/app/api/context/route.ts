import { NextResponse } from "next/server";

import { fetchContext } from "@/lib/context";
import {
  clientKey,
  corsHeaders,
  methodNotAllowed,
  preflight,
  rateLimit,
  rateLimitResponse,
} from "@/lib/http";
import { normaliseSymbol } from "@/lib/symbols";

const METHODS = ["GET", "OPTIONS"];

export const dynamic = "force-dynamic";
/** Vercel reads this from the Next.js build output to size the function timeout. */
export const maxDuration = 15;

/**
 * Extended-hours price and recent headlines for one ticker.
 *
 * Separate from /api/history on purpose: history is daily bars that change
 * once a day and cache for an hour, while this moves minute to minute. Mixing
 * them would force one cache policy onto both.
 */
export async function GET(request: Request) {
  const cors = corsHeaders(request, METHODS);

  const limit = rateLimit(clientKey(request, "context"), 60, 60_000);
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  const url = new URL(request.url);
  const symbol = normaliseSymbol(url.searchParams.get("symbol") ?? "");

  if (!symbol) {
    return NextResponse.json(
      { error: "invalid_symbol", message: "Provide a ticker, e.g. ?symbol=AAPL" },
      { status: 422, headers: cors },
    );
  }

  try {
    const context = await fetchContext(symbol);
    return NextResponse.json(context, {
      status: 200,
      headers: {
        ...cors,
        // Extended-hours prints move continuously; a minute is a reasonable
        // floor that still shields Yahoo from per-keystroke traffic.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "upstream_error",
        message: "Could not load live market context.",
      },
      { status: 502, headers: cors },
    );
  }
}

export async function OPTIONS(request: Request) {
  return preflight(request, METHODS);
}
export async function POST() {
  return methodNotAllowed(METHODS);
}
export async function PUT() {
  return methodNotAllowed(METHODS);
}
export async function DELETE() {
  return methodNotAllowed(METHODS);
}
