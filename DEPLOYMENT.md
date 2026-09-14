# Deploying QuantPulse to Vercel

Production deployment guide: GitHub → Vercel → custom domain → SSL → verified
webhook endpoint.

**Repository:** `https://github.com/hoshsmith244-ops/quantpulse-app`

---

## 0. Before you start — read this

Two things in this codebase are **not production-safe as written**. They work
fine on a single server and will behave unpredictably on Vercel's serverless
platform, where each request may hit a different instance.

| What | Where | Why it breaks | Fix before real money |
| --- | --- | --- | --- |
| Webhook idempotency | in-memory `Map` in `src/app/api/webhook/[key]/route.ts` | Each serverless instance keeps its own map, so a duplicate alert landing on a different instance is **not** caught and the order fires twice | Move to Vercel KV / Upstash Redis with a TTL |
| Rate limiting | in-memory `Map` in `src/lib/http.ts` | Limits apply per instance, so the real ceiling is `limit × instances` | Same — Redis, or Vercel Firewall rate limiting |

Also still simulated: market data, broker execution, auth, and persistence.
See the README for the full boundary. **Do not connect a funded brokerage
account to this deployment.**

---

## a) Connect the repo to Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)** and sign in with GitHub.
2. Find `quantpulse-app` in the repository list and click **Import**.
   (First time only: click *Adjust GitHub App Permissions* and grant access to
   the repo.)
3. Leave every build setting at its default — `vercel.json` already declares the
   framework, build command and install command — then click **Deploy**.

Vercel auto-detects Next.js, runs `npm ci && npm run build`, and gives you a
`*.vercel.app` URL in about a minute.

From then on: **every push to `main` deploys to production**, and every pull
request gets its own preview URL.

### Environment variables

Before the first deploy (or immediately after), add these under
**Project → Settings → Environment Variables**. Full annotated list in
[`.env.example`](.env.example).

Minimum for a working production deploy:

| Variable | Scope | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Production | `https://quantpulse.io` |
| `QP_WEBHOOK_SECRET` | Production | `openssl rand -hex 32` |

`NEXT_PUBLIC_APP_URL` is not cosmetic — it is the CORS allow-list. If it is
wrong or missing, browser calls to `/api/*` from your own domain are rejected.

> `NEXT_PUBLIC_*` values are inlined into the client bundle at **build** time
> and are publicly readable. Changing one requires a redeploy, not just a
> save. Never put a secret behind that prefix.

---

## b) Point a custom domain at Vercel

Buy the domain first (Namecheap, GoDaddy, Cloudflare — any registrar).

### 1. Add the domain in Vercel

**Project → Settings → Domains → Add** → enter `quantpulse.io` → **Add**.

Add `www.quantpulse.io` too; Vercel will offer to redirect one to the other.
Redirecting `www` → apex (or vice versa) is one click, and picking one canonical
host matters for SEO and for your CORS allow-list.

Vercel then shows you the exact DNS records to create. They will look like this:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

> Use the values **Vercel shows you**, not the ones above — they change.

### 2. Create those records at your registrar

**Namecheap:** Domain List → *Manage* → **Advanced DNS** → *Add New Record*.
Set Host to `@` (apex) or `www`. Make sure Nameservers is set to
*Namecheap BasicDNS*, and delete the default parking/redirect records or they
will fight yours.

**GoDaddy:** My Products → *DNS* → **Manage Zones** → *Add*. GoDaddy calls the
apex record `@`. Remove the default `Parked` A record.

Set TTL to the lowest offered (usually 600s / *Automatic*) while you are
setting up — it makes mistakes cheap to correct.

### 3. Wait for propagation

Vercel's Domains page flips from *Invalid Configuration* to **Valid
Configuration** on its own. Usually 5–30 minutes; DNS can take up to 48 hours.

Check from your machine rather than guessing:

```bash
nslookup quantpulse.io
```

Alternatively, use an external checker like `dnschecker.org` to see propagation
across regions — your local resolver may cache an old answer.

---

## c) Verify SSL and the webhook endpoint

### SSL certificate

Vercel issues a Let's Encrypt certificate automatically once DNS validates —
there is nothing to buy or upload. The Domains page shows the status.

Verify the certificate and the HSTS header declared in `vercel.json`:

```bash
curl -sSI https://quantpulse.io | findstr /I "HTTP strict-transport-security"
```

Expect `HTTP/2 200` and
`strict-transport-security: max-age=63072000; includeSubDomains; preload`.

To inspect the certificate chain and expiry:

```bash
curl -vI https://quantpulse.io 2>&1 | findstr /I "subject issuer expire"
```

Then confirm the security headers from `next.config.ts` survived the deploy:

```bash
curl -sSI https://quantpulse.io | findstr /I "content-security-policy x-frame-options x-content-type-options"
```

`http://` should 308-redirect to `https://` automatically. If the browser shows
a padlock and no mixed-content warning in DevTools → Console, SSL is done.

### Webhook endpoint

Smoke-test the live endpoint:

```bash
curl -X POST https://quantpulse.io/api/webhook/wh_live_8f2c41d9a6b3e057 -H "Content-Type: application/json" -d "{\"symbol\":\"SPY\",\"action\":\"buy\",\"qty\":10,\"alert_id\":\"deploy-test-1\"}"
```

Expected — `201` with a routed order:

```json
{ "status": "accepted", "order": { "symbol": "SPY", "side": "buy", ... } }
```

Now verify the guardrails actually engaged in production. Run the same command
a second time; the duplicate `alert_id` must return **409**:

```json
{ "error": "duplicate_alert" }
```

Full expected matrix:

| Request | Expected |
| --- | --- |
| Valid POST | `201 accepted` |
| Same `alert_id` again within 60s | `409 duplicate_alert` |
| `action` not buy/sell/close | `422 invalid_action` |
| Key not starting `wh_live_` | `404 unknown_endpoint` |
| `DELETE` | `405` + `Allow: POST, GET, OPTIONS` |
| Origin not in allow-list | no `Access-Control-Allow-Origin` header |
| >120 POSTs/min from one IP | `429` + `Retry-After` |

**Once `QP_WEBHOOK_SECRET` is set in Vercel, signature verification becomes
mandatory** — unsigned requests get `401`. Sign the raw body:

```bash
BODY='{"symbol":"SPY","action":"buy"}'; SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$QP_WEBHOOK_SECRET" -r | cut -d' ' -f1); curl -X POST https://quantpulse.io/api/webhook/wh_live_8f2c41d9a6b3e057 -H "Content-Type: application/json" -H "X-QP-Signature: sha256=$SIG" -d "$BODY"
```

Set the same URL in TradingView under **Alert → Notifications → Webhook URL**,
using the JSON body from `/dashboard/webhooks`.

### Backtest endpoint

```bash
curl -X POST https://quantpulse.io/api/backtest -H "Content-Type: application/json" -d "{\"symbol\":\"NVDA\",\"strategy\":\"breakout\",\"lookback\":45}"
```

Returns computed `metrics` plus the trade list. Add `"include_curve": true` for
the full equity series.

---

## Deploying

`deploy.sh` runs the same gate Vercel will, in the same order, and refuses to
push if anything fails — a red build is caught locally instead of in production.

```bash
./deploy.sh
```

It checks Node ≥ 20, scans for committed secrets, runs `npm ci`, `tsc --noEmit`,
`eslint`, and a production build, then commits and pushes.

Dry run, no push:

```bash
./deploy.sh --check-only
```

On Windows, `deploy.sh` needs Git Bash. For plain PowerShell or CMD, this runs
the identical checks:

```bash
npm run check
```

---

## Configuration map

Deliberately split, because the two files are read at different times:

| File | Holds | Why there |
| --- | --- | --- |
| `next.config.ts` | CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, static asset caching | Applies in `next dev` **and** production, so the CSP is testable locally instead of only failing once deployed. Portable to any host. |
| `vercel.json` | HSTS, build/install commands, region pinning, redirects | Vercel-specific, or only meaningful over real TLS |
| Route files | `maxDuration` (backtest 30s, webhook 15s) | Next.js writes it into the build output and Vercel reads it from there — the supported way to size function timeouts for a Next app |

Headers are defined in exactly one place each. Setting the same key in both
files produces duplicate headers.

### Tightening the CSP

The policy currently needs `'unsafe-inline'` for scripts (the App Router streams
hydration data as inline scripts) and styles (Recharts sets inline styles on its
SVGs). To move to nonces, generate one per request in `proxy.ts` and pass it
through — a real change, not a config tweak. The current policy still blocks
framing, foreign script origins, `eval` in production, and form hijacking.

### Function region

`vercel.json` pins `iad1` (US East), closest to the US exchanges. Change it to
sit near your broker's API, not your users — the latency that matters is
QuantPulse → broker.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Build fails on Vercel, passes locally | Vercel runs `npm ci`, which needs `package-lock.json` committed and in sync. Run `npm install` and commit the lockfile. |
| Blank page, console shows CSP violations | Something added a new external origin. Add it to the matching directive in `next.config.ts`. |
| `/api/*` calls blocked from your own domain | `NEXT_PUBLIC_APP_URL` missing or has a trailing slash. It must exactly match the origin, e.g. `https://quantpulse.io`. |
| Env var change had no effect | `NEXT_PUBLIC_*` is inlined at build time — redeploy. |
| Domain stuck on *Invalid Configuration* | Registrar parking records still present, or nameservers not pointed at the registrar's own DNS. |
| Webhook returns 401 in prod, 200 locally | `QP_WEBHOOK_SECRET` is set in Vercel, so requests must be signed. |
| Duplicate orders despite `alert_id` | Expected — see §0. The dedupe map is per-instance. |
