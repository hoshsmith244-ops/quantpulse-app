# Changelog

Every substantive change to QuantPulse, newest first. One entry per commit.

---

## 2026-09-16 — Screener filters, and a way to see what failed

### You can now see the strategies that did not work

The screener always held all 1,030 combinations, but the default view filtered
to "worth a closer look" and **simple mode had no way to widen it** — so a whole
class of user could only ever see strategies that succeeded, in an app whose
entire argument is that most of them don't.

A line under the results now states how many were hidden and offers to show
everything. It drops the stress-test filter at the same time, because showing
"everything" with that still on would show 103 of 1,030 and call it the base
rate.

### Filters, grouped into three honest categories

| Group | Filters |
| --- | --- |
| **The strategy** | verdict, factor, signal now, minimum trades, beat holding out of sample, survives the stress test, hide strategies that still lost money |
| **The company** | sector, industry, market cap, P/E, dividend, profitable or not, revenue growing or shrinking |
| **Risk and tradeability** | liquidity, volatility, beta, short interest |

Simple mode keeps four; the rest are behind **More filters** in advanced.

- **Liquidity is the important one.** Every backtest charges a flat 10 bps round
  trip, which is only honest on a name that trades. Below ~$10M a day the real
  spread is wider than the modelled cost, so the column turns amber there.
- **Minimum trades** guards against six-trade results that mean nothing.
- **Hide strategies that still lost money** — a large edge over a stock that
  fell is not a profit, and the green edge column reads like one.
- Every bucket shows its ticker count, so an empty slice announces itself.
- Analyst ratings and price targets were available and deliberately left out.
  They are opinions; nothing else on the page is.

### Universe widened to make those filters mean something

The old universe was 206 mega- and large-caps: **zero mid-caps, zero small-caps,
and every single name in the heaviest liquidity bucket.** "Mid", "Small" and
"Thin" all returned nothing, which reads as a broken filter. Roughly 80 mid- and
small-caps were added across every sector — also the part of the market where an
edge is likelier to be real *and* likelier to be eaten by the spread, which is
exactly the trade-off these filters exist to expose.

### Fixed: crypto liquidity was off by a factor of a billion

Yahoo reports crypto volume already denominated in dollars while equity volume
is a share count, so multiplying by price gave BTC a daily turnover of
$2,077,804,854M. The units give themselves away — 27 billion *units* of BTC is
more than will ever exist. Now $27.2B, which is about right.

---

## 2026-09-16 — The pre-close action window

### Alerts now fire in the last twenty minutes, and only there

The pre-close check previously fired at any point in the session, keyed by day.
That meant you got the *least* reliable reading available — a provisional close
computed at 10am is a guess about six more hours of trading — and then nothing
afterwards, because the day was already marked as alerted.

Alerts are now bounded at both ends:

- **Window opens 20 minutes before the close** (3:40pm for a New York 4:00pm
  bell). Watchlist names are re-run with the live price standing in for the
  close, and a flip sends one alert carrying the minutes left to order.
- **On-close cutoff 10 minutes before the close** (3:50pm). NYSE and Nasdaq
  accept no new market-on-close or limit-on-close orders after this, so the app
  stops advising one rather than advising a trade that would be rejected.
- **Stand-down alerts.** If the price moves back and the rule stops triggering,
  the earlier alert is withdrawn — untagged and requiring interaction, so it
  cannot silently replace the alert it contradicts. An instruction that is never
  taken back walks the user into a trade the strategy does not want, which is
  worse than never alerting at all.
- **Adaptive polling.** A flat 15-minute timer would routinely sleep straight
  through a 10-minute window. Each scan reports how soon it needs to run again:
  15 min at rest, 5 min within 45 minutes of a close, 2 min inside the window.

Times come from each venue's own calendar rather than an assumed 16:00, so
London's 4:30pm close puts the window at 4:10–4:20pm and half-day holidays shift
automatically. Crypto is flagged `alwaysOpen` and gets its own copy — there is
no bell to trade into.

The terminal panel became a live countdown with four distinct states (too early
/ act now / past the cutoff / settled), and now renders in **both** simple and
advanced mode, since the alerts fire in both. Guide gains section 10 on when to
actually place the trade.

*Verified without waiting for 3:40pm:* `scripts/check-window.mts` drives the
window and the alert state machine against fixed clocks — 37 checks covering
phase boundaries, London, half-days, crypto, and a full minute-by-minute window
including the alert-then-reverse case. The UI was checked by simulating each
phase in the browser.

---

## 2026-09-16 — Finding what to look at

### Screener

The terminal could always evaluate a ticker you had already thought of. It had
no answer for *which* ticker — the harder half of the job, and the half a new
trader has no way to do.

`/screener` runs all five price factors against ~200 tickers and filters the
results by **sector, market cap and P/E**. Click a row to open it in the
terminal with that strategy preloaded, or Watch it straight from the table.

- **Precomputed, not live.** A thousand backtests takes ~3 minutes, so
  `scripts/build-screen.mts` writes `public/screen.json` and the page fetches
  that static file. No Yahoo traffic, no function timeout, nothing added to the
  JS bundle.
- **Every factor at its default setting.** Sweeping parameters to find winners
  would produce results that evaporate when you open the ticker. Every number on
  the screen reproduces in the terminal — verified: AIG showed t = 5.43 in both.
- **Fundamentals filter the universe, never the backtest.** They are today's
  values; feeding them into a three-year simulation would be lookahead bias.
- **Two defences on by default**, because scanning 1,030 combinations is exactly
  the multiple-testing trap the guide warns about. Results must still beat
  holding at 25 bps and with the setting moved ±20%, and the header shows how
  many would clear the significance bar by luck (~47) beside how many actually
  did (389).
- Rows whose strategy **lost money** are tagged as such. A large edge over a
  stock that fell is not a profit, but a green edge column reads like one.
- Tickers with no value for an active filter are reported as excluded, not
  silently dropped — an ETF has no P/E, and missing is not the same as failing.
- Guide gains section 09 on reading a screen without fooling yourself.

*What the first scan found:* 45 of 1,030 pairs graded "worth a closer look" —
but **226 came back statistically backwards**, against those 45 that worked as
intended. Over this window, momentum on large caps predicts *weaker* forward
returns (DIS t = −7.4). Most of the real structure in the market right now
points the opposite way to the thesis.

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
