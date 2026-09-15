"use client";

import { ChevronDown, Search } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/terminal";
import { FACTORS, HORIZON_CHOICES, type FactorMeta } from "@/lib/alpha";
import type { SentimentSeries } from "@/lib/symbols";
import { PRESETS } from "@/lib/symbols";
import type { Params } from "@/lib/use-alpha";
import type { Mode } from "@/lib/use-mode";
import { cn } from "@/lib/utils";

/** Ticker search plus quick-pick chips. Shared by both modes. */
export function TickerBar({
  params,
  set,
  right,
}: {
  params: Params;
  set: <K extends keyof Params>(k: K, v: Params[K]) => void;
  right?: React.ReactNode;
}) {
  const [draft, setDraft] = React.useState(params.symbol);
  const [lastSymbol, setLastSymbol] = React.useState(params.symbol);
  if (params.symbol !== lastSymbol) {
    setLastSymbol(params.symbol);
    setDraft(params.symbol);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-2.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const s = draft.trim().toUpperCase();
          if (s) set("symbol", s);
        }}
        className="flex items-center gap-1.5"
      >
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

      {right ? <div className="ml-auto flex items-center gap-3">{right}</div> : null}
    </div>
  );
}

/**
 * Strategy picker for simple mode: a plain dropdown plus one line explaining
 * what the strategy believes. No windows, no horizons, no jargon.
 */
/** Factors whose data is actually available right now. */
export function usableFactors(sentiment: SentimentSeries | null) {
  return FACTORS.filter((f) => !f.external || sentiment?.available);
}

export function SimpleStrategyPicker({
  params,
  set,
  meta,
  sentiment,
}: {
  params: Params;
  set: <K extends keyof Params>(k: K, v: Params[K]) => void;
  meta: FactorMeta;
  sentiment: SentimentSeries | null;
}) {
  const options = usableFactors(sentiment);
  return (
    <div className="flex flex-col gap-3 border-b border-line bg-panel px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2.5">
        <Label className="shrink-0">Strategy</Label>
        <div className="relative">
          <select
            value={params.factor}
            onChange={(e) =>
              set("factor", e.target.value as Params["factor"])
            }
            aria-label="Strategy"
            className="h-8 appearance-none border border-edge bg-base py-0 pl-2.5 pr-8 text-[13px] text-bright outline-none transition-colors hover:border-dim focus-visible:border-amber"
          >
            {options.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-dim" />
        </div>
      </div>

      <p className="prose-face min-w-0 flex-1 text-[12px] leading-relaxed text-muted sm:border-l sm:border-line sm:pl-4">
        {meta.thesis}
      </p>
    </div>
  );
}

/** Full parameter rail for advanced mode. */
export function AdvancedControls({
  params,
  set,
  meta,
  sentiment,
}: {
  params: Params;
  set: <K extends keyof Params>(k: K, v: Params[K]) => void;
  meta: FactorMeta;
  sentiment: SentimentSeries | null;
}) {
  const options = usableFactors(sentiment);
  return (
    <aside className="space-y-px border-b border-line bg-panel xl:border-b-0 xl:border-r">
      <div className="p-3">
        <Label>Factor</Label>
        <div className="mt-2 space-y-px">
{options.map((f) => (
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
          Every statistic measures the factor against returns {params.horizon}{" "}
          trading {params.horizon === 1 ? "day" : "days"} ahead.
        </p>
      </div>

      <div className="border-t border-line p-3">
        <Label>Thesis</Label>
        <p className="prose-face mt-2 text-[12px] leading-relaxed text-muted">
          {meta.thesis}
        </p>
      </div>
    </aside>
  );
}

/** Simple / Advanced switch. */
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="flex items-center border border-edge">
      {(["simple", "advanced"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={cn(
            "px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] transition-colors",
            mode === m
              ? "bg-amber text-black"
              : "text-dim hover:text-bright",
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
