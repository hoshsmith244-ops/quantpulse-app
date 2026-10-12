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
