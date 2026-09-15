# Deploying QuantPulse to Vercel

GitHub → Vercel → custom domain → SSL → verified data endpoint.

**Repository:** `https://github.com/hoshsmith244-ops/quantpulse-app`

---

## 0. Before you start

Two things to know about this deployment.

**The app depends on an upstream service.** Prices come from Yahoo Finance via
`yahoo-finance2`. There is no contract and no API key — if Yahoo rate-limits or
changes its endpoints, `/api/history` starts returning `502` and the terminal
shows an error state. Responses are cached at the edge for an hour, which keeps
normal traffic well clear of any limit, but plan for the dependency.

**Rate limiting is per-instance.** The limiter in `src/lib/http.ts` lives in
module memory, so on serverless each instance keeps its own counter and the real
ceiling is `limit × instances`. It blunts accidental floods; it is not a
security boundary. Move it to Vercel KV or Upstash before relying on it.

Also still unbuilt: authentication, persistence and billing. `/membership`
renders the account area but nothing submits anywhere.

---

## a) Connect the repo to Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)** and sign in with GitHub.
2. Find `quantpulse-app` in the list and click **Import**.
   (First time only: *Adjust GitHub App Permissions* and grant access.)
3. Leave every build setting at its default — `vercel.json` already declares the
   framework, build command and install command — then click **Deploy**.

Vercel runs `npm ci && npm run build` and gives you a `*.vercel.app` URL in
about a minute. After that, **every push to `main` deploys to production** and
every pull request gets a preview URL.

### Environment variables

The app deploys and works with **no environment variables set**. Add these under
**Project → Settings → Environment Variables** once you have a domain. The full
annotated list is in [`.env.example`](.env.example).

| Variable | Scope | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Production | `https://quantpulse.io` |

That one is not cosmetic — it is the CORS allow-list for `/api/history`. If it
is missing or has a trailing slash, cross-origin browser calls are rejected.
Same-origin calls (what the app itself makes) keep working either way.

> `NEXT_PUBLIC_*` values are inlined into the client bundle at **build** time.
> Changing one needs a redeploy, not just a save. Never put a secret behind that
> prefix.

---

## b) Point a custom domain at Vercel

### 1. Add the domain in Vercel

**Project → Settings → Domains → Add** → enter `quantpulse.io` → **Add**.

Add `www.quantpulse.io` too; Vercel offers to redirect one to the other in one
click. Pick one canonical host — it matters for SEO and for your CORS value.

Vercel then shows the exact DNS records to create:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

> Use the values **Vercel shows you** — they change.

### 2. Create those records at your registrar

**Namecheap:** Domain List → *Manage* → **Advanced DNS** → *Add New Record*.
Host is `@` for the apex. Ensure Nameservers is *Namecheap BasicDNS*, and delete
the default parking records or they will fight yours.

**GoDaddy:** My Products → *DNS* → **Manage Zones** → *Add*. Apex is `@`. Remove
the default `Parked` A record.

Set TTL to the lowest offered while setting up, so mistakes are cheap to fix.

### 3. Wait for propagation

Vercel's Domains page flips from *Invalid Configuration* to **Valid
Configuration** on its own — usually 5–30 minutes, occasionally up to 48 hours.

```bash
nslookup quantpulse.io
```

Your local resolver may cache an old answer; `dnschecker.org` shows propagation
across regions.

---

## c) Verify SSL and the data endpoint

### SSL certificate

Vercel issues a Let's Encrypt certificate automatically once DNS validates —
nothing to buy or upload.

```bash
curl -sSI https://quantpulse.io | findstr /I "HTTP strict-transport-security"
```

Expect `HTTP/2 200` and
`strict-transport-security: max-age=63072000; includeSubDomains; preload`.

Confirm the security headers from `next.config.ts` survived the deploy:

```bash
curl -sSI https://quantpulse.io | findstr /I "content-security-policy x-frame-options x-content-type-options"
```

`http://` should 308-redirect to `https://`. A padlock with no mixed-content
warning in DevTools → Console means SSL is done.

### Data endpoint

This is the one piece of server-side behaviour, so smoke-test it:

```bash
curl -s "https://quantpulse.io/api/history?symbol=AAPL" | findstr /I "symbol currency"
```

Expect `200` with a `quote` object and roughly 750 daily bars.

Full expected matrix:

| Request | Expected |
| --- | --- |
| `?symbol=AAPL` | `200` with quote + bars |
| `?symbol=BTC-USD` | `200` — crypto works |
| `?symbol=ZZZZFAKE` | `404 symbol_not_found` |
| no `symbol` param | `422 invalid_symbol` |
| `POST` | `405` + `Allow: GET, OPTIONS` |
| Origin not in allow-list | no `Access-Control-Allow-Origin` header |
| >60 requests/min from one IP | `429` + `Retry-After` |

Then load `/dashboard` in a browser and confirm a ticker switch repaints the
statistics. If the page shows the error state, check the Vercel function logs —
it is almost always Yahoo rate-limiting or an invalid ticker.

---

## Deploying

`deploy.sh` runs the same gate Vercel will, in the same order, and refuses to
push if anything fails.

```bash
./deploy.sh
```

It checks Node ≥ 20, scans for committed secrets, validates the lockfile, then
runs `tsc --noEmit`, `eslint` and a production build before committing and
pushing.

Dry run, no push:

```bash
./deploy.sh --check-only
```

On Windows `deploy.sh` needs Git Bash. For plain PowerShell or CMD:

```bash
npm run check
```

---

## Configuration map

Split deliberately, because the files are read at different times:

| File | Holds | Why there |
| --- | --- | --- |
| `next.config.ts` | CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, static asset caching | Applies in `next dev` **and** production, so the CSP is testable locally instead of only failing once deployed |
| `vercel.json` | HSTS, build/install commands, region pinning, redirects | Vercel-specific, or only meaningful over real TLS |
| `src/app/api/history/route.ts` | `maxDuration = 20` | Next.js writes it into the build output and Vercel reads it from there — the supported way to size a function timeout for a Next app |

Each header is defined in exactly one place. Setting the same key in both files
produces duplicate headers.

### Function region

`vercel.json` pins `iad1` (US East), close to Yahoo's infrastructure and the US
exchanges. Hobby plans may select any single region.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Build fails on Vercel, passes locally | Vercel runs `npm ci`, which needs `package-lock.json` committed and in sync. Run `npm install` and commit the lockfile. |
| `/api/history` returns 502 in production | Yahoo Finance is rate-limiting or unreachable. Edge caching usually prevents this; check function logs. |
| A ticker works on Yahoo's site but 404s here | Yahoo needs the exact symbol — `BRK-B` not `BRK.B`, `^GSPC` for indices, `VOD.L` for London listings. |
| Terminal loads but charts are empty | The symbol returned fewer than 260 daily bars, so the statistics are suppressed. Try a longer-listed ticker. |
| Blank page, CSP violations in console | Something added a new external origin. Add it to the matching directive in `next.config.ts`. |
| Cross-origin `/api/*` calls blocked | `NEXT_PUBLIC_APP_URL` missing or has a trailing slash. |
| Env var change had no effect | `NEXT_PUBLIC_*` is inlined at build time — redeploy. |
| Domain stuck on *Invalid Configuration* | Registrar parking records still present, or nameservers not pointed at the registrar's own DNS. |
