/**
 * Verifies how two devices' state is reconciled.
 *
 * This is the only code in the app that can silently destroy something the user
 * created — a careless merge deletes watchlist entries added on another device
 * and nobody notices until they go looking for a ticker that is gone. Driving
 * it directly is cheaper than discovering that in production.
 *
 *   node scripts/check-sync.mts
 */

import {
  MAX_EVENTS,
  mergeNotifications,
  mergePayloads,
  mergeWatchlists,
  type SyncPayload,
} from "../src/lib/sync-merge.ts";
import type { WatchEntry } from "../src/lib/watchlist.ts";
import type { SignalEvent } from "../src/lib/notifications.ts";

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

const w = (symbol: string, factor: string, addedAt: number): WatchEntry =>
  ({ symbol, factor, param: 50, addedAt }) as WatchEntry;

const ev = (id: string, at: number, read = false): SignalEvent =>
  ({
    id,
    symbol: id.split(":")[0],
    factor: "momentum",
    kind: "entry",
    date: "2026-09-17",
    price: 1,
    at,
    read,
  }) as SignalEvent;

const payload = (over: Partial<SyncPayload>): SyncPayload => ({
  version: 1,
  updatedAt: 1000,
  appearance: null,
  mode: null,
  params: null,
  watchlist: [],
  notifyPrefs: null,
  notifications: [],
  ...over,
});

const symbols = (list: WatchEntry[]) => list.map((e) => `${e.symbol}:${e.factor}`);

// --- Watchlists: the data-loss surface ------------------------------------
console.log("\nWatchlist merging — nothing may ever be dropped");

check(
  "entries unique to each side both survive",
  symbols(
    mergeWatchlists(
      [w("AAPL", "momentum", 1), w("PG", "trendDistance", 2)],
      [w("DG", "reversal", 3)],
    ),
  ),
  ["AAPL:momentum", "PG:trendDistance", "DG:reversal"],
);

check(
  "the same ticker under two strategies is two entries",
  symbols(
    mergeWatchlists([w("AAPL", "momentum", 1)], [w("AAPL", "reversal", 2)]),
  ),
  ["AAPL:momentum", "AAPL:reversal"],
);

check(
  "an identical entry on both sides is not duplicated",
  symbols(mergeWatchlists([w("AAPL", "momentum", 1)], [w("AAPL", "momentum", 9)])),
  ["AAPL:momentum"],
);

check(
  "a duplicate keeps the EARLIER addedAt",
  mergeWatchlists([w("AAPL", "momentum", 5)], [w("AAPL", "momentum", 2)])[0]
    .addedAt,
  2,
);

check(
  "order follows addedAt regardless of which side supplied it",
  symbols(
    mergeWatchlists(
      [w("C", "momentum", 30)],
      [w("A", "momentum", 10), w("B", "momentum", 20)],
    ),
  ),
  ["A:momentum", "B:momentum", "C:momentum"],
);

check(
  "an empty side never empties the other",
  symbols(mergeWatchlists([], [w("AAPL", "momentum", 1)])),
  ["AAPL:momentum"],
);

check(
  "malformed entries are dropped without taking valid ones with them",
  symbols(
    mergeWatchlists(
      [w("AAPL", "momentum", 1), null as unknown as WatchEntry, {} as WatchEntry],
      [w("PG", "trendDistance", 2)],
    ),
  ),
  ["AAPL:momentum", "PG:trendDistance"],
);

// --- Notifications --------------------------------------------------------
console.log("\nNotification merging");

check(
  "same event id is not duplicated",
  mergeNotifications([ev("A:entry:1", 10)], [ev("A:entry:1", 10)]).length,
  1,
);

check(
  "read on either side wins (local read, remote unread)",
  mergeNotifications([ev("A:entry:1", 10, true)], [ev("A:entry:1", 10, false)])[0]
    .read,
  true,
);

check(
  "read on either side wins (local unread, remote read)",
  mergeNotifications([ev("A:entry:1", 10, false)], [ev("A:entry:1", 10, true)])[0]
    .read,
  true,
);

check(
  "newest first",
  mergeNotifications([ev("A", 10)], [ev("B", 30), ev("C", 20)]).map((e) => e.id),
  ["B", "C", "A"],
);

check(
  `capped at ${MAX_EVENTS}, keeping the newest`,
  (() => {
    const many = Array.from({ length: 80 }, (_, i) => ev(`E${i}`, i));
    const out = mergeNotifications(many, []);
    return [out.length, out[0].id];
  })(),
  [MAX_EVENTS, "E79"],
);

// --- Whole-payload reconciliation ----------------------------------------
console.log("\nPreferences take the newer side; collections still merge");

const older = payload({
  updatedAt: 1000,
  mode: "simple",
  appearance: { accent: "amber" } as never,
  watchlist: [w("AAPL", "momentum", 1)],
});
const newer = payload({
  updatedAt: 2000,
  mode: "advanced",
  appearance: { accent: "cyan" } as never,
  watchlist: [w("PG", "trendDistance", 2)],
});

check("remote newer -> remote preference wins", mergePayloads(older, newer).mode, "advanced");
check("local newer -> local preference wins", mergePayloads(newer, older).mode, "advanced");
check(
  "…but the watchlist is unioned either way",
  symbols(mergePayloads(older, newer).watchlist),
  ["AAPL:momentum", "PG:trendDistance"],
);
check(
  "…and the union is identical whichever side is newer",
  symbols(mergePayloads(newer, older).watchlist),
  ["AAPL:momentum", "PG:trendDistance"],
);
check(
  "updatedAt carries the later of the two",
  mergePayloads(older, newer).updatedAt,
  2000,
);

console.log("\nFirst sign-in and degenerate cases");

check(
  "no stored state yet -> local passes through untouched",
  symbols(mergePayloads(older, null).watchlist),
  ["AAPL:momentum"],
);

check(
  "signing in on a brand-new device adopts the stored watchlist",
  symbols(mergePayloads(payload({ updatedAt: 5000 }), newer).watchlist),
  ["PG:trendDistance"],
);

check(
  "a fresh device does NOT wipe stored state just by being newer",
  mergePayloads(payload({ updatedAt: 9999 }), newer).watchlist.length,
  1,
);

check(
  "a null preference falls back to the other side rather than blanking",
  mergePayloads(payload({ updatedAt: 9999, mode: null }), newer).mode,
  "advanced",
);

check(
  "merging is idempotent — re-running changes nothing",
  (() => {
    const once = mergePayloads(older, newer);
    const twice = mergePayloads(once, once);
    return JSON.stringify(symbols(twice.watchlist)) === JSON.stringify(symbols(once.watchlist));
  })(),
  true,
);

console.log(
  `\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}  (sync merge rules)\n`,
);
process.exit(failures === 0 ? 0 : 1);
