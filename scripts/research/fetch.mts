/**
 * Downloads long daily history for the strategy research.
 *
 * Eleven years rather than the app's three, because honest tuning needs data
 * the tuner never sees. The research chooses settings on the older years and
 * judges them only on the recent ones -- the same window the app displays --
 * so every number a user reads was produced by settings chosen without it.
 *
 * Bar hygiene matches the app exactly (same timezone dating, same in-progress
 * bar removal), otherwise conclusions would not transfer to what users see.
 *
 * Cached to disk: a rerun of the research should not re-download 286 tickers.
 *
 *   node scripts/research/fetch.mts [cacheDir]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import YahooFinance from "yahoo-finance2";

import { dropInProgressBar } from "../../src/lib/bars.ts";
import type { Bar } from "../../src/lib/types.ts";

export const YEARS = 11;

/** Set RESEARCH_CACHE; only this file's own CLI also accepts the path as an argument. */
export function cacheDir(): string {
  return resolve(process.env.RESEARCH_CACHE ?? ".research-cache");
}

/** The screener universe, minus crypto: a 24-hour market has no closing auction. */
export function universe(): string[] {
  const src = readFileSync(resolve(import.meta.dirname, "../build-screen.mts"), "utf8");
  const block = src.match(/const UNIVERSE = \[([\s\S]*?)\n\];/);
  if (!block) throw new Error("UNIVERSE not found in build-screen.mts");
  return [...block[1].matchAll(/"([A-Z0-9.\-]+)"/g)]
    .map((m) => m[1])
    .filter((s) => !s.endsWith("-USD"));
}

export type Series = { symbol: string; kind: string; bars: Bar[] };

export function loadAll(dir = cacheDir()): Series[] {
  const out: Series[] = [];
  for (const symbol of universe()) {
    const file = resolve(dir, `${symbol}.json`);
    if (existsSync(file)) out.push(JSON.parse(readFileSync(file, "utf8")));
  }
  return out;
}

async function main() {
  const dir = process.argv[2] ? resolve(process.argv[2]) : cacheDir();
  mkdirSync(dir, { recursive: true });

  const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - YEARS);

  const queue = universe().filter((s) => !existsSync(resolve(dir, `${s}.json`)));
  const failed: string[] = [];
  let done = 0;
  const total = queue.length;

  const worker = async () => {
    for (;;) {
      const symbol = queue.shift();
      if (!symbol) return;
      try {
        const res = await yf.chart(symbol, {
          period1: period1.toISOString().slice(0, 10),
          interval: "1d",
        });
        const tz = res.meta.exchangeTimezoneName || "UTC";
        const bars: Bar[] = res.quotes
          .filter((q) => q.close != null && q.open != null && q.high != null && q.low != null)
          .map((q) => ({
            date: new Date(q.date).toLocaleDateString("en-CA", { timeZone: tz }),
            open: q.open as number,
            high: q.high as number,
            low: q.low as number,
            close: q.close as number,
            volume: q.volume ?? 0,
          }));
        dropInProgressBar(bars, res.meta, tz);
        const series: Series = { symbol, kind: res.meta.instrumentType ?? "EQUITY", bars };
        writeFileSync(resolve(dir, `${symbol}.json`), JSON.stringify(series));
      } catch {
        failed.push(symbol);
      }
      done++;
      if (done % 25 === 0) process.stderr.write(`  ...${done}/${total}\n`);
    }
  };

  await Promise.all(Array.from({ length: 6 }, worker));
  const have = loadAll(dir);
  console.log(`cached ${have.length} series in ${dir}`);
  if (failed.length) console.log(`failed: ${failed.join(", ")}`);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("fetch.mts")) {
  await main();
}
