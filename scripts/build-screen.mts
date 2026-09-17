/**
 * Builds the screener dataset: public/screen.json
 *
 * Runs the SAME engine the terminal runs — three years of daily bars, each
 * factor at its DEFAULT parameter, a five-day horizon, the default 10 bps
 * round-trip cost — across the whole universe, then attaches a snapshot of
 * each ticker's fundamentals.
 *
 * Two rules this file exists to enforce:
 *
 * 1. No parameter sweeping to find winners. Searching the grid for the best
 *    setting is the curve fit this project argues against, and a result found
 *    that way would not reproduce when the ticker is opened in the terminal.
 *    Every number here is reproducible by typing the ticker into the app.
 *
 * 2. Fundamentals are a filter on WHICH NAMES YOU LOOK AT, never an input to
 *    the backtest. They are today's values — today's P/E did not exist three
 *    years ago, so folding them into a three-year simulation would be
 *    lookahead bias of the most basic kind. They narrow the universe; the
 *    strategy statistics are computed on price alone.
 *
 * Run after the close; the daily bars only move once a day.
 *
 *   node scripts/build-screen.mts
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import YahooFinance from "yahoo-finance2";

import {
  DEFAULT_COST_BPS,
  FACTORS,
  analyse,
  getFactor,
  tune,
  verdict,
  type FactorId,
} from "../src/lib/alpha.ts";
import type { Bar } from "../src/lib/types.ts";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false },
});

/** A pessimistic cost, used only to ask whether an edge survives one. */
const STRESS_COST_BPS = 25;
/** Parameter neighbourhood probed for fragility, as a fraction of the default. */
const NEIGHBOUR_SHIFT = 0.2;

const UNIVERSE = [
  // Technology
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "AVGO", "ORCL", "CRM",
  "ADBE", "AMD", "INTC", "QCOM", "TXN", "MU", "AMAT", "LRCX", "KLAC", "ADI",
  "NOW", "INTU", "PANW", "SNPS", "CDNS", "ANET", "DELL", "HPQ", "IBM", "CSCO",
  "ACN", "UBER", "ABNB", "SHOP", "PLTR", "SNOW", "CRWD", "DDOG", "NET", "MDB",
  "TEAM", "WDAY",
  // Communication services
  "NFLX", "DIS", "CMCSA", "T", "VZ", "TMUS", "EA", "WBD",
  // Financials
  "BRK-B", "JPM", "BAC", "WFC", "GS", "MS", "C", "SCHW", "BLK", "AXP", "V",
  "MA", "PYPL", "SPGI", "CB", "PGR", "MMC", "AIG", "COF", "USB", "PNC", "TFC",
  // Healthcare
  "LLY", "UNH", "JNJ", "ABBV", "MRK", "PFE", "TMO", "ABT", "DHR", "AMGN",
  "BMY", "GILD", "VRTX", "REGN", "ISRG", "SYK", "BSX", "MDT", "CVS", "CI",
  "ELV", "MCK", "ZTS",
  // Consumer
  "WMT", "COST", "PG", "KO", "PEP", "PM", "MO", "MDLZ", "CL", "KMB", "GIS",
  "K", "SYY", "KR", "HD", "LOW", "MCD", "SBUX", "NKE", "TJX", "BKNG", "CMG",
  "YUM", "ORLY", "AZO", "ROST", "DG", "TGT", "F", "GM", "RIVN",
  // Industrials
  "CAT", "DE", "BA", "GE", "HON", "UNP", "CSX", "NSC", "LMT", "RTX", "NOC",
  "GD", "MMM", "EMR", "ETN", "ITW", "PH", "CMI", "FDX", "UPS", "WM",
  // Energy
  "XOM", "CVX", "COP", "EOG", "SLB", "PSX", "VLO", "MPC", "OXY", "KMI", "WMB",
  // Materials, utilities, real estate
  "LIN", "APD", "SHW", "FCX", "NEM", "NUE", "DOW", "NEE", "DUK", "SO", "D",
  "AEP", "EXC", "SRE", "AMT", "PLD", "CCI", "EQIX", "SPG", "O", "VICI",
  // ETFs
  "SPY", "QQQ", "IWM", "DIA", "VTI", "XLF", "XLE", "XLK", "XLV", "XLU", "XLP",
  "XLI", "XLY", "XLB", "XLRE", "XLC", "SMH", "ARKK", "GLD", "SLV", "TLT",
  "IEF", "HYG", "LQD", "EEM", "EFA", "VNQ", "USO",
  // Crypto
  "BTC-USD", "ETH-USD", "SOL-USD",
];

type Fundamentals = {
  name: string;
  kind: string;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  /** percent */
  divYield: number | null;
  beta: number | null;
  priceToBook: number | null;
  /** percent */
  profitMargin: number | null;
  /** percent */
  revenueGrowth: number | null;
  avgVolume: number | null;
  price: number;
  bars: number;
};

/** Mirrors fetchHistory() in src/lib/market.ts, without the server-only guard. */
async function fetchBars(symbol: string) {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 3);

  const res = await yf.chart(symbol, {
    period1: period1.toISOString().slice(0, 10),
    interval: "1d",
  });

  const tz = res.meta.exchangeTimezoneName || "UTC";
  const bars: Bar[] = res.quotes
    .filter(
      (q) => q.close != null && q.open != null && q.high != null && q.low != null,
    )
    .map((q) => ({
      date: new Date(q.date).toLocaleDateString("en-CA", { timeZone: tz }),
      open: q.open as number,
      high: q.high as number,
      low: q.low as number,
      close: q.close as number,
      volume: q.volume ?? 0,
    }));

  if (bars.length < 260) throw new Error("too few bars");

  return {
    bars,
    name: res.meta.longName ?? res.meta.shortName ?? symbol,
    kind: res.meta.instrumentType ?? "EQUITY",
  };
}

/** Best-effort. A missing field stays null and the filters treat it as unknown. */
async function fetchFundamentals(symbol: string) {
  try {
    const r = await yf.quoteSummary(symbol, {
      modules: ["price", "summaryDetail", "defaultKeyStatistics", "assetProfile", "financialData"],
    });
    const pct = (v: number | undefined | null) =>
      typeof v === "number" && Number.isFinite(v) ? round(v * 100, 2) : null;
    const num = (v: number | undefined | null) =>
      typeof v === "number" && Number.isFinite(v) ? round(v, 2) : null;

    return {
      kind: r.price?.quoteType ?? null,
      sector: r.assetProfile?.sector ?? null,
      industry: r.assetProfile?.industry ?? null,
      marketCap: r.price?.marketCap ?? null,
      // A negative trailing P/E is not a low valuation, it is no earnings.
      pe: (r.summaryDetail?.trailingPE ?? 0) > 0 ? num(r.summaryDetail?.trailingPE) : null,
      forwardPe: (r.summaryDetail?.forwardPE ?? 0) > 0 ? num(r.summaryDetail?.forwardPE) : null,
      divYield: pct(r.summaryDetail?.dividendYield),
      beta: num(r.summaryDetail?.beta),
      priceToBook: num(r.defaultKeyStatistics?.priceToBook),
      profitMargin: pct(r.defaultKeyStatistics?.profitMargins),
      revenueGrowth: pct(r.financialData?.revenueGrowth),
      avgVolume: r.summaryDetail?.averageVolume ?? null,
    };
  } catch {
    return null;
  }
}

const round = (v: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

type Row = {
  s: string;
  f: FactorId;
  p: number;
  /** verdict level */
  lvl: string;
  ic: number;
  t: number;
  /** completed trades */
  n: number;
  win: number;
  ret: number;
  bh: number;
  sharpe: number;
  dd: number;
  exp: number;
  state: "in" | "out";
  /** walk-forward, this same parameter on the held-out window */
  oos: number | null;
  oosBh: number | null;
  /** still beats holding at 25 bps */
  costOk: boolean;
  /** still beats holding at the default parameter +/- 20% */
  nbrOk: boolean;
};

const tickers: Record<string, Fundamentals> = {};
const rows: Row[] = [];
const failed: string[] = [];
/** Per-symbol last bar date; the headline date is derived from equities only. */
const lastBar: Record<string, string> = {};

const queue = [...UNIVERSE];
let done = 0;

const worker = async () => {
  for (;;) {
    const symbol = queue.shift();
    if (!symbol) return;

    let hist;
    try {
      hist = await fetchBars(symbol);
    } catch {
      failed.push(symbol);
      continue;
    }

    const fund = await fetchFundamentals(symbol);
    const { bars } = hist;
    const last = bars[bars.length - 1];
    lastBar[symbol] = last.date;

    tickers[symbol] = {
      name: hist.name,
      kind: fund?.kind ?? hist.kind,
      sector: fund?.sector ?? null,
      industry: fund?.industry ?? null,
      marketCap: fund?.marketCap ?? null,
      pe: fund?.pe ?? null,
      forwardPe: fund?.forwardPe ?? null,
      divYield: fund?.divYield ?? null,
      beta: fund?.beta ?? null,
      priceToBook: fund?.priceToBook ?? null,
      profitMargin: fund?.profitMargin ?? null,
      revenueGrowth: fund?.revenueGrowth ?? null,
      avgVolume: fund?.avgVolume ?? null,
      price: round(last.close, 2),
      bars: bars.length,
    };

    for (const f of FACTORS) {
      // newsSentiment needs an Alpha Vantage series per ticker, which is rate
      // limited well below a universe scan. It stays a terminal-only factor.
      if (f.external) continue;

      const r = analyse(bars, f.id, f.def, 5, { costBps: DEFAULT_COST_BPS });
      const v = verdict(r);
      const bh = r.strategy.buyHoldReturnPct;

      // Robustness. Asked of every row, not just the winners, so the screener
      // can be filtered on it without a second pass.
      const meta = getFactor(f.id);
      const clamp = (p: number) =>
        Math.min(meta.max, Math.max(meta.min, Math.round(p)));
      const lo = clamp(meta.def * (1 - NEIGHBOUR_SHIFT));
      const hi = clamp(meta.def * (1 + NEIGHBOUR_SHIFT));

      const pricey = analyse(bars, f.id, f.def, 5, { costBps: STRESS_COST_BPS });
      const down = analyse(bars, f.id, lo, 5, { costBps: DEFAULT_COST_BPS });
      const up = analyse(bars, f.id, hi, 5, { costBps: DEFAULT_COST_BPS });

      let oos: number | null = null;
      let oosBh: number | null = null;
      if (v.level === "promising" || v.level === "mixed") {
        const t = tune(bars, f.id, f.def, { costBps: DEFAULT_COST_BPS });
        if (t?.current) {
          oos = round(t.current.testPct);
          oosBh = round(t.testBuyHoldPct);
        }
      }

      rows.push({
        s: symbol,
        f: f.id,
        p: f.def,
        lvl: v.level,
        ic: round(r.ic, 3),
        t: round(r.icTStat, 2),
        n: r.record.completed,
        win: round(r.record.winRatePct, 0),
        ret: round(r.strategy.totalReturnPct),
        bh: round(bh),
        sharpe: round(r.strategy.sharpe, 2),
        dd: round(r.strategy.maxDrawdownPct),
        exp: round(r.strategy.exposurePct, 0),
        state: r.signal.state,
        oos,
        oosBh,
        costOk: pricey.strategy.totalReturnPct > bh,
        nbrOk:
          down.strategy.totalReturnPct > bh && up.strategy.totalReturnPct > bh,
      });
    }

    done++;
    if (done % 20 === 0) {
      process.stderr.write(`  ...${done}/${UNIVERSE.length}\n`);
    }
  }
};

const t0 = Date.now();
await Promise.all(Array.from({ length: 6 }, worker));

rows.sort((a, b) => b.ret - b.bh - (a.ret - a.bh));

const counts = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.lvl] = (acc[r.lvl] ?? 0) + 1;
  return acc;
}, {});

/**
 * The headline date is a US equity session, not the newest bar anywhere.
 * Crypto trades through the weekend and its bars are dated in UTC, so taking
 * the maximum would label the whole screen with tomorrow's date whenever the
 * scan runs after 8pm New York.
 */
const asOf =
  lastBar.SPY ??
  lastBar.QQQ ??
  Object.entries(lastBar)
    .filter(([s]) => !s.endsWith("-USD"))
    .map(([, d]) => d)
    .sort()
    .pop() ??
  "";

const payload = {
  generatedAt: new Date().toISOString(),
  asOf,
  years: 3,
  horizon: 5,
  costBps: DEFAULT_COST_BPS,
  stressCostBps: STRESS_COST_BPS,
  neighbourShift: NEIGHBOUR_SHIFT,
  universe: Object.keys(tickers).length,
  pairs: rows.length,
  counts,
  failed,
  tickers,
  rows,
};

const out = resolve(import.meta.dirname, "../public/screen.json");
writeFileSync(out, JSON.stringify(payload));

const size = (JSON.stringify(payload).length / 1024).toFixed(0);
console.log(
  `\n${rows.length} pairs across ${payload.universe} tickers in ${((Date.now() - t0) / 1000).toFixed(0)}s`,
);
console.log(`verdicts: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join("  ")}`);
if (failed.length) console.log(`no data: ${failed.join(", ")}`);
console.log(`wrote ${out} (${size} KB, as of ${asOf})`);
