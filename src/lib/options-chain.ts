import "server-only";

import YahooFinance from "yahoo-finance2";

import type { ExpiryChain, OptionQuote, OptionsSnapshot } from "./options";

/**
 * Live option chains from Yahoo Finance.
 *
 * One request fans out to several Yahoo calls: the expiry list, one chain per
 * expiry we keep, and the earnings calendar. The route caches the result for a
 * few minutes at the edge, so a page refresh does not repeat them.
 *
 * Yahoo's option quotes are delayed roughly 15 minutes and go one-sided after
 * the close. Everything downstream treats a zero bid as "no quote" rather than
 * as a price.
 */

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false },
});

export class NoOptions extends Error {
  constructor(symbol: string) {
    super(`No listed options for "${symbol}".`);
    this.name = "NoOptions";
  }
}

/** Expiries within this many days are kept; enough for weeklies and two monthlies. */
const MAX_DAYS = 75;
const MAX_EXPIRIES = 6;
/** Strikes further than this from spot are dropped; nothing here uses them. */
const STRIKE_BAND = 0.3;
/**
 * And at most this many per side, nearest the money first. SPY lists $1
 * strikes, so the band alone left 240 per expiry and a 160 KB response.
 */
const MAX_STRIKES = 60;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Calendar days until the 4pm New York close on the expiry date. Close enough
 * across daylight saving for pricing a 30-day option.
 */
function daysTo(expiration: Date, now: number) {
  const close = Date.parse(`${iso(expiration)}T20:30:00Z`);
  return Math.max(0.1, (close - now) / 86_400_000);
}

type YahooContract = {
  strike: number;
  bid?: number;
  ask?: number;
  lastPrice?: number;
  impliedVolatility?: number;
  openInterest?: number;
  volume?: number;
};

function toQuote(c: YahooContract): OptionQuote {
  return {
    strike: c.strike,
    bid: c.bid ?? 0,
    ask: c.ask ?? 0,
    last: c.lastPrice ?? 0,
    iv: typeof c.impliedVolatility === "number" ? c.impliedVolatility : null,
    openInterest: c.openInterest ?? 0,
    volume: c.volume ?? 0,
  };
}

export async function fetchOptions(symbol: string, now = Date.now()): Promise<OptionsSnapshot> {
  let base;
  try {
    base = await yf.options(symbol, {});
  } catch {
    throw new NoOptions(symbol);
  }
  const spot = base.quote?.regularMarketPrice;
  const dates = (base.expirationDates ?? []) as Date[];
  if (!dates.length || typeof spot !== "number" || !(spot > 0)) throw new NoOptions(symbol);

  const inRange = dates.filter((d) => {
    const days = daysTo(d, now);
    return days >= 0.5 && days <= MAX_DAYS;
  });
  // Keep the nearest few, and always the one closest to 30 days -- the
  // horizon the rich/cheap rule was tested on.
  const near30 = inRange.reduce<Date | null>(
    (a, b) => (a === null || Math.abs(daysTo(b, now) - 30) < Math.abs(daysTo(a, now) - 30) ? b : a),
    null,
  );
  const keep = inRange.slice(0, MAX_EXPIRIES);
  if (near30 && !keep.some((d) => iso(d) === iso(near30))) keep[keep.length - 1] = near30;

  const chains = await Promise.all(
    keep.map(async (d): Promise<ExpiryChain | null> => {
      try {
        const res = await yf.options(symbol, { date: d });
        const o = res.options?.[0];
        if (!o) return null;
        const band = (c: YahooContract) => Math.abs(c.strike / spot - 1) <= STRIKE_BAND;
        const nearest = (list: YahooContract[]) =>
          list
            .filter(band)
            .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))
            .slice(0, MAX_STRIKES)
            .sort((a, b) => a.strike - b.strike)
            .map(toQuote);
        return {
          expiration: iso(d),
          days: Math.round(daysTo(d, now) * 10) / 10,
          calls: nearest(o.calls as YahooContract[]),
          puts: nearest(o.puts as YahooContract[]),
        };
      } catch {
        return null;
      }
    }),
  );

  let earnings: string | null = null;
  try {
    const s = await yf.quoteSummary(symbol, { modules: ["calendarEvents"] });
    const next = (s.calendarEvents?.earnings?.earningsDate ?? [])
      .map((d: Date) => iso(d))
      .filter((d: string) => d >= iso(new Date(now)))
      .sort()[0];
    earnings = next ?? null;
  } catch {
    // ETFs and many funds have no calendar; absence is not an error.
  }

  const expirations = chains
    .filter((c): c is ExpiryChain => c !== null && c.calls.length > 0 && c.puts.length > 0)
    .sort((a, b) => a.days - b.days);
  if (!expirations.length) throw new NoOptions(symbol);

  return {
    symbol,
    spot,
    asOf: now,
    isEtf: base.quote?.quoteType === "ETF",
    earnings,
    expirations,
  };
}
