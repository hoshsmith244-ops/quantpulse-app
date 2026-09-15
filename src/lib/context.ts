import "server-only";

import YahooFinance from "yahoo-finance2";

/**
 * Live market context: the extended-hours price, and what has been published
 * recently.
 *
 * This deliberately sits BESIDE the algorithm, never inside it.
 *
 * The strategy signal is computed from daily closes. Anything that happens
 * after the close — an earnings release, a downgrade, a lawsuit — is invisible
 * to it until tomorrow's bar exists. The job here is to say so plainly, not to
 * adjust the maths.
 *
 * Two things this module will not do:
 *   - Feed news into the backtest. Yahoo returns roughly half a day of
 *     headlines, so there is nothing to fit or validate against three years of
 *     prices, and mixing today's news into a historical simulation is textbook
 *     lookahead bias.
 *   - Claim a headline caused a move. Timestamps near each other are a
 *     coincidence until proven otherwise; the UI presents them as context.
 */

import type { MarketContext, NewsItem, Session } from "./symbols";

export type { MarketContext, NewsItem, Session };

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false },
});

/** Yahoo reports PRE/PREPRE/REGULAR/POST/POSTPOST/CLOSED. */
function toSession(raw: string | undefined): Session {
  switch (raw) {
    case "PRE":
    case "PREPRE":
      return "pre";
    case "REGULAR":
      return "regular";
    case "POST":
      return "post";
    default:
      return "closed";
  }
}

function toMs(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v > 1e11 ? v : v * 1000;
  return null;
}

export async function fetchContext(symbol: string): Promise<MarketContext> {
  const [quoteRes, newsRes] = await Promise.allSettled([
    yf.quote(symbol),
    yf.search(symbol, { newsCount: 10, quotesCount: 0 }),
  ]);

  let session: Session = "closed";
  let timezone = "";
  let regular: MarketContext["regular"] = null;
  let extended: MarketContext["extended"] = null;

  if (quoteRes.status === "fulfilled") {
    const q = quoteRes.value as Record<string, unknown>;
    session = toSession(q.marketState as string | undefined);
    timezone = (q.exchangeTimezoneShortName as string) ?? "";

    const regPrice = q.regularMarketPrice as number | undefined;
    const regAt = toMs(q.regularMarketTime);
    if (typeof regPrice === "number") {
      regular = {
        price: regPrice,
        changePct: (q.regularMarketChangePercent as number) ?? 0,
        at: regAt ?? Date.now(),
      };
    }

    // Prefer whichever extended session actually has a print.
    const postPrice = q.postMarketPrice as number | undefined;
    const prePrice = q.preMarketPrice as number | undefined;

    if (typeof postPrice === "number") {
      extended = {
        price: postPrice,
        changePct: (q.postMarketChangePercent as number) ?? 0,
        at: toMs(q.postMarketTime) ?? Date.now(),
        session: "post",
      };
    } else if (typeof prePrice === "number") {
      extended = {
        price: prePrice,
        changePct: (q.preMarketChangePercent as number) ?? 0,
        at: toMs(q.preMarketTime) ?? Date.now(),
        session: "pre",
      };
    }
  }

  const driftPct =
    extended && regular && regular.price > 0
      ? ((extended.price - regular.price) / regular.price) * 100
      : null;

  const closeAt = regular?.at ?? 0;
  let news: NewsItem[] = [];

  if (newsRes.status === "fulfilled") {
    const raw = (newsRes.value as { news?: Array<Record<string, unknown>> })
      .news;
    news = (raw ?? [])
      .map((n, i) => {
        const publishedAt = toMs(n.providerPublishTime) ?? 0;
        return {
          id: (n.uuid as string) ?? `n${i}`,
          title: (n.title as string) ?? "",
          publisher: (n.publisher as string) ?? "",
          link: (n.link as string) ?? "",
          publishedAt,
          afterClose: closeAt > 0 && publishedAt > closeAt,
        };
      })
      .filter((n) => n.title && n.publishedAt > 0)
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, 8);
  }

  return {
    symbol,
    session,
    timezone,
    regular,
    extended,
    driftPct,
    news,
  };
}

