/**
 * Proves the research engine IS the app's rule before any result is trusted.
 *
 * With the app's settings, every ticker and every factor must give the same
 * equity curve and the same trade list as `analyse()` in src/lib/alpha.ts. A
 * research engine that drifts from the shipped code produces conclusions about
 * a strategy nobody is running.
 *
 *   node scripts/research/validate.mts <cacheDir>
 */

import { analyse, FACTORS } from "../../src/lib/alpha.ts";

import { APP_RULE, prepare, simulate, WINDOW_BARS } from "./engine.mts";
import { loadAll } from "./fetch.mts";

const series = loadAll().filter((s) => s.bars.length >= WINDOW_BARS);
let checked = 0;
let mismatches = 0;

for (const s of series) {
  const bars = s.bars.slice(-WINDOW_BARS);
  for (const f of FACTORS) {
    if (f.external) continue;
    const app = analyse(bars, f.id, f.def, 5, { costBps: APP_RULE.costBps });
    const { ranks, trendMa } = prepare(bars, f.id, f.def);
    const sim = simulate(bars, ranks, APP_RULE, trendMa);

    // The app records each bar's curve point BEFORE charging that bar's flip
    // cost, so its curve shows the cost one bar late. Compare like with like:
    // equity through the previous bar, times this bar's market move only.
    let equity = 1;
    let worst = 0;
    for (let i = 0; i < bars.length; i++) {
      const move = i > 0 && sim.heldInto[i] ? bars[i].close / bars[i - 1].close : 1;
      worst = Math.max(worst, Math.abs(equity * move - app.curve[i].strategy));
      equity *= sim.stratFactor[i];
    }
    // And the final figure the page reports, which includes every cost.
    worst = Math.max(worst, Math.abs((equity - 1) * 100 - app.strategy.totalReturnPct) / 100);
    const appTrades = app.trades.map((t) => `${t.entryDate}|${t.exitDate}|${t.returnPct.toFixed(6)}`);
    const simTrades = sim.trades.map(
      (t) =>
        `${bars[t.entry].date}|${t.exit === null ? null : bars[t.exit].date}|${t.returnPct.toFixed(6)}`,
    );
    const sameTrades = JSON.stringify(appTrades) === JSON.stringify(simTrades);

    checked++;
    if (worst > 1e-9 || !sameTrades) {
      mismatches++;
      if (mismatches <= 5) {
        console.log(
          `MISMATCH ${s.symbol}/${f.id}: max equity gap ${worst.toExponential(2)}, trades ${appTrades.length} vs ${simTrades.length}, same=${sameTrades}`,
        );
      }
    }
  }
}

console.log(`${checked} ticker/factor pairs checked, ${mismatches} mismatches`);
process.exit(mismatches === 0 ? 0 : 1);
