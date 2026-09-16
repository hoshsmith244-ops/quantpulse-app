"use client";

import { AlarmClock, ArrowRight, CircleDot, Lock } from "lucide-react";
import * as React from "react";

import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { analyse, type FactorId } from "@/lib/alpha";
import type { Bar } from "@/lib/types";
import type { History, MarketContext } from "@/lib/symbols";
import { cn } from "@/lib/utils";

/**
 * The pre-close check.
 *
 * The rule reads the daily CLOSE, which creates a timing problem nobody
 * mentions: by the time the close exists, that price is gone. The backtest
 * fills at the close of the signal day, so acting on a signal you read the
 * next morning is not the same trade it measured.
 *
 * The way this is actually traded is to evaluate the rule shortly before the
 * bell using the current price as a provisional close, and send a
 * market-on-close order if it triggers. That is what this panel does: it
 * re-runs the exact same factor with today's live price standing in for the
 * close, and says what the rule would do if the day ended right now.
 *
 * It is explicitly provisional. A move in the last ten minutes can flip it,
 * which is stated rather than hidden.
 */

/** Today's date in the venue's timezone, matching how bars are dated. */
function todayIn(tz: string) {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Replaces today's in-progress bar with the live price, or appends one if
 * Yahoo has not opened today's bar yet.
 */
function withProvisionalClose(
  bars: Bar[],
  livePrice: number,
  tz: string,
): Bar[] {
  const today = todayIn(tz);
  const last = bars[bars.length - 1];
  if (!last) return bars;

  if (last.date === today) {
    return [
      ...bars.slice(0, -1),
      {
        ...last,
        close: livePrice,
        high: Math.max(last.high, livePrice),
        low: Math.min(last.low, livePrice),
      },
    ];
  }

  return [
    ...bars,
    {
      date: today,
      open: livePrice,
      high: livePrice,
      low: livePrice,
      close: livePrice,
      volume: 0,
    },
  ];
}

export function TodayAction({
  history,
  context,
  factor,
  param,
  currentState,
}: {
  history: History;
  context: MarketContext | null;
  factor: FactorId;
  param: number;
  /** what the rule says based on the last completed close */
  currentState: "in" | "out";
}) {
  const session = context?.session;
  const live = context?.regular?.price ?? null;

  // Only meaningful while there is still a close to act on.
  const tradeable = session === "regular" || session === "pre";

  const provisional = React.useMemo(() => {
    if (!tradeable || !live) return null;
    const bars = withProvisionalClose(
      history.bars,
      live,
      history.quote.timezone,
    );
    return analyse(bars, factor, param, 5).signal.state;
  }, [tradeable, live, history, factor, param]);

  if (!tradeable || !provisional || !live) {
    return (
      <Panel>
        <PanelHead
          title="Today's action"
          right={<Tag tone="neutral">
            <Lock className="size-2.5" />
            settled
          </Tag>}
        />
        <p className="prose-face px-4 py-3 text-[12px] leading-relaxed text-muted">
          The market is closed, so today&apos;s close is final and the signal
          above is settled. The next chance to act is before tomorrow&apos;s
          bell — come back while the market is open and this panel will tell you
          whether the rule is about to trigger.
        </p>
      </Panel>
    );
  }

  const changing = provisional !== currentState;
  const entering = changing && provisional === "in";
  const exiting = changing && provisional === "out";

  return (
    <Panel className={cn(changing && (entering ? "border-up/50" : "border-down/50"))}>
      <PanelHead
        title="Today's action"
        right={
          <Tag tone={changing ? (entering ? "up" : "down") : "neutral"}>
            <CircleDot className="size-2.5" />
            {session === "pre" ? "pre-market" : "market open"}
          </Tag>
        }
      />

      <div className="p-4">
        <span className="label">If today closed right now</span>

        <div className="mt-2.5 flex items-center gap-3">
          <span
            className={cn(
              "text-[24px] leading-none",
              entering ? "text-up" : exiting ? "text-down" : "text-muted",
            )}
          >
            {entering ? "BUY AT CLOSE" : exiting ? "SELL AT CLOSE" : "NO ACTION"}
          </span>
        </div>

        <p className="prose-face mt-3 max-w-xl text-[12px] leading-relaxed text-text">
          {changing ? (
            <>
              With {history.quote.symbol} at{" "}
              <span className="tnum text-bright">{live.toFixed(2)}</span>, the
              rule would {entering ? "enter" : "exit"} on today&apos;s close. To
              take the same price the backtest measures, send a{" "}
              <span className="text-amber">market-on-close</span> order before
              the bell.
            </>
          ) : (
            <>
              With {history.quote.symbol} at{" "}
              <span className="tnum text-bright">{live.toFixed(2)}</span>, the
              rule would stay {currentState === "in" ? "in the position" : "out"}{" "}
              at today&apos;s close. Nothing to do.
            </>
          )}
        </p>

        <div className="mt-4 flex items-start gap-2 border-t border-line pt-3">
          <AlarmClock className="mt-0.5 size-3.5 shrink-0 text-dim" />
          <p className="prose-face text-[11px] leading-relaxed text-dim">
            <span className="text-muted">This is provisional.</span> The rule
            reads the closing price, so a move in the final minutes can change
            it. Check again near the bell before acting.
          </p>
        </div>

        {changing ? (
          <div className="mt-2 flex items-start gap-2">
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-dim" />
            <p className="prose-face text-[11px] leading-relaxed text-dim">
              Buying at tomorrow&apos;s open instead is simpler, but it is a
              different trade than the one measured — an overnight gap can move
              the price before you are filled, and none of the results on this
              page account for that.
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
