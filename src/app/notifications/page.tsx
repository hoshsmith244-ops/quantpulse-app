"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BellOff,
  Check,
  Info,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { getFactor } from "@/lib/alpha";
import { fmtPct } from "@/lib/format";
import {
  checkSignals,
  getPermission,
  getPrefs,
  refreshStore,
  setPrefs,
  subscribeStore,
  useNotifications,
  type SignalEvent,
} from "@/lib/notifications";
import { useWatchlist } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

function relative(ms: number) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const { events, unread, markAllRead, clearAll } = useNotifications();
  const { entries } = useWatchlist();

  const [checking, setChecking] = React.useState(false);

  // Both are browser-only values that do not exist during SSR. Reading them
  // through useSyncExternalStore (server snapshot: off / "default") keeps the
  // first client render identical to the server markup, and React applies the
  // real values straight after hydration without a mismatch.
  const browserOn = React.useSyncExternalStore(
    subscribeStore,
    () => getPrefs().browser,
    () => false,
  );
  const permission = React.useSyncExternalStore(
    subscribeStore,
    getPermission,
    () => "default" as const,
  );

  const toggleBrowser = async () => {
    if (browserOn) {
      setPrefs({ browser: false });
      return;
    }
    if (typeof Notification === "undefined") return;
    const granted =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (granted === "granted") setPrefs({ browser: true });
    // The prompt changed permission outside React; nudge subscribers.
    refreshStore();
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      await checkSignals(entries);
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[900px] space-y-4 p-4 lg:p-6">
        <Panel>
          <PanelHead
            title="Signal changes"
            right={
              <span className="flex items-center gap-2">
                {unread > 0 ? <Tag tone="amber">{unread} new</Tag> : null}
                <Button size="sm" variant="outline" onClick={checkNow} disabled={checking || entries.length === 0}>
                  {checking ? "Checking…" : "Check now"}
                </Button>
              </span>
            }
          />

          {events.length === 0 ? (
            <div className="p-6">
              <p className="prose-face max-w-xl text-[13px] leading-relaxed text-text">
                {entries.length === 0 ? (
                  <>
                    Nothing to watch yet. Add tickers to your{" "}
                    <Link href="/watchlist" className="text-amber hover:underline">
                      watchlist
                    </Link>{" "}
                    and this page will record every time one of them enters or
                    exits.
                  </>
                ) : (
                  <>
                    No changes recorded yet. Your {entries.length} watched{" "}
                    {entries.length === 1 ? "position is" : "positions are"}{" "}
                    being tracked — the first check records their current state
                    quietly, and anything that changes after that shows up here.
                  </>
                )}
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-line-soft">
                {events.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </ul>
              <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
                <Button size="sm" variant="ghost" onClick={markAllRead}>
                  <Check />
                  Mark all read
                </Button>
                <Button size="sm" variant="ghost" onClick={clearAll}>
                  <Trash2 />
                  Clear
                </Button>
              </div>
            </>
          )}
        </Panel>

        {/* Browser notifications */}
        <Panel>
          <PanelHead title="Delivery" />
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[13px] text-bright">Browser notifications</p>
                <p className="prose-face mt-1 max-w-lg text-[12px] leading-relaxed text-muted">
                  Show a desktop notification when a watched signal changes.
                  These only fire while a QuantPulse tab is open.
                </p>
              </div>
              <Button
                size="sm"
                variant={browserOn ? "primary" : "outline"}
                onClick={toggleBrowser}
                disabled={permission === "denied"}
              >
                {browserOn ? "On" : permission === "denied" ? "Blocked" : "Turn on"}
              </Button>
            </div>

            {permission === "denied" ? (
              <p className="prose-face flex items-start gap-2 border-t border-line pt-3 text-[11px] leading-relaxed text-dim">
                <BellOff className="mt-0.5 size-3 shrink-0" />
                Your browser has blocked notifications for this site. Re-enable
                them in the site permissions, then come back.
              </p>
            ) : null}

            <p className="prose-face flex items-start gap-2 border-t border-line pt-3 text-[11px] leading-relaxed text-dim">
              <Info className="mt-0.5 size-3 shrink-0" />
              QuantPulse has no account system or server scheduler, so it cannot
              reach you when the app is closed. Signals move on the daily close —
              about once a day — so checks happen when you open the app and
              every 15 minutes while it is open. Email or push that works with
              the app shut needs an account, which is the next thing to build.
            </p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function EventRow({ event }: { event: SignalEvent }) {
  const entered = event.kind === "entry";
  const meta = getFactor(event.factor);

  return (
    <li
      className={cn(
        "flex items-start gap-3 px-4 py-3",
        !event.read && "bg-amber/[0.04]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center border",
          entered
            ? "border-up/40 bg-up/10 text-up"
            : "border-down/40 bg-down/10 text-down",
        )}
      >
        {entered ? (
          <ArrowUpRight className="size-3.5" />
        ) : (
          <ArrowDownRight className="size-3.5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="tnum text-[13px] text-bright">{event.symbol}</span>
          <span className={cn("text-[13px]", entered ? "text-up" : "text-down")}>
            {entered ? "ENTERED" : "EXITED"}
          </span>
          {!event.read ? <Tag tone="amber">new</Tag> : null}
        </span>

        <span className="prose-face mt-1 block text-[12px] leading-relaxed text-muted">
          {meta.name} · {entered ? "bought" : "sold"} on{" "}
          <span className="text-text">{prettyDate(event.date)}</span> at{" "}
          <span className="tnum text-text">{event.price.toFixed(2)}</span>
          {event.returnPct !== undefined ? (
            <>
              {" "}
              — closed{" "}
              <span
                className={event.returnPct >= 0 ? "text-up" : "text-down"}
              >
                {fmtPct(event.returnPct, 1)}
              </span>
            </>
          ) : null}
        </span>
      </span>

      <span className="tnum shrink-0 text-[10px] text-faint">
        {relative(event.at)}
      </span>
    </li>
  );
}
