"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { buildModel, day, IvVerdict, MoveVerdict, pct, usd } from "@/components/options/parts";
import { Panel, PanelHead, Readout } from "@/components/ui/terminal";
import type { AlphaResult, FactorMeta } from "@/lib/alpha";
import { contractsFor, IV_BUCKETS, suggestedContract } from "@/lib/options";
import type { Bar } from "@/lib/types";
import { useOptions } from "@/lib/use-options";

/**
 * The options read-out on the terminal: is buying options on this stock
 * expensive today, what move is priced, and where to start. The full picture --
 * every strike, both calls and puts, the payoff -- lives on the Options tab.
 */
export function OptionsPanel({
  symbol,
  bars,
  result,
  factor,
}: {
  symbol: string;
  bars: Bar[];
  result: AlphaResult;
  factor: FactorMeta;
}) {
  const { state, cutoffs } = useOptions(symbol);

  return (
    <Panel>
      <PanelHead
        title="Options"
        right={
          <Link href="/options" className="flex items-center gap-1 text-[11px] text-amber hover:underline">
            Full options view <ArrowRight className="size-3" />
          </Link>
        }
      />
      {state.status === "loading" ? (
        <p className="p-4 text-[12px] text-muted">Loading the option chain…</p>
      ) : state.status === "none" ? (
        <p className="prose-face p-4 text-[12px] text-muted">
          {symbol} has no listed options. Crypto and most non-US listings don&apos;t.
        </p>
      ) : state.status === "error" ? (
        <p className="prose-face p-4 text-[12px] text-muted">Option data is unavailable right now.</p>
      ) : (
        <Summary snapshot={state.snapshot} cutoffs={cutoffs} bars={bars} result={result} factor={factor} />
      )}
    </Panel>
  );
}

function Summary({
  snapshot: snap,
  cutoffs,
  bars,
  result,
  factor,
}: {
  snapshot: Extract<ReturnType<typeof useOptions>["state"], { status: "ready" }>["snapshot"];
  cutoffs: ReturnType<typeof useOptions>["cutoffs"];
  bars: Bar[];
  result: AlphaResult;
  factor: FactorMeta;
}) {
  const m = buildModel(snap, cutoffs, bars, result, null);
  const start = m.holding ? suggestedContract(contractsFor(m.chain, snap.spot, "call")) : null;

  return (
    <div className="divide-y divide-line-soft">
      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <Readout label="Implied vol · 30 day" value={m.iv30 ? pct(m.iv30, 1) : "—"} sub={m.hv ? `realised ${pct(m.hv, 1)} · 1 yr` : undefined} />
        <Readout
          label="IV vs today's market"
          value={m.bucket !== null ? IV_BUCKETS[m.bucket].label : snap.isEtf ? "ETF" : "—"}
          tone={m.bucket !== null ? IV_BUCKETS[m.bucket].tone : "dim"}
          sub={cutoffs && m.bucket !== null ? `ranked against ${cutoffs.n} stocks` : undefined}
        />
        <Readout label={`Market prices · ${day(m.chain.expiration)}`} value={m.move ? `±${pct(m.move, 1)}` : "—"} sub={`~${m.sessions} sessions`} />
        <Readout
          label="Typical move after entry"
          value={m.past ? `±${pct(m.past.medianAbs, 1)}` : "—"}
          sub={m.past ? `${m.past.n} past signals` : "too few signals"}
        />
      </div>
      <div className="space-y-2 p-4">
        <IvVerdict bucket={m.bucket} isEtf={snap.isEtf} hasCutoffs={cutoffs !== null} symbol={snap.symbol} />
        <MoveVerdict move={m.move} past={m.past} factor={factor} />
        <p className="prose-face text-[12px] leading-relaxed text-text">
          {start && start.premium !== null && start.breakeven !== null && start.needMove !== null ? (
            <>
              {factor.name} is holding {snap.symbol}. The place to start is the at-the-money call:{" "}
              <span className="tnum text-bright">
                {day(m.chain.expiration)} {start.strike} call
              </span>{" "}
              at about <span className="tnum text-bright">{usd(start.premium * 100)}</span> a contract, which needs the
              stock above <span className="tnum">${start.breakeven.toFixed(2)}</span> (
              <span className="tnum">+{pct(start.needMove, 1)}</span>) by expiry to make money.
            </>
          ) : m.holding ? (
            <>The at-the-money call has no usable quote right now — check during market hours.</>
          ) : (
            <>
              {factor.name} isn&apos;t holding {snap.symbol}, so it has no view to buy an option on. The Options tab still
              shows every call and put if you have a view of your own.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
