"use client";

import { CircleCheck, CircleHelp, Clock } from "lucide-react";
import * as React from "react";

import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { ACTION_LEAD_MIN, MOC_CUTOFF_MIN } from "@/lib/action-window";
import { getWindowLog, subscribeStore, type WindowLog } from "@/lib/notifications";
import { cn } from "@/lib/utils";

/**
 * Whether today's pre-close window was actually checked.
 *
 * Alerting systems fail silently, and silence looks identical to "all clear".
 * There is no notification for a quiet day — on most days nothing triggers, so
 * a daily "nothing happened" push would be the bulk of all notifications and
 * would teach people to ignore the bell. Instead the app can be *asked*, and
 * answers one of three distinct things rather than one ambiguous nothing:
 *
 *   - checked, and the rules said no
 *   - checked, and it fired (the events are listed above this)
 *   - never checked, because nothing was open during the window
 *
 * The third is the one that matters. It is the difference between "no trade
 * today" and "you missed it".
 */
/** Stable no-op: the date only changes at midnight, which a re-render can wait for. */
const subscribeNothing = () => () => {};

/**
 * Today at the venue the window belongs to.
 *
 * Pinned to New York because that is the venue every watched US equity closes
 * on; a watchlist of foreign listings would want this per-entry, which is not
 * worth the machinery until someone actually has one.
 */
const venueToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export function WindowStatus({ watching }: { watching: number }) {
  const log = React.useSyncExternalStore(
    subscribeStore,
    getWindowLog,
    () => null as WindowLog | null,
  );

  // "Today" depends on a clock the server does not have, so it is read through
  // an external store with a null server snapshot rather than set in an effect.
  // Safe to recompute per call because the snapshot is a STRING: primitives
  // compare by value, so there is no referential churn to loop on.
  const today = React.useSyncExternalStore(
    subscribeNothing,
    venueToday,
    () => null as string | null,
  );

  if (today === null) return null;

  const forToday = log && log.date === today ? log : null;
  const time = (ms: number) =>
    new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <Panel>
      <PanelHead
        title="Today's window"
        right={
          forToday ? (
            <Tag tone={forToday.fired > 0 ? "amber" : "up"}>
              <CircleCheck className="size-2.5" />
              checked
            </Tag>
          ) : (
            <Tag tone="neutral">
              <CircleHelp className="size-2.5" />
              not checked
            </Tag>
          )
        }
      />

      <div className="flex items-start gap-2.5 p-4">
        <Clock
          className={cn(
            "mt-0.5 size-3.5 shrink-0",
            forToday ? "text-up" : "text-dim",
          )}
        />
        <p className="prose-face max-w-2xl text-[12px] leading-relaxed text-text">
          {watching === 0 ? (
            <>
              Nothing is being watched, so there is no window to check. Add a
              ticker and its strategy to the watchlist first.
            </>
          ) : forToday ? (
            <>
              Evaluated{" "}
              <span className="tnum text-bright">{forToday.checks}</span>{" "}
              {forToday.checks === 1 ? "time" : "times"} during today&apos;s
              window
              {forToday.lastCheckAt ? (
                <>
                  , last at{" "}
                  <span className="tnum text-bright">
                    {time(forToday.lastCheckAt)}
                  </span>
                </>
              ) : null}
              .{" "}
              {forToday.fired > 0 ? (
                <span className="text-amber">
                  {forToday.fired} alert{forToday.fired === 1 ? "" : "s"} raised
                  — see above.
                </span>
              ) : (
                <span className="text-up">
                  None of your watched strategies triggered. That is the normal
                  answer on most days, and it is a real answer rather than an
                  absence of one.
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-muted">
                Today&apos;s window has not been checked.
              </span>{" "}
              Nothing was open between{" "}
              <span className="tnum">{ACTION_LEAD_MIN}</span> and{" "}
              <span className="tnum">{MOC_CUTOFF_MIN}</span> minutes before the
              close, so no alert could have been raised — which is not the same
              as nothing having triggered. If a rule did flip, it will appear
              here as a settled record once the bar closes, by which point the
              price it refers to has gone.
            </>
          )}
        </p>
      </div>
    </Panel>
  );
}
