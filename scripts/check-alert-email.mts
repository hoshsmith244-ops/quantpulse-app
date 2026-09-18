/**
 * Verifies the wording of the pre-close alert email.
 *
 * This message is the whole product of the alert feature: it lands on a phone,
 * is read in a hurry, and is acted on with real money. A stand-down buried
 * under a list of buys, or a subject line that reads like a buy when it is a
 * withdrawal, costs more than most bugs in this codebase.
 *
 *   node scripts/check-alert-email.mts
 */

import { composeAlert, type AlertLine } from "../src/lib/cron/compose-alert.ts";

const W = { leadMinutes: 20, cutoffMinutes: 10 };

let failures = 0;

function check(name: string, pass: boolean, detail?: string) {
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${pass || !detail ? "" : `\n          ${detail}`}`);
}

const line = (symbol: string, dir: "in" | "out", price: number): AlertLine => ({
  symbol,
  strategy: "Distance from trend",
  dir,
  price,
  entryKey: `${symbol}:trendDistance`,
});

console.log("\nA plain buy alert");
const buy = composeAlert({
  acts: [line("DG", "in", 122.41), line("UPS", "in", 99.06)],
  standDowns: [],
  minutesToCutoff: 9,
  cutoffAt: "3:50 PM",
  ...W,
});
check("subject says BUY and names the tickers", /^BUY at the close — DG, UPS$/.test(buy.subject), buy.subject);
check("states the minutes left", buy.text.includes("9 minutes left"));
check("names the order type", buy.text.includes("market-on-close"));
check("gives the cutoff time", buy.text.includes("3:50 PM"));
check("quotes each price", buy.text.includes("122.41") && buy.text.includes("99.06"));
check("says it is provisional", /Provisional/.test(buy.text));
check("promises the stand-down", buy.text.includes("stand-down"));
check("carries the disclaimer", buy.text.includes("not investment advice"));

console.log("\nA sell alert");
const sell = composeAlert({ ...W, acts: [line("PG", "out", 151.2)], standDowns: [], minutesToCutoff: 4, cutoffAt: "3:50 PM" });
check("subject says SELL, not BUY", sell.subject.startsWith("SELL at the close"), sell.subject);
check("body says exit", sell.text.includes("would exit"));

console.log("\nA stand-down — the dangerous one");
const stand = composeAlert({
  ...W,
  acts: [],
  standDowns: [line("DG", "in", 121.0)],
  minutesToCutoff: 6,
  cutoffAt: "3:50 PM",
});
check("subject leads with the withdrawal", stand.subject.startsWith("Stand down"), stand.subject);
check("subject never says BUY", !/\bBUY\b/.test(stand.subject), stand.subject);
check("tells you not to place it", stand.text.includes("Do not place the order"));
check("tells you to cancel one already placed", stand.text.includes("cancel it if you already did"));

console.log("\nMixed: a stand-down alongside new buys");
const mixed = composeAlert({
  ...W,
  acts: [line("UPS", "in", 99.06)],
  standDowns: [line("DG", "in", 121.0)],
  minutesToCutoff: 7,
  cutoffAt: "3:50 PM",
});
check("subject is the stand-down, not the buy", mixed.subject.startsWith("Stand down"), mixed.subject);
check(
  "the stand-down appears BEFORE the buys in the body",
  mixed.text.indexOf("STAND DOWN") < mixed.text.indexOf("left to send"),
  mixed.text.slice(0, 120),
);
check("the buy is still included", mixed.text.includes("BUY UPS"));

console.log("\nEdge cases");
const soon = composeAlert({ ...W, acts: [line("DG", "in", 122.41)], standDowns: [], minutesToCutoff: 0, cutoffAt: "3:50 PM" });
check("zero minutes reads as words, not '0 minutes'", soon.text.includes("Under a minute"), soon.text.split("\n")[0]);
const one = composeAlert({ ...W, acts: [line("DG", "in", 1)], standDowns: [], minutesToCutoff: 1, cutoffAt: "3:50 PM" });
check("one minute is singular", one.text.includes("1 minute left"), one.text.split("\n")[0]);
check(
  "html escapes rather than injecting markup",
  composeAlert({ ...W, acts: [{ ...line("A", "in", 1), symbol: "<script>" }], standDowns: [], minutesToCutoff: 5, cutoffAt: "x" })
    .html.includes("&lt;script&gt;"),
);
check("html and text carry the same content", stand.html.includes("Do not place the order"));

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}  (alert email)\n`);

if (failures === 0) {
  console.log("Sample — mixed stand-down and buy:\n");
  console.log("  Subject: " + mixed.subject);
  console.log(mixed.text.split("\n").map((l) => "  " + l).join("\n"));
}

process.exit(failures === 0 ? 0 : 1);
