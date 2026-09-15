import { NextResponse } from "next/server";

import {
  clientKey,
  corsHeaders,
  methodNotAllowed,
  preflight,
  rateLimit,
  rateLimitResponse,
} from "@/lib/http";
import { fetchSentiment } from "@/lib/news-sentiment";
import { normaliseSymbol } from "@/lib/symbols";

const METHODS = ["GET", "OPTIONS"];

export const dynamic = "force-dynamic";
/** Vercel reads this from the Next.js build output to size the function timeout. */
export const maxDuration = 25;

/**
 * Daily news sentiment for one ticker.
 *
 * Kept behind a tighter rate limit than the price routes because the upstream
 * free tier allows only a couple of dozen calls a day.
 */
export async function GET(request: Request) {
  const cors = corsHeaders(request, METHODS);

  const limit = rateLimit(clientKey(request, "sentiment"), 10, 60_000);
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  const symbol = normaliseSymbol(
    new URL(request.url).searchParams.get("symbol") ?? "",
  );
  if (!symbol) {
    return NextResponse.json(
      { error: "invalid_symbol", message: "Provide a ticker, e.g. ?symbol=AAPL" },
      { status: 422, headers: cors },
    );
  }

  const series = await fetchSentiment(symbol);

  return NextResponse.json(series, {
    status: 200,
    headers: {
      ...cors,
      // Sentiment shifts slowly and the upstream quota is small, so cache hard.
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
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
