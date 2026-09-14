"use client";

import { Eraser, Pause, Play, Terminal } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { fmtInt, fmtUSD, fmtUSDCompact } from "@/lib/format";
import {
  formatTime,
  makeEvent,
  seedEvents,
  type FeedEvent,
  type FeedLevel,
} from "@/lib/webhook";
import { cn } from "@/lib/utils";

const MAX_ROWS = 120;

const STATUS_TONE: Record<FeedLevel, string> = {
  success: "text-profit",
  warn: "text-warn",
  error: "text-loss",
  info: "text-accent",
};

const ACTION_TONE: Record<FeedEvent["action"], string> = {
  BUY: "text-profit",
  SELL: "text-loss",
  CLOSE: "text-muted",
};

export function TerminalFeed() {
  const [events, setEvents] = React.useState<FeedEvent[]>([]);
  const [paused, setPaused] = React.useState(false);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const seededRef = React.useRef(false);

  /**
   * The feed stands in for a stream subscription. Both the backfill and the
   * incoming events arrive from the timer callback rather than synchronously
   * during the effect, so the first paint always matches the server markup.
   */
  React.useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      setEvents((prev) => {
        // Backfill once, on the very first tick — never after a manual clear.
        const base = seededRef.current ? prev : seedEvents(16);
        seededRef.current = true;
        return [...base, makeEvent()].slice(-MAX_ROWS);
      });
      // Irregular cadence reads as real traffic rather than a metronome.
      timer = setTimeout(tick, 1400 + Math.random() * 3600);
    };

    timer = setTimeout(tick, 80);
    return () => clearTimeout(timer);
  }, [paused]);

  React.useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [events, autoScroll]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const stats = React.useMemo(() => {
    if (events.length === 0) {
      return { p50: 0, ok: 0, failed: 0, total: 0, volume: 0 };
    }
    const lat = events.map((e) => e.latency).sort((a, b) => a - b);
    const ok = events.filter((e) => e.status === 200).length;
    return {
      p50: lat[Math.floor(lat.length / 2)],
      ok,
      failed: events.filter((e) => e.status >= 400).length,
      total: events.length,
      volume: events
        .filter((e) => e.status === 200)
        .reduce((a, e) => a + e.qty * e.price, 0),
    };
  }, [events]);

  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden">
      <PanelHeader className="flex-wrap">
        <PanelTitle className="flex items-center gap-2">
          <Terminal className="size-3.5 text-dim" />
          Live execution feed
          <Badge tone={paused ? "warn" : "profit"}>
            {!paused ? (
              <span className="size-1 rounded-full bg-profit animate-pulse-dot" />
            ) : null}
            {paused ? "Paused" : "Streaming"}
          </Badge>
        </PanelTitle>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaused((p) => !p)}
            title={paused ? "Resume stream" : "Pause stream"}
          >
            {paused ? <Play /> : <Pause />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEvents([])}
            title="Clear feed"
          >
            <Eraser />
            Clear
          </Button>
        </div>
      </PanelHeader>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
        <Stat label="p50 latency" value={`${stats.p50}ms`} tone="text-profit" />
        <Stat
          label="Delivered"
          value={`${fmtInt(stats.ok)} / ${fmtInt(stats.total)}`}
          tone="text-bright"
        />
        <Stat
          label="Failed"
          value={fmtInt(stats.failed)}
          tone={stats.failed > 0 ? "text-loss" : "text-bright"}
        />
        <Stat
          label="Notional routed"
          value={fmtUSDCompact(stats.volume)}
          tone="text-bright"
        />
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-base px-3 py-2"
      >
        {events.length === 0 ? (
          <div className="flex h-full min-h-40 items-center justify-center">
            <p className="tnum text-[12px] text-faint">
              Waiting for inbound alerts…
            </p>
          </div>
        ) : (
          <div className="tnum space-y-px text-[12px] leading-[1.75]">
            {events.map((e) => (
              <div
                key={e.id}
                className="group flex animate-slide-in flex-nowrap items-baseline gap-2 whitespace-nowrap rounded px-1.5 py-0.5 hover:bg-raised/60"
              >
                <span className="shrink-0 text-faint">{formatTime(e.ts)}</span>

                <span
                  className={cn(
                    "w-9 shrink-0 font-medium",
                    STATUS_TONE[e.level],
                  )}
                >
                  {e.status}
                </span>

                <span
                  className={cn(
                    "w-11 shrink-0 font-medium",
                    ACTION_TONE[e.action],
                  )}
                >
                  {e.action}
                </span>

                <span className="w-16 shrink-0 truncate text-bright">
                  {e.symbol}
                </span>

                <span className="hidden w-14 shrink-0 text-right text-muted lg:inline">
                  {e.qty < 1 ? e.qty.toFixed(2) : e.qty}
                </span>

                <span className="hidden w-24 shrink-0 text-right text-muted xl:inline">
                  <span className="text-faint">@ </span>
                  {fmtUSD(e.price)}
                </span>

                <span className="hidden w-14 shrink-0 text-dim 2xl:inline">
                  {e.broker}
                </span>

                <span
                  className={cn(
                    "w-12 shrink-0 text-right",
                    e.latency < 30
                      ? "text-profit"
                      : e.latency < 150
                        ? "text-muted"
                        : "text-warn",
                  )}
                >
                  {e.latency}ms
                </span>

                <span className="min-w-0 flex-1 truncate text-dim">
                  {e.message}
                </span>

                <span className="hidden shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100 xl:inline">
                  {e.orderId}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!autoScroll && events.length > 0 ? (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
            });
          }}
          className="border-t border-line bg-raised py-1.5 text-[11px] text-accent transition-colors hover:bg-overlay"
        >
          Jump to latest
        </button>
      ) : null}
    </Panel>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="bg-surface px-4 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-dim">
        {label}
      </div>
      <div className={cn("tnum mt-1 text-[15px] font-medium", tone)}>
        {value}
      </div>
    </div>
  );
}
