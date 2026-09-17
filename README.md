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
| `/screener` | Every strategy against every ticker, filtered by sector, size and P/E |
| `/watchlist` | Saved ticker + strategy pairs, scanned in one pass |
| `/notifications` | Entry and exit changes across the watchlist |
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

## Live context sits beside the algorithm, never inside it

The terminal also shows the extended-hours price and recent headlines, because
a signal computed on the daily close cannot see an earnings release at 16:05.
When the after-hours move exceeds 2%, the signal is flagged as possibly out of
date.

None of it touches the maths, for two reasons:

- **No history to test against.** Yahoo returns roughly half a day of
  headlines. There is nothing to fit or validate a news factor on across three
  years of prices.
- **It would be lookahead bias.** Mixing today.s news into a historical
  simulation is the exact error the rest of the tool is built to detect.

Headlines are labelled as context, not cause. A story published near a price
move is a hypothesis; the interface says so rather than asserting a reason.
Building a real news factor would need point-in-time historical news with
timestamps and sentiment — a different data provider, not Yahoo.

## Screener

`/screener` answers the question the terminal cannot: *which ticker should I
even be looking at?* It runs all five price factors against the universe at
their default settings and lets you filter the results three ways:

| Group | Filters |
| --- | --- |
| **The strategy** | verdict, factor, signal now, minimum trades, beat holding out of sample, survives the stress test, hide strategies that still lost money |
| **The company** | sector, industry, market cap, P/E, dividend, profitable or not, revenue growing or shrinking |
| **Risk and tradeability** | liquidity (daily dollar volume), volatility, beta, short interest |

Simple mode shows four of these; the rest live behind **More filters** in
advanced mode. Every bucket carries its ticker count (`Mid · $2–10B (34)`) so an
empty slice announces itself rather than silently returning nothing.

**Liquidity is the one that matters most** and the one a conventional screener
never has. Every backtest here charges a flat 10 bps round trip, which is only
honest on a name that actually trades; below roughly $10M a day the real spread
is wider than the modelled cost and the edge shown is partly fiction.

Analyst ratings and price targets are deliberately absent. They are opinions,
not measurements, and nothing else on this page is an opinion.

**It is precomputed, not live.** The scan is a thousand backtests and takes
about three minutes — far too slow per request, and pointless, because daily
bars only move once a day. `scripts/build-screen.mts` writes
`public/screen.json` (399 KB, ~62 KB gzipped) and the page fetches that static
file. No Yahoo traffic, no function timeout, nothing added to the JS bundle.

Rebuild it after the close:

```bash
node scripts/build-screen.mts
```

Two rules the script enforces, both of which a conventional screener breaks:

- **No parameter sweeping.** Every factor runs at its default setting. Hunting
  the grid for the best number would guarantee good-looking results that do not
  reproduce when you open the ticker in the terminal. Every figure on the screen
  is reproducible by typing that ticker in.
- **Fundamentals never touch the backtest.** Market cap, P/E, beta and dividend
  yield are today's snapshot. Today's P/E did not exist three years ago, so
  scoring a three-year simulation with it would be lookahead bias. They narrow
  which names you look at; the statistics come from price alone.

Because scanning a thousand combinations is exactly the multiple-testing trap
the guide warns about, two defences are on by default: results must survive a
raised cost (25 bps) and a parameter shift of ±20%, and the page shows how many
results chance alone would produce next to how many actually appeared.

## The pre-close action window

Every strategy reads the daily close, so by the time a signal exists the price
it refers to is gone. The only way to take the trade the backtest measured is to
decide shortly *before* the bell and send a market-on-close order.

That window is bounded at both ends, and the app enforces both:

| | US equities | What happens |
| --- | --- | --- |
| Window opens | 3:40pm | Watchlist alerts fire; the terminal shows a live countdown |
| On-close cutoff | 3:50pm | Exchange stops accepting MOC/LOC orders — alerts stop too |
| Close | 4:00pm | The bar settles; entries and exits are recorded for the record |

Earlier in the session a provisional reading is a guess about hours of trading
still to come, so it is shown but explicitly marked too early, and **no alert is
sent**. That restraint is the feature — alerting all day would train people to
act on noise.

**Stand-downs.** If a price moves back inside the window and the rule stops
triggering, the earlier alert is withdrawn. An alert that is never taken back
walks the user into a trade the strategy does not want, which is worse than
never alerting.

Times come from each venue's own trading calendar
(`currentTradingPeriod.regular.end`), not an assumed 16:00 — so London's 4:30pm
close puts the window at 4:10–4:20pm and half-day holidays shift automatically.
Crypto reports a 24-hour session and is flagged `alwaysOpen`, where none of this
applies.

The logic is time-dependent and alive for twenty minutes a day, so it is covered
by a test rather than by looking at the running app:

```bash
node scripts/check-window.mts
```

These are *exchange* cutoffs. Brokers often impose earlier ones and some retail
brokers do not offer on-close orders at all, which the UI says rather than
assuming.

## Watchlist

`/watchlist` scans every ticker you save in one pass and reports which are
signalling now, how long they have been in that state, and whether the signal
has any evidence behind it.

Each row carries its own strategy, not just a ticker. That is the point: a
factor that works on one name usually does not work on another, so a watchlist
of bare tickers would throw away the conclusion the research surface exists to
reach. The Watch button in the terminal saves whatever you are currently
looking at, strategy included, and clicking a row opens it back up with that
preset loaded.

Fetches are pooled six at a time and each ticker is edge-cached for an hour;
measured at roughly 210ms to fetch eight cold tickers and 18ms per ticker to
analyse.

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
