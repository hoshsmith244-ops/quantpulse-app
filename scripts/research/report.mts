/**
 * Reads train.json + test.json and reports, per factor:
 *
 *   - the app's current setting vs the pre-registered selection, on the test
 *     window the selection never saw
 *   - how much the selection flattered itself (train vs test)
 *   - whether train performance predicts test performance AT ALL across the
 *     grid. If that rank correlation is near zero, the ranking is noise and the
 *     honest conclusion is that tuning this factor does not work.
 *
 *   node scripts/research/report.mts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve(import.meta.dirname, "results");
const train = JSON.parse(readFileSync(resolve(OUT, "train.json"), "utf8"));
const test = JSON.parse(readFileSync(resolve(OUT, "test.json"), "utf8"));
const selection: Record<string, { key: string; baseline: string }> = test.selection.selection;

type S = {
  excessAnn: number;
  tStat: number;
  trades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  medianHold: number;
  beatHoldShare: number;
  exposure: number;
};

function spearman(xs: number[], ys: number[]) {
  const rank = (v: number[]) => {
    const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array(v.length);
    idx.forEach(([, i], k) => (r[i] = k));
    return r;
  };
  const a = rank(xs);
  const b = rank(ys);
  const n = xs.length;
  const ma = a.reduce((x: number, y: number) => x + y, 0) / n;
  const mb = b.reduce((x: number, y: number) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

const fmt = (v: number, d = 1) => (v >= 0 ? "+" : "") + v.toFixed(d);
const row = (label: string, s: S) =>
  `  ${label.padEnd(10)} excess ${fmt(s.excessAnn).padStart(6)}%/yr  t ${fmt(s.tStat, 2).padStart(6)}  ` +
  `trades ${String(s.trades).padStart(6)}  win ${s.winRate.toFixed(0).padStart(3)}%  ` +
  `avgW ${fmt(s.avgWin).padStart(5)}  avgL ${fmt(s.avgLoss).padStart(6)}  ` +
  `per-trade ${fmt(s.expectancy, 2).padStart(6)}%  hold ${String(s.medianHold).padStart(3)}  ` +
  `beats-hold ${s.beatHoldShare.toFixed(0).padStart(3)}%  in-mkt ${s.exposure.toFixed(0).padStart(2)}%`;

console.log(`train windows ending ${train.ends.join(", ")}`);
console.log(`test window ending ${test.ends[0]}, selection committed ${test.selection.committedAt}\n`);

for (const [factor, { key, baseline }] of Object.entries(selection)) {
  const keys = Object.keys(train.results).filter((k) => train.results[k].factor === factor);
  const trainT = keys.map((k) => train.results[k].pooled.tStat);
  const testX = keys.map((k) => test.results[k].pooled.excessAnn);
  const rho = spearman(trainT, testX);

  const base = { train: train.results[baseline].pooled as S, test: test.results[baseline].pooled as S };
  const pick = { train: train.results[key].pooled as S, test: test.results[key].pooled as S };

  const beatBaseTest = keys.filter((k) => test.results[k].pooled.excessAnn > base.test.excessAnn).length;
  const consistent = keys.filter((k) => train.results[k].windows.every((w: S) => w.excessAnn > 0)).length;

  console.log(`=== ${factor} ===`);
  console.log(`  current : ${baseline}`);
  console.log(`  selected: ${key}`);
  console.log(`  grid: ${keys.length} configs, ${consistent} positive in all 3 train windows`);
  console.log(`  does train rank predict test? spearman(train t, test excess) = ${fmt(rho, 2)}`);
  console.log(`  ${beatBaseTest}/${keys.length} configs beat the current setting on test`);
  console.log("  TRAIN");
  console.log(row("current", base.train));
  console.log(row("selected", pick.train));
  console.log("  TEST (never seen by the selection)");
  console.log(row("current", base.test));
  console.log(row("selected", pick.test));
  console.log(
    `  optimism gap (selected): train ${fmt(pick.train.excessAnn)} -> test ${fmt(pick.test.excessAnn)} %/yr`,
  );
  console.log(
    `  VERDICT: ${pick.test.excessAnn > base.test.excessAnn ? "selected beats current on test" : "KEEP CURRENT -- selection did not hold up"}\n`,
  );
}
