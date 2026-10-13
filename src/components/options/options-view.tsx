"use client";

import { AlertTriangle, Info, Loader2, Star } from "lucide-react";
import * as React from "react";

import { buildModel, day, dteLabel, ExpiryChips, IvVerdict, MoveVerdict, pct, signed, usd, Warn, type OptionsModel } from "@/components/options/parts";
import { SimpleStrategyPicker, TickerBar } from "@/components/terminal/controls";
import { useMarketContext } from "@/components/terminal/market-context";
import { Panel, PanelHead, Readout, Tag } from "@/components/ui/terminal";
import { getFactor, type AlphaResult, type FactorMeta } from "@/lib/alpha";
import {
  contractsFor,
  historicalChance,
  IV_BUCKETS,
  payoffAtExpiry,
  suggestedContract,
  type Contract,
  type IvCutoffs,
  type OptionsSnapshot,
  type Right,
} from "@/lib/options";
import type { Bar } from "@/lib/types";
import { useAlpha } from "@/lib/use-alpha";
import { useOptions } from "@/lib/use-options";
import { useHydrated } from "@/lib/use-persisted-params";
import type { Session } from "@/lib/symbols";
import { cn } from "@/lib/utils";

/**
 * The Options tab: buying calls and puts.
 *
 * Shares the ticker and strategy with the terminal (both read the same saved
 * settings), so switching here switches there. Everything on this page is
 * about one decision — which contract, if any, to buy — and is built from
 * what the research found holds up: whether options on the stock are
 * expensive today, how big a move the price already assumes, how often the
 * stock has actually moved that far, and what the spread costs.
 */
export function OptionsView() {
  const { params, set, state, result, sentiment } = useAlpha();
  const meta = getFactor(params.factor);
  // Only to know whether the market is open: after the close, option quotes go
  // stale and widen, and every cost on this page would read as worse than it is.
  const hydrated = useHydrated();
  const context = useMarketContext(hydrated ? params.symbol : null);
  const session = context?.session ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TickerBar params={params} set={set} />
      <SimpleStrategyPicker params={params} set={set} meta={meta} sentiment={sentiment} />
      {state.status === "error" ? (
        <p className="p-6 text-[13px] text-down">{state.message}</p>
      ) : state.status !== "ready" || !result ? (
        <p className="flex items-center gap-2 p-6 text-[13px] text-muted">
          <Loader2 className="size-3.5 animate-spin" /> Loading {params.symbol}…
        </p>
      ) : (
        <OptionsBody
          key={state.history.quote.symbol}
          symbol={state.history.quote.symbol}
          bars={state.history.bars}
          result={result}
          factor={meta}
          session={session}
        />
      )}
    </div>
  );
}

function OptionsBody({
  symbol,
  bars,
  result,
  factor,
  session,
}: {
  symbol: string;
  bars: Bar[];
  result: AlphaResult;
  factor: FactorMeta;
  /** null until known; ETFs and stocks share the regular session. */
  session: Session | null;
}) {
  const { state, cutoffs } = useOptions(symbol);
  const [right, setRight] = React.useState<Right>("call");
  const [expiry, setExpiry] = React.useState<string | null>(null);
  const [pick, setPick] = React.useState<string | null>(null);

  if (state.status === "loading") {
    return (
      <p className="flex items-center gap-2 p-6 text-[13px] text-muted">
        <Loader2 className="size-3.5 animate-spin" /> Loading the {symbol} option chain…
      </p>
    );
  }
  if (state.status === "none") {
    return (
      <div className="mx-auto w-full max-w-[1200px] p-4 lg:p-6">
        <Panel>
          <p className="prose-face p-6 text-[13px] text-muted">
            {symbol} has no listed options — crypto and most non-US listings don&apos;t. Pick a US stock or ETF above.
          </p>
        </Panel>
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="p-6 text-[13px] text-muted">Option data is unavailable right now. Try again in a minute.</p>;
  }

  const snap = state.snapshot;
  const model = buildModel(snap, cutoffs, bars, result, expiry);
  const contracts = contractsFor(model.chain, snap.spot, right);
  const suggested = suggestedContract(contracts);
  const selected = contracts.find((c) => `${right}|${model.chain.expiration}|${c.strike}` === pick) ?? suggested ?? contracts[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 p-4 lg:p-6">
      <Overview snap={snap} cutoffs={cutoffs} model={model} factor={factor} result={result} />

      <Panel>
        <PanelHead title="Choose" />
        <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[auto_1fr]">
          <div>
            <p className="label mb-2">Buy</p>
            <div className="flex gap-1.5">
              {(["call", "put"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRight(r);
                    setPick(null);
                  }}
                  className={cn(
                    "w-24 border px-3 py-2 text-left transition-colors",
                    right === r ? (r === "call" ? "border-up bg-up/10" : "border-down bg-down/10") : "border-edge hover:border-amber/50",
                  )}
                >
                  <span className={cn("block text-[13px]", right === r ? (r === "call" ? "text-up" : "text-down") : "text-bright")}>
                    {r === "call" ? "Calls" : "Puts"}
                  </span>
                  <span className="block text-[10px] text-dim">{r === "call" ? "profit if it rises" : "profit if it falls"}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <p className="label mb-2">Expiry</p>
            <ExpiryChips
              snapshot={snap}
              model={model}
              onPick={(e) => {
                setExpiry(e);
                setPick(null);
              }}
            />
          </div>
        </div>
        <p className="prose-face border-t border-line-soft px-4 py-3 text-[12px] leading-relaxed text-muted">
          {right === "call" ? (
            model.holding ? (
              <>
                <span className="text-up">{factor.name} is holding {symbol}</span> — its view is bullish, which is what a call
                expresses. The default expiry covers three in four of its past holds on this stock.
              </>
            ) : (
              <>
                {factor.name} isn&apos;t holding {symbol}, so a call here is your view, not the strategy&apos;s.
              </>
            )
          ) : (
            <>
              None of the strategies in this app produce a bearish signal — &ldquo;not holding&rdquo; means no view, not a
              falling one. A put here is your own view, or protection for shares you own.
            </>
          )}
        </p>
      </Panel>

      <Panel>
        <PanelHead
          title={`${symbol} ${right === "call" ? "calls" : "puts"} · ${day(model.chain.expiration)} · ${dteLabel(model.chain)}`}
          right={<span className="text-[10px] uppercase tracking-[0.1em] text-dim">click a row · per contract (100 shares)</span>}
        />
        {session !== null && session !== "regular" ? (
          <p className="prose-face flex items-start gap-2 border-b border-line-soft bg-amber/[0.05] px-4 py-2.5 text-[11px] leading-relaxed text-amber">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            <span>
              The market is closed. Option quotes go stale and widen after hours, so the spreads and asks below overstate
              what you would pay during the session. Costs are taken at the mid; check again after the 9:30am ET open.
            </span>
          </p>
        ) : null}
        <ContractTable
          contracts={contracts}
          selected={selected}
          suggested={suggested}
          bars={bars}
          sessions={model.sessions}
          onPick={(c) => setPick(`${right}|${model.chain.expiration}|${c.strike}`)}
        />
      </Panel>

      {selected ? (
        <ContractDetail
          contract={selected}
          snap={snap}
          model={model}
          bars={bars}
          factor={factor}
          isSuggested={selected === suggested}
          marketOpen={session === "regular"}
        />
      ) : null}

      <Research />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Overview({ snap, cutoffs, model, factor, result }: { snap: OptionsSnapshot; cutoffs: IvCutoffs | null; model: OptionsModel; factor: FactorMeta; result: AlphaResult }) {
  return (
    <Panel>
      <PanelHead
        title={`Options · ${snap.symbol}`}
        right={
          <span className="text-[10px] uppercase tracking-[0.1em] text-dim">
            quotes ~15 min delayed · fetched {new Date(snap.asOf).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Readout label="Price" value={`$${snap.spot.toFixed(2)}`} />
        <Readout label="Implied vol · 30 day" value={model.iv30 ? pct(model.iv30, 1) : "—"} sub={`${day(model.c30.expiration)} expiry`} />
        <Readout label="Realised vol · 1 year" value={model.hv ? pct(model.hv, 1) : "—"} sub={model.iv30 && model.hv ? `IV is ${(model.iv30 / model.hv).toFixed(2)}x this` : undefined} />
        <Readout
          label="IV vs today's market"
          value={model.bucket !== null ? IV_BUCKETS[model.bucket].label : snap.isEtf ? "ETF" : "—"}
          tone={model.bucket !== null ? IV_BUCKETS[model.bucket].tone : "dim"}
          sub={cutoffs && model.bucket !== null ? `ranked against ${cutoffs.n} stocks` : undefined}
        />
        <Readout label="Next earnings" value={snap.earnings ? day(snap.earnings) : "—"} tone={snap.earnings ? "amber" : "dim"} sub={snap.earnings ? "IV usually drops right after" : "none scheduled"} />
        <Readout
          label={factor.name}
          value={model.holding ? "Holding" : "No signal"}
          tone={model.holding ? "up" : "dim"}
          sub={model.holding && result.signal.entryDate ? `since ${day(result.signal.entryDate)}` : "not in a position"}
        />
      </div>
      <div className="space-y-2 border-t border-line-soft px-4 py-3">
        <IvVerdict bucket={model.bucket} isEtf={snap.isEtf} hasCutoffs={cutoffs !== null} symbol={snap.symbol} />
        <MoveVerdict move={model.move} past={model.past} factor={factor} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function ContractTable({
  contracts,
  selected,
  suggested,
  bars,
  sessions,
  onPick,
}: {
  contracts: Contract[];
  selected: Contract | null;
  suggested: Contract | null;
  bars: Bar[];
  sessions: number;
  onPick: (c: Contract) => void;
}) {
  if (!contracts.length) return <p className="p-4 text-[12px] text-muted">No contracts listed for this expiry.</p>;
  const head = ["Strike", "Cost", "Bid / ask", "Spread", "IV", "Delta", "Breakeven", "Needs", "Market odds", "History odds", "OI", "Volume"];
  return (
    <div className="overflow-x-auto">
      <table className="tnum w-full min-w-[920px] border-collapse text-[12px]">
        <thead className="bg-panel">
          <tr className="border-b border-line">
            {head.map((h, i) => (
              <th key={h} className={cn("whitespace-nowrap px-3 py-2 text-[10px] font-normal uppercase tracking-[0.1em] text-dim", i === 0 ? "text-left" : "text-right")} title={HEAD_HINTS[h]}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => {
            const on = selected === c;
            const hist = c.needMove !== null ? historicalChance(bars, sessions, c.needMove, c.right) : null;
            return (
              <tr
                key={c.strike}
                onClick={() => onPick(c)}
                className={cn(
                  "cursor-pointer border-b border-line-soft transition-colors",
                  on ? "bg-amber/10" : c.moneyness === "atm" ? "bg-raised/50 hover:bg-raised" : "hover:bg-raised/50",
                )}
              >
                <td className="whitespace-nowrap px-3 py-1.5 text-left">
                  <span className={cn(on ? "text-amber" : "text-bright")}>{c.strike}</span>
                  <span className="ml-1.5 text-[10px] uppercase text-dim">{c.moneyness}</span>
                  {c === suggested ? <Star className="ml-1 inline size-3 fill-amber text-amber" aria-label="start here" /> : null}
                </td>
                <td className="px-3 py-1.5 text-right text-bright">{c.premium !== null ? usd(c.premium * 100, 0) : "—"}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-muted">
                  {c.bid ? c.bid.toFixed(2) : "—"} / {c.ask ? c.ask.toFixed(2) : "—"}
                </td>
                <td className={cn("px-3 py-1.5 text-right", c.spread === null ? "text-dim" : c.spread <= 0.05 ? "text-up" : c.spread <= 0.12 ? "text-text" : "text-down")}>
                  {c.spread !== null ? pct(c.spread) : "—"}
                </td>
                <td className="px-3 py-1.5 text-right text-muted">{c.iv ? pct(c.iv) : "—"}</td>
                <td className="px-3 py-1.5 text-right text-muted">{c.delta !== null ? c.delta.toFixed(2) : "—"}</td>
                <td className="px-3 py-1.5 text-right text-text">{c.breakeven !== null ? c.breakeven.toFixed(2) : "—"}</td>
                <td className="px-3 py-1.5 text-right text-text">{c.needMove !== null ? (c.right === "call" ? "+" : "−") + pct(Math.abs(c.needMove), 1) : "—"}</td>
                <td className="px-3 py-1.5 text-right text-muted">{c.chanceMarket !== null ? pct(c.chanceMarket) : "—"}</td>
                <td className="px-3 py-1.5 text-right text-muted">{hist !== null ? pct(hist) : "—"}</td>
                <td className="px-3 py-1.5 text-right text-dim">{c.openInterest.toLocaleString("en-US")}</td>
                <td className="px-3 py-1.5 text-right text-dim">{c.volume.toLocaleString("en-US")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="prose-face px-4 py-2.5 text-[10px] leading-relaxed text-faint">
        <Star className="mr-1 inline size-2.5 fill-amber text-amber" />
        Start here: the at-the-money contract, where spreads are tightest. Market odds = chance of finishing past breakeven
        that the option price implies. History odds = how often this stock moved that far over the same number of trading
        days in the last three years, with its trend removed. Neither is a forecast.
      </p>
    </div>
  );
}

const HEAD_HINTS: Record<string, string> = {
  Cost: "Mid price x 100 shares. You will usually pay a little more.",
  Spread: "Ask minus bid, as a share of the mid. Green under 5%, red over 12%.",
  Delta: "Roughly how much the option moves per $1 in the stock, per share.",
  Needs: "How far the stock must move by expiry just to break even.",
  "Market odds": "Chance of finishing past breakeven implied by the option's own price.",
  "History odds": "Share of past same-length windows (trend removed) where the stock moved past breakeven.",
  OI: "Open interest: contracts outstanding.",
};

// ---------------------------------------------------------------------------

function ContractDetail({
  contract: c,
  snap,
  model,
  bars,
  factor,
  isSuggested,
  marketOpen,
}: {
  contract: Contract;
  snap: OptionsSnapshot;
  model: OptionsModel;
  bars: Bar[];
  factor: FactorMeta;
  isSuggested: boolean;
  marketOpen: boolean;
}) {
  const spot = snap.spot;
  const premium = c.premium;
  const hist = c.needMove !== null ? historicalChance(bars, model.sessions, c.needMove, c.right) : null;

  // After this strategy's own past entries: how often the stock finished past
  // this breakeven over the same number of sessions. Calls only — the
  // strategies have no bearish signal for a put to follow.
  let afterSignal: { hits: number; n: number } | null = null;
  if (c.right === "call" && c.needMove !== null) {
    let hits = 0;
    let n = 0;
    for (const i of model.entries) {
      if (i + model.sessions >= bars.length) continue;
      n++;
      if (bars[i + model.sessions].close / bars[i].close - 1 > c.needMove) hits++;
    }
    afterSignal = n >= 3 ? { hits, n } : null;
  }

  const move = model.move ?? 0.05;
  const scenarios = [-2, -1, 0, 1, 2].map((k) => {
    const price = spot * (1 + k * move);
    const pnl = premium !== null ? payoffAtExpiry(c.right, c.strike, premium, price) * 100 : null;
    return { k, price, pnl, ret: pnl !== null && premium ? pnl / (premium * 100) : null };
  });

  return (
    <Panel>
      <PanelHead
        title={`Buy 1 ${snap.symbol} ${day(model.chain.expiration)} ${c.strike} ${c.right}`}
        right={isSuggested ? <Tag tone="amber">start here</Tag> : <Tag tone="neutral">{c.moneyness}</Tag>}
      />
      <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Readout label="Cost" value={premium !== null ? usd(premium * 100) : "—"} sub={c.ask ? `${usd(c.ask * 100)} at the ask` : undefined} />
            <Readout label="Most you can lose" value={premium !== null ? usd(premium * 100) : "—"} tone="down" sub="the whole premium" />
            <Readout label="Breakeven at expiry" value={c.breakeven !== null ? `$${c.breakeven.toFixed(2)}` : "—"} sub={c.needMove !== null ? `${c.right === "call" ? "+" : "−"}${pct(Math.abs(c.needMove), 1)} from here` : undefined} />
            <Readout label="Market prices" value={model.move ? `±${pct(model.move, 1)}` : "—"} sub={`by ${day(model.chain.expiration)}`} />
            <Readout label="Time decay" value={c.thetaPerDay !== null ? `−${usd(Math.abs(c.thetaPerDay) * 100)}` : "—"} tone="down" sub="per day, if nothing moves" />
            <Readout label="Delta" value={c.delta !== null ? c.delta.toFixed(2) : "—"} sub={c.delta !== null ? `~${usd(Math.abs(c.delta) * 100)} per $1 move` : undefined} />
          </div>

          <div className="border-t border-line-soft pt-3">
            <p className="label mb-2">Chance of finishing past breakeven</p>
            <dl className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3">
              <Odds label="Option price implies" value={c.chanceMarket} />
              <Odds label="This stock's history" value={hist} hint="same horizon, trend removed" />
              {afterSignal ? (
                <Odds label={`After ${factor.name} entries`} value={afterSignal.hits / afterSignal.n} hint={`${afterSignal.hits} of ${afterSignal.n} past signals`} />
              ) : (
                <Odds label="After strategy entries" value={null} hint={c.right === "put" ? "no bearish signals" : "too few signals"} />
              )}
            </dl>
          </div>

          <ul className="space-y-1.5 border-t border-line-soft pt-3">
            {model.earningsRisk ? (
              <Warn>
                Earnings on {day(snap.earnings!)} come before this expiry. Implied vol usually collapses straight after, so the
                option can lose value even if the stock moves your way.
              </Warn>
            ) : null}
            {model.bucket !== null && model.bucket <= 1 ? (
              <Warn>
                {snap.symbol}&apos;s options are among the most expensive in the market today relative to how much it moves.
                Buying here has been the costliest place to do it.
              </Warn>
            ) : null}
            {c.spread !== null && c.spread > 0.12 ? (
              <Warn>
                The spread is {pct(c.spread)} of the price.{" "}
                {marketOpen
                  ? "Paying the ask costs that much on day one — use a limit order near the mid, or pick a strike nearer the money."
                  : "The market is closed and after-hours quotes run wide, so this likely overstates the session spread. Recheck after the open."}
              </Warn>
            ) : null}
            {c.moneyness === "otm" && c.delta !== null && Math.abs(c.delta) < 0.3 ? (
              <Warn>
                Far out of the money: cheap per contract, but it needs a large move and finishes worthless most of the time.
              </Warn>
            ) : null}
          </ul>
        </div>

        <div>
          <p className="label mb-2">Profit or loss at expiry, per contract</p>
          {premium !== null ? <PayoffChart right={c.right} strike={c.strike} premium={premium} spot={spot} move={move} breakeven={c.breakeven!} /> : null}
          <table className="tnum mt-3 w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.1em] text-dim">
                <th className="py-1 text-left font-normal">If the stock ends at</th>
                <th className="py-1 text-right font-normal">Move</th>
                <th className="py-1 text-right font-normal">P&amp;L</th>
                <th className="py-1 text-right font-normal">Return</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.k} className="border-b border-line-soft">
                  <td className="py-1 text-left text-text">
                    ${s.price.toFixed(2)}
                    <span className="ml-1.5 text-dim">{s.k === 0 ? "unchanged" : `${s.k > 0 ? "+" : "−"}${Math.abs(s.k)}× priced move`}</span>
                  </td>
                  <td className="py-1 text-right text-muted">{signed(s.k * move)}</td>
                  <td className={cn("py-1 text-right", s.pnl === null ? "text-dim" : s.pnl >= 0 ? "text-up" : "text-down")}>
                    {s.pnl === null ? "—" : `${s.pnl >= 0 ? "+" : "−"}${usd(s.pnl)}`}
                  </td>
                  <td className={cn("py-1 text-right", s.ret === null ? "text-dim" : s.ret >= 0 ? "text-up" : "text-down")}>
                    {s.ret === null ? "—" : signed(s.ret, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="prose-face mt-2 text-[10px] leading-relaxed text-faint">
            &ldquo;Priced move&rdquo; is the move the market expects by expiry (±{pct(move, 1)}). Values are at expiry; before then
            the option also carries time value.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function Odds({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div className="border border-line-soft px-3 py-2">
      <dt className="text-[10px] uppercase tracking-[0.1em] text-dim">{label}</dt>
      <dd className="tnum mt-1 text-[16px] text-bright">{value !== null ? pct(value) : "—"}</dd>
      {hint ? <dd className="text-[10px] text-faint">{hint}</dd> : null}
    </div>
  );
}

/** P&L at expiry across a range of prices. Plain SVG, coloured by the theme. */
function PayoffChart({ right, strike, premium, spot, move, breakeven }: { right: Right; strike: number; premium: number; spot: number; move: number; breakeven: number }) {
  const W = 600;
  const H = 220;
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  const span = Math.max(move * 2.4, 0.08);
  const lo = spot * (1 - span);
  const hi = spot * (1 + span);
  const N = 80;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const p = lo + ((hi - lo) * i) / N;
    return { p, v: payoffAtExpiry(right, strike, premium, p) * 100 };
  });
  const vMin = Math.min(...pts.map((d) => d.v), -premium * 100);
  const vMax = Math.max(...pts.map((d) => d.v), premium * 100);
  const x = (p: number) => pad.l + ((p - lo) / (hi - lo)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((vMax - v) / (vMax - vMin)) * (H - pad.t - pad.b);
  const path = pts.map((d, i) => `${i ? "L" : "M"}${x(d.p).toFixed(1)},${y(d.v).toFixed(1)}`).join(" ");
  const zero = y(0);
  const mark = (p: number, label: string, cls: string, dashed = false) =>
    p > lo && p < hi ? (
      <g className={cls}>
        <line x1={x(p)} x2={x(p)} y1={pad.t} y2={H - pad.b} stroke="currentColor" strokeWidth={1} strokeDasharray={dashed ? "3 3" : undefined} opacity={0.7} />
        <text x={x(p)} y={H - 6} fontSize={10} textAnchor="middle" fill="currentColor">
          {label}
        </text>
      </g>
    ) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Profit or loss at expiry">
      <defs>
        <clipPath id="above">
          <rect x={0} y={0} width={W} height={zero} />
        </clipPath>
        <clipPath id="below">
          <rect x={0} y={zero} width={W} height={H - zero} />
        </clipPath>
      </defs>
      <line x1={pad.l} x2={W - pad.r} y1={zero} y2={zero} className="text-dim" stroke="currentColor" strokeWidth={1} />
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} clipPath="url(#above)" className="text-up" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} clipPath="url(#below)" className="text-down" />
      {mark(spot, `now ${spot.toFixed(0)}`, "text-muted")}
      {mark(breakeven, `breakeven ${breakeven.toFixed(0)}`, "text-amber", true)}
      <text x={pad.l + 2} y={y(-premium * 100) - 4} fontSize={10} className="text-down" fill="currentColor">
        max loss −{usd(premium * 100, 0)}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------

function Research() {
  const items: [string, React.ReactNode][] = [
    [
      "Paying for movement lost money on average.",
      "Buying an at-the-money call and put together — a pure bet that the stock moves — lost 8% a month in 2020–23 and 4% in 2023–26 across 233 stocks, at a typical fill. Option prices usually assume a little more movement than stocks deliver.",
    ],
    [
      "Calls alone followed the market.",
      "Bought at-the-money calls averaged −0.9% a month in 2020–23 and +5.9% in 2023–26, a rising market; neither result is statistically reliable. With a call or a put, direction is the bet and the option adds its cost on top.",
    ],
    [
      "Where IV sits matters most.",
      "Paying for movement in the most expensive fifth of stocks (IV high versus the stock's own past year) lost 8–11% a month; the cheapest fifth lost least, about break-even in 2023–26. That ranking is the badge at the top of this page.",
    ],
    [
      "The strategies don't make options cheaper.",
      "Options on stocks the strategies were buying were priced like options on any other stock. A signal tells you direction; it doesn't find you a bargain on the option.",
    ],
    [
      "Spreads are the hidden cost.",
      "At the money, single-stock spreads ran 11–12% of the price in real quotes; out of the money they are far wider. Start at the money and use a limit order near the mid.",
    ],
    [
      "Earnings change the trade.",
      "Implied vol rises into earnings and usually collapses right after, so an option can lose value even when the stock moves the right way.",
    ],
  ];
  return (
    <Panel>
      <PanelHead title="What the research says about buying options" />
      <ul className="divide-y divide-line-soft">
        {items.map(([h, body]) => (
          <li key={h} className="flex items-start gap-3 px-4 py-3">
            <Info className="mt-0.5 size-3.5 shrink-0 text-amber" />
            <span className="prose-face text-[12px] leading-relaxed text-muted">
              <span className="text-bright">{h}</span> {body}
            </span>
          </li>
        ))}
        <li className="flex items-start gap-3 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-dim" />
          <span className="prose-face text-[11px] leading-relaxed text-dim">
            Research and education, not investment advice. Prices are delayed mids from Yahoo Finance; odds are estimates,
            not forecasts. Options can expire worthless.
          </span>
        </li>
      </ul>
    </Panel>
  );
}
