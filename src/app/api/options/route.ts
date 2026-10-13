import { NextResponse } from "next/server";

import {
  clientKey,
  corsHeaders,
  methodNotAllowed,
  preflight,
  rateLimit,
  rateLimitResponse,
} from "@/lib/http";
import { fetchOptions, NoOptions } from "@/lib/options-chain";
import { normaliseSymbol } from "@/lib/symbols";

const METHODS = ["GET", "OPTIONS"];

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Live option chains for one ticker: the next few expiries, strikes within
 * 30% of spot, and the next earnings date.
 *
 * Each request costs several Yahoo calls, so it is rate limited more tightly
 * than /api/history and cached at the edge -- but only for a minute. Yahoo's
 * option quotes are already ~15 minutes late, and for 1-2 day expiries every
 * extra minute this layer adds is a minute the user did not choose. Stale
 * copies are served for at most 30 s while a refresh runs.
 */
export async function GET(request: Request) {
  const cors = corsHeaders(request, METHODS);

  const limit = rateLimit(clientKey(request, "options"), 20, 60_000);
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  const symbol = normaliseSymbol(new URL(request.url).searchParams.get("symbol") ?? "");
  if (!symbol) {
    return NextResponse.json(
      { error: "invalid_symbol", message: "Provide a ticker, e.g. ?symbol=AAPL" },
      { status: 422, headers: cors },
    );
  }

  try {
    const data = await fetchOptions(symbol);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        ...cors,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    if (err instanceof NoOptions) {
      return NextResponse.json(
        { error: "no_options", message: `No listed options for ${symbol}.` },
        // Cache the absence too: crypto and most foreign listings never have
        // US options, and asking again in five minutes will not change that.
        { status: 404, headers: { ...cors, "Cache-Control": "public, s-maxage=3600" } },
      );
    }
    return NextResponse.json(
      { error: "upstream_error", message: "Option data is unavailable. Try again shortly." },
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
