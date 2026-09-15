"use client";

import { FlaskConical, Loader2 } from "lucide-react";
import * as React from "react";

import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { tune, type FactorMeta, type Tuning } from "@/lib/alpha";
import { fmtPct } from "@/lib/format";
import type { Bar } from "@/lib/types";
import { cn } from "@/lib/utils";

const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Walk-forward parameter tuning.
 *
 * Choosing the parameter that made the most money across the whole history is
 * curve fitting: the answer always looks good and predicts nothing. Here the
 * parameter is chosen on the first 60% of the history and then scored on the
 * remaining 40%, which the chooser never saw. The distance between those two
 * columns is the part of the result that was luck.
 */
export function TuningPanel({
  bars,
  factor,
  currentParam,
  onApply,
  sentimentMap,
}: {
  bars: Bar[];
  factor: FactorMeta;
  currentParam: number;
  onApply: (param: number) => void;
  sentimentMap?: Map<string, number>;
}) {
  const [result, setResult] = React.useState<Tuning | null>(null);
  const [running, setRunning] = React.useState(false);

  // Any change of asset or factor invalidates a previous run.
  const key = `${factor.id}:${bars.length}:${bars[bars.length - 1]?.date ?? ""}`;
  const [prevKey, setPrevKey] = React.useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setResult(null);
  }

  const run = () => {
    setRunning(true);
    // Yield to the event loop so the spinner renders before the sweep blocks
    // the thread. Deliberately setTimeout rather than requestAnimationFrame:
    // rAF does not fire while the page is not being painted (a background tab,
    // a hidden pane), which would leave the button spinning forever.
    setTimeout(() => {
      try {
        setResult(
          tune(bars, factor.id, currentParam, { sentiment: sentimentMap }),
        );
      } finally {
        setRunning(false);
      }
    }, 0);
  };

  return (
    <Panel className="border-x-0 border-b-0">
      <PanelHead
        title="Parameter tuning — walk forward"
        right={
          result ? (
            <Tag tone={result.chosen.testPct > result.testBuyHoldPct ? "up" : "amber"}>
              {result.chosen.testPct > result.testBuyHoldPct
                ? "beat buy & hold"
                : "lost to buy & hold"}
            </Tag>
          ) : null
        }
      />

      {!result ? (
        <div className="flex flex-col items-start gap-3 p-4">
          <p className="prose-face max-w-2xl text-[12px] leading-relaxed text-muted">
            Tunes {factor.paramLabel.toLowerCase()} on the first 60% of the
            history, then scores that choice on the 40% it never saw. Tuning
            across the whole history instead would always look better and mean
            nothing.
          </p>
          <button
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-2 border border-amber bg-amber px-3 py-1.5 text-[12px] uppercase tracking-[0.08em] text-black transition-colors hover:bg-amber/85 disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FlaskConical className="size-3.5" />
            )}
            {running ? "Tuning…" : "Run walk-forward tuning"}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
            <Cell
              label="Tuning picked"
              value={String(result.chosen.param)}
              sub={`${factor.paramLabel.toLowerCase()} · ${result.chosen.trades} trades`}
              tone="text-amber"
            />
            <Cell
              label="On training data"
              value={fmtPct(result.chosen.trainPct, 1)}
              sub={`to ${prettyDate(result.splitDate)} · what it was chosen for`}
              tone={result.chosen.trainPct >= 0 ? "text-up" : "text-down"}
            />
            <Cell
              label="Out of sample"
              value={fmtPct(result.chosen.testPct, 1)}
              sub="the only number that means anything"
              tone={result.chosen.testPct >= 0 ? "text-up" : "text-down"}
            />
            <Cell
              label="Buy & hold, same window"
              value={fmtPct(result.testBuyHoldPct, 1)}
              sub="the bar to clear"
              tone="text-dim"
            />
          </div>

          <div className="border-t border-line px-4 py-3">
            <p className="prose-face max-w-3xl text-[12px] leading-relaxed text-text">
              {result.chosen.testPct > result.testBuyHoldPct ? (
                <>
                  <span className="text-up">
                    The tuned setting held up out of sample
                  </span>{" "}
                  and beat buying and holding over the same window. That is the
                  uncommon case — check it on other tickers before believing it.
                </>
              ) : (
                <>
                  <span className="text-amber">
                    The tuned setting did not beat buying and holding
                  </span>{" "}
                  over the window it was tested on, despite being the best
                  choice available on the training data. This is the usual
                  outcome, and it is why tuning on all the data is misleading.
                </>
              )}{" "}
              With hindsight the best setting would have been{" "}
              <span className="tnum text-bright">{result.hindsight.param}</span>{" "}
              at{" "}
              <span
                className={cn(
                  "tnum",
                  result.hindsight.testPct >= 0 ? "text-up" : "text-down",
                )}
              >
                {fmtPct(result.hindsight.testPct, 1)}
              </span>
              {result.hindsight.param !== result.chosen.param ? (
                <> — a different value than tuning chose, which is the point.</>
              ) : (
                <> — the same value tuning chose, which does happen.</>
              )}
            </p>
          </div>

          <div className="max-h-64 overflow-auto border-t border-line">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 bg-panel">
                <tr className="border-b border-line">
                  {[
                    factor.paramLabel,
                    "Training",
                    "Out of sample",
                    "Trades",
                    "",
                  ].map((h, i) => (
                    <th
                      key={h || i}
                      className={cn(
                        "whitespace-nowrap px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-dim",
                        i === 0 ? "text-left" : "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => {
                  const isCurrent = r.param === currentParam;
                  const isChosen = r.param === result.chosen.param;
                  return (
                    <tr
                      key={r.param}
                      className={cn(
                        "border-b border-line-soft last:border-0 hover:bg-raised/50",
                        isCurrent && "bg-amber/[0.06]",
                      )}
                    >
                      <td className="tnum px-4 py-1.5">
                        <span className="flex items-center gap-2">
                          <span className={isCurrent ? "text-amber" : "text-bright"}>
                            {r.param}
                          </span>
                          {isChosen ? <Tag tone="amber">picked</Tag> : null}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "tnum px-4 py-1.5 text-right",
                          r.trainPct >= 0 ? "text-up" : "text-down",
                        )}
                      >
                        {fmtPct(r.trainPct, 1)}
                      </td>
                      <td
                        className={cn(
                          "tnum px-4 py-1.5 text-right font-medium",
                          r.testPct >= 0 ? "text-up" : "text-down",
                        )}
                      >
                        {fmtPct(r.testPct, 1)}
                      </td>
                      <td className="tnum px-4 py-1.5 text-right text-dim">
                        {r.trades}
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        {isCurrent ? (
                          <span className="text-[11px] text-dim">current</span>
                        ) : (
                          <button
                            onClick={() => onApply(r.param)}
                            className="text-[11px] text-amber transition-colors hover:text-bright"
                          >
                            Apply
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
            Read the two return columns together. A row that is strong in
            training and weak out of sample found noise. Prefer a setting that
            is merely decent in both, and that sits among neighbours which are
            also decent — an isolated spike is the signature of a curve fit.
          </p>
        </>
      )}
    </Panel>
  );
}

function Cell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="bg-panel px-4 py-3">
      <span className="label block truncate">{label}</span>
      <span className={cn("tnum mt-1.5 block text-[19px]", tone)}>{value}</span>
      <span className="prose-face mt-1 block text-[11px] leading-snug text-dim">
        {sub}
      </span>
    </div>
  );
}
