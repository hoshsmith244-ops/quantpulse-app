/**
 * Verifies that an unfinished session is never mistaken for a daily close.
 *
 * This is the highest-stakes logic in the project. When it was wrong the app
 * reported entries that had not happened, a user acted on one, and pre-close
 * alerting was silently dead because the "settled" signal already contained
 * today's live price.
 *
 *   node scripts/check-bars.mts
 */

import { dropInProgressBar } from "../src/lib/bars.ts";
import type { Bar } from "../src/lib/types.ts";

let failures = 0;

function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name}` +
      (ok
        ? ""
        : `\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`),
  );
}

const bar = (date: string, close = 100): Bar => ({
  date,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
});

const TZ = "America/New_York";
/** Today at the venue, computed the same way the helper does. */
const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const yesterday = "2000-01-03";
const older = "2000-01-02";

const dates = (b: Bar[]) => b.map((x) => x.date);

// 4:00pm New York on an arbitrary day, used only as a relative reference.
const CLOSE_AT = Date.parse("2026-09-17T20:00:00Z");
const duringSession = CLOSE_AT - 20 * 60_000; // 3:40pm
const afterSession = CLOSE_AT + 30 * 60_000; // 4:30pm
const meta = { currentTradingPeriod: { regular: { end: CLOSE_AT } } };

console.log("\nUS equities — the case that caused a real trade");

check(
  "market OPEN: today's in-progress bar is dropped",
  dates(
    dropInProgressBar(
      [bar(older), bar(yesterday), bar(today)],
      meta,
      TZ,
      duringSession,
    ),
  ),
  [older, yesterday],
);

check(
  "market CLOSED: today's bar is a real close and stays",
  dates(
    dropInProgressBar(
      [bar(older), bar(yesterday), bar(today)],
      meta,
      TZ,
      afterSession,
    ),
  ),
  [older, yesterday, today],
);

check(
  "no bar for today: nothing is removed while open",
  dates(
    dropInProgressBar([bar(older), bar(yesterday)], meta, TZ, duringSession),
  ),
  [older, yesterday],
);

check(
  "history before today is never touched",
  dates(
    dropInProgressBar([bar(older), bar(yesterday), bar(today)], meta, TZ, duringSession),
  ).includes(today),
  false,
);

console.log("\nDefensive cases");

check(
  "unknown session end: today's bar is dropped rather than trusted",
  dates(dropInProgressBar([bar(yesterday), bar(today)], undefined, TZ, duringSession)),
  [yesterday],
);

check(
  "missing currentTradingPeriod behaves the same",
  dates(dropInProgressBar([bar(yesterday), bar(today)], {}, TZ, duringSession)),
  [yesterday],
);

check(
  "a future-dated bar is dropped too",
  dates(
    dropInProgressBar(
      [bar(yesterday), bar(today), bar("2099-01-01")],
      meta,
      TZ,
      duringSession,
    ),
  ),
  [yesterday],
);

check("empty input does not throw", dates(dropInProgressBar([], meta, TZ, duringSession)), []);

check(
  "an array of only today's bar empties rather than keeping a fake close",
  dates(dropInProgressBar([bar(today)], meta, TZ, duringSession)),
  [],
);

console.log("\nCrypto — a ~24h session means the current day is always in progress");

const cryptoEnd = Date.parse("2026-09-17T23:59:00Z");
const cryptoMeta = { currentTradingPeriod: { regular: { end: cryptoEnd } } };
const utcToday = new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });

check(
  "today's crypto bar is dropped: it only settles at midnight UTC",
  dates(
    dropInProgressBar(
      [bar(older), bar(utcToday)],
      cryptoMeta,
      "UTC",
      cryptoEnd - 60 * 60_000,
    ),
  ),
  [older],
);

console.log(
  `\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}  (bar hygiene)\n`,
);
process.exit(failures === 0 ? 0 : 1);
