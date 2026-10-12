/**
 * Weekly implied-vol history for the universe, from DoltHub's public
 * post-no-preference/options database (CC BY-SA 4.0).
 *
 * Weekly, not daily: the public SQL API caps results at 1,000 rows and takes
 * 30-45 s a query, so a daily pull is an all-day job. The cross-sectional
 * option studies this research leans on (Goyal & Saretto and successors) use
 * monthly or weekly snapshots, so weekly loses nothing they rely on.
 *
 * Coverage starts mid-2020 for this universe; some days are missing from the
 * source, so each week tries Wednesday, then Thursday, then Tuesday.
 *
 *   RESEARCH_CACHE=... node scripts/research/fetch-iv.mts
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { cacheDir, universe } from "./fetch.mts";

const API = "https://www.dolthub.com/api/v1alpha1/post-no-preference/options/master";
const OUT = resolve(cacheDir(), "iv_weekly.json");

export type IvRow = { date: string; symbol: string; iv: number; hv: number; ivWeekAgo: number | null; ivMonthAgo: number | null };

const toDolt = (s: string) => s.replace("-", ".");
const fromDolt = (s: string) => s.replace(".", "-");

async function query(sql: string): Promise<Record<string, string>[] | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API}?q=${encodeURIComponent(sql)}`, { signal: AbortSignal.timeout(75_000) });
      const j = (await res.json()) as { query_execution_status: string; rows?: Record<string, string>[] };
      if (j.query_execution_status === "Success") return j.rows ?? [];
    } catch {
      // timeout or network: retry after a pause
    }
    await new Promise((r) => setTimeout(r, 5_000 * (attempt + 1)));
  }
  return null;
}

if (process.argv[1].endsWith("fetch-iv.mts")) {
  const syms = universe().map((s) => `'${toDolt(s)}'`).join(",");
  const have: IvRow[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
  const done = new Set(have.map((r) => r.date));

  const weeks: Date[] = [];
  for (let d = new Date(Date.UTC(2020, 4, 6)); d < new Date(Date.UTC(2026, 9, 10)); d.setUTCDate(d.getUTCDate() + 7)) weeks.push(new Date(d));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return iso(x); };

  const queue = weeks.filter((w) => ![0, 1, -1].some((n) => done.has(shift(w, n))));
  let n = 0;
  const failed: string[] = [];
  const worker = async () => {
    for (;;) {
      const w = queue.shift();
      if (!w) return;
      let got: IvRow[] = [];
      for (const off of [0, 1, -1]) {
        const date = shift(w, off);
        const rows = await query(
          `SELECT date, act_symbol, iv_current, hv_current, iv_week_ago, iv_month_ago FROM volatility_history WHERE date='${date}' AND act_symbol IN (${syms})`,
        );
        if (rows && rows.length) {
          got = rows.map((r) => ({
            date: String(r.date).slice(0, 10),
            symbol: fromDolt(r.act_symbol),
            iv: Number(r.iv_current),
            hv: Number(r.hv_current),
            ivWeekAgo: r.iv_week_ago == null ? null : Number(r.iv_week_ago),
            ivMonthAgo: r.iv_month_ago == null ? null : Number(r.iv_month_ago),
          }));
          break;
        }
      }
      if (got.length) have.push(...got);
      else failed.push(iso(w));
      if (++n % 10 === 0) {
        writeFileSync(OUT, JSON.stringify(have));
        console.log(`  ${n}/${weeks.length} weeks, ${have.length} rows`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  writeFileSync(OUT, JSON.stringify(have));
  console.log(`done: ${have.length} rows over ${new Set(have.map((r) => r.date)).size} weeks; no data for ${failed.length} weeks`);
}
