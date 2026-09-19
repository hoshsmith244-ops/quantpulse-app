"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BellOff,
  Check,
  Clock,
  Info,
  Lock,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AppShell } from "@/components/shell/app-shell";
import { WindowStatus } from "@/components/shell/window-status";
import { Button } from "@/components/ui/button";
import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { ACTION_LEAD_MIN, MOC_CUTOFF_MIN } from "@/lib/action-window";
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
import { useAccount } from "@/lib/use-account";
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
  const emailOn = React.useSyncExternalStore(
    subscribeStore,
    () => getPrefs().email === true,
    () => false,
  );
  // The email job needs an account: it runs on a server and has to know where
  // to send the message.
  const { session, email } = useAccount();

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

        <WindowStatus watching={entries.length} />

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

            {/* The only delivery that survives a closed tab. */}
            <div className="flex items-start justify-between gap-6 border-t border-line pt-3">
              <div>
                <p className="text-[13px] text-bright">
                  Email during the pre-close window
                </p>
                <p className="prose-face mt-1 max-w-lg text-[12px] leading-relaxed text-muted">
                  A scheduled job checks your watchlist at{" "}
                  {ACTION_LEAD_MIN} minutes to the bell and emails you if a rule
                  would trigger — <span className="text-bright">whether or
                  not anything is open</span>. The only alert here that reaches
                  you when the app is shut.
                </p>
              </div>
              <Button
                size="sm"
                variant={emailOn ? "primary" : "outline"}
                onClick={() => setPrefs({ ...getPrefs(), email: !emailOn })}
                disabled={!session}
              >
                {emailOn ? "On" : "Turn on"}
              </Button>
            </div>

            {!session ? (
              <p className="prose-face flex items-start gap-2 text-[11px] leading-relaxed text-dim">
                <Info className="mt-0.5 size-3 shrink-0" />
                <span>
                  Requires an account — the job runs on a server and has to know
                  where to send it. Sign in on the{" "}
                  <Link href="/membership" className="text-amber hover:underline">
                    membership page
                  </Link>
                  .
                </span>
              </p>
            ) : emailOn ? (
              <p className="prose-face flex items-start gap-2 text-[11px] leading-relaxed text-dim">
                <Info className="mt-0.5 size-3 shrink-0" />
                <span>
                  Sending to <span className="text-muted">{email}</span>. The
                  setting travels with your account, so it applies no matter
                  which device you set it on.
                </span>
              </p>
            ) : null}

            {session && emailOn ? <EmailSetupTest /> : null}
          </div>
        </Panel>

        {/* When alerts fire, and why that specific window. */}
        <Panel>
          <PanelHead
            title="When alerts fire"
            right={
              <Tag tone="amber">
                <Clock className="size-2.5" />
                last {ACTION_LEAD_MIN} minutes
              </Tag>
            }
          />
          <div className="p-4">
            <ol className="space-y-3">
              <Step
                when={`${ACTION_LEAD_MIN} min before the close`}
                title="The window opens"
                tone="amber"
              >
                Every watched name is re-run with the live price standing in for
                today&apos;s close. If the rule would flip, you get one alert —
                with the minutes remaining to place the order.
              </Step>
              <Step
                when={`${MOC_CUTOFF_MIN} min before the close`}
                title="On-close orders stop"
                tone="neutral"
              >
                The exchange accepts no new market-on-close or limit-on-close
                orders after this. Alerts stop too, because there is nothing
                actionable left to say.
              </Step>
              <Step when="Any time in between" title="Stand-down" tone="down">
                If the price moves back and the rule no longer triggers, the
                earlier alert is withdrawn. Without this a single alert could
                send you into a trade the strategy never wanted.
              </Step>
              <Step when="After the close" title="Settled" tone="up">
                The bar is final, so the entry or exit is recorded — with the
                realised return on exits. These arrive whenever you open the
                app, at any hour, and are marked <em>settled</em>. They are
                history, not a prompt: the price they refer to has already
                traded.
              </Step>
            </ol>

            <p className="prose-face mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-text">
              <span className="text-amber">
                What happens while the app is closed.
              </span>{" "}
              The app remembers the last state it saw for each watched name, so
              on the next open it reports anything that changed — you will not
              miss the fact that a position opened or closed. Two limits worth
              knowing:{" "}
              <span className="text-muted">
                only the net change is reported
              </span>
              , so if a name entered and then exited while you were away, you
              see the exit and never hear about the entry; and{" "}
              <span className="text-muted">
                pre-close alerts do not queue up
              </span>{" "}
              — they are only useful inside their window, so if the app was shut
              at 3:40 there is nothing to deliver later. The settled record
              arrives instead.
            </p>

            <p className="prose-face mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-dim">
              Times come from each venue&apos;s own calendar, so a 4:00pm New
              York close puts the window at 3:40–3:50pm, London&apos;s 4:30pm
              close puts it at 4:10–4:20pm, and half-day holidays shift
              automatically. Crypto never closes, so no window applies to it.
              Your broker may stop accepting on-close orders earlier than the
              exchange does — check before relying on the last minute.
            </p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

/**
 * "Will this actually reach me?", answered by pressing a button.
 *
 * The scheduled job only speaks inside a ten-minute window, so a mistake in the
 * server setup — a missing key, a stale deployment, a preference that never
 * synced — stays invisible until the one moment it costs you a trade. This
 * sends one clearly-marked email through the real delivery path so the whole
 * chain is proven at a time of your choosing.
 */
function EmailSetupTest() {
  const [state, setState] = React.useState<
    | { phase: "idle" }
    | { phase: "running" }
    | { phase: "done"; ok: boolean; message: string }
  >({ phase: "idle" });

  const run = async () => {
    setState({ phase: "running" });
    try {
      const res = await fetch("/api/alerts/self-test", { method: "POST" });
      const body = (await res.json()) as {
        ok?: boolean;
        problem?: string;
        email?: string;
        watching?: number;
      };
      setState({
        phase: "done",
        ok: body.ok === true,
        message: body.ok
          ? `Sent to ${body.email}. It should arrive within a minute — check spam if not, and mark it "not spam" so real alerts land in your inbox.`
          : (body.problem ?? "The test did not complete."),
      });
    } catch {
      setState({
        phase: "done",
        ok: false,
        message: "Could not reach the server. Check your connection and try again.",
      });
    }
  };

  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[13px] text-bright">Test the setup</p>
          <p className="prose-face mt-1 max-w-lg text-[12px] leading-relaxed text-muted">
            Sends one email now, marked clearly as a test. Worth doing once:
            the real job only speaks inside a ten-minute window, so anything
            broken stays hidden until the moment it matters.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={run}
          disabled={state.phase === "running"}
        >
          {state.phase === "running" ? "Sending…" : "Send test"}
        </Button>
      </div>

      {state.phase === "done" ? (
        <p
          className={cn(
            "prose-face mt-3 flex items-start gap-2 text-[11px] leading-relaxed",
            state.ok ? "text-up" : "text-down",
          )}
        >
          {state.ok ? (
            <Check className="mt-0.5 size-3 shrink-0" />
          ) : (
            <Info className="mt-0.5 size-3 shrink-0" />
          )}
          <span>{state.message}</span>
        </p>
      ) : null}
    </div>
  );
}

function Step({
  when,
  title,
  tone,
  children,
}: {
  when: string;
  title: string;
  tone: "amber" | "up" | "down" | "neutral";
  children: React.ReactNode;
}) {
  const dot = {
    amber: "bg-amber",
    up: "bg-up",
    down: "bg-down",
    neutral: "bg-dim",
  }[tone];

  return (
    <li className="flex gap-3">
      <span className={cn("mt-1.5 size-2 shrink-0", dot)} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[13px] text-bright">{title}</span>
          <span className="text-[10px] uppercase tracking-[0.1em] text-dim">
            {when}
          </span>
        </span>
        <span className="prose-face mt-0.5 block max-w-2xl text-[12px] leading-relaxed text-muted">
          {children}
        </span>
      </span>
    </li>
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
        event.provisional && !event.cancelled && "border-l-2 border-amber",
        event.cancelled && "border-l-2 border-dim bg-raised/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center border",
          event.cancelled
            ? "border-dim/50 bg-raised text-muted"
            : entered
              ? "border-up/40 bg-up/10 text-up"
              : "border-down/40 bg-down/10 text-down",
        )}
      >
        {event.cancelled ? (
          <Undo2 className="size-3.5" />
        ) : entered ? (
          <ArrowUpRight className="size-3.5" />
        ) : (
          <ArrowDownRight className="size-3.5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="tnum text-[13px] text-bright">{event.symbol}</span>
          <span
            className={cn(
              "text-[13px]",
              event.cancelled
                ? "text-muted"
                : entered
                  ? "text-up"
                  : "text-down",
            )}
          >
            {event.cancelled
              ? "STAND DOWN"
              : event.provisional
                ? entered
                  ? "BUY AT CLOSE"
                  : "SELL AT CLOSE"
                : entered
                  ? "NOW HOLDING"
                  : "NOW FLAT"}
          </span>
          {event.cancelled ? (
            <Tag tone="neutral">cancelled</Tag>
          ) : event.provisional ? (
            <Tag tone="amber">
              act today
              {event.minutesLeft !== undefined
                ? ` · ${event.minutesLeft}m`
                : ""}
            </Tag>
          ) : (
            /* Settled events are history. Saying so stops an evening
               notification reading as a prompt to go and trade. */
            <Tag tone="neutral">
              <Lock className="size-2.5" />
              settled
            </Tag>
          )}
          {!event.read ? <Tag tone="amber">new</Tag> : null}
        </span>

        <span className="prose-face mt-1 block text-[12px] leading-relaxed text-muted">
          {event.cancelled ? (
            <>
              The earlier {entered ? "buy" : "sell"} alert on {meta.name} no
              longer holds — {event.symbol} moved to{" "}
              <span className="tnum text-text">{event.price.toFixed(2)}</span>{" "}
              and the rule does not trigger at that price.{" "}
              <span className="text-text">
                Do not place the order, or cancel it if you already did.
              </span>
            </>
          ) : event.provisional ? (
            <>
              {meta.name} · would {entered ? "enter" : "exit"} if today closed
              near{" "}
              <span className="tnum text-text">{event.price.toFixed(2)}</span>.
              Send a market-on-close order before the cutoff to take that price.
              Provisional — a late move can still change it, and you will get a
              stand-down here if it does.
            </>
          ) : (
            <>
              {meta.name} · the rule {entered ? "entered" : "exited"} on the{" "}
              <span className="text-text">{prettyDate(event.date)}</span> close
              at <span className="tnum text-text">{event.price.toFixed(2)}</span>
              {event.returnPct !== undefined ? (
                <>
                  {" "}
                  — that trade made{" "}
                  <span
                    className={event.returnPct >= 0 ? "text-up" : "text-down"}
                  >
                    {fmtPct(event.returnPct, 1)}
                  </span>
                </>
              ) : null}
              .{" "}
              <span className="text-dim">
                That bar is final, so this is a record of what the strategy did
                — not something to act on now. The chance to take that price was
                the {ACTION_LEAD_MIN} minutes before the bell.
              </span>
            </>
          )}
        </span>
      </span>

      <span className="tnum shrink-0 text-[10px] text-faint">
        {relative(event.at)}
      </span>
    </li>
  );
}
