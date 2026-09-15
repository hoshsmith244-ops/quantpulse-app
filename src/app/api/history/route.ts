import { NextResponse } from "next/server";

import {
  clientKey,
  corsHeaders,
  methodNotAllowed,
  preflight,
  rateLimit,
  rateLimitResponse,
} from "@/lib/http";
import { fetchHistory, SymbolNotFound } from "@/lib/market";
import { normaliseSymbol } from "@/lib/symbols";

const METHODS = ["GET", "OPTIONS"];

export const dynamic = "force-dynamic";
/** Vercel reads this from the Next.js build output to size the function timeout. */
export const maxDuration = 20;

/**
 * Daily OHLCV for one ticker, straight from Yahoo Finance.
 *
 * The client fetches this once per symbol, then recomputes every factor and
 * parameter locally — so moving a slider never costs a network round trip and
 * Yahoo sees one request per ticker rather than one per keystroke.
 */
export async function GET(request: Request) {
  const cors = corsHeaders(request, METHODS);

  const limit = rateLimit(clientKey(request, "history"), 60, 60_000);
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  const url = new URL(request.url);
  const raw = url.searchParams.get("symbol") ?? "";
  const symbol = normaliseSymbol(raw);

  if (!symbol) {
    return NextResponse.json(
      {
        error: "invalid_symbol",
        message: "Provide a ticker, e.g. ?symbol=AAPL",
      },
      { status: 422, headers: cors },
    );
  }

  const yearsRaw = Number(url.searchParams.get("years") ?? 3);
  const years = Number.isFinite(yearsRaw)
    ? Math.min(10, Math.max(1, Math.round(yearsRaw)))
    : 3;

  try {
    const data = await fetchHistory(symbol, years);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        ...cors,
        // Daily bars change once a day; an hour of edge cache is plenty and
        // keeps us well clear of Yahoo's rate limits.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    if (err instanceof SymbolNotFound) {
      return NextResponse.json(
        {
          error: "symbol_not_found",
          message: `No daily history for "${symbol}". Check the ticker — Yahoo uses suffixes like BRK-B, ^GSPC, BTC-USD.`,
        },
        { status: 404, headers: cors },
      );
    }
    return NextResponse.json(
      {
        error: "upstream_error",
        message: "Market data provider is unavailable. Try again shortly.",
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
