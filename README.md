# QuantPulse

Algorithmic trading research and webhook execution, built as a runnable Next.js
application. Backtest a strategy against three years of market structure, read
the risk-adjusted metrics, then route the live signal to a broker over a signed
webhook.

## Running it

```bash
npm run dev
```

Then open <http://localhost:3000>.

> **Node runtime.** This machine had no Node installation, so a portable build
> (Node 24.21.0) was extracted to `%LOCALAPPDATA%\nodejs-portable` and added to
> your user `PATH`. A new terminal will pick it up automatically. If a shell
> still cannot find `node`, run `dev.cmd` in this folder — it pins the path
> before starting the server.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page with a live, interactive backtest widget |
| `/dashboard` | Backtesting workspace — controls, equity curve, trade log |
| `/dashboard/backtester` | Strategy lab with a full parameter sweep |
| `/dashboard/webhooks` | Endpoint generator, payload helper, live execution feed |
| `/dashboard/api-keys` | Key management and request signing reference |
| `/dashboard/settings` | Broker connections and execution guardrails |
| `/api/webhook/[key]` | Working webhook receiver (POST) |

## The engine is real

Nothing on the metrics surfaces is hardcoded. Every number — CAGR, Sharpe,
Sortino, max drawdown, win rate, profit factor, exposure — is computed by
`src/lib/backtest.ts` from the price series, on every parameter change. Change
the asset in the hero widget and the whole panel recomputes.

- **`src/lib/market-data.ts`** — deterministic price generator. Geometric
  Brownian motion with an Ornstein–Uhlenbeck regime term so the series trends
  and mean-reverts the way real instruments do. Raw GBM over three years at
  20–60% vol makes the terminal price a coin flip, so the drift is *bridged*:
  after generating the path, a constant is added to every log return to land the
  series on a realistic total return. Daily volatility, regime texture and
  drawdown shape are untouched. Seeded per symbol, so results are identical
  across server render, client hydration and reloads.
- **`src/lib/indicators.ts`** — SMA, Wilder-smoothed RSI, Donchian rolling
  extremes.
- **`src/lib/strategies.ts`** — Dual Moving Average, RSI Reversion, Breakout
  Momentum. Each returns a per-bar exposure of 1 (long) or 0 (flat), evaluated
  on bar close, which is when a TradingView alert would actually fire.
- **`src/lib/backtest.ts`** — the engine. Long-only, fully invested, 5 bps a
  side. Stops and targets are checked against the bar's high/low rather than the
  close, and a risk exit starts a 5-bar cooldown before re-entry so one stop
  does not immediately re-trigger.

Because the engine is honest, strategies lose on some assets. That is the point:
`/dashboard/backtester` sweeps the lookback across its whole range so you can
see whether a good result sits on a plateau or a single curve-fit spike.

## The webhook endpoint works

`POST /api/webhook/:key` is a real handler, not a stub. It validates the key,
optionally verifies an HMAC-SHA256 signature over the raw body (set
`QP_WEBHOOK_SECRET` to enable — without it the endpoint stays open for local
testing), rejects duplicate `alert_id` values inside a 60-second window, and
returns a simulated order.

```bash
curl -X POST http://localhost:3000/api/webhook/wh_live_8f2c41d9a6b3e057 \
  -H "Content-Type: application/json" \
  -d '{"symbol":"SPY","action":"buy","qty":10,"price":514.2,"alert_id":"a-1"}'
```

Returns `201` with the routed order. Send it twice and the second call returns
`409 duplicate_alert`. An unknown key returns `404`; an action other than
buy/sell/close returns `422`.

Order execution is simulated — there are no brokerage credentials here.

## Design system

Deep charcoal surfaces (`#0B0F17`) layered by elevation, `#1E293B` hairlines,
muted `#94A3B8` type, and colour reserved for meaning: `#10B981` profit,
`#EF4444` loss, `#3B82F6` interactive. Every financial figure uses JetBrains
Mono with `tabular-nums` (the `.tnum` utility) so columns of numbers align
digit-for-digit. Tokens live in `src/app/globals.css` under `@theme`.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
Recharts · Radix UI primitives · Lucide icons.

---

Market data is simulated and backtested results are hypothetical. This is a
demonstration application, not investment advice.
