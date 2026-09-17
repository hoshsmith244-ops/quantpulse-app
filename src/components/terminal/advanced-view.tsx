"use client";

import Link from "next/link";
import * as React from "react";

import {
  DecayChart,
  EquityChart,
  QuantileChart,
} from "@/components/charts/charts";
import {
  Label,
  Meter,
  Panel,
  PanelHead,
  Readout,
  Tag,
} from "@/components/ui/terminal";
import { CostControl } from "@/components/terminal/cost-control";
import { TodayAction } from "@/components/terminal/today-action";
import { TuningPanel } from "@/components/terminal/tuning-panel";
import { getFactor, gradeIC, type AlphaResult } from "@/lib/alpha";
import { fmtPct } from "@/lib/format";
import type { History, MarketContext } from "@/lib/symbols";
import type { Bar } from "@/lib/types";
import type { Params } from "@/lib/use-alpha";
import { cn } from "@/lib/utils";

/** The full research surface: IC, significance, decay, quintiles, equity. */
export function AdvancedView({
  result,
  params,
  symbol,
  bars,
  onApplyParam,
  sentimentMap,
  costBps,
  onCostChange,
  history,
  context,
}: {
  result: AlphaResult;
  params: Params;
  symbol: string;
  bars: Bar[];
  onApplyParam: (param: number) => void;
  sentimentMap?: Map<string, number>;
  costBps: number;
  onCostChange: (bps: number) => void;
  history: History;
  context: MarketContext | null;
}) {
  return (
    <>
      <Verdict result={result} horizon={params.horizon} />

      {/* The alerts fire in both modes, so the window they refer to has to be
          explained in both. Placed above the research surface because it is
          the only part of this page that is time-critical. */}
      <div className="border-b border-line p-3">
        <TodayAction
          history={history}
          context={context}
          factor={params.factor}
          param={params.param}
          currentState={result.signal.state}
        />
      </div>

      <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-2">
        <Panel className="border-0">
          <PanelHead
            title="IC decay by horizon"
            right={<span className="text-[10px] text-dim">dashed = selected</span>}
          />
          <div className="p-2">
            <DecayChart data={result.decay} active={params.horizon} />
          </div>
          <p className="prose-face border-t border-line px-3 py-2 text-[11px] leading-relaxed text-dim">
            If the line fades toward zero as the horizon grows, the edge is
            short-lived. A line that holds up means the signal keeps working for
            weeks.
          </p>
        </Panel>

        <Panel className="border-0">
          <PanelHead
            title="Mean forward return by quintile"
            right={
              result.current.bucket ? (
                <Tag tone="amber">now in Q{result.current.bucket}</Tag>
              ) : null
            }
          />
          <div className="p-2">
            <QuantileChart
              data={result.quantiles}
              current={result.current.bucket}
            />
          </div>
          <p className="prose-face border-t border-line px-3 py-2 text-[11px] leading-relaxed text-dim">
            Sorted lowest to highest factor score. A usable factor steps upward
            left to right — Q5 should beat Q1.
          </p>
        </Panel>
      </div>

      <Panel className="border-x-0 border-b-0">
        <PanelHead
          title={`Acting on the signal — ${symbol}`}
          right={
            <span className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted">
                <span
                  className={cn(
                    "h-px w-3",
                    result.strategy.totalReturnPct >=
                      result.strategy.buyHoldReturnPct
                      ? "bg-up"
                      : "bg-down",
                  )}
                />
                Signal
              </span>
              <span className="flex items-center gap-1.5 text-dim">
                <span className="h-px w-3 border-t border-dashed border-dim" />
                Buy &amp; hold
              </span>
            </span>
          }
        />
        <div className="p-2">
          <EquityChart data={result.curve} />
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: "Signal return",
              value: fmtPct(result.strategy.totalReturnPct, 1),
              tone:
                result.strategy.totalReturnPct >= 0
                  ? ("up" as const)
                  : ("down" as const),
            },
            {
              label: "Buy & hold",
              value: fmtPct(result.strategy.buyHoldReturnPct, 1),
              tone: "dim" as const,
            },
            {
              label: "CAGR",
              value: fmtPct(result.strategy.cagr, 1),
              tone:
                result.strategy.cagr >= 0 ? ("up" as const) : ("down" as const),
            },
            {
              label: "Sharpe",
              value: result.strategy.sharpe.toFixed(2),
              tone:
                result.strategy.sharpe >= 1
                  ? ("up" as const)
                  : ("bright" as const),
            },
            {
              label: "Max drawdown",
              value: `${result.strategy.maxDrawdownPct.toFixed(1)}%`,
              tone: "down" as const,
            },
            {
              label: "Time in market",
              value: `${result.strategy.exposurePct.toFixed(0)}%`,
              tone: "bright" as const,
            },
          ].map((s) => (
            <div key={s.label} className="bg-panel px-3 py-2.5">
              <Readout label={s.label} value={s.value} tone={s.tone} size="sm" />
            </div>
          ))}
        </div>

        <div className="border-t border-line px-3 py-2">
          <CostControl costBps={costBps} onChange={onCostChange} />
        </div>

        <p className="prose-face border-t border-line px-3 py-2 text-[11px] leading-relaxed text-dim">
          Long whenever the score sits in the top 40% of everything seen{" "}
          <em>up to that day</em>, flat otherwise. The threshold never uses
          future data, and there is a one-year warm-up before the first trade —
          so this is a fair test, not a curve fit. No costs or slippage are
          applied.{" "}
          <Link href="/guide" className="text-amber hover:underline">
            How to read this
          </Link>
        </p>
      </Panel>

      <TuningPanel
        bars={bars}
        factor={getFactor(params.factor)}
        currentParam={params.param}
        onApply={onApplyParam}
        sentimentMap={sentimentMap}
        costBps={costBps}
      />
    </>
  );
}

function Verdict({
  result,
  horizon,
}: {
  result: AlphaResult;
  horizon: number;
}) {
  const grade = gradeIC(result.ic, result.icTStat);
  const significant = Math.abs(result.icTStat) >= 2;
  const inverted = grade.inverted && significant;

  const toneMap = { up: "up", amber: "amber", dim: "dim" } as const;

  return (
    <div className="border-b border-line bg-panel">
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
        <Cell>
          <Readout
            label="Information coeff."
            value={result.ic.toFixed(3)}
            tone={toneMap[grade.tone]}
            sub={`${grade.label} · n=${result.sampleSize}`}
            hint="Spearman rank correlation between the factor score and the forward return"
          />
        </Cell>
        <Cell>
          <Readout
            label="t-statistic"
            value={result.icTStat.toFixed(2)}
            tone={significant ? "up" : "dim"}
            sub={significant ? "significant" : "|t| < 2 — noise"}
            hint="Above 2 in magnitude means the IC is unlikely to be chance"
          />
        </Cell>
        <Cell>
          <Readout
            label="Q5 − Q1 spread"
            value={fmtPct(result.spreadPct)}
            tone={result.spreadPct >= 0 ? "up" : "down"}
            sub={`per ${horizon}d`}
            hint="Mean forward return of the highest-scoring fifth minus the lowest"
          />
        </Cell>
        <Cell>
          <Readout
            label="Hit rate"
            value={`${result.hitRatePct.toFixed(1)}%`}
            tone="bright"
            sub="direction correct"
          />
        </Cell>
        <Cell>
          <Readout
            label="Current percentile"
            value={
              result.current.percentile === null
                ? "—"
                : `${result.current.percentile.toFixed(0)}`
            }
            tone="amber"
            sub={
              result.current.bucket
                ? `quintile ${result.current.bucket} of 5`
                : "insufficient history"
            }
          />
          {result.current.percentile !== null ? (
            <Meter
              value={result.current.percentile}
              className="mt-2"
              segments={14}
            />
          ) : null}
        </Cell>
        <Cell>
          <Label>Reading</Label>
          <p className="prose-face mt-1.5 text-[11px] leading-relaxed text-muted">
            {!significant ? (
              <>
                No reliable edge in this sample. That is the normal result — most
                factors do not work on most assets.
              </>
            ) : inverted ? (
              <>
                <span className="text-down">Inverted.</span> High scores precede{" "}
                <em>lower</em> returns here. A quant would flip the sign and
                trade it the other way.
              </>
            ) : (
              <>
                <span className="text-up">Positive edge.</span> {grade.note}
              </>
            )}
          </p>
        </Cell>
      </div>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="bg-panel px-3 py-2.5">{children}</div>;
}
