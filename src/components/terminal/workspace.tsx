"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import * as React from "react";

import {
  AdvancedControls,
  ModeToggle,
  SimpleStrategyPicker,
  TickerBar,
} from "@/components/terminal/controls";
import { AdvancedView } from "@/components/terminal/advanced-view";
import { useMarketContext } from "@/components/terminal/market-context";
import { displayPrice } from "@/components/terminal/price-display";
import { WatchButton } from "@/components/terminal/watch-button";
import { SimpleView } from "@/components/terminal/simple-view";
import { getFactor } from "@/lib/alpha";
import { fmtPct } from "@/lib/format";
import { useAlpha } from "@/lib/use-alpha";
import { useMode } from "@/lib/use-mode";
import { cn } from "@/lib/utils";

export function Workspace() {
  const { params, set, state, result, computing, sentiment, sentimentMap } =
    useAlpha();
  const meta = getFactor(params.factor);

  const [mode, setMode] = useMode();
  // One poll shared by the header readout and the context panel below.
  const context = useMarketContext(params.symbol);

  const quote = state.status === "ready" ? state.history.quote : null;

  // Same source of truth as the price panel, so the header can never disagree
  // with the figure shown below it.
  const headline =
    state.status === "ready" ? displayPrice(state.history, context) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TickerBar
        params={params}
        set={set}
        right={
          <>
{quote ? (
              <span className="hidden items-center gap-3 sm:flex">
                <span className="tnum text-[12px] text-bright">
                  {quote.symbol}
<span className="ml-2 text-dim">
                    {headline?.value.toFixed(2)}
                  </span>
                </span>
                <span
                  className={cn(
                    "tnum text-[12px]",
(headline?.changePct ?? 0) >= 0 ? "text-up" : "text-down",
                  )}
                >
{fmtPct(headline?.changePct ?? 0)}
                </span>
              </span>
            ) : null}
            {state.status === "loading" || computing ? (
              <Loader2 className="size-3.5 animate-spin text-amber" />
            ) : null}
<WatchButton
              symbol={params.symbol}
              factor={params.factor}
              param={params.param}
            />
            <ModeToggle mode={mode} onChange={setMode} />
          </>
        }
      />

      {mode === "simple" ? (
        <SimpleStrategyPicker
          params={params}
          set={set}
          meta={meta}
          sentiment={sentiment}
        />
      ) : null}

      {state.status === "error" ? (
        <ErrorState message={state.message} />
      ) : state.status === "loading" || !result ? (
        <LoadingState symbol={params.symbol} />
      ) : mode === "simple" ? (
        <div className={cn("transition-opacity", computing && "opacity-60")}>
          <SimpleView
            result={result}
            history={state.history}
            factor={meta}
            param={params.param}
            costBps={params.costBps}
            onCostChange={(bps) => set("costBps", bps)}
            context={context}
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)]">
          <AdvancedControls
            params={params}
            set={set}
            meta={meta}
            sentiment={sentiment}
          />
          <div
            className={cn(
              "min-w-0 overflow-auto transition-opacity",
              computing && "opacity-60",
            )}
          >
            <AdvancedView
              result={result}
              params={params}
              symbol={params.symbol}
              bars={state.history.bars}
              onApplyParam={(p) => set("param", p)}
              sentimentMap={sentimentMap}
              costBps={params.costBps}
              onCostChange={(bps) => set("costBps", bps)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingState({ symbol }: { symbol: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="text-center">
        <Loader2 className="mx-auto size-5 animate-spin text-amber" />
        <p className="tnum mt-3 text-[12px] text-muted">
          Loading {symbol}
          <span className="blink">_</span>
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
        <p className="mt-2 text-[13px] text-bright">
          Could not load that ticker
        </p>
        <p className="prose-face mt-1.5 text-[12px] leading-relaxed text-muted">
          {message}
        </p>
      </div>
    </div>
  );
}
