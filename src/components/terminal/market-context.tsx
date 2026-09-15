"use client";

import { AlertTriangle, ExternalLink, Moon, Newspaper, Sun } from "lucide-react";
import * as React from "react";

import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { fmtPct } from "@/lib/format";
import { STALE_DRIFT_PCT, type MarketContext } from "@/lib/symbols";
import { cn } from "@/lib/utils";

/** Poll while the page is open; extended-hours prints move continuously. */
const REFRESH_MS = 60_000;

export function useMarketContext(symbol: string) {
  const [data, setData] = React.useState<MarketContext | null>(null);
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/context?symbol=${encodeURIComponent(symbol)}`,
        );
        if (!res.ok) throw new Error("bad response");
        const body = (await res.json()) as MarketContext;
        if (cancelled) return;
        setData(body);
        setLoadedFor(symbol);
      } catch {
        // Context is additive. If it fails the signal is still valid, so the
        // panel simply does not render rather than showing an error.
        if (!cancelled) {
          setData(null);
          setLoadedFor(symbol);
        }
      }
    };

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol]);

  return loadedFor === symbol ? data : null;
}

const timeOf = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

function relative(ms: number) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const SESSION_LABEL = {
  pre: "Pre-market",
  regular: "Market open",
  post: "After hours",
  closed: "Market closed",
} as const;

/**
 * Sits under the signal card. Its job is to tell the user what the signal has
 * NOT seen — never to adjust the signal itself.
 */
export function MarketContextPanel({
  context,
  compact = false,
}: {
  context: MarketContext | null;
  compact?: boolean;
}) {
  if (!context) return null;

  const { extended, regular, driftPct, news, session } = context;
  const stale = driftPct !== null && Math.abs(driftPct) >= STALE_DRIFT_PCT;
  const afterCloseNews = news.filter((n) => n.afterClose);

  return (
    <div className="space-y-4">
      {/* Extended-hours price */}
      {extended && regular ? (
        <Panel className={cn(stale && "border-amber/50")}>
          <PanelHead
            title={SESSION_LABEL[session] ?? "Extended hours"}
            right={
              <Tag tone={stale ? "amber" : "neutral"}>
                {extended.session === "pre" ? (
                  <Sun className="size-2.5" />
                ) : (
                  <Moon className="size-2.5" />
                )}
                {timeOf(extended.at)}
                {context.timezone ? ` ${context.timezone}` : ""}
              </Tag>
            }
          />

          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
            <Cell
              label="Last close"
              value={regular.price.toFixed(2)}
              sub={fmtPct(regular.changePct, 2)}
              subTone={regular.changePct >= 0 ? "text-up" : "text-down"}
            />
            <Cell
              label={
                extended.session === "pre" ? "Pre-market" : "After hours"
              }
              value={extended.price.toFixed(2)}
              sub={fmtPct(extended.changePct, 2)}
              subTone={extended.changePct >= 0 ? "text-up" : "text-down"}
            />
            <Cell
              label="Move since close"
              value={driftPct === null ? "—" : fmtPct(driftPct, 2)}
              valueTone={
                driftPct === null
                  ? "text-bright"
                  : driftPct >= 0
                    ? "text-up"
                    : "text-down"
              }
              sub="the signal has not seen this"
            />
          </div>

          {stale ? (
            <div className="flex items-start gap-2 border-t border-amber/30 bg-amber/[0.06] px-4 py-2.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber" />
              <p className="prose-face text-[12px] leading-relaxed text-text">
                <span className="text-amber">Signal may be out of date.</span>{" "}
                The strategy reads the daily close. This has moved{" "}
                <span className="tnum text-bright">
                  {fmtPct(driftPct!, 1)}
                </span>{" "}
                since then, which it will not react to until the next daily bar
                exists.
              </p>
            </div>
          ) : (
            <p className="prose-face border-t border-line px-4 py-2 text-[11px] leading-relaxed text-dim">
              The strategy is computed on daily closes, so extended-hours moves
              do not change it until the next bar closes.
            </p>
          )}
        </Panel>
      ) : null}

      {/* Headlines */}
      {news.length ? (
        <Panel>
          <PanelHead
            title="Recent headlines"
            right={
              afterCloseNews.length ? (
                <Tag tone="amber">{afterCloseNews.length} since close</Tag>
              ) : (
                <Tag tone="neutral">
                  <Newspaper className="size-2.5" />
                  {news.length}
                </Tag>
              )
            }
          />
          <ul className="divide-y divide-line-soft">
            {news.slice(0, compact ? 4 : 8).map((n) => (
              <li key={n.id}>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-raised/50"
                >
                  <span
                    className={cn(
                      "tnum mt-0.5 w-16 shrink-0 text-[11px]",
                      n.afterClose ? "text-amber" : "text-dim",
                    )}
                  >
                    {relative(n.publishedAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="prose-face block text-[12px] leading-relaxed text-text group-hover:text-bright">
                      {n.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] uppercase tracking-[0.1em] text-faint">
                      {n.publisher}
                      {n.afterClose ? (
                        <span className="text-amber"> · after close</span>
                      ) : null}
                    </span>
                  </span>
                  <ExternalLink className="mt-0.5 size-3 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
          <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
            Published around the same time as the move —{" "}
            <span className="text-muted">not necessarily the cause of it</span>.
            Headlines are shown so you can judge for yourself; nothing here
            feeds into the strategy or its statistics.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}

function Cell({
  label,
  value,
  valueTone = "text-bright",
  sub,
  subTone = "text-dim",
}: {
  label: string;
  value: string;
  valueTone?: string;
  sub?: string;
  subTone?: string;
}) {
  return (
    <div className="bg-panel px-4 py-3">
      <span className="label block truncate">{label}</span>
      <span className={cn("tnum mt-1.5 block text-[18px]", valueTone)}>
        {value}
      </span>
      {sub ? (
        <span className={cn("tnum mt-1 block text-[11px]", subTone)}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}
