import { NextResponse } from "next/server";

import { runBacktest, thin } from "@/lib/backtest";
import {
  clientKey,
  corsHeaders,
  methodNotAllowed,
  preflight,
  rateLimit,
  rateLimitResponse,
} from "@/lib/http";
import { ASSETS } from "@/lib/market-data";
import { STRATEGIES } from "@/lib/strategies";
import type { StrategyId } from "@/lib/types";

const METHODS = ["POST", "OPTIONS"];

export const dynamic = "force-dynamic";
/** Vercel reads this from the Next.js build output to size the function timeout. */
export const maxDuration = 30;

const VALID_SYMBOLS = new Set(ASSETS.map((a) => a.symbol));
const VALID_STRATEGIES = new Set(STRATEGIES.map((s) => s.id));

/** Clamp a number into range, falling back when it is not finite. */
function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function POST(request: Request) {
  const cors = corsHeaders(request, METHODS);

  // Backtests are the expensive route, so the window is deliberately tight.
  const limit = rateLimit(clientKey(request, "backtest"), 30, 60_000);
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      {
        error: "unsupported_media_type",
        message: "Content-Type must be application/json.",
      },
      { status: 415, headers: cors },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Body must be valid JSON." },
      { status: 400, headers: cors },
    );
  }

  const symbol = String(body.symbol ?? "SPY");
  const strategy = String(body.strategy ?? "dma") as StrategyId;

  if (!VALID_SYMBOLS.has(symbol)) {
    return NextResponse.json(
      {
        error: "unknown_symbol",
        message: `Unsupported symbol "${symbol}".`,
        supported: [...VALID_SYMBOLS],
      },
      { status: 422, headers: cors },
    );
  }

  if (!VALID_STRATEGIES.has(strategy)) {
    return NextResponse.json(
      {
        error: "unknown_strategy",
        message: `Unsupported strategy "${strategy}".`,
        supported: [...VALID_STRATEGIES],
      },
      { status: 422, headers: cors },
    );
  }

  const meta = STRATEGIES.find((s) => s.id === strategy)!;
  const config = {
    symbol,
    strategy,
    lookback: Math.round(
      clamp(body.lookback, meta.lookbackMin, meta.lookbackMax, meta.lookbackDefault),
    ),
    initialCapital: clamp(body.initial_capital, 1_000, 100_000_000, 10_000),
    stopLossPct: clamp(body.stop_loss_pct, 0, 90, 8),
    takeProfitPct: clamp(body.take_profit_pct, 0, 500, 20),
  };

  const started = Date.now();
  const result = runBacktest(config);

  // Callers opt in to the full curve; the default payload stays small.
  const includeCurve = body.include_curve === true;
  const includeTrades = body.include_trades !== false;

  return NextResponse.json(
    {
      config,
      metrics: result.metrics,
      trades: includeTrades ? result.trades.slice(0, 200) : undefined,
      equity: includeCurve ? thin(result.equity, 400) : undefined,
      meta: {
        bars: result.equity.length,
        trades_total: result.trades.length,
        compute_ms: Date.now() - started,
        disclaimer:
          "Simulated market data. Hypothetical results, not investment advice.",
      },
    },
    {
      status: 200,
      headers: {
        ...cors,
        // Deterministic for a given config, so it is safe to cache at the edge.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    },
  );
}

export async function OPTIONS(request: Request) {
  return preflight(request, METHODS);
}

export async function GET() {
  return methodNotAllowed(METHODS);
}
export async function PUT() {
  return methodNotAllowed(METHODS);
}
export async function DELETE() {
  return methodNotAllowed(METHODS);
}
export async function PATCH() {
  return methodNotAllowed(METHODS);
}
