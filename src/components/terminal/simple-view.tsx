"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleSlash,
  HelpCircle,
  Info,
  MinusCircle,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { PriceWithTrades } from "@/components/charts/charts";
import { MarketContextPanel } from "@/components/terminal/market-context";
import { displayPrice } from "@/components/terminal/price-display";
import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { verdict, type AlphaResult, type FactorMeta } from "@/lib/alpha";
import { fmtPct } from "@/lib/format";
import type { History, MarketContext } from "@/lib/symbols";
import { cn } from "@/lib/utils";

const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * The default view. Leads with what the strategy says to do right now, then
 * whether that strategy has any track record worth trusting. Statistics live
 * behind the Advanced toggle.
 */
export function SimpleView({
  result,
  history,
  factor,
  context,
}: {
  result: AlphaResult;
  history: History;
  factor: FactorMeta;
  context: MarketContext | null;
}) {
  const v = verdict(result);
  const { signal, record, strategy } = result;
  const inPosition = signal.state === "in";
  const price = displayPrice(history, context);

  // Mark an open position to the live price rather than the last daily bar,
  // which can be a session behind. The engine's own figure is used only when
  // no live quote is available.
  const openPct =
    signal.entryPrice && price.isLive
      ? (price.value / signal.entryPrice - 1) * 100
      : signal.openReturnPct;

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4 p-4 lg:p-6">
      {/* ---- What the strategy says right now ---- */}
      <Panel
        className={cn(
          "overflow-hidden",
          inPosition ? "border-up/40" : "border-edge",
        )}
      >
        <PanelHead
          title={`${factor.name} on ${history.quote.symbol}`}
          right={
            signal.freshToday ? (
              <Tag tone="amber">changed today</Tag>
            ) : (
              <Tag tone="neutral">
                {signal.daysInState}d in this state
              </Tag>
            )
          }
        />

        <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-[1fr_300px]">
          <div className="bg-panel p-5">
            <span className="label">The strategy says</span>

            <div className="mt-3 flex items-center gap-3">
              {inPosition ? (
                <CheckCircle2 className="size-7 shrink-0 text-up" />
              ) : (
                <MinusCircle className="size-7 shrink-0 text-dim" />
              )}
              <span
                className={cn(
                  "text-[30px] leading-none",
                  inPosition ? "text-up" : "text-muted",
                )}
              >
                {inPosition ? "HOLD" : "STAY OUT"}
              </span>
            </div>

            <p className="prose-face mt-4 max-w-lg text-[13px] leading-relaxed text-text">
              {inPosition ? (
                <>
                  This strategy would have bought{" "}
                  <span className="text-bright">{history.quote.symbol}</span> on{" "}
                  <span className="text-bright">
                    {prettyDate(signal.entryDate ?? "")}
                  </span>{" "}
                  at{" "}
                  <span className="tnum text-bright">
                    {signal.entryPrice?.toFixed(2)}
                  </span>{" "}
                  and would still be holding it.{" "}
                  {openPct !== null ? (
                    <>
                      That position is{" "}
                      <span className={openPct >= 0 ? "text-up" : "text-down"}>
                        {fmtPct(openPct, 1)}
                      </span>{" "}
                      so far.
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  The conditions for entering are not met, so this strategy is
                  sitting in cash. It buys when {factor.name.toLowerCase()}{" "}
                  climbs into the top 40% of its own recent range, and sells when
                  it drops back out.
                </>
              )}
            </p>

            {!inPosition && signal.proximityPct !== null ? (
              <div className="mt-5 max-w-sm">
                <div className="flex items-baseline justify-between">
                  <span className="label">How close to a buy signal</span>
                  <span className="tnum text-[12px] text-amber">
                    {signal.proximityPct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full bg-line">
                  <div
                    className="h-full bg-amber"
                    style={{ width: `${signal.proximityPct}%` }}
                  />
                </div>
                <p className="prose-face mt-2 text-[11px] leading-relaxed text-dim">
                  Further right means the signal is closer to triggering. This is
                  a gauge, not a countdown — it can move either way tomorrow.
                </p>
              </div>
            ) : null}
          </div>

          {/* Price snapshot */}
          <div className="bg-panel p-5">
            <span className="label">{price.label}</span>
            <div className="tnum mt-3 text-[26px] leading-none text-bright">
              {price.value.toFixed(2)}
              <span className="ml-1.5 text-[13px] text-dim">
                {history.quote.currency}
              </span>
            </div>
            <div
              className={cn(
                "tnum mt-2 text-[14px]",
                price.changePct >= 0 ? "text-up" : "text-down",
              )}
            >
              {fmtPct(price.changePct)} {price.changeLabel}
            </div>
            <p className="prose-face mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-dim">
              {history.quote.name}
              {history.quote.exchange ? ` · ${history.quote.exchange}` : ""}
            </p>
            <p className="prose-face mt-1.5 text-[11px] leading-relaxed text-faint">
              {price.note}
            </p>
          </div>
        </div>

        <p className="prose-face flex items-start gap-2 border-t border-line bg-raised/40 px-5 py-2.5 text-[11px] leading-relaxed text-dim">
          <Info className="mt-0.5 size-3 shrink-0" />
          This is what a mechanical rule would do with past prices — not a
          recommendation to buy or sell anything.
        </p>
      </Panel>

      <MarketContextPanel context={context} />

      {/* ---- Should you trust it? ---- */}
      <Panel>
        <PanelHead title="Is this strategy any good on this stock?" />
        <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-[1fr_320px]">
          <div className="bg-panel p-5">
            <div className="flex items-center gap-2.5">
              {v.level === "promising" ? (
                <CheckCircle2 className="size-5 shrink-0 text-up" />
              ) : v.level === "weak" ? (
                <CircleSlash className="size-5 shrink-0 text-dim" />
              ) : (
                <HelpCircle className="size-5 shrink-0 text-amber" />
              )}
              <span
                className={cn(
                  "text-[19px]",
                  v.tone === "up"
                    ? "text-up"
                    : v.tone === "amber"
                      ? "text-amber"
                      : "text-muted",
                )}
              >
                {v.headline}
              </span>
            </div>
            <p className="prose-face mt-3 max-w-xl text-[13px] leading-relaxed text-text">
              {v.detail}
            </p>
            <Link
              href="/guide"
              className="prose-face mt-4 inline-flex items-center gap-1.5 text-[12px] text-amber hover:underline"
            >
              What does this mean?
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-px bg-line">
            <Stat
              label="Strategy return"
              value={fmtPct(strategy.totalReturnPct, 1)}
              tone={strategy.totalReturnPct >= 0 ? "up" : "down"}
            />
            <Stat
              label="Just holding"
              value={fmtPct(strategy.buyHoldReturnPct, 1)}
              tone="dim"
            />
            <Stat
              label="Trades won"
              value={
                record.completed
                  ? `${record.wins} of ${record.completed}`
                  : "—"
              }
              tone="bright"
            />
            <Stat
              label="Worst drop"
              value={`${strategy.maxDrawdownPct.toFixed(1)}%`}
              tone="down"
            />
          </div>
        </div>
      </Panel>

      {/* ---- Where it would have bought ---- */}
      <Panel>
        <PanelHead
          title="Where it would have bought and sold"
          right={
            <span className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-up">
                <span className="h-2 w-2 bg-up/30 ring-1 ring-up" /> holding
              </span>
              <span className="text-dim">amber line = price</span>
            </span>
          }
        />
        <div className="p-2">
          <PriceWithTrades bars={history.bars} trades={result.trades} />
        </div>
        <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
          Shaded stretches are periods the strategy was holding. It needs a year
          of history before its first trade, so the early part of the chart is
          always empty.
        </p>
      </Panel>

      {/* ---- Recent trades ---- */}
      {record.completed > 0 ? (
        <Panel>
          <PanelHead
            title="Its last few trades"
            right={
              <span className="tnum text-[11px] text-dim">
                {record.completed} completed
              </span>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line">
                  {["Bought", "Sold", "Held", "Result"].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "whitespace-nowrap px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-dim",
                        i === 3 ? "text-right" : "text-left",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...result.trades]
                  .reverse()
                  .slice(0, 8)
                  .map((t, i) => (
                    <tr
                      key={`${t.entryDate}-${i}`}
                      className="border-b border-line-soft last:border-0"
                    >
                      <td className="tnum whitespace-nowrap px-4 py-2 text-muted">
                        {prettyDate(t.entryDate)}
                        <span className="ml-2 text-faint">
                          {t.entryPrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="tnum whitespace-nowrap px-4 py-2 text-muted">
                        {t.exitDate ? (
                          <>
                            {prettyDate(t.exitDate)}
                            <span className="ml-2 text-faint">
                              {t.exitPrice?.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-amber">still holding</span>
                        )}
                      </td>
                      <td className="tnum px-4 py-2 text-dim">
                        {t.barsHeld}d
                      </td>
                      <td
                        className={cn(
                          "tnum px-4 py-2 text-right",
                          t.returnPct >= 0 ? "text-up" : "text-down",
                        )}
                      >
                        {fmtPct(t.returnPct, 1)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
            <Stat
              label="Win rate"
              value={`${record.winRatePct.toFixed(0)}%`}
              tone="bright"
            />
            <Stat
              label="Average win"
              value={fmtPct(record.avgWinPct, 1)}
              tone="up"
            />
            <Stat
              label="Average loss"
              value={fmtPct(record.avgLossPct, 1)}
              tone="down"
            />
            <Stat
              label="Typical hold"
              value={`${record.avgHoldDays.toFixed(0)} days`}
              tone="bright"
            />
          </div>
        </Panel>
      ) : null}

      <p className="prose-face pb-2 text-[11px] leading-relaxed text-faint">
        Results are hypothetical, come from past prices only, and exclude fees
        and slippage. Past performance does not predict future returns. This is
        an educational tool, not investment advice.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "up" | "down" | "bright" | "dim";
}) {
  const tones = {
    up: "text-up",
    down: "text-down",
    bright: "text-bright",
    dim: "text-dim",
  } as const;
  return (
    <div className="bg-panel px-4 py-3">
      <span className="label block truncate">{label}</span>
      <span className={cn("tnum mt-1.5 block text-[17px]", tones[tone])}>
        {value}
      </span>
    </div>
  );
}
