"use client";

import { AlertTriangle } from "lucide-react";
import * as React from "react";

import type { AlphaResult, FactorMeta } from "@/lib/alpha";
import {
  atmIv,
  earningsBefore,
  expiryNear,
  hv252,
  impliedMove,
  IV_BUCKETS,
  ivBucket,
  liquidityOf,
  movesAfter,
  sessionsIn,
  type ExpiryChain,
  type IvBucket,
  type IvCutoffs,
  type OptionsSnapshot,
} from "@/lib/options";
import type { Bar } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
export const signed = (x: number, d = 1) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;
export const usd = (x: number, d = 2) => `$${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
export const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Same-day expiry means expiring TODAY in New York, not "under 24 hours away". */
const todayNy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
export const dteLabel = (c: ExpiryChain) => (c.expiration === todayNy() ? "0DTE" : `${Math.max(1, Math.round(c.days))}d`);

// ---------------------------------------------------------------------------
// The derived picture, shared by the terminal summary and the Options tab
// ---------------------------------------------------------------------------

export type OptionsModel = {
  chain: ExpiryChain;
  /** The expiry nearest 30 days -- the horizon the rich/cheap rule was tested on. */
  c30: ExpiryChain;
  iv30: number | null;
  hv: number | null;
  bucket: IvBucket | null;
  iv: number | null;
  move: number | null;
  liq: ReturnType<typeof liquidityOf>;
  frontIv: number | null;
  inverted: boolean;
  sessions: number;
  entries: number[];
  past: ReturnType<typeof movesAfter>;
  holding: boolean;
  earningsRisk: boolean;
};

/**
 * Default expiry: long enough to cover three in four of this strategy's past
 * holds on this stock, so the option is not likely to expire before the trade
 * it expresses would have finished. At least a week; at most two months.
 */
export function defaultExpiry(chains: ExpiryChain[], result: AlphaResult): ExpiryChain {
  const holds = result.trades.filter((t) => t.exitDate !== null).map((t) => t.barsHeld).sort((a, b) => a - b);
  const p75 = holds.length ? holds[Math.floor(holds.length * 0.75)] : 5;
  const target = Math.min(60, Math.max(7, Math.ceil((p75 * 7) / 5)));
  return chains.find((c) => c.days >= target) ?? chains[chains.length - 1];
}

export function buildModel(
  snapshot: OptionsSnapshot,
  cutoffs: IvCutoffs | null,
  bars: Bar[],
  result: AlphaResult,
  picked: string | null,
): OptionsModel {
  const { spot, expirations: chains } = snapshot;
  const chain = chains.find((c) => c.expiration === picked) ?? defaultExpiry(chains, result);
  const c30 = expiryNear(chains, 30, 7) ?? chain;
  const iv30 = atmIv(c30, spot);
  const hv = hv252(bars);
  const front = chains[0];
  const frontIv = front ? atmIv(front, spot) : null;
  const idx = new Map(bars.map((b, i) => [b.date, i]));
  const entries = result.trades.map((t) => idx.get(t.entryDate) ?? -1).filter((i) => i >= 0);
  const sessions = sessionsIn(chain.days);
  return {
    chain,
    c30,
    iv30,
    hv,
    bucket: iv30 && hv && cutoffs && !snapshot.isEtf ? ivBucket(hv, iv30, cutoffs) : null,
    iv: atmIv(chain, spot),
    move: impliedMove(chain, spot),
    liq: liquidityOf(chain, spot),
    frontIv,
    // Near-term IV well above the 30-day reading: the market is pricing an
    // event, usually earnings, before the later expiry.
    inverted: frontIv !== null && iv30 !== null && front.days < c30.days && frontIv > iv30 * 1.1,
    sessions,
    entries,
    past: movesAfter(bars, entries, sessions),
    holding: result.signal.state === "in",
    earningsRisk: earningsBefore(snapshot.earnings, chain.expiration),
  };
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** The tested rule, said for a BUYER: how buying options in this fifth went. */
export function IvVerdict({ bucket, isEtf, hasCutoffs, symbol }: { bucket: IvBucket | null; isEtf: boolean; hasCutoffs: boolean; symbol: string }) {
  let text: React.ReactNode;
  if (isEtf) {
    text = (
      <>
        The rich/cheap rule was tested on single stocks. Index ETFs carry a different, market-wide volatility
        premium, so no tested figure is shown for {symbol}.
      </>
    );
  } else if (!hasCutoffs) {
    text = <>Today&apos;s market-wide ranking isn&apos;t available yet; it is rebuilt after each close.</>;
  } else if (bucket === null) {
    text = <>Not enough data to rank {symbol}&apos;s options against the market.</>;
  } else {
    const b = IV_BUCKETS[bucket];
    const fifth = ["most expensive", "second most expensive", "middle", "second cheapest", "cheapest"][bucket];
    text = (
      <>
        Relative to how much it has actually moved over the past year, {symbol}&apos;s options are in the{" "}
        <span className={cn(bucket <= 1 ? "text-down" : bucket >= 3 ? "text-up" : "text-text")}>{fifth} fifth</span>{" "}
        of stocks today. In testing, paying for movement here (an at-the-money call and put together) returned{" "}
        <span className="tnum text-text">{b.train.toFixed(1)}%</span> (2020–23) and{" "}
        <span className="tnum text-text">
          {b.test >= 0 ? "+" : ""}
          {b.test.toFixed(1)}%
        </span>{" "}
        (2023–26) per 30 days at a typical fill.{" "}
        {bucket <= 1
          ? "This is where buying options has cost the most."
          : bucket >= 3
            ? "The least costly place to buy options — still not an edge on its own."
            : "Middle of the pack."}
      </>
    );
  }
  return <p className="prose-face text-[12px] leading-relaxed text-muted">{text}</p>;
}

export function MoveVerdict({ move, past, factor }: { move: number | null; past: OptionsModel["past"]; factor: FactorMeta }) {
  if (!move || !past) {
    return (
      <p className="prose-face text-[11px] leading-relaxed text-dim">
        {factor.name} has too few past entries on this stock to compare with what the market prices.
      </p>
    );
  }
  const ratio = past.medianAbs / move;
  const text =
    ratio < 0.8
      ? `The market is pricing a bigger move than ${factor.name} has produced here, so a bought option is paying for movement the signal hasn't delivered.`
      : ratio > 1.25
        ? `${factor.name}'s past moves here have been larger than the market now prices — the one case where buying isn't obviously overpaying, though past signals are few and noisy.`
        : `What the market prices is roughly what ${factor.name} has delivered here: a bought option neither overpays nor underpays for the signal's typical move.`;
  return <p className="prose-face text-[12px] leading-relaxed text-muted">{text}</p>;
}

export function ExpiryChips({
  snapshot,
  model,
  onPick,
}: {
  snapshot: OptionsSnapshot;
  model: OptionsModel;
  onPick: (expiration: string) => void;
}) {
  const { spot } = snapshot;
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {snapshot.expirations.map((c) => {
          const civ = atmIv(c, spot);
          const cm = impliedMove(c, spot);
          const on = c.expiration === model.chain.expiration;
          return (
            <button
              key={c.expiration}
              onClick={() => onPick(c.expiration)}
              className={cn("border px-2 py-1 text-left transition-colors", on ? "border-amber bg-amber/10" : "border-edge hover:border-amber/50")}
            >
              <span className={cn("block text-[11px]", on ? "text-amber" : "text-bright")}>
                {day(c.expiration)}
                <span className="ml-1 text-dim">{dteLabel(c)}</span>
                {earningsBefore(snapshot.earnings, c.expiration) ? (
                  <span className="ml-1 text-amber" title={`Earnings ${day(snapshot.earnings!)} fall before this expiry`}>
                    E
                  </span>
                ) : null}
              </span>
              <span className="tnum block text-[10px] text-dim">
                {civ ? `IV ${pct(civ)}` : "IV —"} · {cm ? `±${pct(cm, 1)}` : "±—"}
              </span>
            </button>
          );
        })}
      </div>
      {model.inverted ? (
        <p className="prose-face mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-amber">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>
            Near-term IV ({pct(model.frontIv!, 0)}) is well above the 30-day reading ({pct(model.iv30!, 0)}): the market
            is pricing an event before {day(model.c30.expiration)}
            {snapshot.earnings ? `, likely earnings on ${day(snapshot.earnings)}` : ""}.
          </span>
        </p>
      ) : null}
    </>
  );
}

export function Warn({ children }: { children: React.ReactNode }) {
  return (
    <li className="prose-face flex items-start gap-2 text-[11px] leading-relaxed text-amber">
      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
