"use client";

import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import * as React from "react";

import { Panel, PanelHead, Readout, Tag } from "@/components/ui/terminal";
import type { AlphaResult, FactorMeta } from "@/lib/alpha";
import {
  atmIv,
  atmStrike,
  bullishStructures,
  contractIv,
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
  type Structure,
} from "@/lib/options";
import type { Bar } from "@/lib/types";
import { useOptions } from "@/lib/use-options";
import { cn } from "@/lib/utils";

const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const signed = (x: number, d = 1) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;
const usd = (x: number) => `$${Math.abs(x).toFixed(2)}`;
/** Same-day expiry means expiring TODAY in New York, not "under 24 hours away". */
const todayNy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const dte = (c: ExpiryChain) => (c.expiration === todayNy() ? "0DTE" : `${Math.max(1, Math.round(c.days))}d`);

const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * The options view of whatever the terminal is showing.
 *
 * Built around what the research found actually holds up (scripts/research/
 * README.md): not "the signal says buy calls" -- the signals carry no options
 * edge -- but whether options on this stock are expensive today, how big a
 * move the market is already pricing, and the cheapest way to express a view
 * if you take one.
 */
export function OptionsPanel({
  symbol,
  bars,
  result,
  factor,
  marketOpen,
}: {
  symbol: string;
  bars: Bar[];
  result: AlphaResult;
  factor: FactorMeta;
  /** Whether the regular session is open; quotes widen badly outside it. */
  marketOpen: boolean;
}) {
  const { state, cutoffs } = useOptions(symbol);
  const [picked, setPicked] = React.useState<string | null>(null);
  const [showChain, setShowChain] = React.useState(false);

  return (
    <Panel>
      <PanelHead
        title="Options"
        right={
          state.status === "ready" ? (
            <span className="text-[10px] uppercase tracking-[0.1em] text-dim">
              quotes ~15 min delayed
            </span>
          ) : null
        }
      />
      {state.status === "loading" ? (
        <p className="p-4 text-[12px] text-muted">Loading the option chain…</p>
      ) : state.status === "none" ? (
        <p className="prose-face p-4 text-[12px] text-muted">
          {symbol} has no listed options. Crypto and most non-US listings don&apos;t.
        </p>
      ) : state.status === "error" ? (
        <p className="prose-face p-4 text-[12px] text-muted">
          Option data is unavailable right now. The stock signal above is unaffected.
        </p>
      ) : (
        <Body
          snapshot={state.snapshot}
          cutoffs={cutoffs}
          bars={bars}
          result={result}
          factor={factor}
          marketOpen={marketOpen}
          picked={picked}
          onPick={setPicked}
          showChain={showChain}
          onToggleChain={() => setShowChain((v) => !v)}
        />
      )}
    </Panel>
  );
}

function Body({
  snapshot,
  cutoffs,
  bars,
  result,
  factor,
  marketOpen,
  picked,
  onPick,
  showChain,
  onToggleChain,
}: {
  snapshot: OptionsSnapshot;
  cutoffs: IvCutoffs | null;
  bars: Bar[];
  result: AlphaResult;
  factor: FactorMeta;
  marketOpen: boolean;
  picked: string | null;
  onPick: (e: string) => void;
  showChain: boolean;
  onToggleChain: () => void;
}) {
  const { spot, expirations: chains } = snapshot;

  // Default expiry: long enough to cover three in four of this strategy's past
  // holds on this stock, so the option is not likely to expire before the
  // trade it expresses would have finished.
  const holds = result.trades.filter((t) => t.exitDate !== null).map((t) => t.barsHeld).sort((a, b) => a - b);
  const p75 = holds.length ? holds[Math.floor(holds.length * 0.75)] : 5;
  const targetDays = Math.min(60, Math.max(7, Math.ceil((p75 * 7) / 5)));
  const fallback = chains.find((c) => c.days >= targetDays) ?? chains[chains.length - 1];
  const chain = chains.find((c) => c.expiration === picked) ?? fallback;

  // The rich/cheap rule was tested on 30-day vol.
  const c30 = expiryNear(chains, 30, 7) ?? chain;
  const iv30 = atmIv(c30, spot);
  const hv = hv252(bars);
  const bucket: IvBucket | null =
    iv30 && hv && cutoffs && !snapshot.isEtf ? ivBucket(hv, iv30, cutoffs) : null;

  const iv = atmIv(chain, spot);
  const move = impliedMove(chain, spot);
  const liq = liquidityOf(chain, spot);

  // Front-month IV well above the 30-day reading: the market is pricing an
  // event, usually earnings, before the later expiry.
  const front = chains[0];
  const frontIv = front ? atmIv(front, spot) : null;
  const inverted = frontIv !== null && iv30 !== null && front.days < c30.days && frontIv > iv30 * 1.1;

  const idx = new Map(bars.map((b, i) => [b.date, i]));
  const entries = result.trades.map((t) => idx.get(t.entryDate) ?? -1).filter((i) => i >= 0);
  const sessions = sessionsIn(chain.days);
  const past = movesAfter(bars, entries, sessions);

  const holding = result.signal.state === "in";
  const structures = holding && iv && move ? bullishStructures(chain, spot, iv, move, bucket) : [];
  const earningsRisk = earningsBefore(snapshot.earnings, chain.expiration);

  return (
    <div className="divide-y divide-line-soft">
      {/* ---- Is this stock's option market expensive today? ---- */}
      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <Readout label="Implied vol · 30 day" value={iv30 ? pct(iv30, 1) : "—"} sub={`${day(c30.expiration)} expiry`} />
        <Readout label="Realised vol · 1 year" value={hv ? pct(hv, 1) : "—"} sub={iv30 && hv ? `IV is ${(iv30 / hv).toFixed(2)}x this` : undefined} />
        <Readout
          label="IV vs today's market"
          value={bucket !== null ? IV_BUCKETS[bucket].label : snapshot.isEtf ? "ETF" : "—"}
          tone={bucket !== null ? IV_BUCKETS[bucket].tone : "dim"}
          sub={cutoffs && bucket !== null ? `ranked against ${cutoffs.n} stocks` : undefined}
        />
        <Readout
          label="Spread at the money"
          value={liq.spread !== null ? pct(liq.spread, 1) : "no quote"}
          tone={liq.grade === "tight" ? "up" : liq.grade === "fair" ? "bright" : "down"}
          sub={
            liq.grade === "no-quote"
              ? "one-sided quote"
              : `${liq.grade}${marketOpen ? "" : " · market closed"} · OI ${liq.openInterest.toLocaleString("en-US")}`
          }
        />
      </div>

      <IvVerdict bucket={bucket} isEtf={snapshot.isEtf} hasCutoffs={cutoffs !== null} symbol={snapshot.symbol} />

      {/* ---- Expiries: the term structure, and the one being looked at ---- */}
      <div className="p-4">
        <p className="label mb-2">Expiry</p>
        <div className="flex flex-wrap gap-1.5">
          {chains.map((c) => {
            const civ = atmIv(c, spot);
            const cm = impliedMove(c, spot);
            const on = c.expiration === chain.expiration;
            return (
              <button
                key={c.expiration}
                onClick={() => onPick(c.expiration)}
                className={cn(
                  "border px-2 py-1 text-left transition-colors",
                  on ? "border-amber bg-amber/10" : "border-edge hover:border-amber/50",
                )}
              >
                <span className={cn("block text-[11px]", on ? "text-amber" : "text-bright")}>
                  {day(c.expiration)}
                  <span className="ml-1 text-dim">{dte(c)}</span>
                  {earningsBefore(snapshot.earnings, c.expiration) ? (
                    <span className="ml-1 text-amber" title={`Earnings ${day(snapshot.earnings!)} fall before this expiry`}>E</span>
                  ) : null}
                </span>
                <span className="tnum block text-[10px] text-dim">
                  {civ ? `IV ${pct(civ)}` : "IV —"} · {cm ? `±${pct(cm, 1)}` : "±—"}
                </span>
              </button>
            );
          })}
        </div>
        {inverted ? (
          <p className="prose-face mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-amber">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            <span>
              Near-term IV ({pct(frontIv!, 0)}) is well above the 30-day reading ({pct(iv30!, 0)}): the market is
              pricing an event before {day(c30.expiration)}
              {snapshot.earnings ? `, likely earnings on ${day(snapshot.earnings)}` : ""}.
            </span>
          </p>
        ) : null}
      </div>

      {/* ---- What the market prices vs what this signal has done ---- */}
      <div className="p-4">
        <p className="label mb-2">Market vs this signal, to {day(chain.expiration)}</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Readout label="Market prices" value={move ? `±${pct(move, 1)}` : "—"} sub={`over ~${sessions} session${sessions === 1 ? "" : "s"}`} />
          <Readout
            label="Typical move after entry"
            value={past ? `±${pct(past.medianAbs, 1)}` : "—"}
            sub={past ? `${past.n} past signals` : "too few past signals"}
          />
          <Readout
            label="Average after entry"
            value={past ? signed(past.mean) : "—"}
            tone={past ? (past.mean >= 0 ? "up" : "down") : "dim"}
            sub={past ? `up ${pct(past.upRate)} of the time` : undefined}
          />
          <Readout label="Implied vol, this expiry" value={iv ? pct(iv, 1) : "—"} sub={`${day(chain.expiration)} · ${dte(chain) === "0DTE" ? "0DTE" : `${Math.max(1, Math.round(chain.days))} days`}`} />
        </div>
        <MoveVerdict move={move} past={past} factor={factor} />
      </div>

      {/* ---- If you take the view: the cheapest ways to express it ---- */}
      <div className="p-4">
        <p className="label mb-2">Expressing the signal</p>
        {!holding ? (
          <p className="prose-face text-[12px] leading-relaxed text-muted">
            {factor.name} is not holding {snapshot.symbol} right now, so there is no direction to express. An option
            position here would be a bet the strategy isn&apos;t making.
          </p>
        ) : structures.length === 0 ? (
          <p className="prose-face text-[12px] leading-relaxed text-muted">
            No structure can be priced on this expiry — the quotes are one-sided. Try a nearer expiry or check again
            during market hours.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {structures.map((s, i) => (
              <StructureCard key={s.id} s={s} first={i === 0} bucket={bucket} />
            ))}
          </div>
        )}

        <ul className="mt-3 space-y-1.5">
          {earningsRisk ? (
            <Warn>
              Earnings on {day(snapshot.earnings!)} land before this expiry. Implied vol usually collapses right after,
              and the stock can gap past any strike — the biggest single cost for option buyers in the research.
            </Warn>
          ) : null}
          {liq.grade === "wide" ? (
            <Warn>
              The at-the-money spread is {pct(liq.spread!, 0)} of the price.{" "}
              {marketOpen
                ? "Crossing it on entry costs more than most strategies here ever earned. Use a limit order at or near the mid, or skip it."
                : "The market is closed and quotes widen after hours, so this overstates what you would pay in the session — check it again after the open."}
            </Warn>
          ) : null}
          <li className="prose-face flex items-start gap-2 text-[11px] leading-relaxed text-dim">
            <Info className="mt-0.5 size-3 shrink-0" />
            <span>
              Tested on 2020–2026 option data, none of this app&apos;s strategies showed an options edge after trading
              costs: options at a signal are priced like options on any other stock. These structures are the
              cheapest way to express the strategy&apos;s view, not a better trade. Prices are mids; chances are what
              the option market implies, not forecasts. Not investment advice.
            </span>
          </li>
        </ul>
      </div>

      {/* ---- The chain itself ---- */}
      <div>
        <button
          onClick={onToggleChain}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.12em] text-muted hover:bg-raised/40"
        >
          <ChevronDown className={cn("size-3 transition-transform", !showChain && "-rotate-90")} />
          Chain near the money · {day(chain.expiration)}
        </button>
        {showChain ? <ChainTable chain={chain} spot={spot} /> : null}
      </div>
    </div>
  );
}

function IvVerdict({ bucket, isEtf, hasCutoffs, symbol }: { bucket: IvBucket | null; isEtf: boolean; hasCutoffs: boolean; symbol: string }) {
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
        of stocks today. In testing, buying options in this fifth returned{" "}
        <span className="tnum text-text">{b.train.toFixed(1)}%</span> (2020–23) and{" "}
        <span className="tnum text-text">{b.test >= 0 ? "+" : ""}{b.test.toFixed(1)}%</span> (2023–26) per 30 days at a
        typical fill.{" "}
        {bucket <= 1
          ? "Paying for options here has been the costliest place to do it."
          : bucket >= 3
            ? "The least costly place to buy options — still not an edge on its own."
            : "Middle of the pack."}
      </>
    );
  }
  return <p className="prose-face px-4 py-3 text-[12px] leading-relaxed text-muted">{text}</p>;
}

function MoveVerdict({ move, past, factor }: { move: number | null; past: ReturnType<typeof movesAfter>; factor: FactorMeta }) {
  if (!move || !past) {
    return (
      <p className="prose-face mt-3 text-[11px] leading-relaxed text-dim">
        {factor.name} has too few past entries on this stock to compare with what the market prices.
      </p>
    );
  }
  const ratio = past.medianAbs / move;
  const text =
    ratio < 0.8
      ? `The market is pricing a bigger move than ${factor.name} has produced here. Buying options tends to overpay for movement the signal doesn't deliver; spreads or the stock itself express it more cheaply.`
      : ratio > 1.25
        ? `${factor.name}'s past moves here have been larger than the market now prices. That is the one case where buying options is not obviously overpaying — but past signals are few and noisy.`
        : `What the market prices is roughly what ${factor.name} has delivered here. Options neither overpay nor underpay for the signal's typical move.`;
  return <p className="prose-face mt-3 text-[12px] leading-relaxed text-muted">{text}</p>;
}

function StructureCard({ s, first, bucket }: { s: Structure; first: boolean; bucket: IvBucket | null }) {
  const debit = s.net > 0;
  return (
    <div className={cn("border p-3", first ? "border-amber/50 bg-amber/[0.03]" : "border-line")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-bright">{s.name}</span>
        {first && bucket !== null ? <Tag tone="amber">fits today&apos;s IV</Tag> : null}
      </div>
      <ul className="tnum mt-2 space-y-0.5 text-[12px]">
        {s.legs.map((l) => (
          <li key={`${l.side}${l.right}${l.strike}`} className="text-muted">
            <span className={l.side === "buy" ? "text-up" : "text-down"}>{l.side === "buy" ? "Buy" : "Sell"}</span>{" "}
            {l.strike} {l.right} <span className="text-dim">@ {l.mid.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <dl className="tnum mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <Stat label={debit ? "You pay" : "You collect"} value={`${usd(s.net * 100)}`} sub={`${usd(s.natural * 100)} at worst fill`} />
        <Stat label="Breakeven" value={`$${s.breakeven.toFixed(2)}`} />
        <Stat label="Max gain" value={s.maxGain === null ? "Unlimited" : usd(s.maxGain * 100)} tone="up" />
        <Stat label="Max loss" value={usd(s.maxLoss * 100)} tone="down" />
        <Stat label="Market-implied chance" value={pct(s.chance)} sub="of finishing past breakeven" />
      </dl>
      <p className="prose-face mt-2.5 text-[11px] leading-relaxed text-dim">{s.fit}</p>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.1em] text-dim">{label}</dt>
      <dd className={cn("text-[13px]", tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-text")}>{value}</dd>
      {sub ? <dd className="text-[10px] text-faint">{sub}</dd> : null}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <li className="prose-face flex items-start gap-2 text-[11px] leading-relaxed text-amber">
      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function ChainTable({ chain, spot }: { chain: ExpiryChain; spot: number }) {
  const K = atmStrike(chain, spot);
  const strikes = [...new Set(chain.calls.map((c) => c.strike))].filter((k) => chain.puts.some((p) => p.strike === k)).sort((a, b) => a - b);
  const at = K === null ? Math.floor(strikes.length / 2) : strikes.indexOf(K);
  const rows = strikes.slice(Math.max(0, at - 6), at + 7);
  const cell = (right: "call" | "put", k: number) => {
    const q = (right === "call" ? chain.calls : chain.puts).find((x) => x.strike === k)!;
    const iv = contractIv(right, q, spot, chain.days);
    return { q, iv };
  };
  return (
    <div className="overflow-x-auto pb-2">
      <table className="tnum w-full min-w-[560px] border-collapse text-[11px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.1em] text-dim">
            <th className="px-2 py-1.5 text-right font-normal" colSpan={4}>Calls</th>
            <th className="px-2 py-1.5 font-normal">Strike</th>
            <th className="px-2 py-1.5 text-left font-normal" colSpan={4}>Puts</th>
          </tr>
          <tr className="border-b border-line text-[10px] text-faint">
            {["OI", "IV", "Bid", "Ask"].map((h) => <th key={`c${h}`} className="px-2 py-1 text-right font-normal">{h}</th>)}
            <th />
            {["Bid", "Ask", "IV", "OI"].map((h) => <th key={`p${h}`} className="px-2 py-1 text-left font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const c = cell("call", k);
            const p = cell("put", k);
            const itmCall = k < spot;
            return (
              <tr key={k} className={cn("border-b border-line-soft", k === K && "bg-amber/[0.06]")}>
                <td className={cn("px-2 py-1 text-right text-dim", itmCall && "bg-raised/40")}>{c.q.openInterest.toLocaleString("en-US")}</td>
                <td className={cn("px-2 py-1 text-right text-muted", itmCall && "bg-raised/40")}>{c.iv ? pct(c.iv) : "—"}</td>
                <td className={cn("px-2 py-1 text-right text-text", itmCall && "bg-raised/40")}>{c.q.bid ? c.q.bid.toFixed(2) : "—"}</td>
                <td className={cn("px-2 py-1 text-right text-text", itmCall && "bg-raised/40")}>{c.q.ask ? c.q.ask.toFixed(2) : "—"}</td>
                <td className={cn("px-2 py-1 text-center", k === K ? "text-amber" : "text-bright")}>{k}</td>
                <td className={cn("px-2 py-1 text-left text-text", !itmCall && "bg-raised/40")}>{p.q.bid ? p.q.bid.toFixed(2) : "—"}</td>
                <td className={cn("px-2 py-1 text-left text-text", !itmCall && "bg-raised/40")}>{p.q.ask ? p.q.ask.toFixed(2) : "—"}</td>
                <td className={cn("px-2 py-1 text-left text-muted", !itmCall && "bg-raised/40")}>{p.iv ? pct(p.iv) : "—"}</td>
                <td className={cn("px-2 py-1 text-left text-dim", !itmCall && "bg-raised/40")}>{p.q.openInterest.toLocaleString("en-US")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 pt-2 text-[10px] text-faint">Shaded cells are in the money. IV is computed from the mid where the quote is two-sided.</p>
    </div>
  );
}

