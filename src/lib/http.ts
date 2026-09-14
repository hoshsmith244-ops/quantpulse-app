import { NextResponse } from "next/server";

/**
 * Shared production hardening for the API routes: origin allow-listing,
 * method limiting and a coarse rate limit.
 */

const isProd = process.env.NODE_ENV === "production";

/** Origins permitted to call the API from a browser. */
function allowedOrigins(): string[] {
  const list = [
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim()),
  ].filter((s): s is string => Boolean(s));

  // Local development hosts are only trusted outside production.
  if (!isProd) {
    list.push("http://localhost:3000", "http://127.0.0.1:3000");
  }
  return list;
}

/**
 * CORS headers for an incoming Origin, or an empty object when the request is
 * same-origin (no Origin header) or the origin is not allow-listed. Returning
 * nothing is what makes the browser block the response.
 */
export function corsHeaders(
  request: Request,
  methods: string[],
): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin) return {};
  if (!allowedOrigins().includes(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": "Content-Type, X-QP-Signature",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Preflight response. */
export function preflight(request: Request, methods: string[]) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request, methods),
  });
}

/** 405 with a correct Allow header, per RFC 9110. */
export function methodNotAllowed(methods: string[]) {
  return NextResponse.json(
    {
      error: "method_not_allowed",
      message: `Allowed methods: ${methods.join(", ")}.`,
    },
    { status: 405, headers: { Allow: methods.join(", ") } },
  );
}

/**
 * Fixed-window rate limiter.
 *
 * This lives in module memory, so on serverless it is per-instance rather than
 * global — it blunts accidental floods and simple abuse, but it is not a
 * security boundary. Move to Upstash/Vercel KV before relying on it.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || now >= hit.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  hit.count++;
  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
  }

  return {
    ok: hit.count <= limit,
    remaining: Math.max(0, limit - hit.count),
    resetAt: hit.resetAt,
  };
}

/** Best-effort client identity for rate limiting. */
export function clientKey(request: Request, scope: string) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return `${scope}:${ip}`;
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: "rate_limited",
      message: "Too many requests. Slow down and retry.",
      retry_after_seconds: retryAfter,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
