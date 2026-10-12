/**
 * Implied-volatility index history for the options research.
 *
 * Free historical implied vol barely exists. CBOE's volatility indices are the
 * exception, and Yahoo carries eleven years of six of them -- each the market's
 * implied vol for an underlying already in the universe. Single-stock vol
 * indices (VXAPL, VXGS, ...) return only today's value, so implied vol on
 * individual stocks cannot be studied historically without paid data.
 *
 *   RESEARCH_CACHE=... node scripts/research/fetch-vol.mts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import YahooFinance from "yahoo-finance2";

import { cacheDir } from "./fetch.mts";

/** Index -> the ETF it prices, and the horizon in calendar days. */
export const VOL_INDICES = {
  "^VIX": { underlying: "SPY", days: 30 },
  "^VIX9D": { underlying: "SPY", days: 9 },
  "^VXN": { underlying: "QQQ", days: 30 },
  "^VXD": { underlying: "DIA", days: 30 },
  "^GVZ": { underlying: "GLD", days: 30 },
  "^OVX": { underlying: "USO", days: 30 },
} as const;

export type VolPoint = { date: string; iv: number };

if (process.argv[1].endsWith("fetch-vol.mts")) {
  const dir = cacheDir();
  mkdirSync(dir, { recursive: true });
  const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  const p1 = new Date();
  p1.setFullYear(p1.getFullYear() - 11);
  for (const sym of Object.keys(VOL_INDICES)) {
    const r = await yf.chart(sym, { period1: p1.toISOString().slice(0, 10), interval: "1d" });
    // Index levels are dated in New York like the ETFs they price.
    const pts: VolPoint[] = r.quotes
      .filter((q) => q.close != null)
      .map((q) => ({
        date: new Date(q.date).toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
        iv: (q.close as number) / 100,
      }));
    writeFileSync(resolve(dir, `vol_${sym.replace("^", "")}.json`), JSON.stringify(pts));
    console.log(`${sym}: ${pts.length} days`);
  }
}
