"use client";

import { AlertTriangle, Loader2, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  DecayChart,
  EquityChart,
  QuantileChart,
} from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Label,
  Meter,
  Panel,
  PanelHead,
  Readout,
  Tag,
} from "@/components/ui/terminal";
import { FACTORS, HORIZON_CHOICES, getFactor, gradeIC } from "@/lib/alpha";
import { fmtPct } from "@/lib/format";
import { PRESETS } from "@/lib/symbols";
import { useAlpha } from "@/lib/use-alpha";
import { cn } from "@/lib/utils";

export function Workspace() {
  const { params, set, state, result, computing } = useAlpha();
  const meta = getFactor(params.factor);

  // The search box is a draft the user can type freely into; it resyncs when
  // the loaded symbol changes some other way (a preset chip). Adjusting during
  // render is React's recommended alternative to a reset effect.
  const [draft, setDraft] = React.useState(params.symbol);
  const [lastSymbol, setLastSymbol] = React.useState(params.symbol);
  if (params.symbol !== lastSymbol) {
    setLastSymbol(params.symbol);
    setDraft(params.symbol);
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = draft.trim().toUpperCase();
    if (s) set("symbol", s);
  };

  const quote = state.status === "ready" ? state.history.quote : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Command bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-2.5">
        <form onSubmit={submit} className="flex items-center gap-1.5">
          <span className="text-amber">&gt;</span>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-7 w-28 uppercase"
            placeholder="TICKER"
            aria-label="Ticker symbol"
            spellCheck={false}
          />
          <Button type="submit" size="sm" variant="outline" aria-label="Load ticker">
            <Search />
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.symbol}
              onClick={() => set("symbol", p.symbol)}
              title={p.label}
              className={cn(
                "border px-1.5 py-0.5 text-[11px] transition-colors",
                params.symbol === p.symbol
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-transparent text-dim hover:border-edge hover:text-text",
              )}
            >
              {p.symbol}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          {quote ? (
            <>
              <span className="tnum text-[12px] text-bright">
                {quote.symbol}
                <span className="ml-2 text-dim">
                  {quote.price.toFixed(2)} {quote.currency}
                </span>
              </span>
              <span
                className={cn(
                  "tnum text-[12px]",
                  quote.changePct >= 0 ? "text-up" : "text-down",
                )}
              >
                {fmtPct(quote.changePct)}
              </span>
            </>
          ) : null}
          {state.status === "loading" || computing ? (
            <Loader2 className="size-3.5 animate-spin text-amber" />
          ) : null}
        </div>
      </div>

      {state.status === "error" ? (
        <ErrorState message={state.message} />
      ) : state.status === "loading" || !result ? (
        <LoadingState symbol={params.symbol} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)]">
          {/* Controls rail */}
          <aside className="space-y-px border-b border-line bg-panel xl:border-b-0 xl:border-r">
            <div className="p-3">
              <Label>Factor</Label>
              <div className="mt-2 space-y-px">
                {FACTORS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => set("factor", f.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 border px-2 py-1.5 text-left text-[12px] transition-colors",
                      params.factor === f.id
                        ? "border-amber/50 bg-amber/[0.07] text-bright"
                        : "border-transparent text-muted hover:border-edge hover:text-bright",
                    )}
                  >
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-[9px] uppercase tracking-[0.1em] text-faint">
                      {f.family}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-line p-3">
              <div className="flex items-baseline justify-between">
                <Label>{meta.paramLabel}</Label>
                <span className="tnum text-[12px] text-bright">
                  {params.param}
                  <span className="ml-1 text-dim">d</span>
                </span>
              </div>
              <input
                type="range"
                min={meta.min}
                max={meta.max}
                value={params.param}
                onChange={(e) => set("param", Number(e.target.value))}
                className="mt-2 w-full accent-[#ffb020]"
                aria-label={meta.paramLabel}
              />
              <div className="tnum flex justify-between text-[10px] text-faint">
                <span>{meta.min}</span>
                <span>{meta.max}</span>
              </div>
            </div>

            <div className="border-t border-line p-3">
              <Label>Forward horizon</Label>
              <div className="mt-2 grid grid-cols-5 gap-px">
                {HORIZON_CHOICES.map((h) => (
                  <button
                    key={h}
                    onClick={() => set("horizon", h)}
                    className={cn(
                      "tnum border py-1 text-[11px] transition-colors",
                      params.horizon === h
                        ? "border-amber bg-amber/10 text-amber"
                        : "border-edge text-dim hover:text-bright",
                    )}
                  >
                    {h}d
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-dim">
                Every statistic below measures the factor against returns{" "}
                {params.horizon} trading {params.horizon === 1 ? "day" : "days"}{" "}
                ahead.
              </p>
            </div>

            <div className="border-t border-line p-3">
              <Label>Thesis</Label>
              <p className="prose-face mt-2 text-[12px] leading-relaxed text-muted">
                {meta.thesis}
              </p>
            </div>
          </aside>

          {/* Analysis */}
          <div className="min-w-0 overflow-auto">
            <Verdict result={result} horizon={params.horizon} />

            <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-2">
              <Panel className="border-0">
                <PanelHead
                  title="IC decay by horizon"
                  right={
                    <span className="text-[10px] text-dim">
                      dashed = selected
                    </span>
                  }
                />
                <div className="p-2">
                  <DecayChart data={result.decay} active={params.horizon} />
                </div>
                <p className="prose-face border-t border-line px-3 py-2 text-[11px] leading-relaxed text-dim">
                  If the line fades toward zero as the horizon grows, the edge is
                  short-lived. A line that holds up means the signal keeps
                  working for weeks.
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
                  Sorted lowest to highest factor score. A usable factor steps
                  upward left to right — Q5 should beat Q1.
                </p>
              </Panel>
            </div>

            <Panel className="border-x-0 border-b-0">
              <PanelHead
                title={`Acting on the signal — ${params.symbol}`}
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
                      result.strategy.cagr >= 0
                        ? ("up" as const)
                        : ("down" as const),
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
                    <Readout
                      label={s.label}
                      value={s.value}
                      tone={s.tone}
                      size="sm"
                    />
                  </div>
                ))}
              </div>

              <p className="prose-face border-t border-line px-3 py-2 text-[11px] leading-relaxed text-dim">
                Long whenever the score sits in the top 40% of everything seen{" "}
                <em>up to that day</em>, flat otherwise. The threshold never uses
                future data, and there is a one-year warm-up before the first
                trade — so this is a fair test, not a curve fit. No costs or
                slippage are applied.{" "}
                <Link href="/guide" className="text-amber hover:underline">
                  How to read this
                </Link>
              </p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

/** The headline call: is there an edge here, and what is it saying now? */
function Verdict({
  result,
  horizon,
}: {
  result: NonNullable<ReturnType<typeof useAlpha>["result"]>;
  horizon: number;
}) {
  const grade = gradeIC(result.ic, result.icTStat);
  const significant = Math.abs(result.icTStat) >= 2;
  const inverted = grade.inverted && significant;

  const toneMap = {
    up: "up",
    amber: "amber",
    dim: "dim",
  } as const;

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

function LoadingState({ symbol }: { symbol: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="text-center">
        <Loader2 className="mx-auto size-5 animate-spin text-amber" />
        <p className="tnum mt-3 text-[12px] text-muted">
          Loading {symbol} daily bars<span className="blink">_</span>
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="max-w-md border border-down/40 bg-down/[0.05] p-4 text-center">
        <AlertTriangle className="mx-auto size-5 text-down" />
        <p className="mt-2 text-[13px] text-bright">Could not load that ticker</p>
        <p className="prose-face mt-1.5 text-[12px] leading-relaxed text-muted">
          {message}
        </p>
      </div>
    </div>
  );
}
