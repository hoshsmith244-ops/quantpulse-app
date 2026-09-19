import "server-only";

import {
  ACTION_LEAD_MIN,
  MOC_CUTOFF_MIN,
  actionWindow,
  decideAlert,
  venueTime,
} from "@/lib/action-window";
import { DEFAULT_COST_BPS, analyse, getFactor, type FactorId } from "@/lib/alpha";
import { todayAtVenue } from "@/lib/bars";
import { fetchContext } from "@/lib/context";
import { EMAIL_CONFIGURED, sendEmail } from "@/lib/email";
import { fetchHistory } from "@/lib/market";
import { withProvisionalClose } from "@/lib/provisional";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { composeAlert, type AlertLine } from "@/lib/cron/compose-alert";

/**
 * The scheduled pre-close pass.
 *
 * Everything the browser does at 3:40, done server side so it happens whether
 * or not anyone has a tab open — which was the single largest limitation of the
 * feature.
 *
 * THE SCHEDULER IS NOT TRUSTED TO KNOW THE TIME. It is told to call this every
 * few minutes across a broad band, and this decides for itself whether the
 * market is genuinely inside the window by reading the venue's real session
 * end. Daylight saving, market holidays, early closes and scheduler drift then
 * all resolve in one place, instead of being encoded in a cron expression that
 * silently rots twice a year.
 */

/** Reference venue for "is the US market about to close". */
const CLOCK_SYMBOL = "SPY";
/** Watchlists are capped at 40; this bounds a pass regardless. */
const MAX_ENTRIES_PER_USER = 40;
const CONCURRENCY = 6;

type WatchEntry = { symbol: string; factor: FactorId; param: number };

type UserRow = { user_id: string; state: { watchlist?: WatchEntry[]; notifyPrefs?: { email?: boolean } } | null };

export type PreCloseResult = {
  ran: boolean;
  reason?: string;
  sessionDate?: string;
  minutesToCutoff?: number;
  usersConsidered?: number;
  usersEmailed?: number;
  alerts?: number;
  standDowns?: number;
  errors?: string[];
};

export type ProbeResult = {
  marketWindow: { phase: string; actionable: boolean; minutesToClose: number | null };
  sessionDate: string;
  supabase: { configured: boolean; canRead: boolean; error?: string };
  accounts: { total: number; withWatchlist: number; emailAlertsOn: number };
  alertLog: { readable: boolean; rowsToday: number; error?: string };
  email: { configured: boolean; sentTestTo?: string; error?: string };
  ready: boolean;
  blocking: string[];
};

/**
 * Setup diagnostic.
 *
 * The real pass returns early outside the window, which is correct but means
 * the Supabase and email wiring cannot be checked until the ten minutes it
 * actually runs. That is a miserable way to discover a typo in a key, so this
 * exercises every dependency on demand and reports exactly what is missing.
 *
 * `sendTest` additionally puts one clearly-marked sample email through the real
 * sending path, which is the only way to prove deliverability before the day it
 * matters.
 */
export async function probePreClose(sendTest = false): Promise<ProbeResult> {
  const blocking: string[] = [];

  const clock = await fetchContext(CLOCK_SYMBOL).catch(() => null);
  const win = actionWindow(clock);
  const sessionDate = todayAtVenue(clock?.timezone || "America/New_York");

  const admin = getSupabaseAdmin();
  const out: ProbeResult = {
    marketWindow: {
      phase: win.phase,
      actionable: win.actionable,
      minutesToClose: win.minutesToClose === null ? null : Math.round(win.minutesToClose),
    },
    sessionDate,
    supabase: { configured: Boolean(admin), canRead: false },
    accounts: { total: 0, withWatchlist: 0, emailAlertsOn: 0 },
    alertLog: { readable: false, rowsToday: 0 },
    email: { configured: EMAIL_CONFIGURED },
    ready: false,
    blocking: [],
  };

  if (!admin) {
    blocking.push("SUPABASE_SERVICE_ROLE_KEY is not set");
  } else {
    const { data, error } = await admin.from("user_state").select("user_id, state");
    if (error) {
      out.supabase.error = error.message;
      blocking.push(`cannot read user_state: ${error.message}`);
    } else {
      out.supabase.canRead = true;
      const rows = (data as UserRow[] | null) ?? [];
      out.accounts.total = rows.length;
      out.accounts.withWatchlist = rows.filter((r) => (r.state?.watchlist?.length ?? 0) > 0).length;
      out.accounts.emailAlertsOn = rows.filter((r) => r.state?.notifyPrefs?.email === true).length;
      if (out.accounts.emailAlertsOn === 0) {
        blocking.push("nobody has switched email alerts on at /notifications");
      }
    }

    const { data: logRows, error: logErr } = await admin
      .from("alert_log")
      .select("user_id")
      .eq("session_date", sessionDate);
    if (logErr) {
      out.alertLog.error = logErr.message;
      blocking.push(`cannot read alert_log — has supabase/alerts.sql been run? (${logErr.message})`);
    } else {
      out.alertLog.readable = true;
      out.alertLog.rowsToday = (logRows ?? []).length;
    }
  }

  if (!EMAIL_CONFIGURED) blocking.push("RESEND_API_KEY is not set");

  // --- Optional: prove delivery actually works ---------------------------
  if (sendTest && admin && EMAIL_CONFIGURED) {
    const { data } = await admin.from("user_state").select("user_id, state");
    const target = ((data as UserRow[] | null) ?? []).find(
      (r) => r.state?.notifyPrefs?.email === true,
    );
    if (!target) {
      out.email.error = "no account has email alerts switched on";
    } else {
      const { data: userData } = await admin.auth.admin.getUserById(target.user_id);
      const address = userData.user?.email;
      if (!address) {
        out.email.error = "that account has no email address";
      } else {
        const sent = await sendEmail({
          to: address,
          subject: "QuantPulse setup test — not a signal",
          text: [
            "This is a setup test, not a trading signal. Nothing has triggered.",
            "",
            "If you are reading this, the scheduled alert job can reach you:",
            "Supabase, Resend and the endpoint secret are all wired correctly.",
            "",
            "Real alerts only arrive inside the pre-close window and always name",
            "a ticker, a strategy and the minutes left to place the order.",
          ].join("\n"),
          html: "<pre style=\"font:13px ui-monospace,Menlo,monospace;white-space:pre-wrap\">This is a setup test, not a trading signal. Nothing has triggered.\n\nIf you are reading this, the scheduled alert job can reach you:\nSupabase, Resend and the endpoint secret are all wired correctly.\n\nReal alerts only arrive inside the pre-close window and always name\na ticker, a strategy and the minutes left to place the order.</pre>",
        });
        if (sent.ok) out.email.sentTestTo = address;
        else out.email.error = sent.error;
      }
    }
  }

  out.blocking = blocking;
  out.ready = blocking.length === 0;
  return out;
}

export async function runPreClosePass(now = Date.now()): Promise<PreCloseResult> {
  // --- Is it actually the window? ----------------------------------------
  //
  // Checked BEFORE configuration on purpose. It makes the endpoint a usable
  // diagnostic before any of the plumbing exists — curl it and it tells you
  // what it thinks the market is doing — and the answer is the same either way
  // in production, since a configured deployment reaches this check anyway.
  const clock = await fetchContext(CLOCK_SYMBOL).catch(() => null);
  const win = actionWindow(clock, now);
  const sessionDate = todayAtVenue(clock?.timezone || "America/New_York");
  const minutesToCutoff = Math.round(win.minutesToCutoff ?? 0);

  if (!win.actionable) {
    return {
      ran: false,
      reason: `outside the window (${win.phase})`,
      sessionDate,
      ...(win.minutesToClose !== null
        ? { minutesToCutoff: Math.round(win.minutesToClose) }
        : {}),
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ran: false, reason: "sync is not configured", sessionDate, minutesToCutoff };
  }

  // --- Who wants these? ---------------------------------------------------
  const { data: rows, error } = await admin
    .from("user_state")
    .select("user_id, state");
  if (error) return { ran: false, reason: `could not read user_state: ${error.message}` };

  const users = (rows as UserRow[] | null ?? []).filter(
    (r) => r.state?.notifyPrefs?.email === true && (r.state?.watchlist?.length ?? 0) > 0,
  );
  if (users.length === 0) {
    return { ran: true, reason: "nobody has email alerts switched on", sessionDate, minutesToCutoff, usersConsidered: 0 };
  }

  // What has already been sent today, so a pass every few minutes does not
  // repeat itself — and so a withdrawn instruction can be recognised.
  const { data: sentRows } = await admin
    .from("alert_log")
    .select("user_id, entry_key, dir, cancelled_at")
    .eq("session_date", sessionDate);

  const priorOf = new Map<string, { dir: "in" | "out"; cancelled: boolean }>();
  for (const r of (sentRows ?? []) as { user_id: string; entry_key: string; dir: "in" | "out"; cancelled_at: string | null }[]) {
    priorOf.set(`${r.user_id}|${r.entry_key}`, { dir: r.dir, cancelled: r.cancelled_at !== null });
  }

  // --- Evaluate, sharing market data across users -------------------------
  const marketCache = new Map<string, Promise<{ bars: Awaited<ReturnType<typeof fetchHistory>>["bars"]; tz: string; live: number | null } | null>>();

  const load = (symbol: string) => {
    let hit = marketCache.get(symbol);
    if (!hit) {
      hit = (async () => {
        try {
          const [history, context] = await Promise.all([
            fetchHistory(symbol),
            fetchContext(symbol).catch(() => null),
          ]);
          return { bars: history.bars, tz: history.quote.timezone, live: context?.regular?.price ?? null };
        } catch {
          return null;
        }
      })();
      marketCache.set(symbol, hit);
    }
    return hit;
  };

  const errors: string[] = [];
  let usersEmailed = 0;
  let alertCount = 0;
  let standDownCount = 0;

  for (const user of users) {
    const entries = (user.state?.watchlist ?? []).slice(0, MAX_ENTRIES_PER_USER);
    const acts: AlertLine[] = [];
    const standDowns: AlertLine[] = [];

    const queue = [...entries];
    const worker = async () => {
      for (;;) {
        const entry = queue.shift();
        if (!entry) return;
        const market = await load(entry.symbol);
        if (!market || market.live === null) continue;

        const settled = analyse(market.bars, entry.factor, entry.param, 5, {
          costBps: DEFAULT_COST_BPS,
        }).signal.state;
        const provisional = analyse(
          withProvisionalClose(market.bars, market.live, market.tz),
          entry.factor,
          entry.param,
          5,
          { costBps: DEFAULT_COST_BPS },
        ).signal.state;

        const entryKey = `${entry.symbol}:${entry.factor}`;
        const prior = priorOf.get(`${user.user_id}|${entryKey}`);

        const decision = decideAlert({
          actionable: true,
          changing: provisional !== settled,
          provisional,
          today: sessionDate,
          // A cancelled instruction is no longer standing, so it must not be
          // stood down a second time.
          prior: prior && !prior.cancelled ? { date: sessionDate, dir: prior.dir } : null,
        });

        if (decision.emit === "act") {
          acts.push({ symbol: entry.symbol, strategy: getFactor(entry.factor).name, dir: provisional, price: market.live, entryKey });
        } else if (decision.emit === "stand-down" && prior) {
          standDowns.push({ symbol: entry.symbol, strategy: getFactor(entry.factor).name, dir: prior.dir, price: market.live, entryKey });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(1, entries.length)) }, worker));

    if (acts.length === 0 && standDowns.length === 0) continue;

    // --- Deliver --------------------------------------------------------
    const email = await emailOf(user.user_id);
    if (!email) {
      errors.push(`no email address for ${user.user_id.slice(0, 8)}`);
      continue;
    }

    const cutoffAt = venueTime(
      (win.closeAt ?? now) - MOC_CUTOFF_MIN * 60_000,
      clock?.timezone || "America/New_York",
    );
    const message = composeAlert({
      acts,
      standDowns,
      minutesToCutoff,
      cutoffAt,
      leadMinutes: ACTION_LEAD_MIN,
      cutoffMinutes: MOC_CUTOFF_MIN,
    });

    if (EMAIL_CONFIGURED) {
      const sent = await sendEmail({ to: email, ...message });
      if (!sent.ok) {
        errors.push(`send to ${email}: ${sent.error}`);
        // Not recorded as sent, so the next pass retries rather than going
        // silent about a real signal.
        continue;
      }
      usersEmailed++;
    } else {
      errors.push("RESEND_API_KEY not set — computed but not delivered");
    }

    // --- Record -----------------------------------------------------------
    if (acts.length) {
      const { error: upErr } = await admin.from("alert_log").upsert(
        acts.map((a) => ({
          user_id: user.user_id,
          entry_key: a.entryKey,
          session_date: sessionDate,
          dir: a.dir,
          cancelled_at: null,
        })),
        { onConflict: "user_id,entry_key,session_date" },
      );
      if (upErr) errors.push(`alert_log upsert: ${upErr.message}`);
    }
    for (const s of standDowns) {
      const { error: cErr } = await admin
        .from("alert_log")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("user_id", user.user_id)
        .eq("entry_key", s.entryKey)
        .eq("session_date", sessionDate);
      if (cErr) errors.push(`alert_log cancel: ${cErr.message}`);
    }

    alertCount += acts.length;
    standDownCount += standDowns.length;
  }

  return {
    ran: true,
    sessionDate,
    minutesToCutoff,
    usersConsidered: users.length,
    usersEmailed,
    alerts: alertCount,
    standDowns: standDownCount,
    ...(errors.length ? { errors } : {}),
  };

  async function emailOf(userId: string): Promise<string | null> {
    const { data, error: err } = await admin!.auth.admin.getUserById(userId);
    if (err) return null;
    return data.user?.email ?? null;
  }
}

