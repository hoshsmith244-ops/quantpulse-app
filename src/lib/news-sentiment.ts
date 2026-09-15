import "server-only";

import type { SentimentSeries } from "./symbols";

/**
 * Daily news sentiment from Alpha Vantage's NEWS_SENTIMENT endpoint.
 *
 * Unlike the five price factors, this one needs an outside provider and an API
 * key, so it is available only when `ALPHAVANTAGE_API_KEY` is set. Without a
 * key the factor is hidden rather than faked.
 *
 * A caveat worth stating plainly: the free tier is rate limited (25 requests a
 * day at time of writing) and one request returns a bounded window of
 * articles. Covering three years of history means paginating backwards through
 * many windows, which the free tier cannot sustain. So on a free key this
 * usually yields a few weeks of coverage — enough to see the factor working,
 * not enough to trust its statistics. `coverageDays` reports what was actually
 * obtained so the UI can say so.
 */

const ENDPOINT = "https://www.alphavantage.co/query";
/** Alpha Vantage caps a single response at 1000 items. */
const LIMIT = 1000;

type AvArticle = {
  time_published?: string;
  overall_sentiment_score?: number | string;
  ticker_sentiment?: Array<{
    ticker?: string;
    relevance_score?: string | number;
    ticker_sentiment_score?: string | number;
  }>;
};

export const sentimentEnabled = () =>
  Boolean(process.env.ALPHAVANTAGE_API_KEY);

/** Alpha Vantage stamps time as YYYYMMDDTHHMMSS. */
function toIsoDate(stamp: string | undefined): string | null {
  if (!stamp || stamp.length < 8) return null;
  const y = stamp.slice(0, 4);
  const m = stamp.slice(4, 6);
  const d = stamp.slice(6, 8);
  if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(m) || !/^\d{2}$/.test(d)) {
    return null;
  }
  return `${y}-${m}-${d}`;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number.parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

export async function fetchSentiment(
  symbol: string,
  years = 3,
): Promise<SentimentSeries> {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) {
    return {
      available: false,
      reason: "no_key",
      message:
        "Set ALPHAVANTAGE_API_KEY to enable the news sentiment factor. A free key takes under a minute at alphavantage.co.",
      daily: [],
      articles: 0,
      coverageDays: 0,
    };
  }

  const from = new Date();
  from.setFullYear(from.getFullYear() - years);
  const timeFrom = `${from.toISOString().slice(0, 10).replace(/-/g, "")}T0000`;

  const url =
    `${ENDPOINT}?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(symbol)}` +
    `&time_from=${timeFrom}&sort=EARLIEST&limit=${LIMIT}&apikey=${encodeURIComponent(key)}`;

  let payload: Record<string, unknown>;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    return fail("upstream", "Could not reach the sentiment provider.");
  }

  // Alpha Vantage answers 200 with an explanatory body for quota and key
  // problems rather than an HTTP error code.
  if (typeof payload.Note === "string" || typeof payload.Information === "string") {
    const msg = (payload.Note ?? payload.Information) as string;
    return fail(
      /limit|frequency|premium/i.test(msg) ? "rate_limited" : "provider",
      msg,
    );
  }
  if (typeof payload["Error Message"] === "string") {
    return fail("provider", payload["Error Message"] as string);
  }

  const feed = payload.feed as AvArticle[] | undefined;
  if (!Array.isArray(feed) || feed.length === 0) {
    return fail("no_data", `No sentiment coverage found for ${symbol}.`);
  }

  // Average each day's articles, weighting by how relevant the article is to
  // this ticker — a passing mention should not move the score like a headline
  // about the company itself.
  const buckets = new Map<string, { weighted: number; weight: number; n: number }>();

  for (const article of feed) {
    const date = toIsoDate(article.time_published);
    if (!date) continue;

    const forTicker = article.ticker_sentiment?.find(
      (t) => t.ticker?.toUpperCase() === symbol.toUpperCase(),
    );
    const score =
      num(forTicker?.ticker_sentiment_score) ??
      num(article.overall_sentiment_score);
    if (score === null) continue;

    const relevance = num(forTicker?.relevance_score) ?? 0.5;
    const w = Math.max(0.01, relevance);

    const b = buckets.get(date) ?? { weighted: 0, weight: 0, n: 0 };
    b.weighted += score * w;
    b.weight += w;
    b.n += 1;
    buckets.set(date, b);
  }

  const daily = [...buckets.entries()]
    .map(([date, b]) => ({
      date,
      score: b.weight > 0 ? b.weighted / b.weight : 0,
      articles: b.n,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (daily.length === 0) {
    return fail("no_data", `No usable sentiment scores for ${symbol}.`);
  }

  const spanDays =
    (Date.parse(daily[daily.length - 1].date) - Date.parse(daily[0].date)) /
    86_400_000;

  return {
    available: true,
    daily,
    articles: feed.length,
    coverageDays: Math.max(1, Math.round(spanDays)),
    from: daily[0].date,
    to: daily[daily.length - 1].date,
  };
}

function fail(
  reason: NonNullable<SentimentSeries["reason"]>,
  message: string,
): SentimentSeries {
  return {
    available: false,
    reason,
    message,
    daily: [],
    articles: 0,
    coverageDays: 0,
  };
}
