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
import { DEFAULT_CASH_RATE_PCT, edgeOf } from "../src/lib/edge.ts";
import { dropInProgressBar } from "../src/lib/bars.ts";
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

  // --- Mid and small caps ---------------------------------------------------
  // Without these the market-cap and liquidity filters cannot discriminate:
  // a universe of nothing but mega caps makes "Mid", "Small" and "Thin" return
  // zero rows, which reads as a broken filter rather than an empty slice.
  // These are also where a factor edge is likelier to be real and likelier to
  // be eaten by the spread, which is the trade-off the filters exist to show.
  "CROX", "SKX", "FIVE", "PLNT", "WING", "TXRH", "CAKE", "SHAK", "JACK",
  "AEO", "ANF", "URBN", "M", "KSS", "VSCO", "BOOT",
  "RRC", "AR", "MTDR", "CHRD", "CIVI", "SM", "CNX", "MUR",
  "ALK", "JBLU", "ALGT", "HOG", "THO", "PII", "LCII",
  "AVNT", "ASH", "CBT", "SEE", "OLN", "HUN",
  "GT", "LEA", "ADNT", "DAN",
  "RUN", "ENPH", "SHLS", "ARRY", "FSLR",
  "UPST", "AFRM", "LC", "SOFI", "OPEN", "RDFN",
  "IONQ", "BBAI", "RGTI",
  "PRGS", "DBX", "YELP", "ZI", "PATH", "ASAN", "BOX",
  "NTLA", "BEAM", "CRSP", "SRPT", "HIMS", "OSCR", "CLOV",
  "CATY", "WAFD", "FIBK", "PPBI", "HOPE", "BANR",
  "UMH", "LTC", "GOOD", "NATH", "PTLO",
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
  priceToSales: number | null;
  debtToEquity: number | null;
  /** percent */
  profitMargin: number | null;
  /** percent */
  revenueGrowth: number | null;
  /** percent of float sold short */
  shortPctFloat: number | null;
  avgVolume: number | null;
  /**
   * Average daily traded value in dollars.
   *
   * The single most important filter on this page and the one a conventional
   * screener never has: every backtest here charges a flat 10 bps round trip,
   * which is only a fair assumption on a name that actually trades. On a thin
   * stock the real spread swallows the edge, so the result is fiction.
   */
  dollarVolume: number | null;
  /** annualised standard deviation of daily returns, percent */
  volatility: number | null;
  /** percent below the 52-week high; 0 means sitting at it */
  from52wHigh: number | null;
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

  // Same hygiene as the live fetch: a session still in progress is not a
  // close, and building the whole screen on one would bake phantom entries
  // into every row.
  dropInProgressBar(bars, res.meta, tz);

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
      priceToSales: num(r.summaryDetail?.priceToSalesTrailing12Months),
      debtToEquity: num(r.financialData?.debtToEquity),
      profitMargin: pct(r.defaultKeyStatistics?.profitMargins),
      revenueGrowth: pct(r.financialData?.revenueGrowth),
      shortPctFloat: pct(r.defaultKeyStatistics?.shortPercentOfFloat),
      avgVolume: r.summaryDetail?.averageVolume ?? null,
      fiftyTwoWeekHigh: num(r.summaryDetail?.fiftyTwoWeekHigh),
    };
  } catch {
    return null;
  }
}

/** Annualised standard deviation of daily returns over the last year, percent. */
function annualisedVol(bars: Bar[]): number | null {
  const window = bars.slice(-253);
  if (window.length < 60) return null;

  const rets: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const prev = window[i - 1].close;
    if (prev > 0) rets.push(Math.log(window[i].close / prev));
  }
  if (rets.length < 30) return null;

  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance =
    rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return round(Math.sqrt(variance) * Math.sqrt(252) * 100, 1);
}

/**
 * How far below the 52-week high, in percent.
 *
 * Computed from the bars rather than taken from the quote so it agrees with
 * the prices every other number here is derived from, and so it works for ETFs
 * and crypto where Yahoo's field is patchy.
 */
function from52wHigh(bars: Bar[]): number | null {
  const window = bars.slice(-253);
  if (window.length < 60) return null;
  const high = Math.max(...window.map((b) => b.high));
  if (!(high > 0)) return null;
  return round(((window[window.length - 1].close - high) / high) * 100, 1);
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
  /**
   * When the open position was entered, and how many sessions the rule has
   * been in its current state.
   *
   * "Currently in" on its own is not actionable and is routinely misread as
   * "buy this". A rule that entered forty sessions ago has already captured
   * most of what the backtest measured; buying it today is a different trade
   * from the one that was simulated. Carrying the date is what lets the UI
   * separate a fresh signal from a stale one.
   */
  entry: string | null;
  days: number;
  /** Return on the open position so far, percent. */
  open: number | null;
  /**
   * 0-100, how close the score sits to the entry trigger. Only meaningful
   * while out: it is the difference between "nowhere near" and "one bad day
   * away", which is the whole point of a watchlist.
   */
  prox: number | null;
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

    // Prefer Yahoo's own 3-month average volume; fall back to the bars so ETFs
    // and crypto still get a liquidity figure.
    const avgVolume =
      fund?.avgVolume ??
      (bars.length >= 60
        ? Math.round(
            bars.slice(-60).reduce((a, b) => a + b.volume, 0) / 60,
          )
        : null);

    const kind = fund?.kind ?? hist.kind;

    /**
     * Yahoo reports crypto volume already denominated in USD, while equity and
     * ETF volume is a share count. Multiplying the crypto figure by the price
     * produces a number in the quadrillions — 27 billion "units" of BTC is more
     * than will ever exist, which is how the units give themselves away.
     */
    const dollarVolume =
      avgVolume === null
        ? null
        : kind === "CRYPTOCURRENCY"
          ? Math.round(avgVolume)
          : Math.round(avgVolume * last.close);

    tickers[symbol] = {
      name: hist.name,
      kind,
      sector: fund?.sector ?? null,
      industry: fund?.industry ?? null,
      marketCap: fund?.marketCap ?? null,
      pe: fund?.pe ?? null,
      forwardPe: fund?.forwardPe ?? null,
      divYield: fund?.divYield ?? null,
      beta: fund?.beta ?? null,
      priceToBook: fund?.priceToBook ?? null,
      priceToSales: fund?.priceToSales ?? null,
      debtToEquity: fund?.debtToEquity ?? null,
      profitMargin: fund?.profitMargin ?? null,
      revenueGrowth: fund?.revenueGrowth ?? null,
      shortPctFloat: fund?.shortPctFloat ?? null,
      avgVolume,
      dollarVolume,
      volatility: annualisedVol(bars),
      from52wHigh: from52wHigh(bars),
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
        entry: r.signal.entryDate,
        days: r.signal.daysInState,
        open: r.signal.openReturnPct === null ? null : round(r.signal.openReturnPct),
        prox: r.signal.proximityPct === null ? null : round(r.signal.proximityPct, 0),
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

/**
 * Rank by edge over holding, DISCOUNTED by how much evidence supports it.
 *
 * The previous key was raw `ret - bh`, which put the least trustworthy rows on
 * top: of its ten loudest results, nine had no statistical edge at all and some
 * rested on one or two trades. Sorting by a shrunk edge means a 35%/yr claim
 * from fifteen trades ranks below a 20%/yr claim from sixty, which is the
 * correct ordering of belief.
 */
rows.sort(
  (a, b) =>
    edgeOf(b, 3).score - edgeOf(a, 3).score,
);

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

/**
 * The short rate a strategy has to clear to be worth running.
 *
 * ^IRX is the 13-week Treasury discount rate, quoted in percent. It matters
 * because these rules sit in cash roughly three-quarters of the time: judged
 * against zero, a rule earning 3% a year looks like a win, when in fact it
 * took real drawdown risk to underperform a savings account. Falls back to a
 * fixed default rather than failing the build -- a missing quote should not
 * cost a whole scan.
 */
const cashRatePct = await yf
  .quote("^IRX")
  .then((q) => {
    const v = q?.regularMarketPrice;
    return typeof v === "number" && v > 0 && v < 25 ? round(v, 2) : DEFAULT_CASH_RATE_PCT;
  })
  .catch(() => DEFAULT_CASH_RATE_PCT);

const payload = {
  generatedAt: new Date().toISOString(),
  asOf,
  cashRatePct,
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
