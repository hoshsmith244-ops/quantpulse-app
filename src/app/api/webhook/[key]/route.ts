import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import {
  clientKey,
  corsHeaders,
  methodNotAllowed,
  preflight,
  rateLimit,
  rateLimitResponse,
} from "@/lib/http";

/**
 * Working webhook receiver. Mirrors the contract documented in the dashboard:
 * validate the key, optionally verify an HMAC signature over the raw body,
 * reject duplicate alert ids, then acknowledge with a routed order.
 *
 * Orders are simulated — this demo has no brokerage credentials.
 */

const VALID_KEY_PREFIX = "wh_live_";
const SIGNING_SECRET = process.env.QP_WEBHOOK_SECRET ?? "";
const DEDUPE_WINDOW_MS = 60_000;
const METHODS = ["POST", "GET", "OPTIONS"];

export const dynamic = "force-dynamic";
/** Vercel reads this from the Next.js build output to size the function timeout. */
export const maxDuration = 15;

/** alert_id -> first-seen timestamp. In-memory, so it resets on redeploy. */
const seen = new Map<string, number>();

function prune(now: number) {
  for (const [id, ts] of seen) {
    if (now - ts > DEDUPE_WINDOW_MS) seen.delete(id);
  }
}

type Payload = {
  key?: string;
  symbol?: string;
  action?: string;
  qty?: number | string;
  price?: number | string;
  order_type?: string;
  time_in_force?: string;
  alert_id?: string;
};

function verifySignature(raw: string, header: string | null) {
  // Signature checking is opt-in: without a configured secret the endpoint
  // stays usable for local testing.
  if (!SIGNING_SECRET) return true;
  if (!header) return false;

  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", SIGNING_SECRET)
    .update(raw)
    .digest("hex");

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const started = Date.now();
  const { key } = await params;
  const cors = corsHeaders(request, METHODS);

  // Signals are bursty but bounded; this catches runaway alert loops.
  const limit = rateLimit(clientKey(request, "webhook"), 120, 60_000);
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  if (!key.startsWith(VALID_KEY_PREFIX)) {
    return NextResponse.json(
      { error: "unknown_endpoint", message: "No endpoint matches that key." },
      { status: 404, headers: cors },
    );
  }

  const raw = await request.text();

  if (!verifySignature(raw, request.headers.get("x-qp-signature"))) {
    return NextResponse.json(
      {
        error: "invalid_signature",
        message: "HMAC digest did not match the request body.",
      },
      { status: 401, headers: cors },
    );
  }

  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Body must be valid JSON." },
      { status: 400, headers: cors },
    );
  }

  const symbol = body.symbol?.trim();
  const action = body.action?.trim().toLowerCase();

  if (!symbol || !action) {
    return NextResponse.json(
      {
        error: "missing_fields",
        message: "Both symbol and action are required.",
        required: ["symbol", "action"],
      },
      { status: 422, headers: cors },
    );
  }

  if (!["buy", "sell", "close"].includes(action)) {
    return NextResponse.json(
      {
        error: "invalid_action",
        message: `action must be buy, sell or close — received "${action}".`,
      },
      { status: 422, headers: cors },
    );
  }

  const now = Date.now();
  prune(now);

  if (body.alert_id) {
    const first = seen.get(body.alert_id);
    if (first !== undefined) {
      return NextResponse.json(
        {
          error: "duplicate_alert",
          message: "This alert_id was already processed.",
          first_seen: new Date(first).toISOString(),
        },
        { status: 409, headers: cors },
      );
    }
    seen.set(body.alert_id, now);
  }

  const qty = Number(body.qty ?? 0) || null;
  const price = Number(body.price ?? 0) || null;

  return NextResponse.json(
    {
      status: "accepted",
      order: {
        id: `ord_${now.toString(36)}`,
        symbol: symbol.toUpperCase(),
        side: action,
        qty,
        price,
        order_type: body.order_type ?? "market",
        time_in_force: body.time_in_force ?? "gtc",
        broker: "simulated",
        filled_at: new Date(now).toISOString(),
      },
      latency_ms: Date.now() - started,
    },
    { status: 201, headers: cors },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      message:
        "QuantPulse webhook endpoint. Send a POST with a JSON body to submit a signal.",
      docs: "/dashboard/webhooks",
      expects: {
        symbol: "string, required",
        action: "buy | sell | close, required",
        qty: "number, optional",
        price: "number, optional",
        alert_id: "string, optional idempotency key",
      },
    },
    { status: 200, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

export async function OPTIONS(request: Request) {
  return preflight(request, METHODS);
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
