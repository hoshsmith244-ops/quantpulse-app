/**
 * Verifies the options maths the terminal's Options panel is built on.
 *
 * Every chain here is priced with Black-Scholes at a known vol, so each figure
 * the panel derives -- implied vol, implied move, structure P&L, rich/cheap
 * bucket -- has an exact expected value.
 *
 *   node scripts/check-options.mts
 */

import {
  atmIv,
  atmStrike,
  bsPrice,
  bsThetaPerDay,
  contractsFor,
  earningsBefore,
  historicalChance,
  hv252,
  impliedMove,
  impliedVol,
  ivBucket,
  liquidityOf,
  midOf,
  movesAfter,
  payoffAtExpiry,
  probAbove,
  RATE,
  sessionsIn,
  suggestedContract,
  type ExpiryChain,
  type IvCutoffs,
  type OptionQuote,
} from "../src/lib/options.ts";
import type { Bar } from "../src/lib/types.ts";

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`}`);
}
function near(name: string, got: number | null, want: number, tol: number) {
  const ok = got !== null && Math.abs(got - want) <= tol;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n          got  ${got}\n          want ~${want} (+/-${tol})`}`);
}

/** A chain priced at one flat vol, quoted 2% either side of fair. */
function chainAt(S: number, sigma: number, days: number, spread = 0.02): ExpiryChain {
  const T = days / 365;
  const strikes: number[] = [];
  for (let k = 80; k <= 120; k += 2.5) strikes.push(k);
  const q = (right: "call" | "put", k: number): OptionQuote => {
    const p = bsPrice(right, S, k, T, sigma);
    return { strike: k, bid: +(p * (1 - spread)).toFixed(4), ask: +(p * (1 + spread)).toFixed(4), last: p, iv: sigma, openInterest: 500, volume: 50 };
  };
  return { expiration: "2026-11-13", days, calls: strikes.map((k) => q("call", k)), puts: strikes.map((k) => q("put", k)) };
}

console.log("\nBlack-Scholes");
{
  const S = 100, K = 105, T = 0.25, v = 0.3;
  const c = bsPrice("call", S, K, T, v), p = bsPrice("put", S, K, T, v);
  near("put-call parity holds", c - p, S - K * Math.exp(-RATE * T), 1e-6);
  near("implied vol inverts the call price", impliedVol("call", c, S, K, T), v, 1e-4);
  near("implied vol inverts the put price", impliedVol("put", p, S, K, T), v, 1e-4);
  check("no vol fits a price below intrinsic", impliedVol("call", 0.01, 120, 100, 0.25), null);
  near("ATM chance of finishing above spot is just under half", probAbove(100, 100, 0.25, 0.3), 0.49, 0.03);
}

console.log("\nReading a chain");
{
  const ch = chainAt(101, 0.3, 30);
  check("ATM strike is the nearest listed", atmStrike(ch, 101), 100);
  near("ATM IV recovered from mids", atmIv(ch, 101), 0.3, 0.005);
  const K = 100;
  const c = ch.calls.find((x) => x.strike === K)!, p = ch.puts.find((x) => x.strike === K)!;
  near("implied move is the straddle mid over spot", impliedMove(ch, 101), (midOf(c)! + midOf(p)!) / 101, 1e-9);
  near("...and close to 0.8 x vol x sqrt(T)", impliedMove(ch, 101), 0.8 * 0.3 * Math.sqrt(30 / 365), 0.01);
  check("a one-sided quote has no mid", midOf({ ...c, bid: 0 }), null);

  const oneSided: ExpiryChain = { ...ch, calls: ch.calls.map((x) => ({ ...x, bid: 0 })), puts: ch.puts.map((x) => ({ ...x, bid: 0 })) };
  near("implied move falls back to the vol approximation", impliedMove(oneSided, 101), 0.8 * 0.3 * Math.sqrt(30 / 365), 0.01);
}

console.log("\nLiquidity");
check("2% either side of fair is a 4% spread: tight", liquidityOf(chainAt(100, 0.3, 30, 0.02), 100).grade, "tight");
check("5% either side is a 10% spread: fair", liquidityOf(chainAt(100, 0.3, 30, 0.05), 100).grade, "fair");
check("10% either side is a 20% spread: wide", liquidityOf(chainAt(100, 0.3, 30, 0.1), 100).grade, "wide");

console.log("\nRich or cheap");
{
  const cut: IvCutoffs = { asOf: "x", generatedAt: "x", breaks: [-0.1, 0.05, 0.17, 0.3], n: 200 };
  // log(HV/IV) well below the lowest break -> IV richest
  check("IV far above realised is the richest fifth", ivBucket(0.2, 0.4, cut), 0);
  check("IV far below realised is the cheapest fifth", ivBucket(0.4, 0.2, cut), 4);
  check("in between lands in the middle", ivBucket(0.3, 0.3, cut), 1);

  const bars: Bar[] = [];
  let px = 100;
  for (let i = 0; i < 300; i++) {
    px *= i % 2 ? 1.01 : 1 / 1.01;
    bars.push({ date: `d${i}`, open: px, high: px, low: px, close: px, volume: 1 });
  }
  near("one-year vol of a +/-1% daily zigzag", hv252(bars), Math.log(1.01) * Math.sqrt(252), 1e-9);
  check("fewer than 253 bars has no one-year vol", hv252(bars.slice(0, 200)), null);
}

console.log("\nMoves after past signals");
{
  const bars: Bar[] = Array.from({ length: 40 }, (_, i) => ({ date: `d${i}`, open: 100 + i, high: 100 + i, low: 100 + i, close: 100 + i, volume: 1 }));
  const m = movesAfter(bars, [0, 10, 20], 5)!;
  check("every entry counted", m.n, 3);
  near("a steadily rising stock is always up after entry", m.upRate, 1, 1e-9);
  near("mean move matches the arithmetic", m.mean, (5 / 100 + 5 / 110 + 5 / 120) / 3, 1e-9);
  check("too few entries returns nothing", movesAfter(bars, [0, 10], 5), null);
  check("entries without enough forward bars are skipped", movesAfter(bars, [0, 10, 20, 38], 5)!.n, 3);
  check("30 calendar days is about 21 sessions", sessionsIn(30), 21);
}

console.log("\nBuying calls and puts");
{
  const S = 100, ch = chainAt(S, 0.3, 30);
  const calls = contractsFor(ch, S, "call");
  const puts = contractsFor(ch, S, "put");
  check("strikes either side of the money", calls.length, 17);
  const c = suggestedContract(calls)!, p = suggestedContract(puts)!;
  check("the suggested call is at the money", [c.strike, c.moneyness], [100, "atm"]);
  check("the suggested put is at the money", [p.strike, p.moneyness], [100, "atm"]);
  near("premium is the mid", c.premium, midOf(ch.calls.find((x) => x.strike === 100)!)!, 1e-9);
  near("call breakeven is strike plus premium", c.breakeven, 100 + c.premium!, 1e-9);
  near("put breakeven is strike minus premium", p.breakeven, 100 - p.premium!, 1e-9);
  near("call needs a rise to breakeven", c.needMove, c.breakeven! / S - 1, 1e-9);
  near("put needs a fall to breakeven, stated as a positive share", p.needMove, 1 - p.breakeven! / S, 1e-9);
  check("an ATM call has delta near +0.5", c.delta! > 0.45 && c.delta! < 0.6, true);
  check("an ATM put has delta near -0.5", p.delta! < -0.4 && p.delta! > -0.55, true);
  check("a bought option loses value each day", c.thetaPerDay! < 0 && p.thetaPerDay! < 0, true);
  check("reaching breakeven is less likely than finishing above the strike", c.chanceMarket! < 0.5, true);
  check("a lower call strike is in the money", calls.find((x) => x.strike === 90)!.moneyness, "itm");
  check("a higher put strike is in the money", puts.find((x) => x.strike === 110)!.moneyness, "itm");
  check("deeper out of the money needs a bigger move", calls.find((x) => x.strike === 110)!.needMove! > c.needMove!, true);

  near("call payoff below the strike is minus the premium", payoffAtExpiry("call", 100, 3, 90), -3, 1e-12);
  near("call payoff above", payoffAtExpiry("call", 100, 3, 110), 7, 1e-12);
  near("put payoff below the strike", payoffAtExpiry("put", 100, 3, 90), 7, 1e-12);
  near("put payoff at breakeven is zero", payoffAtExpiry("put", 100, 3, 97), 0, 1e-12);
  near(
    "theta over a day matches the price change",
    bsThetaPerDay("call", 100, 100, 0.25, 0.3),
    bsPrice("call", 100, 100, 0.25 - 1 / 365, 0.3) - bsPrice("call", 100, 100, 0.25, 0.3),
    1e-12,
  );

  // A stock alternating +2% / -2% days, trending up 0.5% a day on top.
  const bars: Bar[] = [];
  let px = 100;
  for (let i = 0; i < 400; i++) {
    px *= (i % 2 ? 1.02 : 1 / 1.02) * 1.005;
    bars.push({ date: `d${i}`, open: px, high: px, low: px, close: px, volume: 1 });
  }
  // Over 2 sessions the zigzag cancels, so with the trend removed every
  // window moves ~0: neither side should ever look reachable.
  check("a 1% move is never reached once the trend is removed", historicalChance(bars, 2, 0.01, "call"), 0);
  check("...for puts too", historicalChance(bars, 2, 0.01, "put"), 0);
  // Over 1 session the stock moves ~2% either way.
  near("a 1% one-day move is reached about half the time, upward", historicalChance(bars, 1, 0.01, "call"), 0.5, 0.01);
  near("...and about half the time downward", historicalChance(bars, 1, 0.01, "put"), 0.5, 0.01);
  check("too little history returns nothing", historicalChance(bars.slice(0, 50), 5, 0.01, "call"), null);
}

console.log("\nEarnings");
check("earnings before expiry is flagged", earningsBefore("2026-10-29", "2026-10-30"), true);
check("earnings after expiry is not", earningsBefore("2026-11-05", "2026-10-30"), false);
check("no scheduled earnings is not", earningsBefore(null, "2026-10-30"), false);

console.log(failures === 0 ? "\nAll options checks passed.\n" : `\n${failures} options check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
