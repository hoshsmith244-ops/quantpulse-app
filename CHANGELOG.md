# Changelog

Every substantive change to QuantPulse, newest first. One entry per commit.

---

## 2026-09-16 — Making the signal actually tradeable

### `be4f6b9` Charge trading costs, and alert before the close rather than after

A backtest with no costs is a sales pitch. Every result now pays a round-trip
fee, charged half on entry and half on exit, and the default is **10 bps** — not
zero — so the honest number is what you see first.

- New **cost toggle** (Free / 5 / 10 / 25 bps) on the equity panel. "Free"
  carries an explicit warning that every figure below it is better than reality.
- The cost flows through the backtest, the per-trade returns, and walk-forward
  tuning, so tuning stops picking settings that only work when trading is free.
- Notifications now fire **before** the close, not after it. The rule is re-run
  with the live price standing in for today's close; if it would flip, you get
  the alert while there is still time to send a market-on-close order.
- The chosen cost persists with the rest of your workspace.

*What this exposed:* AAPL reversal at 43 trades goes from **+4.1% / 67% win** to
**−0.3% / 63% win** once you pay to trade. Profitable to losing, on the cost
alone.

### `902afc0` Add a pre-close check so entry signals can actually be acted on

The rule reads the daily close — which means by the time the signal exists, that
price is gone. A signal you read the next morning is not the trade the backtest
measured.

- New **Today's action** panel: `BUY AT CLOSE` / `SELL AT CLOSE` / `NO ACTION`,
  computed by re-running the exact same factor with the current price as a
  provisional close.
- Says plainly that it is provisional — a move in the last ten minutes can flip
  it — and that buying at tomorrow's open is a *different* trade than the one
  measured.
- Only renders while there is still a close to act on; otherwise it reads
  "settled".

### `8bff422` Notify on watchlist signal changes, and state entries and exits outright

- New `/notifications` page recording every entry and exit across the watchlist,
  with the date, the fill price, and the realised return on exits.
- Opt-in browser notifications (they only fire while a tab is open — there is no
  server or account yet, and the page says so rather than implying otherwise).
- The first scan of a fresh watchlist records current state **silently**. A
  position open for three weeks is not news, and announcing it as if it just
  happened would be a lie.
- Entry and exit language made explicit across the terminal instead of leaving
  the user to infer state from a coloured badge.

---

## 2026-09-15 — Accuracy and memory

### `de74b1a` Date bars in the venue's timezone and name that zone in the UI

Fixed a bar dated Sep 16 while it was still Sep 15 in EST. The cause was
UTC-slicing timestamps, which worked for US equities only by luck and broke on
crypto bars stamped 00:00 UTC.

A daily bar is a venue-defined window, not a viewer preference, so there is
deliberately **no timezone picker** — the app names the exchange's zone instead.

### `be87424` Add a watchlist that scans each ticker with its own strategy

- Each row stores **ticker + strategy preset**, so `AAPL/momentum` and
  `AAPL/reversal` are tracked independently.
- Six-at-a-time concurrent scan, capped at 40 entries, sanitised on read.
- Watch button in the terminal enrols whatever you are currently looking at.

### `3435f00` Show the live price, and keep the ticker across navigation

- The headline price was the **previous day's close**, not the current price.
  Now sourced from the live quote, labelled with which it is, and flagged when
  the market is shut.
- Your ticker, factor, parameter and horizon survive navigating to the guide and
  back, via `localStorage` read through `useSyncExternalStore` so the server
  render and first client render agree.

---

## 2026-09-14 — From SaaS shell to research tool

### `76ca41b` Add walk-forward tuning and an optional news sentiment factor

- **Walk-forward tuning**: the parameter is chosen on the first 60% of history
  and scored on the 40% it never saw. Tuning on everything always looks better
  and means nothing.
- The panel shows the training and out-of-sample columns side by side, plus what
  hindsight would have picked — the gap between them is the part that was luck.
- Across 15 factor/ticker pairs, the tuned choice beat buy & hold out of sample
  in **3**. That number is shown, not hidden.
- Optional news-sentiment factor from Alpha Vantage, gated on having at least
  400 days of history so it cannot be fitted on a fortnight of headlines.

### `6f335fc` Add extended-hours price and headlines as context beside the signal

Deliberately **beside** the signal, never inside it. Yahoo returns 8–10 headlines
over half a day — no history to fit, no way to establish causation, and folding
it into the engine would be lookahead bias.

- Pre/post-market price, move since close, and a staleness warning when that
  move exceeds 2%.
- Recent headlines, with anything published after the close marked.
- Labelled "published around the same time as the move" — not "the cause".

### `1221986` Compute the landing page sample live instead of hard-coding it

The landing page demo now runs the real engine on real data at request time. A
fake sample on the front page of a tool about not fooling yourself was the wrong
first impression.

### `596b042` Add a simple mode for newer traders, hide the statistics behind a toggle

- **Simple view**: what the rule says to do right now, in plain English, with the
  reasoning underneath.
- **Advanced view**: IC, t-statistic, decay curve, quintile ladder, equity curve,
  tuning. Same numbers, nothing dumbed down — just collapsed by default.

### `388d9ba` Rebuild as a quant alpha research tool

The pivot. **6,045 lines deleted.** Gone: webhook execution, API key management,
paper trading, the settings surface, the backtester page — the whole SaaS
scaffold.

What replaced it:

- `src/lib/alpha.ts` — the engine. Six factors (momentum, reversal,
  risk-adjusted momentum, trend distance, volume thrust, news sentiment),
  Spearman information coefficient, t-statistic, IC decay across horizons, a
  quintile ladder with the Q5−Q1 spread, and a backtest.
- The backtest goes long when the score sits in the top 40% of everything seen
  **up to that day** — an expanding-window percentile, never a full-sample one.
  252-bar warm-up before the first trade, and a 5-bar cooldown after a stop.
- Real daily data from Yahoo Finance.
- `/guide` — how to read every number on the page.
- `/membership` — placeholder, as specified.

*Verified:* truncating the last 120 sessions and re-running produced
byte-identical trades for 15 factor/ticker pairs. The trade list contains no
lookahead.

### `b5e6b9b` Pin Node engine to 24.x for local/production parity

### `f2cb367` Add production deployment configuration for Vercel

`vercel.json` (validated against the official schema), `.env.example`,
`deploy.sh`, and `DEPLOYMENT.md`. `deploy.sh` defaults to `npm ci --dry-run`
after a real `npm ci` gutted `node_modules` on Windows; the destructive path is
behind an explicit `--clean-install` flag.

### `b22e952` Build QuantPulse trading and webhook execution app

The original brief: landing page, dashboard, webhook hub. Fintech palette
(`#0B0F17` / `#1E293B` / `#94A3B8` / `#10B981` / `#EF4444` / `#3B82F6`), tabular
figures on every financial value, no gradients and no glassmorphism.

### `8793527` Initial commit from Create Next App

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4.

---

## Known limits

- **Notifications are watchlist-scoped only.** A ticker open in the terminal but
  not added via the Watch button generates nothing.
- **Nothing runs while the app is closed.** No account, no server scheduler. The
  checks happen on open and every 15 minutes while a tab is live. Real push
  needs auth, a database and a cron job — that is the membership product.
- **The newest crypto bar is always incomplete**, because crypto never closes.
- **Fills are assumed at the close.** Slippage beyond the cost setting, partial
  fills, and overnight gaps are not modelled.
