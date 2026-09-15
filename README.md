# QuantPulse

A quant factor research tool. Pick a stock, pick a factor, and find out whether
it actually predicts the next move — measured the way a quant fund measures it,
using real market data.

An introduction to quant research, built as a runnable Next.js app.

## Running it

```bash
npm run dev
```

Then open <http://localhost:3000>.

> **Node runtime.** This machine had no Node installation, so a portable build
> (Node 24.21.0) was extracted to `%LOCALAPPDATA%\nodejs-portable` and added to
> your user `PATH`. A new terminal picks it up automatically. If a shell still
> cannot find `node`, run `dev.cmd` in this folder — it pins the path first.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run check` | typecheck + lint + build |
| `npm run deploy` | Pre-deploy gate, then commit and push (Git Bash) |

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/dashboard` | The tool. Opens in **Simple** mode; **Advanced** holds the statistics |
| `/guide` | How to use it, and how to read every statistic |
| `/membership` | Account area and tiers (UI only — see below) |
| `/api/history` | Daily OHLCV for one ticker (GET) |

## Market data is real

Prices come from Yahoo Finance via [`yahoo-finance2`](https://github.com/gadicc/yahoo-finance2)
— the same endpoints the Python `yfinance` package reads, in TypeScript so the
app stays on one runtime and deploys to Vercel without a Python function.

Any ticker Yahoo carries works: `AAPL`, `BRK-B`, `BTC-USD`, `^GSPC`, `VOD.L`,
`EURUSD=X`. Three years of daily bars, fetched once per symbol and cached at the
edge for an hour.

`src/lib/market.ts` is server-only (`yahoo-finance2` needs `node:module` and
cannot be bundled for the browser). Anything the client needs — the ticker list,
shared types — lives in `src/lib/symbols.ts`.

## The landing page reads live

The hero panel on `/` is not a screenshot. It runs the real engine on AAPL at
request time and prints the current signal, dated. The page is prerendered with
`revalidate = 3600`, so it refreshes hourly and costs one Yahoo call an hour no
matter how much traffic it gets. If the provider is unreachable at build or
revalidate time it falls back to describing the tool rather than showing numbers
that were never true.

## Two modes

The terminal opens in **Simple** mode, which answers the question a newer
trader actually has: is this strategy holding this stock right now, when would
it have bought, how have its past trades gone, and is there any evidence it
works. One plain-English verdict, a price chart with entry and exit points
marked, and a table of every trade.

**Advanced** mode exposes the research surface underneath — information
coefficient, significance, decay, quintile ladder, equity curve — plus the
lookback and forward-horizon controls. The choice is remembered per browser.

## How the analysis works

`src/lib/alpha.ts` is the engine. A **factor** turns price history into one
score per day; the engine then measures that score against *forward* returns —
returns it could not have seen.

- **Information coefficient** — Spearman rank correlation between the score and
  the forward return. Rank-based, so one outlier day cannot manufacture an edge.
- **t-statistic** — whether the IC is large enough, given the sample, to be
  unlikely by chance. Below 2 in magnitude, treat the IC as noise.
- **Decay** — the IC recomputed at 1, 5, 10, 21 and 63 days forward, showing how
  fast the edge fades.
- **Quintile ladder** — every day sorted into five buckets by score, with each
  bucket's mean forward return. A usable factor steps upward from Q1 to Q5.
- **Equity curve** — long whenever the score is in the top 40% of everything
  seen *up to that day*, flat otherwise. The threshold never uses future data
  and there is a one-year warm-up, so it is a fair test rather than a curve fit.
  Costs and slippage are not modelled.

Five factors ship: momentum, short-term reversal, risk-adjusted momentum,
distance from trend, and volume thrust.

### It will often tell you the factor doesn't work

That is the correct answer most of the time, and reading it is the point. A
negative IC means the factor is *inverted* on that asset — high scores precede
weaker returns — which is still information, and the interface says so rather
than dressing it up. Momentum on AAPL over the current window has an IC around
−0.14 with a t-stat near −3.4: a real effect, pointing the opposite way to the
textbook thesis.

## Membership is UI only

`/membership` renders the account area and tiers, but **nothing is wired**.
There is no authentication, no database, no billing, and the sign-in form does
not submit anywhere. The terminal is fully usable without an account.

## Design

A terminal-leaning interface: near-black surfaces (`#07090D`), visible hairline
grid, square corners, amber (`#FFB020`) as the primary accent rather than blue,
and JetBrains Mono as the default face — prose passages opt back into Geist via
`.prose-face`. Every figure is tabular so columns align digit-for-digit. Tokens
live in `src/app/globals.css` under `@theme`.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
Recharts · Lucide icons · yahoo-finance2.

---

Educational research tool. Hypothetical results exclude costs and slippage, and
past behaviour does not predict future returns. Nothing here is investment
advice.
