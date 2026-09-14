"use client";

import { SlidersHorizontal } from "lucide-react";

import { ParameterSweep } from "@/components/backtest/parameter-sweep";
import { StrategyControls } from "@/components/backtest/strategy-controls";
import { TradeLog } from "@/components/backtest/trade-log";
import { EquityChart } from "@/components/charts/equity-chart";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Metric } from "@/components/ui/metric";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { fmtNum, fmtPct, fmtPctPlain, fmtUSD } from "@/lib/format";
import { getStrategy } from "@/lib/strategies";
import { useBacktest } from "@/lib/use-backtest";

export default function BacktesterPage() {
  const { config, setConfig, update, result } = useBacktest();
  const m = result.metrics;
  const strategy = getStrategy(config.strategy);

  return (
    <>
      <PageHeader
        title="Strategy lab"
        description="Sweep a parameter across its full range before you trust any single result. Robust edges show up as plateaus, not spikes."
        actions={<Badge tone="neutral">{strategy.name}</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 p-4 lg:p-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel className="h-fit">
            <PanelHeader>
              <PanelTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-dim" />
                Parameters
              </PanelTitle>
            </PanelHeader>
            <div className="p-4">
              <StrategyControls
                config={config}
                update={update}
                setConfig={setConfig}
              />
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <Metric
                label="CAGR"
                value={fmtPct(m.cagr, 1)}
                tone={m.cagr >= 0 ? "profit" : "loss"}
                size="sm"
              />
              <Metric
                label="Sharpe"
                value={fmtNum(m.sharpe, 2)}
                tone={m.sharpe >= 1 ? "profit" : "neutral"}
                size="sm"
              />
              <Metric
                label="Max DD"
                value={`${m.maxDrawdown.toFixed(1)}%`}
                tone="loss"
                size="sm"
              />
              <Metric
                label="Win rate"
                value={fmtPctPlain(m.winRate, 0)}
                size="sm"
              />
              <Metric
                label="Profit factor"
                value={fmtNum(m.profitFactor, 2)}
                tone={m.profitFactor >= 1 ? "profit" : "loss"}
                size="sm"
              />
              <Metric
                label="Final equity"
                value={fmtUSD(m.finalEquity)}
                size="sm"
              />
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>
                <span className="tnum font-semibold">{config.symbol}</span>
                <span className="ml-2 font-normal text-dim">equity curve</span>
              </PanelTitle>
              <span className="tnum text-[12px] font-medium text-bright">
                {fmtUSD(m.finalEquity)}
                <span
                  className={
                    m.totalReturnPct >= 0
                      ? "ml-2 text-profit"
                      : "ml-2 text-loss"
                  }
                >
                  {fmtPct(m.totalReturnPct)}
                </span>
              </span>
            </PanelHeader>
            <div className="px-2 py-3">
              <EquityChart
                data={result.equity}
                initialCapital={config.initialCapital}
                height={240}
              />
            </div>
          </Panel>

          <ParameterSweep
            config={config}
            onSelect={(lookback) => update("lookback", lookback)}
          />

          <Panel className="overflow-hidden">
            <TradeLog
              trades={result.trades}
              symbol={config.symbol}
              pageSize={8}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
