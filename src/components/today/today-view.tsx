"use client";

import { AlertTriangle, Check, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { getFactor } from "@/lib/alpha";
import { fmtDate, fmtPct, fmtPctPlain } from "@/lib/format";
import { stalenessOf } from "@/lib/screen";
import {
  BUCKET_BLURBS,
  BUCKET_LABELS,
  buildToday,
  type Pick,
  type PickBucket,
} from "@/lib/today";
import { useScreen } from "@/lib/use-screen";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/lib/watchlist";

const ORDER: PickBucket[] = ["fresh", "nearing", "holding", "waiting"];

export function TodayView() {
  const { data, error } = useScreen();
  const { entries, add } = useWatchlist();

  const today = React.useMemo(() => (data ? buildToday(data) : null), [data]);

  // Derived from `entries` rather than the store's `has()` so the button
  // re-renders the moment something is added.
  const onList = React.useMemo(
    () => new Set(entries.map((e) => `${e.symbol}:${e.factor}`)),
    [entries],
  );

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1000px] p-4 lg:p-6">
        <Panel>
          <div className="p-6 text-[13px] text-down">{error}</div>
        </Panel>
      </div>
    );
  }

  if (!today) {
    return (
      <div className="mx-auto w-full max-w-[1000px] p-4 lg:p-6">
        <Panel>
          <div className="p-6 text-[13px] text-muted">Loading the scan…</div>
        </Panel>
      </div>
    );
  }

  const stale = stalenessOf(today.asOf);
  const grouped = ORDER.map((b) => ({
    bucket: b,
    picks: today.picks.filter((p) => p.bucket === b),
  })).filter((g) => g.picks.length > 0);

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-4 p-4 lg:p-6">
      <Funnel today={today} stale={stale} />

      {today.picks.length === 0 ? (
        <Panel>
          <div className="p-6">
            <p className="prose-face max-w-xl text-[13px] leading-relaxed text-text">
              Nothing cleared the bar in this scan. That is a real answer, not a
              failure — on most days most rules are not worth trading, and a
              list that always has something on it is a list that is not
              filtering anything.
            </p>
          </div>
        </Panel>
      ) : (
        grouped.map((g) => (
          <Panel key={g.bucket}>
            <PanelHead
              title={BUCKET_LABELS[g.bucket]}
              right={
                <Tag tone={g.bucket === "fresh" ? "up" : g.bucket === "nearing" ? "amber" : "neutral"}>
                  {g.picks.length}
                </Tag>
              }
            />
            <p className="prose-face border-b border-line-soft px-4 py-3 text-[12px] leading-relaxed text-muted">
              {BUCKET_BLURBS[g.bucket]}
            </p>
            <ul className="divide-y divide-line-soft">
              {g.picks.map((p) => (
                <PickRow
                  key={p.key}
                  pick={p}
                  cash={today.cashRatePct}
                  years={today.years}
                  added={onList.has(p.key)}
                  onAdd={() => add(p.row.s, p.row.f, p.row.p)}
                />
              ))}
            </ul>
          </Panel>
        ))
      )}

      <Panel>
        <PanelHead title="What this list is not" />
        <div className="space-y-2 p-4">
          <p className="prose-face max-w-2xl text-[12px] leading-relaxed text-muted">
            These are the rules that survived every test the scan can apply to
            past data. That is the strongest statement available here, and it is
            still a statement about the past. None of it is a forecast, and a
            rule that worked for three years can stop working the day you start
            using it.
          </p>
          <p className="prose-face max-w-2xl text-[12px] leading-relaxed text-muted">
            The scan tests {today.years} years at one fixed setting per strategy,
            with no searching for the setting that happened to work — that search
            is how backtests get fabricated. Costs are charged at{" "}
            <span className="text-text">10 bps</span> a round trip and every
            survivor was re-tested at{" "}
            <span className="text-text">25 bps</span> and at neighbouring
            settings. Research tool, not investment advice.
          </p>
        </div>
      </Panel>
    </div>
  );
}

/**
 * The rejection funnel.
 *
 * This panel is the argument for the list. Without it, "seventeen names" reads
 * like a stock tip; with it, it reads as what survived 1,390 attempts — and the
 * reader can see that most of the drop happens at the statistical test, not at
 * some arbitrary cutoff chosen to leave a tidy number behind.
 */
function Funnel({
  today,
  stale,
}: {
  today: ReturnType<typeof buildToday>;
  stale: ReturnType<typeof stalenessOf>;
}) {
  const f = today.funnel;
  // A list built on stale bars is the failure mode that matters here: it would
  // read as "today's names" while describing a market several sessions old.
  const freshness = {
    fresh: { tone: "up" as const, label: "current" },
    aging: { tone: "amber" as const, label: `${stale.sessions} sessions old` },
    stale: { tone: "down" as const, label: `${stale.sessions} sessions old` },
  }[stale.level];
  const steps = [
    { n: f.pairs, label: "strategy + ticker pairs tested" },
    { n: f.significant, label: "showed a statistically real pattern" },
    { n: f.survived, label: "survived cost and parameter stress" },
    { n: f.candidates, label: `made money above cash (${fmtPctPlain(today.cashRatePct, 1)}) and above holding` },
    { n: f.live, label: "are in a position right now" },
    { n: f.fresh, label: "entered within the last week" },
  ];
  const max = steps[0].n || 1;

  return (
    <Panel>
      <PanelHead
        title="Today's list"
        right={
          <span className="flex flex-wrap items-center gap-2">
            <Tag tone={freshness.tone}>{freshness.label}</Tag>
            <span className="tnum text-[11px] text-dim">close of {fmtDate(today.asOf)}</span>
          </span>
        }
      />
      <div className="p-4">
        <p className="prose-face mb-4 max-w-2xl text-[13px] leading-relaxed text-text">
          Built from the scan, not from an opinion. Every name below is a rule
          that already passed each test — nothing here is predicted or chosen by
          a model.
        </p>
        <ul className="space-y-1.5">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-3">
              <span className="tnum w-12 shrink-0 text-right text-[13px] text-bright">
                {s.n.toLocaleString("en-US")}
              </span>
              <span className="h-2 w-32 shrink-0 bg-raised">
                <span
                  className={cn("block h-full", i === 0 ? "bg-dim" : i === steps.length - 1 ? "bg-up" : "bg-amber")}
                  style={{ width: `${Math.max(1.5, (s.n / max) * 100)}%` }}
                />
              </span>
              <span className="prose-face min-w-0 text-[12px] leading-relaxed text-muted">
                {s.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function PickRow({
  pick,
  cash,
  years,
  added,
  onAdd,
}: {
  pick: Pick;
  cash: number;
  years: number;
  added: boolean;
  onAdd: () => void;
}) {
  const { row, edge, ticker, bucket } = pick;
  const meta = getFactor(row.f);

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link
              href={`/dashboard?symbol=${row.s}&factor=${row.f}&param=${row.p}`}
              className="tnum text-[15px] text-bright hover:text-amber hover:underline"
            >
              {row.s}
            </Link>
            <span className="truncate text-[12px] text-muted">{ticker?.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Tag tone="info">{meta.name}</Tag>
            <StateTag row={row} bucket={bucket} />
          </div>
        </div>

        {/* The headline claim, with both halves of it visible. A single "edge"
            number is what let a rule that loses 4% a year look like a winner. */}
        <div className="flex shrink-0 items-start gap-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-dim">Edge / yr</div>
            <div className="tnum text-[17px] text-up">{fmtPct(edge.vsHold, 1)}</div>
          </div>
          <div className="text-[11px] leading-[1.6]">
            <div className="text-dim">
              rule <span className="tnum text-text">{fmtPct(edge.annStrategy, 1)}</span>/yr
            </div>
            <div className="text-dim">
              holding <span className="tnum text-text">{fmtPct(edge.annHold, 1)}</span>/yr
            </div>
            <div className="text-dim">
              cash <span className="tnum text-muted">{fmtPctPlain(cash, 1)}</span>/yr
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]">
          <Stat label="Trades" value={String(row.n)} hint={`over ${years} years`} />
          <Stat label="Win rate" value={`${row.win}%`} />
          <Stat label="In market" value={`${row.exp}%`} hint="of all days" />
          <Stat label="Worst fall" value={fmtPctPlain(row.dd, 0)} tone="down" />
          <Stat label="t-stat" value={row.t.toFixed(2)} hint="2+ is significant" />
        </dl>

        <Button size="sm" variant={added ? "ghost" : "outline"} onClick={onAdd} disabled={added}>
          {added ? <Check /> : <Plus />}
          {added ? "On watchlist" : "Watch"}
        </Button>
      </div>

      {edge.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-line-soft pt-2.5">
          {edge.warnings.map((w) => (
            <li key={w} className="prose-face flex items-start gap-2 text-[11px] leading-relaxed text-amber">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** What state the rule is in, said in a way that cannot be read as a tip. */
function StateTag({ row, bucket }: { row: Pick["row"]; bucket: PickBucket }) {
  if (bucket === "fresh") {
    return (
      <Tag tone="up">
        {row.days === 0 ? "entered today" : `entered ${row.days} session${row.days === 1 ? "" : "s"} ago`}
        {row.open !== null ? ` · ${fmtPct(row.open, 1)}` : ""}
      </Tag>
    );
  }
  if (bucket === "holding") {
    return (
      <Tag tone="neutral">
        holding {row.days} sessions{row.open !== null ? ` · ${fmtPct(row.open, 1)}` : ""}
      </Tag>
    );
  }
  if (bucket === "nearing") {
    return <Tag tone="amber">{row.prox}% of the way to triggering</Tag>;
  }
  return <Tag tone="neutral">out · {row.prox ?? 0}% to trigger</Tag>;
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "down";
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.1em] text-dim">{label}</dt>
      <dd className={cn("tnum text-[13px]", tone === "down" ? "text-down" : "text-text")}>
        {value}
        {hint ? <span className="ml-1 text-[10px] text-faint">{hint}</span> : null}
      </dd>
    </div>
  );
}
