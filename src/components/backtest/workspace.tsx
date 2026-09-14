"use client";

import {
  Activity,
  Loader2,
  Play,
  SlidersHorizontal,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { DrawdownChart, EquityChart } from "@/components/charts/equity-chart";
import { StrategyControls } from "@/components/backtest/strategy-controls";
import { TradeLog } from "@/components/backtest/trade-log";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Metric, MetricCard } from "@/components/ui/metric";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { fmtNum, fmtPct, fmtPctPlain, fmtUSD } from "@/lib/format";
import { getAsset } from "@/lib/market-data";
import { getStrategy } from "@/lib/strategies";
import { useBacktest } from "@/lib/use-backtest";
import { cn } from "@/lib/utils";

export function BacktestWorkspace() {
  const { config, setConfig, update, result, isPending } = useBacktest();
  const m = result.metrics;
  const asset = getAsset(config.symbol);
  const strategy = getStrategy(config.strategy);
  const edge = m.totalReturnPct - m.benchmarkReturnPct;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <MetricCard
          label="Net P/L"
          value={fmtUSD(m.finalEquity - config.initialCapital)}
          tone={m.totalReturnPct >= 0 ? "profit" : "loss"}
          sub={
            <span className={m.totalReturnPct >= 0 ? "text-profit" : "text-loss"}>
              {fmtPct(m.totalReturnPct)}
            </span>
          }
        />
        <MetricCard
          label="CAGR"
          value={fmtPct(m.cagr, 1)}
          tone={m.cagr >= 0 ? "profit" : "loss"}
          sub={`vs ${fmtPct(m.benchmarkCagr, 1)} bench`}
          hint="Compound annual growth rate, net of fees"
        />
        <MetricCard
          label="Sharpe"
          value={fmtNum(m.sharpe, 2)}
          tone={m.sharpe >= 1 ? "profit" : m.sharpe >= 0 ? "neutral" : "loss"}
          sub={`Sortino ${fmtNum(m.sortino, 2)}`}
          hint="Annualised return per unit of volatility"
        />
        <MetricCard
          label="Max drawdown"
          value={`${m.maxDrawdown.toFixed(1)}%`}
          tone="loss"
          sub={`Vol ${fmtPctPlain(m.volatility, 1)}`}
          hint="Deepest peak-to-trough decline"
        />
        <MetricCard
          label="Win rate"
          value={fmtPctPlain(m.winRate, 1)}
          tone="neutral"
          sub={`${m.totalTrades} closed trades`}
        />
        <MetricCard
          label="Profit factor"
          value={fmtNum(m.profitFactor, 2)}
          tone={m.profitFactor >= 1 ? "profit" : "loss"}
          sub={`Avg ${fmtPct(m.avgTradePct, 2)}/trade`}
          hint="Gross profit divided by gross loss"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Controls */}
        <Panel className="h-fit">
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-3.5 text-dim" />
              Parameters
            </PanelTitle>
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin text-accent" />
            ) : (
              <Badge tone="profit">Synced</Badge>
            )}
          </PanelHeader>
          <div className="p-4">
            <StrategyControls
              config={config}
              update={update}
              setConfig={setConfig}
            />
          </div>
        </Panel>

        {/* Chart */}
        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelHeader className="flex-wrap">
              <div className="flex min-w-0 items-center gap-3">
                <PanelTitle className="flex items-center gap-2">
                  <span className="tnum text-[14px] font-semibold text-bright">
                    {config.symbol}
                  </span>
                  <span className="truncate text-[12px] font-normal text-dim">
                    {asset.name}
                  </span>
                </PanelTitle>
                <Badge tone="neutral">{strategy.name}</Badge>
              </div>

              <div className="flex items-center gap-4">
                <Legend swatch="bg-profit" label="Strategy" />
                <Legend swatch="bg-dim" label="S&P 500" dashed />
              </div>
            </PanelHeader>

            <div className="relative px-2 pt-4">
              <div className="pointer-events-none absolute left-5 top-4 z-10">
                <div className="flex items-baseline gap-2.5">
                  <span className="tnum text-[28px] font-medium leading-none text-bright">
                    {fmtUSD(m.finalEquity)}
                  </span>
                  <span
                    className={cn(
                      "tnum text-[15px] font-medium",
                      m.totalReturnPct >= 0 ? "text-profit" : "text-loss",
                    )}
                  >
                    {fmtPct(m.totalReturnPct)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge tone={edge >= 0 ? "profit" : "loss"}>
                    {edge >= 0 ? "+" : ""}
                    {edge.toFixed(1)}pp vs benchmark
                  </Badge>
                  <span className="tnum text-[11px] text-dim">
                    {fmtPctPlain(m.exposurePct, 0)} time in market
                  </span>
                </div>
              </div>

              <div className={cn("transition-opacity", isPending && "opacity-60")}>
                <EquityChart
                  data={result.equity}
                  initialCapital={config.initialCapital}
                  height={330}
                />
              </div>
            </div>

            <div className="border-t border-line px-2 pb-2 pt-3">
              <div className="mb-1 px-3">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
                  Underwater · max {m.maxDrawdown.toFixed(1)}%
                </span>
              </div>
              <DrawdownChart data={result.equity} height={88} />
            </div>
          </Panel>

          {/* Trade log */}
          <Panel className="overflow-hidden">
            <TradeLog trades={result.trades} symbol={config.symbol} />
          </Panel>

          {/* Deploy strip */}
          <Panel className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent/[0.06]">
                <Activity className="size-4 text-accent" />
              </span>
              <div>
                <p className="text-[13px] font-medium text-bright">
                  Deploy this configuration as a live signal
                </p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {strategy.name} on {config.symbol}, {config.lookback}-bar
                  lookback, {config.stopLossPct}% stop / {config.takeProfitPct}%
                  target.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" size="sm">
                <Play />
                Paper trade
              </Button>
              <Button size="sm" asChild>
                <Link href="/dashboard/webhooks">
                  <Webhook />
                  Create webhook
                </Link>
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Legend({
  swatch,
  label,
  dashed,
}: {
  swatch: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted">
      {dashed ? (
        <span className="h-px w-3 border-t border-dashed border-dim" />
      ) : (
        <span className={cn("h-0.5 w-3 rounded-full", swatch)} />
      )}
      {label}
    </span>
  );
}

export { Metric };
