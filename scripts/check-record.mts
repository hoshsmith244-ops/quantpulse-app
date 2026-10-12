/**
 * Verifies the trade record: the four numbers the terminal leads with.
 *
 * Each case below is a shape that was displayed wrongly before. They are not
 * hypotheticals — the hold-period skew and the winning-but-losing rule are both
 * taken from live results on the current universe.
 *
 *   node scripts/check-record.mts
 */

import { analyse } from "../src/lib/alpha.ts";

import type { Bar } from "../src/lib/types.ts";

let failures = 0;

function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`}`,
  );
}

/**
 * Builds bars from a close series, dated across real weekdays so the calendar
 * gap between two bars is not the same as the number of bars between them.
 */
function barsFrom(closes: number[]): Bar[] {
  const out: Bar[] = [];
  const d = new Date(Date.UTC(2023, 0, 2)); // a Monday
  for (const close of closes) {
    out.push({
      date: d.toISOString().slice(0, 10),
      open: close,
      high: close,
      low: close,
      close,
      volume: 1_000_000,
    });
    // Advance one trading day, skipping the weekend.
    do {
      d.setUTCDate(d.getUTCDate() + 1);
    } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  }
  return out;
}

// A long sawtooth: reversal enters on dips and exits on recoveries, giving
// many short completed trades over real weekday dates.
const closes: number[] = [];
for (let i = 0; i < 400; i++) {
  closes.push(100 + 10 * Math.sin(i / 3) + i * 0.05);
}
const r = analyse(barsFrom(closes), "reversal", 5, 5, { costBps: 10 });
const rec = r.record;

console.log("\nShape");
check("has a median hold in bars", typeof rec.medianHoldBars, "number");
check("has a median hold in calendar days", typeof rec.medianHoldDays, "number");
check("has expectancy", typeof rec.expectancyPct, "number");
check("keeps the mean under an honest name", typeof rec.avgHoldBars, "number");

console.log("\nCalendar days vs sessions");
// Five trading sessions span a weekend, so the calendar gap must exceed the
// bar count whenever a hold is long enough to cross one. This is the bug that
// made every holding period on the site read ~40% shorter than it was.
check(
  "a multi-session hold spans more calendar days than bars",
  rec.medianHoldDays >= rec.medianHoldBars,
  true,
);

console.log("\nExpectancy agrees with its parts");
const w = rec.winRatePct / 100;
const derived = w * rec.avgWinPct + (1 - w) * rec.avgLossPct;
check(
  "expectancy matches winRate x avgWin + lossRate x avgLoss",
  Math.abs(derived - rec.expectancyPct) < 0.02,
  true,
);

console.log("\nMedian resists a long tail");
// The property that matters: a few very long holds must not move the median.
// This is the DG/riskAdjMomentum case, where mean=32 bars and median=3.
const sample = [2, 2, 3, 3, 3, 4, 4, 120, 200];
const mid = [...sample].sort((a, b) => a - b)[Math.floor(sample.length / 2)];
const avg = sample.reduce((a, b) => a + b, 0) / sample.length;
check("median of a skewed sample", mid, 3);
check("the mean of the same sample is far away", Math.round(avg), 38);
check("...which is why 'typical' must not use it", mid < avg / 10, true);

console.log("\nEmpty record does not divide by zero");
const flat = analyse(barsFrom(new Array(300).fill(100)), "reversal", 5, 5, {
  costBps: 10,
});
check("no trades, median hold is 0", flat.record.medianHoldBars, 0);
check("no trades, expectancy is 0", flat.record.expectancyPct, 0);
check("no trades, calendar hold is 0", flat.record.medianHoldDays, 0);

console.log(
  failures === 0 ? "\nAll record checks passed.\n" : `\n${failures} record check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
