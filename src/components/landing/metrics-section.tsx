"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { runBacktest } from "@/lib/backtest";
import { fmtNum, fmtPct, fmtPctPlain } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEFS = [
  {
    key: "cagr" as const,
    label: "CAGR",
    desc: "Compound annual growth rate of the equity curve, net of fees.",
    fmt: (m: number) => fmtPct(m, 2),
    good: (m: number) => m > 0,
  },
  {
    key: "sharpe" as const,
    label: "Sharpe ratio",
    desc: "Annualised excess return per unit of total volatility.",
    fmt: (m: number) => fmtNum(m, 2),
    good: (m: number) => m >= 1,
  },
  {
    key: "maxDrawdown" as const,
    label: "Max drawdown",
    desc: "Deepest peak-to-trough loss the strategy ever sat through.",
    fmt: (m: number) => `${m.toFixed(2)}%`,
    good: () => false,
  },
  {
    key: "winRate" as const,
    label: "Win rate",
    desc: "Share of closed trades that finished above the entry price.",
    fmt: (m: number) => fmtPctPlain(m, 1),
    good: (m: number) => m >= 50,
  },
  {
    key: "profitFactor" as const,
    label: "Profit factor",
    desc: "Gross profit divided by gross loss. Above 1.0 is a positive edge.",
    fmt: (m: number) => fmtNum(m, 2),
    good: (m: number) => m >= 1,
  },
  {
    key: "sortino" as const,
    label: "Sortino ratio",
    desc: "Like Sharpe, but only penalises downside volatility.",
    fmt: (m: number) => fmtNum(m, 2),
    good: (m: number) => m >= 1,
  },
  {
    key: "volatility" as const,
    label: "Volatility",
    desc: "Annualised standard deviation of daily strategy returns.",
    fmt: (m: number) => fmtPctPlain(m, 1),
    good: () => true,
  },
  {
    key: "exposurePct" as const,
    label: "Time in market",
    desc: "Percentage of sessions the strategy held a position.",
    fmt: (m: number) => fmtPctPlain(m, 1),
    good: () => true,
  },
];

export function MetricsSection() {
  // Same engine, same defaults as the hero — these are computed, not typed in.
  const metrics = React.useMemo(
    () =>
      runBacktest({
        symbol: "SPY",
        strategy: "dma",
        lookback: 90,
        initialCapital: 10_000,
        stopLossPct: 8,
        takeProfitPct: 20,
      }).metrics,
    [],
  );

  return (
    <section className="border-b border-line py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <Badge tone="neutral">Performance analytics</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-bright sm:text-4xl">
              The metrics that survive contact with a live account
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Total return flatters everything. QuantPulse reports the
              risk-adjusted picture by default, so you know what the strategy
              costs you in drawdown before you fund it.
            </p>
          </div>
          <div className="shrink-0 rounded-panel border border-line bg-surface px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-dim">
              Sample run
            </div>
            <div className="tnum mt-1 text-[13px] text-bright">
              SPY · Dual MA (90) · $10,000
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {DEFS.map((d) => {
            const raw = metrics[d.key];
            const positive = d.good(raw);
            return (
              <div key={d.key} className="bg-surface p-5">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
                  {d.label}
                </div>
                <div
                  className={cn(
                    "tnum mt-2 text-2xl font-medium leading-none",
                    d.key === "maxDrawdown"
                      ? "text-loss"
                      : positive
                        ? "text-profit"
                        : "text-bright",
                  )}
                >
                  {d.fmt(raw)}
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-dim">
                  {d.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
