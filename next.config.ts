import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Origin of the Supabase project, when sync is configured.
 *
 * The CSP below pins `connect-src` to 'self', which blocks the browser from
 * reaching ANY other origin — including the auth and REST endpoints. Without
 * this the sign-in request dies as an opaque "Failed to fetch" with no console
 * error, because a blocked connection is not a script error.
 *
 * Derived from the env var rather than hardcoded so the allowance is exactly
 * the project in use, and disappears entirely when sync is not configured.
 */
const supabaseOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` is required in two places and cannot currently be dropped:
 *   - script-src: the App Router streams hydration data as inline
 *     `self.__next_f.push(...)` scripts.
 *   - style-src:  Recharts sets inline styles on the SVG elements it renders.
 *
 * Dev additionally needs `'unsafe-eval'` and a websocket connect-src for HMR.
 * Tightening this to nonces means moving the policy into proxy.ts so a fresh
 * nonce can be minted per request — see DEPLOYMENT.md.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Supabase only appears here when it is configured. Realtime is not used, so
  // no wss: allowance for it — add one if that ever changes.
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Legacy equivalent of frame-ancestors, for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Every route gets the security baseline.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Each API route sets its own Cache-Control, since a blanket value
        // here would override the per-route one. Keep this to policy that
        // should never vary by route.
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      // NOTE: there is deliberately no Cache-Control rule for /_next/static.
      //
      // Next already serves those assets as `public, max-age=31536000,
      // immutable` and documents that the header cannot be overridden here, so
      // setting it was redundant in production — and actively harmful in dev,
      // where Turbopack reuses filenames while the contents change. The browser
      // held a year-old copy of a file that had just been rewritten, which
      // showed up as edits that appeared to do nothing until the assets were
      // force-refetched. Next warns about this on every build; the warning was
      // right.
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
