/**
 * Verifies the pre-close action window and the alert state machine.
 *
 * Both are time-dependent and only live for twenty minutes a trading day, so
 * they cannot be checked by looking at the running app. This drives them
 * against fixed clocks instead.
 *
 *   node scripts/check-window.mts
 */

import {
  ACTION_LEAD_MIN,
  MOC_CUTOFF_MIN,
  actionWindow,
  decideAlert,
  windowTimes,
} from "../src/lib/action-window.ts";

import type { MarketContext } from "../src/lib/symbols.ts";

let failures = 0;

function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`}`,
  );
}

const ctx = (over: Partial<MarketContext>): MarketContext => ({
  symbol: "TEST",
  session: "regular",
  timezone: "America/New_York",
  regularEnd: null,
  alwaysOpen: false,
  regular: { price: 100, changePct: 0, at: 0 },
  extended: null,
  driftPct: null,
  news: [],
  ...over,
});

// --- Window phases ---------------------------------------------------------
// US equities: 2026-09-16 close at 20:00Z == 4:00pm EDT.
const usClose = Date.parse("2026-09-16T20:00:00Z");
const us = ctx({ regularEnd: usClose });
const at = (hhmm: string) => Date.parse(`2026-09-16T${hhmm}:00Z`);

console.log("\nUS equities — 4:00pm EDT close");
check("9:30am (open)        -> early", actionWindow(us, at("13:30")).phase, "early");
check("3:00pm               -> early", actionWindow(us, at("19:00")).phase, "early");
check("3:39pm               -> early", actionWindow(us, at("19:39")).phase, "early");
check("3:40pm (window opens)-> action", actionWindow(us, at("19:40")).phase, "action");
check("3:45pm               -> action", actionWindow(us, at("19:45")).phase, "action");
check("3:49pm               -> action", actionWindow(us, at("19:49")).phase, "action");
check("3:50pm (MOC cutoff)  -> final", actionWindow(us, at("19:50")).phase, "final");
check("3:59pm               -> final", actionWindow(us, at("19:59")).phase, "final");
check("4:00pm (bell)        -> closed", actionWindow(us, at("20:00")).phase, "closed");
check("4:05pm               -> closed", actionWindow(us, at("20:05")).phase, "closed");

check(
  "actionable only in the window",
  ["19:39", "19:40", "19:49", "19:50"].map((t) => actionWindow(us, at(t)).actionable),
  [false, true, true, false],
);

const t345 = actionWindow(us, at("19:45"));
check("minutes to close at 3:45", Math.round(t345.minutesToClose ?? -1), 15);
check("minutes to MOC cutoff at 3:45", Math.round(t345.minutesToCutoff ?? -1), 5);
check(
  "clock times shown to the user",
  windowTimes(t345, "America/New_York"),
  { opens: "3:40 PM", cutoff: "3:50 PM", close: "4:00 PM" },
);

// --- Other venues ----------------------------------------------------------
console.log("\nLondon — 4:30pm BST close (shifts automatically)");
const lse = ctx({ regularEnd: Date.parse("2026-09-16T15:30:00Z"), timezone: "Europe/London" });
check("4:09pm BST -> early", actionWindow(lse, Date.parse("2026-09-16T15:09:00Z")).phase, "early");
check("4:15pm BST -> action", actionWindow(lse, Date.parse("2026-09-16T15:15:00Z")).phase, "action");
check(
  "window is 4:10-4:20pm London",
  windowTimes(actionWindow(lse, Date.parse("2026-09-16T15:15:00Z")), "Europe/London"),
  { opens: "4:10 PM", cutoff: "4:20 PM", close: "4:30 PM" },
);

console.log("\nHalf-day holiday — 1:00pm close");
const half = ctx({ regularEnd: Date.parse("2026-11-27T18:00:00Z") });
check(
  "window follows the early close",
  windowTimes(actionWindow(half, Date.parse("2026-11-27T17:45:00Z")), "America/New_York"),
  { opens: "12:40 PM", cutoff: "12:50 PM", close: "1:00 PM" },
);

console.log("\nNon-tradeable states");
check("crypto -> always-open", actionWindow(ctx({ alwaysOpen: true }), at("19:45")).phase, "always-open");
check("crypto never actionable", actionWindow(ctx({ alwaysOpen: true }), at("19:45")).actionable, false);
check("pre-market -> closed", actionWindow(ctx({ session: "pre", regularEnd: usClose }), at("12:00")).phase, "closed");
check("post-market -> closed", actionWindow(ctx({ session: "post", regularEnd: usClose }), at("21:00")).phase, "closed");
check("no context -> closed", actionWindow(null, at("19:45")).phase, "closed");
check("missing session end -> closed", actionWindow(ctx({ regularEnd: null }), at("19:45")).phase, "closed");

// --- The alert state machine ----------------------------------------------
console.log("\nAlert state machine — a full window, minute by minute");
const D = "2026-09-16";

check(
  "3:30pm, would flip, but outside the window -> silent",
  decideAlert({ actionable: false, changing: true, provisional: "in", today: D, prior: null }),
  { emit: null, pending: null },
);

let pending: { date: string; dir: "in" | "out" } | null = null;

let d = decideAlert({ actionable: true, changing: true, provisional: "in", today: D, prior: pending });
check("3:40pm, flips to BUY -> alert", d.emit, "act");
pending = d.pending;

d = decideAlert({ actionable: true, changing: true, provisional: "in", today: D, prior: pending });
check("3:42pm, still BUY -> no repeat", d.emit, null);
pending = d.pending;

d = decideAlert({ actionable: true, changing: true, provisional: "in", today: D, prior: pending });
check("3:44pm, still BUY -> still no repeat", d.emit, null);
pending = d.pending;

d = decideAlert({ actionable: true, changing: false, provisional: "out", today: D, prior: pending });
check("3:46pm, price reverses -> STAND DOWN", d.emit, "stand-down");
check("            instruction cleared", d.pending, null);
pending = d.pending;

d = decideAlert({ actionable: true, changing: false, provisional: "out", today: D, prior: pending });
check("3:48pm, still no trade -> silent", d.emit, null);

console.log("\nEdge cases");
check(
  "direction reverses inside the window -> new alert",
  decideAlert({ actionable: true, changing: true, provisional: "out", today: D, prior: { date: D, dir: "in" } }).emit,
  "act",
);
check(
  "yesterday's instruction never stands down today",
  decideAlert({ actionable: true, changing: false, provisional: "out", today: D, prior: { date: "2026-09-15", dir: "in" } }),
  { emit: null, pending: null },
);
check(
  "yesterday's instruction is dropped, not carried",
  decideAlert({ actionable: false, changing: false, provisional: "out", today: D, prior: { date: "2026-09-15", dir: "in" } }).pending,
  null,
);
check(
  "today's instruction survives a check outside the window",
  decideAlert({ actionable: false, changing: false, provisional: "out", today: D, prior: { date: D, dir: "in" } }).pending,
  { date: D, dir: "in" },
);
check(
  "no flip and nothing pending -> silent",
  decideAlert({ actionable: true, changing: false, provisional: "out", today: D, prior: null }),
  { emit: null, pending: null },
);

console.log(
  `\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}  ` +
    `(lead ${ACTION_LEAD_MIN}m, cutoff ${MOC_CUTOFF_MIN}m)\n`,
);
process.exit(failures === 0 ? 0 : 1);
