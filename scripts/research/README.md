# Strategy research

How the strategy defaults in `src/lib/alpha.ts` were chosen, and why four of
the five were left alone.

## Method

Every evaluation uses the app's own procedure: 756 daily bars (three years), a
252-bar warmup, then two years of trading at the close, 10 bps round trip.

- **Train** — three earlier windows whose trading periods do not overlap:
  Oct 2017–Sep 2019, Oct 2019–Sep 2021, Oct 2021–Sep 2023. Covers the 2018
  selloff, the 2020 crash, the 2021 boom and the 2022 bear.
- **Test** — the window the app shows today. Its warmup starts after the last
  train window ends, so nothing in it was visible to the selection.

The selection was written to `results/selection.json` by the train run before
the test run existed. Rule, fixed in advance: positive in all three train
windows, then the highest pooled t-statistic.

**Measure: timing excess.** On each day a rule holds a stock, its net return
minus what random timing with the same exposure would have earned in that same
stock. Averaged across stocks per date, then a t-statistic over dates, so
correlated stocks are not counted as independent evidence. Subtracting each
stock's own drift cancels most of the survivorship bias in a universe made of
today's survivors.

`validate.mts` proves the research engine reproduces the app's `analyse()`
exactly — identical trade lists and equity to 1e-9 — across all 1,370
ticker/strategy pairs before any result is used.

## Results (test window ending 2026-10-12, 274 tickers)

| Strategy | Current default, test | Train rank predicts test? | Outcome |
|---|---|---|---|
| Distance from trend | +1.7%/yr, t 0.36 | yes, ρ +0.54 | **MA 50 → 200**: +5.8%/yr, t 2.77 |
| Short-term reversal | +0.9%/yr, t 0.22 | weakly, ρ +0.52 | unchanged — selection did not beat it |
| Momentum | −6.1%/yr, t −2.49 | **no**, ρ −0.40 | unchanged — see below |
| Risk-adjusted momentum | −3.9%/yr, t −1.19 | **no**, ρ −0.19 | unchanged — see below |
| Volume thrust | −10.9%/yr, t −2.98 | **no**, ρ −0.82 | unchanged — every setting loses |

ρ is the rank correlation, across the whole grid, between train t-statistic and
test timing excess. When it is near zero or negative, a setting's past
performance carries no information about its future performance, and any
"optimised" value is a coin flip presented as a result. That is the case for
both momentum variants and for volume thrust. Their selected settings beat the
current ones on test only because the current ones are actively harmful — and
almost every alternative trades less — not because the selection found an edge.

### Distance from trend

| | test excess | t | per trade | win | avg loss | median hold | worst trade |
|---|---|---|---|---|---|---|---|
| MA 50 (old) | +1.7%/yr | 0.36 | +0.84% | 81% | −6.9% | 3 | −85% |
| **MA 200 (new)** | **+5.8%/yr** | **2.77** | **+1.97%** | 90% | −6.3% | 3 | −47% |
| MA 200, entry 70 / exit 50 | +6.8%/yr | 3.44 | +6.18% | 90% | −10.4% | 17 | −47% |

The pre-registered pick was the third row. It was tied with the second on train
(t 3.15 vs 3.12), and the second keeps holds short, which is the product
requirement — so that choice does not depend on the test result. Both held up.

Robustness: every MA-200 variant tested was positive in all three train
windows. MA 50 and MA 100 looked strong on train only because of the 2020
rebound window (+37% to +60%/yr there, weak elsewhere) and neither was
significant out of sample.

Cost stress, test window: MA 200 earns +5.0%/yr at 25 bps and +3.6%/yr at
50 bps; MA 50 falls to +0.2% and −2.3%.

Time stops cost this strategy most of its edge (10-session cap: +2.1%/yr).
The reversion needs room to finish.

## Caveats

- **Survivorship.** The universe is today's tickers. Ten failed to download —
  all acquired or taken private. Buying deep drawdowns is where survivorship
  bias bites hardest, because the stocks that never recovered are missing.
  Timing excess removes the drift component of that bias, not all of it.
- Prices are split-adjusted but not dividend-adjusted.
- Test is a single two-year window. A t of 2.8 on it is strong evidence, not
  proof.

## Reproduce

```bash
export RESEARCH_CACHE=/some/cache/dir
node scripts/research/fetch.mts "$RESEARCH_CACHE"
node scripts/research/validate.mts
node scripts/research/sweep.mts train
node scripts/research/sweep.mts test
node scripts/research/report.mts
```

---

# Options research (October 2026)

Question: can the strategies' data predict moves well enough to trade
options, and where does any options edge actually live? Literature review:
[`reports/Options edge evidence for retail app.md`](../../reports/Options%20edge%20evidence%20for%20retail%20app.md).

## Data

- **Stock bars** — the same 11-year Yahoo cache as above.
- **Implied-vol indices** (`fetch-vol.mts`) — CBOE VIX, VIX9D, VXN, VXD, GVZ,
  OVX from Yahoo, 2015–2026. Single-stock vol indices have no history there.
- **Real option data** (`fetch-iv.mts`, `chain-calibrate.mts`) — DoltHub's
  public [`post-no-preference/options`](https://www.dolthub.com/repositories/post-no-preference/options)
  database, licensed **CC BY-SA 4.0** (attribution and share-alike apply if
  any of it is shown in the app). Weekly 30-day at-the-money IV for 233 of our
  tickers, May 2020 – Sep 2026, 69,711 stock-weeks; end-of-day chains with
  bid/ask. Coverage starts mid-2020; a handful of days are missing at source;
  `iv_month_ago` is empty after 2023, so month-ago IV is taken from the series
  itself. Checks: its SPY IV tracks VIX at 0.97 correlation and reads ~3 vol
  points lower (VIX includes out-of-the-money skew), and its `hv` field matches
  our own 20-day realised vol (correlation 0.94).

Train is through 2023-09-29, test after — the same split as the strategy work.

## 1. The strategies' signals, as option trades — no edge (`signal-edge.mts`)

35 pre-registered variants built only from the five strategies (stricter
thresholds, agreement between strategies, VIX and SPY regimes, bearish
readings for puts). Zero qualified on train: the best per-signal edge was about
0.1 sd over 5 days with |t| < 2, against roughly 0.12–0.21 sd needed to break
even buying at-the-money options. The bearish near-misses vanished on test
(buying puts lost 4–21% per trade).

With real IV (`iv-analysis.mts` §3), implied vol at a fresh signal is
1.10–1.14x the vol realised afterwards — the same as for any stock (1.10–1.12x).
The signals do not find mispriced options. Long calls on signal stocks were not
significantly better than calls on all stocks in either period (best: Distance
from trend, test +12.6% per trade vs +5.9% baseline, t 1.4; train -3.0% vs
-0.9%).

## 2. Variance premium — real, faded, mostly inside the spread

Short 30-day ATM straddles priced at the real IV, held to expiry, per $ premium
(`iv-analysis.mts` §1):

| | train: mid / full spread | test: mid / full spread | test IV − RV |
|---|---|---|---|
| Index ETFs | +11.3% (t 3.0) / +9.3% (t 2.5) | +8.9% (t 2.0) / +6.9% (t 1.5) | +1.3 pt |
| Single stocks | +6.5% (t 3.0) / +2.5% (t 1.2) | +2.3% (t 0.8) / −1.7% (t −1.0) | +1.1 pt |

The index premium halved between periods and is not significant after costs on
test; the single-stock premium is gone after costs. Earlier VIX-based estimates
(`vol.mts`) overstated it, as the literature warns. Tails are severe: the worst
30-day index straddle since 2016 lost ~8x its premium.

## 3. Implied vs historical vol (Goyal–Saretto) — real signal, priced away by spreads

Weekly quintiles of log(HV_252 / IV) on single stocks; long straddle returns
(§2). Test, at mid: IV-richest quintile −6.3%, IV-cheapest +2.1%, long-cheap /
short-rich +8.4% per 30 days (t 3.2) — stronger than on train (+5.4%, t 2.4).
At a typical retail fill (50% of the spread) +4.4% (t 1.7); at the full spread
+0.5%. The ordering is the durable part: **buying options when IV is rich
versus its one-year history lost 8–11% a month** in both periods.

## 4. One-month IV change — no stock-return signal

Quintiles of IV / IV a month ago predict nothing about the next month's stock
return: Q1−Q5 +0.05% (t 0.2) train, +0.30% (t 0.8) test (§4).

## What this means for the app

- None of the five strategies, in any tested form, gives an options edge after
  realistic retail costs. Directional option suggestions should not be
  presented as one.
- The durable, testable value is in *instrument choice*: IV rich vs its own
  history (avoid buying premium), the implied move vs what a signal has
  historically produced, and cost — at-the-money, liquid contracts, limit
  orders near the mid. The literature review finds cost avoidance is the
  largest documented "edge" available to retail traders.
- Index premium selling is positive but has faded and is not significant after
  costs on 2023–2026 data; it should not be marketed as an edge either.
