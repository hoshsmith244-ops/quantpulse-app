"use client";

import { AlarmClock, ArrowRight, CircleDot, Clock, Lock, TriangleAlert } from "lucide-react";
import * as React from "react";

import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import {
  ACTION_LEAD_MIN,
  MOC_CUTOFF_MIN,
  TICK_MS,
  actionWindow,
  fmtCountdown,
  windowTimes,
} from "@/lib/action-window";
import { analyse, type FactorId } from "@/lib/alpha";
import { withProvisionalClose } from "@/lib/provisional";
import type { History, MarketContext } from "@/lib/symbols";
import { cn } from "@/lib/utils";

/**
 * The pre-close check — the visible half of the action window.
 *
 * The rule reads the daily CLOSE, which creates a timing problem nobody
 * mentions: by the time the close exists, that price is gone. The backtest
 * fills at the close of the signal day, so acting on a signal read the next
 * morning is not the trade it measured.
 *
 * The way this is actually traded is to evaluate the rule shortly before the
 * bell using the current price as a provisional close, and send a
 * market-on-close order if it triggers. This panel re-runs the exact same
 * factor with the live price standing in for the close and says what the rule
 * would do if the day ended right now.
 *
 * Crucially it also says WHEN that reading is worth anything. Twenty minutes
 * out, it is a decision. Four hours out, it is a guess about four hours of
 * trading, and the panel says so rather than presenting the two identically.
 */

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
  // The countdown has to advance on its own; nothing else re-renders this.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const win = actionWindow(context, now);
  const live = context?.regular?.price ?? null;
  const times = windowTimes(win, context?.timezone ?? "");

  const provisional = React.useMemo(() => {
    if (!live || win.phase === "closed") return null;
    const bars = withProvisionalClose(history.bars, live, history.quote.timezone);
    return analyse(bars, factor, param, 5).signal.state;
  }, [live, win.phase, history, factor, param]);

  // --- Nothing to act on ---------------------------------------------------
  if (win.phase === "closed" || !provisional || !live) {
    return (
      <Panel>
        <PanelHead
          title="Today's action"
          right={
            <Tag tone="neutral">
              <Lock className="size-2.5" />
              settled
            </Tag>
          }
        />
        <p className="prose-face px-4 py-3 text-[12px] leading-relaxed text-muted">
          The market is closed, so today&apos;s close is final and the signal
          above is settled. The next chance to act is in the last twenty minutes
          of the next session — open this while the market is running and it
          becomes a countdown.
        </p>
      </Panel>
    );
  }

  // --- Crypto: no bell to beat --------------------------------------------
  if (win.phase === "always-open") {
    const changing = provisional !== currentState;
    return (
      <Panel>
        <PanelHead
          title="Today's action"
          right={<Tag tone="neutral">always open</Tag>}
        />
        <div className="p-4">
          <span className="label">If the bar closed right now</span>
          <p className="mt-2 text-[20px] leading-none text-muted">
            {changing
              ? provisional === "in"
                ? "WOULD ENTER"
                : "WOULD EXIT"
              : "NO CHANGE"}
          </p>
          <p className="prose-face mt-3 max-w-xl text-[12px] leading-relaxed text-text">
            {history.quote.symbol} never closes, so there is no bell to trade
            into and no on-close order to place. The daily bar simply rolls over
            at midnight UTC. Acting on this is a judgement call about when to
            fill, and the backtest cannot tell you which minute is right.
          </p>
        </div>
      </Panel>
    );
  }

  const changing = provisional !== currentState;
  const entering = changing && provisional === "in";
  const exiting = changing && provisional === "out";
  const inWindow = win.phase === "action";
  const tooLate = win.phase === "final";

  // Colour only where there is something to do about it.
  const tone = changing && !tooLate ? (entering ? "up" : "down") : "neutral";

  return (
    <Panel
      className={cn(
        changing && inWindow && (entering ? "border-up/50" : "border-down/50"),
        changing && tooLate && "border-amber/50",
      )}
    >
      <PanelHead
        title="Today's action"
        right={
          <span className="flex items-center gap-2">
            <Tag tone={inWindow ? tone : "neutral"}>
              <CircleDot className="size-2.5" />
              {win.phase === "early"
                ? "market open"
                : inWindow
                  ? "action window"
                  : "past the cutoff"}
            </Tag>
            <Tag tone={win.minutesToClose !== null && win.minutesToClose <= ACTION_LEAD_MIN ? "amber" : "neutral"}>
              <Clock className="size-2.5" />
              {fmtCountdown(win.minutesToClose)} to close
            </Tag>
          </span>
        }
      />

      <div className="p-4">
        <span className="label">
          {win.phase === "early"
            ? "If today closed right now"
            : "If today closed at this price"}
        </span>

        <div className="mt-2.5 flex items-center gap-3">
          <span
            className={cn(
              "text-[24px] leading-none",
              !changing
                ? "text-muted"
                : tooLate
                  ? "text-amber"
                  : entering
                    ? "text-up"
                    : "text-down",
            )}
          >
            {entering ? "BUY AT CLOSE" : exiting ? "SELL AT CLOSE" : "NO ACTION"}
          </span>
        </div>

        {/* What to do about it, which depends entirely on the phase. */}
        {win.phase === "early" ? (
          <EarlyNotice
            symbol={history.quote.symbol}
            live={live}
            changing={changing}
            opensAt={times.opens}
            countdown={fmtCountdown(
              (win.minutesToClose ?? 0) - ACTION_LEAD_MIN,
            )}
          />
        ) : inWindow ? (
          <WindowNotice
            symbol={history.quote.symbol}
            live={live}
            changing={changing}
            entering={entering}
            currentState={currentState}
            minutesToCutoff={win.minutesToCutoff}
            cutoffAt={times.cutoff}
          />
        ) : (
          <LateNotice
            symbol={history.quote.symbol}
            changing={changing}
            entering={entering}
            cutoffAt={times.cutoff}
            closeAt={times.close}
          />
        )}

        <p className="prose-face mt-4 flex items-start gap-2 border-t border-line pt-3 text-[11px] leading-relaxed text-dim">
          <AlarmClock className="mt-0.5 size-3.5 shrink-0" />
          <span>
            The window opens at{" "}
            <span className="tnum text-muted">{times.opens}</span>, on-close
            orders stop at{" "}
            <span className="tnum text-muted">{times.cutoff}</span>, and the
            bell is at <span className="tnum text-muted">{times.close}</span>{" "}
            {context?.timezone ? (
              <span className="text-faint">{context.timezone}</span>
            ) : null}
            . Those are the exchange&apos;s times — your broker may cut off
            earlier, and some do not accept on-close orders at all.
          </span>
        </p>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function EarlyNotice({
  symbol,
  live,
  changing,
  opensAt,
  countdown,
}: {
  symbol: string;
  live: number;
  changing: boolean;
  opensAt: string;
  countdown: string;
}) {
  return (
    <>
      <p className="prose-face mt-3 max-w-xl text-[12px] leading-relaxed text-text">
        With {symbol} at{" "}
        <span className="tnum text-bright">{live.toFixed(2)}</span>, the rule{" "}
        {changing ? "would flip" : "would not change"} on today&apos;s close.
      </p>
      <p className="prose-face mt-2 flex max-w-xl items-start gap-2 text-[12px] leading-relaxed text-amber">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <span className="text-bright">Too early to act on this.</span> The
          rule reads the closing price and there is still {countdown} of trading
          left, which is more than enough to reverse it. No alert is sent until{" "}
          <span className="tnum">{opensAt}</span>, deliberately — acting on a
          reading this early is acting on noise.
        </span>
      </p>
    </>
  );
}

function WindowNotice({
  symbol,
  live,
  changing,
  entering,
  currentState,
  minutesToCutoff,
  cutoffAt,
}: {
  symbol: string;
  live: number;
  changing: boolean;
  entering: boolean;
  currentState: "in" | "out";
  minutesToCutoff: number | null;
  cutoffAt: string;
}) {
  if (!changing) {
    return (
      <p className="prose-face mt-3 max-w-xl text-[12px] leading-relaxed text-text">
        With {symbol} at{" "}
        <span className="tnum text-bright">{live.toFixed(2)}</span>, the rule
        would stay {currentState === "in" ? "in the position" : "out"} at
        today&apos;s close. Nothing to do.
      </p>
    );
  }

  return (
    <>
      <p className="prose-face mt-3 max-w-xl text-[12px] leading-relaxed text-text">
        With {symbol} at{" "}
        <span className="tnum text-bright">{live.toFixed(2)}</span>, the rule
        would {entering ? "enter" : "exit"} on today&apos;s close, and there is
        still time to take that price.
      </p>

      <div className="mt-3 border border-amber/40 bg-amber/[0.06] p-3">
        <p className="prose-face text-[12px] leading-relaxed text-text">
          <span className="text-amber">
            {minutesToCutoff !== null && minutesToCutoff < 1
              ? "Under a minute"
              : `About ${Math.round(minutesToCutoff ?? 0)} minutes`}{" "}
            left
          </span>{" "}
          to send a <span className="text-bright">market-on-close</span> order —
          the exchange stops accepting them at{" "}
          <span className="tnum text-bright">{cutoffAt}</span>. That order fills
          at the official close, which is the exact price every figure on this
          page is measured against.
        </p>
        <p className="prose-face mt-2 text-[11px] leading-relaxed text-dim">
          If your broker does not offer on-close orders, a plain market order in
          the last minute or two is the nearest thing. Buying at tomorrow&apos;s
          open instead is a different trade — an overnight gap can move the
          price before you are filled, and none of the results here account for
          that.
        </p>
      </div>
    </>
  );
}

function LateNotice({
  symbol,
  changing,
  entering,
  cutoffAt,
  closeAt,
}: {
  symbol: string;
  changing: boolean;
  entering: boolean;
  cutoffAt: string;
  closeAt: string;
}) {
  return (
    <>
      <p className="prose-face mt-3 max-w-xl text-[12px] leading-relaxed text-text">
        {changing ? (
          <>
            The rule would {entering ? "enter" : "exit"} {symbol} on
            today&apos;s close, but the window to order into that close has
            passed.
          </>
        ) : (
          <>
            The rule would not change on today&apos;s close, and the window to
            order into it has passed anyway.
          </>
        )}
      </p>

      <div className="mt-3 flex items-start gap-2 border-t border-line pt-3">
        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-dim" />
        <p className="prose-face text-[11px] leading-relaxed text-dim">
          On-close orders stopped being accepted at{" "}
          <span className="tnum text-muted">{cutoffAt}</span>, {MOC_CUTOFF_MIN}{" "}
          minutes before the {closeAt} bell.{" "}
          {changing ? (
            <>
              A market order in the remaining minutes will fill near the close
              but not at it, and tomorrow&apos;s open is a different trade than
              the one measured. Neither is wrong — just know which one you are
              taking.
            </>
          ) : (
            <>Nothing was required today.</>
          )}
        </p>
      </div>
    </>
  );
}
