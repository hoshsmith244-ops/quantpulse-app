"use client";

import { Loader2, Play, TrendingUp } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { EquityChart } from "@/components/charts/equity-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Metric } from "@/components/ui/metric";
import { Slider } from "@/components/ui/slider";
import { fmtPct, fmtPctPlain, fmtNum, fmtUSD } from "@/lib/format";
import { ASSETS } from "@/lib/market-data";
import { STRATEGIES, getStrategy } from "@/lib/strategies";
import { useBacktest } from "@/lib/use-backtest";
import { cn } from "@/lib/utils";

const QUICK_ASSETS = ["SPY", "QQQ", "AAPL", "NVDA", "BTC/USD"];

/**
 * The hero widget. A full run of the real engine, driven by the same code the
 * dashboard uses — nothing here is pre-rendered or faked.
 */
export function HeroBacktest() {
  const { config, update, result, isPending } = useBacktest();
  const meta = getStrategy(config.strategy);
  const m = result.metrics;
  const beat = m.totalReturnPct - m.benchmarkReturnPct;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/40">
      {/* Window chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-raised/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded border border-line bg-base px-2 py-1">
            <span className="size-1.5 rounded-full bg-profit animate-pulse-dot" />
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
              Live engine
            </span>
          </span>
          <span className="tnum hidden text-[11px] text-dim sm:inline">
            756 sessions · 3Y
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isPending ? (
            <Loader2 className="size-3 animate-spin text-accent" />
          ) : null}
          <span className="tnum text-[11px] text-dim">
            {result.trades.length} trades
          </span>
        </div>
      </div>

      {/* Asset chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line px-3 py-2">
        {QUICK_ASSETS.map((sym) => {
          const asset = ASSETS.find((a) => a.symbol === sym)!;
          const active = config.symbol === sym;
          return (
            <button
              key={sym}
              onClick={() => update("symbol", sym)}
              className={cn(
                "tnum shrink-0 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors",
                active
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-line bg-raised text-muted hover:border-line-strong hover:text-bright",
              )}
              title={asset.name}
            >
              {sym}
            </button>
          );
        })}
      </div>

      {/* Strategy + lookback */}
      <div className="grid grid-cols-1 gap-4 border-b border-line px-4 py-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap items-center gap-1.5">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => update("strategy", s.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[12px] transition-colors",
                config.strategy === s.id
                  ? "border-line-strong bg-overlay text-bright"
                  : "border-transparent text-dim hover:text-muted",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:w-52">
          <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.12em] text-dim">
            Lookback
          </span>
          <Slider
            value={[config.lookback]}
            min={meta.lookbackMin}
            max={meta.lookbackMax}
            step={1}
            onValueChange={([v]) => update("lookback", v)}
            aria-label="Lookback"
          />
          <span className="tnum w-7 text-right text-[12px] font-medium text-bright">
            {config.lookback}
          </span>
        </div>
      </div>

      {/* Equity curve */}
      <div className="relative px-2 pt-4">
        <div className="pointer-events-none absolute left-5 top-5 z-10">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "tnum text-2xl font-medium",
                m.totalReturnPct >= 0 ? "text-profit" : "text-loss",
              )}
            >
              {fmtPct(m.totalReturnPct)}
            </span>
            <span className="tnum text-[12px] text-dim">
              {fmtUSD(m.finalEquity)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-dim">
              <span className="h-px w-3 border-t border-dashed border-dim" />
              S&amp;P 500 {fmtPct(m.benchmarkReturnPct)}
            </span>
            <Badge tone={beat >= 0 ? "profit" : "loss"}>
              {beat >= 0 ? "+" : ""}
              {beat.toFixed(1)}pp vs bench
            </Badge>
          </div>
        </div>

        <div className={cn("transition-opacity", isPending && "opacity-60")}>
          <EquityChart
            data={result.equity}
            initialCapital={config.initialCapital}
            height={230}
            compact
          />
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-5">
        {[
          {
            label: "CAGR",
            value: fmtPct(m.cagr, 1),
            tone: m.cagr >= 0 ? "profit" : "loss",
          },
          {
            label: "Sharpe",
            value: fmtNum(m.sharpe, 2),
            tone: m.sharpe >= 1 ? "profit" : m.sharpe >= 0 ? "neutral" : "loss",
          },
          {
            label: "Max DD",
            value: `${m.maxDrawdown.toFixed(1)}%`,
            tone: "loss",
          },
          {
            label: "Win rate",
            value: fmtPctPlain(m.winRate, 0),
            tone: "neutral",
          },
          {
            label: "Profit factor",
            value: fmtNum(m.profitFactor, 2),
            tone: m.profitFactor >= 1 ? "profit" : "loss",
          },
        ].map((s) => (
          <div key={s.label} className="bg-surface px-4 py-3">
            <Metric
              label={s.label}
              value={s.value}
              tone={s.tone as "profit" | "loss" | "neutral"}
              size="sm"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-raised/40 px-4 py-3">
        <p className="text-[11px] text-dim">
          <TrendingUp className="mr-1 inline size-3" />
          Every figure recomputed client-side from {config.symbol} bars.
        </p>
        <Button size="sm" asChild>
          <Link href="/dashboard">
            <Play />
            Full backtester
          </Link>
        </Button>
      </div>
    </div>
  );
}
