"use client";

import { Crosshair, Loader2 } from "lucide-react";
import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { runBacktest } from "@/lib/backtest";
import { fmtNum, fmtPct, fmtPctPlain } from "@/lib/format";
import { getStrategy } from "@/lib/strategies";
import type { BacktestConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

type SweepRow = {
  lookback: number;
  cagr: number;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  trades: number;
};

const STEPS = 22;

/**
 * Re-runs the engine across the strategy's whole lookback range so you can see
 * whether a good result is a plateau or a single lucky parameter.
 */
export function ParameterSweep({
  config,
  onSelect,
}: {
  config: BacktestConfig;
  onSelect: (lookback: number) => void;
}) {
  const meta = getStrategy(config.strategy);
  const [rows, setRows] = React.useState<SweepRow[] | null>(null);
  const [running, setRunning] = React.useState(false);

  const run = React.useCallback(() => {
    setRunning(true);
    // Yield a frame so the spinner paints before the synchronous sweep blocks.
    requestAnimationFrame(() => {
      const span = meta.lookbackMax - meta.lookbackMin;
      const out: SweepRow[] = [];
      for (let i = 0; i < STEPS; i++) {
        const lookback = Math.round(
          meta.lookbackMin + (span * i) / (STEPS - 1),
        );
        const m = runBacktest({ ...config, lookback }).metrics;
        out.push({
          lookback,
          cagr: m.cagr,
          sharpe: m.sharpe,
          maxDrawdown: m.maxDrawdown,
          winRate: m.winRate,
          profitFactor: m.profitFactor,
          trades: m.totalTrades,
        });
      }
      setRows(out);
      setRunning(false);
    });
  }, [config, meta.lookbackMax, meta.lookbackMin]);

  // Any change other than the lookback itself invalidates the sweep, since
  // every row would have been computed against different settings. Adjusting
  // during render avoids showing one stale frame of mismatched results.
  const inputKey = [
    config.symbol,
    config.strategy,
    config.stopLossPct,
    config.takeProfitPct,
    config.initialCapital,
  ].join("|");
  const [prevInputKey, setPrevInputKey] = React.useState(inputKey);
  if (inputKey !== prevInputKey) {
    setPrevInputKey(inputKey);
    setRows(null);
  }

  const best = React.useMemo(
    () =>
      rows?.reduce((a, b) => (b.sharpe > a.sharpe ? b : a), rows[0]) ?? null,
    [rows],
  );

  return (
    <Panel>
      <PanelHeader className="flex-wrap">
        <PanelTitle className="flex items-center gap-2">
          <Crosshair className="size-3.5 text-dim" />
          Parameter sweep
          <span className="text-[11px] font-normal text-dim">
            {meta.lookbackLabel} · {meta.lookbackMin}–{meta.lookbackMax}
          </span>
        </PanelTitle>
        <div className="flex items-center gap-2">
          {best ? (
            <Badge tone="profit">
              Best Sharpe {fmtNum(best.sharpe, 2)} @ {best.lookback}
            </Badge>
          ) : null}
          <Button variant="secondary" size="sm" onClick={run} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <Crosshair />}
            {running ? "Sweeping…" : rows ? "Re-run" : "Run sweep"}
          </Button>
        </div>
      </PanelHeader>

      {!rows ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
          <p className="max-w-md text-[13px] leading-relaxed text-muted">
            Run the strategy across {STEPS} lookback values on {config.symbol} to
            see whether the current setting sits on a stable plateau or a lone
            spike.
          </p>
          <Button size="sm" onClick={run} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <Crosshair />}
            {running ? "Sweeping…" : `Sweep ${STEPS} configurations`}
          </Button>
        </div>
      ) : (
        <>
          <div className="border-b border-line p-4">
            <div className="mb-2 flex items-center gap-4">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
                Sharpe by {meta.lookbackLabel.toLowerCase()}
              </span>
              <span className="text-[11px] text-dim">
                Click a bar to apply that value
              </span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
                >
                  <XAxis
                    dataKey="lookback"
                    tick={{ fill: "#475569", fontSize: 10 }}
                    axisLine={{ stroke: "#172032" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fill: "#475569", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={(v: number) => v.toFixed(1)}
                  />
                  <ReferenceLine y={0} stroke="#2b3a52" />
                  <Tooltip
                    cursor={{ fill: "rgba(59,130,246,0.07)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const r = payload[0].payload as SweepRow;
                      return (
                        <div className="rounded-md border border-line-strong bg-overlay/95 px-3 py-2 text-[11px] shadow-xl shadow-black/60">
                          <div className="tnum mb-1 text-bright">
                            Lookback {r.lookback}
                          </div>
                          <TipRow label="Sharpe" value={fmtNum(r.sharpe, 2)} />
                          <TipRow label="CAGR" value={fmtPct(r.cagr, 1)} />
                          <TipRow
                            label="Max DD"
                            value={`${r.maxDrawdown.toFixed(1)}%`}
                          />
                          <TipRow label="Trades" value={String(r.trades)} />
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="sharpe"
                    isAnimationActive={false}
                    onClick={(d: unknown) =>
                      onSelect((d as SweepRow).lookback)
                    }
                    className="cursor-pointer"
                  >
                    {rows.map((r) => (
                      <Cell
                        key={r.lookback}
                        fill={
                          r.lookback === config.lookback
                            ? "#3b82f6"
                            : r.sharpe >= 0
                              ? "#10b981"
                              : "#ef4444"
                        }
                        fillOpacity={
                          r.lookback === config.lookback ? 1 : 0.55
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="max-h-72 overflow-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line">
                  {[
                    "Lookback",
                    "CAGR",
                    "Sharpe",
                    "Max DD",
                    "Win rate",
                    "Profit factor",
                    "Trades",
                    "",
                  ].map((h, i) => (
                    <th
                      key={h || i}
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-[10px] font-medium uppercase tracking-[0.1em] text-dim",
                        i === 0 ? "text-left" : "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const current = r.lookback === config.lookback;
                  const isBest = best?.lookback === r.lookback;
                  return (
                    <tr
                      key={r.lookback}
                      className={cn(
                        "border-b border-line-soft transition-colors last:border-0 hover:bg-raised/60",
                        current && "bg-accent/[0.07]",
                      )}
                    >
                      <td className="tnum px-3 py-1.5">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              current ? "text-accent" : "text-bright",
                            )}
                          >
                            {r.lookback}
                          </span>
                          {isBest ? <Badge tone="profit">Best</Badge> : null}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "tnum px-3 py-1.5 text-right",
                          r.cagr >= 0 ? "text-profit" : "text-loss",
                        )}
                      >
                        {fmtPct(r.cagr, 1)}
                      </td>
                      <td
                        className={cn(
                          "tnum px-3 py-1.5 text-right font-medium",
                          r.sharpe >= 1
                            ? "text-profit"
                            : r.sharpe >= 0
                              ? "text-text"
                              : "text-loss",
                        )}
                      >
                        {fmtNum(r.sharpe, 2)}
                      </td>
                      <td className="tnum px-3 py-1.5 text-right text-loss">
                        {r.maxDrawdown.toFixed(1)}%
                      </td>
                      <td className="tnum px-3 py-1.5 text-right text-muted">
                        {fmtPctPlain(r.winRate, 0)}
                      </td>
                      <td
                        className={cn(
                          "tnum px-3 py-1.5 text-right",
                          r.profitFactor >= 1 ? "text-text" : "text-loss",
                        )}
                      >
                        {fmtNum(r.profitFactor, 2)}
                      </td>
                      <td className="tnum px-3 py-1.5 text-right text-dim">
                        {r.trades}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {!current ? (
                          <button
                            onClick={() => onSelect(r.lookback)}
                            className="text-[11px] text-accent transition-colors hover:text-bright"
                          >
                            Apply
                          </button>
                        ) : (
                          <span className="text-[11px] text-dim">Current</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line px-4 py-2.5">
            <p className="text-[11px] leading-relaxed text-dim">
              A parameter that only works at one setting is usually curve-fit.
              Prefer a value in the middle of a broad, stable region.
            </p>
          </div>
        </>
      )}
    </Panel>
  );
}

function TipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="text-dim">{label}</span>
      <span className="tnum text-muted">{value}</span>
    </div>
  );
}
