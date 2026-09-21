"use client";

import { AlertTriangle, Check, ChevronDown, Layers, Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { getFactor } from "@/lib/alpha";
import { evidenceLabel } from "@/lib/edge";
import { fmtDate, fmtPct, fmtPctPlain } from "@/lib/format";
import { stalenessOf } from "@/lib/screen";
import {
  BUCKET_BLURBS,
  BUCKET_LABELS,
  DEFAULT_MIN_EDGE,
  buildToday,
  concentrationOf,
  type Pick,
  type PickBucket,
} from "@/lib/today";
import { usePersistedParams } from "@/lib/use-persisted-params";
import { useScreen } from "@/lib/use-screen";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/lib/watchlist";

const ORDER: PickBucket[] = ["fresh", "nearing", "holding", "waiting"];

export function TodayView() {
  const { data, error } = useScreen();
  const { entries, add } = useWatchlist();
  const [, setParams] = usePersistedParams();
  const router = useRouter();
  const [minEdge, setMinEdge] = React.useState(DEFAULT_MIN_EDGE);

  /** The terminal reads from stored params, so set them before navigating. */
  const open = React.useCallback(
    (p: Pick) => {
      setParams((prev) => ({ ...prev, symbol: p.row.s, factor: p.row.f, param: p.row.p }));
      router.push("/dashboard");
    },
    [router, setParams],
  );

  const today = React.useMemo(
    () => (data ? buildToday(data, minEdge) : null),
    [data, minEdge],
  );

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
      <Funnel today={today} stale={stale} minEdge={minEdge} setMinEdge={setMinEdge} />

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
          <Section
            key={g.bucket}
            bucket={g.bucket}
            count={g.picks.length}
            /* Nothing in "not close" can be acted on, so it starts shut. It is
               still here, because a rule at 84% of the way to its trigger is
               worth seeing before it fires rather than after. */
            defaultOpen={g.bucket !== "waiting"}
            concentration={g.bucket === "fresh" ? concentrationOf(g.picks) : []}
          >
            {g.picks.map((p) => (
              <PickRow
                key={p.key}
                pick={p}
                cash={today.cashRatePct}
                years={today.years}
                added={onList.has(p.key)}
                onAdd={() => add(p.row.s, p.row.f, p.row.p)}
                onOpen={() => open(p)}
              />
            ))}
          </Section>
        ))
      )}

      <Panel>
        <div className="p-4">
          <p className="prose-face max-w-2xl text-[12px] leading-relaxed text-muted">
            <span className="text-text">Every number here is about the past.</span>{" "}
            A rule that worked for {today.years} years can stop working the day
            you start using it. One fixed setting per strategy, no searching for
            the one that happened to work, costs charged at 10 bps and every
            survivor re-tested at 25 bps. Research tool, not investment advice.
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
  minEdge,
  setMinEdge,
}: {
  today: ReturnType<typeof buildToday>;
  stale: ReturnType<typeof stalenessOf>;
  minEdge: number;
  setMinEdge: (v: number) => void;
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
    { n: f.heldUp, label: "beat holding on data the tuning never saw", key: true },
    { n: f.candidates, label: `made money above cash (${fmtPctPlain(today.cashRatePct, 1)}) and above holding` },
    { n: f.aboveFloor, label: `clear your ${minEdge}%/yr minimum` },
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

        {/*
          The floor is a control, not a hidden rule. Saying what it is holding
          back matters: a filter that silently shrinks the list teaches you the
          wrong thing about how much actually passed.
        */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
          <span className="text-[11px] uppercase tracking-[0.1em] text-dim">
            Minimum edge
          </span>
          <span className="flex items-center gap-1">
            {[0, 5, 10, 15, 20].map((v) => (
              <button
                key={v}
                onClick={() => setMinEdge(v)}
                className={cn(
                  "tnum border px-2 py-0.5 text-[11px] transition-colors",
                  v === minEdge
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-edge text-muted hover:border-amber/50 hover:text-bright",
                )}
              >
                {v === 0 ? "any" : `${v}%`}
              </button>
            ))}
          </span>
          <span className="prose-face min-w-0 text-[11px] leading-relaxed text-dim">
            {today.hiddenByFloor > 0
              ? `${today.hiddenByFloor} candidate${today.hiddenByFloor === 1 ? "" : "s"} hidden below this floor.`
              : "Showing every candidate."}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function Section({
  bucket,
  count,
  defaultOpen,
  concentration,
  children,
}: {
  bucket: PickBucket;
  count: number;
  defaultOpen: boolean;
  concentration: { label: string; members: string[] }[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Panel>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 border-b border-line px-4 py-2.5 text-left hover:bg-raised/40"
      >
        <ChevronDown
          className={cn("size-3 shrink-0 text-dim transition-transform", !open && "-rotate-90")}
        />
        <span className="text-[11px] uppercase tracking-[0.12em] text-bright">
          {BUCKET_LABELS[bucket]}
        </span>
        <Tag tone={bucket === "fresh" ? "up" : bucket === "nearing" ? "amber" : "neutral"}>
          {count}
        </Tag>
        <span className="prose-face ml-2 hidden min-w-0 truncate text-[11px] text-dim sm:block">
          {BUCKET_BLURBS[bucket]}
        </span>
      </button>

      {open ? (
        <>
          <p className="prose-face border-b border-line-soft px-4 py-2.5 text-[12px] leading-relaxed text-muted sm:hidden">
            {BUCKET_BLURBS[bucket]}
          </p>

          {/*
            Every row on this page is judged alone, which quietly implies the
            names are independent bets. They are not: three of the current
            eight are the same sector and the same trade in different clothes.
            Taking all of them is far more concentrated than the count suggests.
          */}
          {concentration.length > 0 ? (
            <div className="border-b border-line-soft bg-amber/[0.04] px-4 py-2.5">
              <p className="prose-face flex items-start gap-2 text-[11px] leading-relaxed text-amber">
                <Layers className="mt-0.5 size-3 shrink-0" />
                <span>
                  These are fewer bets than they look.{" "}
                  {concentration.map((c, i) => (
                    <React.Fragment key={c.label}>
                      {i > 0 ? "; " : ""}
                      <span className="tnum text-bright">{c.members.join(", ")}</span> all use{" "}
                      {c.label}
                    </React.Fragment>
                  ))}
                  . Taking all of them concentrates the risk rather than spreading it.
                </span>
              </p>
            </div>
          ) : null}

          <ul className="divide-y divide-line-soft">{children}</ul>
        </>
      ) : null}
    </Panel>
  );
}

function PickRow({
  pick,
  cash,
  years,
  added,
  onAdd,
  onOpen,
}: {
  pick: Pick;
  cash: number;
  years: number;
  added: boolean;
  onAdd: () => void;
  onOpen: () => void;
}) {
  const { row, edge, ticker, bucket } = pick;
  const meta = getFactor(row.f);
  const [open, setOpen] = React.useState(false);

  return (
    <li className="p-4">
      {/*
        Three facts decide this row: how much it beat holding by, whether that
        is believable, and whether the signal is current. Everything else was
        competing with them for attention, so it moved behind the toggle.
      */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {/*
              A button, not a link. The terminal reads what to show from
              localStorage and ignores the query string, so `?symbol=CI` looked
              like it worked and silently dropped you on whatever you had open
              before. Setting the params first and then navigating is what the
              screener already does.
            */}
            <button
              onClick={onOpen}
              title={`Open ${row.s} in the terminal`}
              className="tnum text-[15px] text-bright hover:text-amber hover:underline"
            >
              {row.s}
            </button>
            <span className="truncate text-[12px] text-muted">{ticker?.name}</span>
          </div>

          <p className="prose-face mt-1 text-[12px] leading-relaxed text-muted">
            {meta.name} · <StateText row={row} bucket={bucket} /> ·{" "}
            <span className="tnum">{row.n}</span> trades ·{" "}
            <span className={edge.confidence >= 0.8 ? "text-text" : undefined}>
              {evidenceLabel(edge.confidence)}
            </span>
          </p>

          {/*
            The walk-forward result, which the scan has always computed and no
            page has ever shown. It is the only number here measured on data
            the rule was not fitted to, which makes it worth more than every
            in-sample figure on the row combined.
          */}
          {edge.oosEdge !== null ? (
            <p className="prose-face mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-up">
              <ShieldCheck className="mt-0.5 size-3 shrink-0" />
              <span>
                Held up on unseen data — beat holding by{" "}
                <span className="tnum">{edge.oosEdge.toFixed(0)}</span> points on a
                window the tuning never saw.
              </span>
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <div className="tnum text-[18px] leading-none text-up">
            {fmtPct(edge.vsHold, 1)}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-dim">
            a year over holding
          </div>
        </div>
      </div>

      {/* Warnings stay in the collapsed view. They are the reason not to make
          a trade, which is never a detail. */}
      {edge.warnings.length > 0 ? (
        <ul className="mt-2.5 space-y-1">
          {edge.warnings.map((w) => (
            <li
              key={w}
              className="prose-face flex items-start gap-2 text-[11px] leading-relaxed text-amber"
            >
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={added ? "ghost" : "outline"} onClick={onAdd} disabled={added}>
          {added ? <Check /> : <Plus />}
          {added ? "On watchlist" : "Watch"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
          {open ? "Less" : "Details"}
        </Button>
      </div>

      {open ? (
        <div className="mt-3 border-t border-line-soft pt-3">
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
            <span className="text-dim">
              rule <span className="tnum text-text">{fmtPct(edge.annStrategy, 1)}</span>/yr
            </span>
            <span className="text-dim">
              holding <span className="tnum text-text">{fmtPct(edge.annHold, 1)}</span>/yr
            </span>
            <span className="text-dim">
              cash <span className="tnum text-muted">{fmtPctPlain(cash, 1)}</span>/yr
            </span>
          </div>
          <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]">
            <Stat label="Trades" value={String(row.n)} hint={`over ${years} years`} />
            <Stat label="Win rate" value={`${row.win}%`} />
            <Stat label="In market" value={`${row.exp}%`} hint="of all days" />
            <Stat label="Worst fall" value={fmtPctPlain(row.dd, 0)} tone="down" />
            <Stat label="t-stat" value={row.t.toFixed(2)} hint="2+ is significant" />
          </dl>
        </div>
      ) : null}

    </li>
  );
}

/**
 * What state the rule is in, as part of a sentence rather than a badge.
 *
 * Badges read as labels you can skim past; this is the fact that decides
 * whether the numbers beside it apply to the trade being offered, so it sits
 * inline where it has to be read.
 */
function StateText({ row, bucket }: { row: Pick["row"]; bucket: PickBucket }) {
  if (bucket === "fresh") {
    return (
      <span className="text-up">
        {row.days === 0
          ? "entered today"
          : `entered ${row.days} session${row.days === 1 ? "" : "s"} ago`}
      </span>
    );
  }
  if (bucket === "holding") {
    return <span>holding {row.days} sessions</span>;
  }
  return (
    <span className={bucket === "nearing" ? "text-amber" : undefined}>
      out · {row.prox ?? 0}% to trigger
    </span>
  );
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
