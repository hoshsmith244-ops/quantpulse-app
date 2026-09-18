"use client";

import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Coins,
  Info,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { ModeToggle } from "@/components/terminal/controls";
import { WatchButton } from "@/components/terminal/watch-button";
import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { Button } from "@/components/ui/button";
import { FACTORS, getFactor } from "@/lib/alpha";
import { fmtInt, fmtPct } from "@/lib/format";
import {
  CAP_LABELS,
  DEFAULT_FILTERS,
  LIQUIDITY_LABELS,
  PE_LABELS,
  TRADE_FLOORS,
  VERDICT_LABELS,
  VOL_LABELS,
  applyFilters,
  bucketCounts,
  countActive,
  fmtCap,
  hasFundamentalFilter,
  industriesOf,
  liquidityBucket,
  sectorsOf,
  sortRows,
  stalenessOf,
  type CapBucket,
  type Filters,
  type LiquidityBucket,
  type PeBucket,
  type ScreenData,
  type ScreenRow,
  type SortKey,
  type VerdictLevel,
  type VolBucket,
} from "@/lib/screen";
import { useMode } from "@/lib/use-mode";
import { usePersistedParams } from "@/lib/use-persisted-params";
import { useScreen } from "@/lib/use-screen";
import { cn } from "@/lib/utils";

/** Beyond this the table stops being readable long before it stops rendering. */
const PAGE = 150;

export function ScreenerView() {
  const { data, error } = useScreen();
  const [mode] = useMode();
  const advanced = mode === "advanced";

  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = React.useState<SortKey>("edge");
  const [limit, setLimit] = React.useState(PAGE);
  /** The long tail of filters stays folded away until asked for. */
  const [more, setMore] = React.useState(false);

  // Typing in the search box re-filters a thousand rows; deferring it keeps
  // the keystrokes smooth and lets the table catch up a frame later.
  const deferredQ = React.useDeferredValue(filters.q);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setLimit(PAGE);
  };

  /**
   * Simple mode is not a different dataset, only a narrower set of questions.
   * Everything it hides is pinned to a careful default rather than left at
   * whatever was last picked in advanced mode.
   *
   * `verdict` is deliberately NOT pinned: it starts at "worth a closer look"
   * but simple mode can still widen it through the link under the results.
   * Locking it outright would leave a whole class of user unable to see how
   * often these strategies fail, which is the one thing this app exists to
   * show.
   */
  const effective: Filters = React.useMemo(
    () =>
      advanced
        ? { ...filters, q: deferredQ }
        : {
            ...DEFAULT_FILTERS,
            q: deferredQ,
            // `verdict` and `robust` travel together: the escape hatch below
            // drops both, because showing "everything" with the stress test
            // still on would show 103 of 1,030 and call it the base rate.
            verdict: filters.verdict,
            robust: filters.robust,
            sector: filters.sector,
            cap: filters.cap,
            pe: filters.pe,
          },
    [advanced, filters, deferredQ],
  );

  const { rows, unknown } = React.useMemo(
    () => (data ? applyFilters(data, effective) : { rows: [], unknown: 0 }),
    [data, effective],
  );

  const sorted = React.useMemo(() => sortRows(rows, sort), [rows, sort]);
  const sectors = React.useMemo(() => (data ? sectorsOf(data) : []), [data]);
  const industries = React.useMemo(
    () => (data ? industriesOf(data, filters.sector) : []),
    [data, filters.sector],
  );
  // Ticker counts per bucket, so an empty slice announces itself in the
  // dropdown instead of silently returning nothing.
  const counts = React.useMemo(() => (data ? bucketCounts(data) : null), [data]);
  const activeCount = countActive(effective);

  if (error) {
    return (
      <Panel>
        <PanelHead title="Screener" />
        <p className="prose-face p-6 text-[13px] leading-relaxed text-text">
          {error}
        </p>
      </Panel>
    );
  }

  if (!data) {
    return (
      <Panel>
        <PanelHead title="Screener" />
        <div className="flex items-center gap-2.5 p-6 text-[13px] text-muted">
          <Loader2 className="size-4 animate-spin text-amber" />
          Loading the screen…
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Header data={data} />

      <Panel>
        <PanelHead
          title="Filters"
          right={
            activeCount > 0 ? (
              <button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setLimit(PAGE);
                }}
                className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-amber"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            ) : null
          }
        />

        <div className="space-y-3 p-3">
          {/* Always visible: search, and the questions everyone asks. */}
          <div className="flex flex-wrap items-end gap-2.5">
            <Field label="Search">
              <span className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2 size-3.5 text-dim" />
                <input
                  value={filters.q}
                  onChange={(e) => set("q", e.target.value)}
                  placeholder="Ticker or company"
                  aria-label="Search ticker or company"
                  className="h-8 w-[168px] border border-edge bg-base pl-7 pr-2 text-[13px] text-bright outline-none transition-colors placeholder:text-faint hover:border-dim focus-visible:border-amber"
                />
              </span>
            </Field>

            <Field label="Sector">
              <Select
                value={filters.sector}
                onChange={(v) => {
                  // Industries are scoped to the sector, so a stale industry
                  // would silently return nothing.
                  setFilters((f) => ({ ...f, sector: v, industry: "all" }));
                  setLimit(PAGE);
                }}
                options={[
                  { value: "all", label: "Any sector" },
                  ...sectors.map((s) => ({ value: s, label: s })),
                ]}
              />
            </Field>

            <Field label="Market cap">
              <Select
                value={filters.cap}
                onChange={(v) => set("cap", v as CapBucket | "all")}
                options={[
                  { value: "all", label: "Any size" },
                  ...(Object.keys(CAP_LABELS) as CapBucket[]).map((c) => ({
                    value: c,
                    label: `${CAP_LABELS[c]} (${counts?.cap[c] ?? 0})`,
                  })),
                ]}
              />
            </Field>

            <Field label="P/E ratio">
              <Select
                value={filters.pe}
                onChange={(v) => set("pe", v as PeBucket | "none" | "all")}
                options={[
                  { value: "all", label: "Any P/E" },
                  ...(Object.keys(PE_LABELS) as PeBucket[]).map((p) => ({
                    value: p,
                    label: `${PE_LABELS[p]} (${counts?.pe[p] ?? 0})`,
                  })),
                  {
                    value: "none",
                    label: `No earnings (${counts?.pe.none ?? 0})`,
                  },
                ]}
              />
            </Field>

            {advanced ? (
              <button
                onClick={() => setMore((m) => !m)}
                className="flex h-8 items-center gap-1.5 border border-edge px-2.5 text-[12px] text-muted transition-colors hover:border-amber hover:text-amber"
              >
                <SlidersHorizontal className="size-3.5" />
                {more ? "Fewer filters" : "More filters"}
                {more ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>
            ) : null}
          </div>

          {advanced && more ? (
            <>
              {/* --- What the backtest found -------------------------------- */}
              <FilterGroup
                title="The strategy"
                hint="Measured from price alone, with no lookahead."
              >
                <Field label="Verdict">
                  <Select
                    value={filters.verdict}
                    onChange={(v) => set("verdict", v as VerdictLevel | "all")}
                    options={[
                      { value: "all", label: `Any verdict (${data.pairs})` },
                      ...(["promising", "mixed", "inverted", "weak"] as const).map(
                        (v) => ({
                          value: v,
                          label: `${VERDICT_LABELS[v]} (${data.counts[v] ?? 0})`,
                        }),
                      ),
                    ]}
                  />
                </Field>

                <Field label="Strategy">
                  <Select
                    value={filters.factor}
                    onChange={(v) => set("factor", v as Filters["factor"])}
                    options={[
                      { value: "all", label: "Any strategy" },
                      ...FACTORS.filter((f) => !f.external).map((f) => ({
                        value: f.id,
                        label: f.name,
                      })),
                    ]}
                  />
                </Field>

                <Field label="Signal now">
                  <Select
                    value={filters.state}
                    onChange={(v) => set("state", v as Filters["state"])}
                    options={[
                      { value: "all", label: "In or out" },
                      { value: "in", label: "Holding now" },
                      { value: "out", label: "Flat now" },
                    ]}
                  />
                </Field>

                <Field label="Sample size">
                  <Select
                    value={String(filters.minTrades)}
                    onChange={(v) => set("minTrades", Number(v))}
                    options={TRADE_FLOORS.map((n) => ({
                      value: String(n),
                      label: n === 0 ? "Any number of trades" : `${n}+ trades`,
                    }))}
                  />
                </Field>

                <Field label="Out of sample">
                  <Select
                    value={filters.oos}
                    onChange={(v) => set("oos", v as Filters["oos"])}
                    options={[
                      { value: "all", label: "Any" },
                      { value: "beat", label: "Also beat holding" },
                    ]}
                  />
                </Field>
              </FilterGroup>

              {/* --- The company ------------------------------------------- */}
              <FilterGroup
                title="The company"
                hint="Today's figures. They narrow which names you look at and never enter the backtest."
              >
                <Field label="Industry">
                  <Select
                    value={filters.industry}
                    onChange={(v) => set("industry", v)}
                    options={[
                      { value: "all", label: "Any industry" },
                      ...industries.map((s) => ({ value: s, label: s })),
                    ]}
                  />
                </Field>

                <Field label="Earnings">
                  <Select
                    value={filters.earnings}
                    onChange={(v) => set("earnings", v as Filters["earnings"])}
                    options={[
                      { value: "all", label: "Any" },
                      { value: "profitable", label: "Profitable" },
                      { value: "unprofitable", label: "Losing money" },
                    ]}
                  />
                </Field>

                <Field label="Revenue">
                  <Select
                    value={filters.growth}
                    onChange={(v) => set("growth", v as Filters["growth"])}
                    options={[
                      { value: "all", label: "Any" },
                      { value: "growing", label: "Growing" },
                      { value: "shrinking", label: "Shrinking" },
                    ]}
                  />
                </Field>

                <Field label="Dividend">
                  <Select
                    value={filters.dividend}
                    onChange={(v) => set("dividend", v as Filters["dividend"])}
                    options={[
                      { value: "all", label: "Any" },
                      { value: "pays", label: "Pays one" },
                      { value: "over2", label: "Over 2%" },
                    ]}
                  />
                </Field>
              </FilterGroup>

              {/* --- Risk and tradeability --------------------------------- */}
              <FilterGroup
                title="Risk and tradeability"
                hint="Whether the 10 bps cost this page charges is a fair assumption for the name."
              >
                <Field label="Liquidity">
                  <Select
                    value={filters.liquidity}
                    onChange={(v) =>
                      set("liquidity", v as LiquidityBucket | "all")
                    }
                    options={[
                      { value: "all", label: "Any volume" },
                      ...(
                        Object.keys(LIQUIDITY_LABELS) as LiquidityBucket[]
                      ).map((l) => ({
                        value: l,
                        label: `${LIQUIDITY_LABELS[l]} (${counts?.liquidity[l] ?? 0})`,
                      })),
                    ]}
                  />
                </Field>

                <Field label="Volatility">
                  <Select
                    value={filters.volatility}
                    onChange={(v) => set("volatility", v as VolBucket | "all")}
                    options={[
                      { value: "all", label: "Any volatility" },
                      ...(Object.keys(VOL_LABELS) as VolBucket[]).map((v) => ({
                        value: v,
                        label: `${VOL_LABELS[v]} (${counts?.volatility[v] ?? 0})`,
                      })),
                    ]}
                  />
                </Field>

                <Field label="Beta">
                  <Select
                    value={filters.beta}
                    onChange={(v) => set("beta", v as Filters["beta"])}
                    options={[
                      { value: "all", label: "Any beta" },
                      { value: "under1", label: "Calmer than market" },
                      { value: "over1", label: "Jumpier than market" },
                    ]}
                  />
                </Field>

                <Field label="Short interest">
                  <Select
                    value={filters.shortInterest}
                    onChange={(v) =>
                      set("shortInterest", v as Filters["shortInterest"])
                    }
                    options={[
                      { value: "all", label: "Any" },
                      { value: "heavy", label: "Heavily shorted (10%+)" },
                    ]}
                  />
                </Field>
              </FilterGroup>

              {/* --- Honesty switches --------------------------------------- */}
              <div className="space-y-2 border-t border-line-soft pt-3">
                <Toggle
                  checked={filters.robust}
                  onChange={(v) => set("robust", v)}
                  icon={<ShieldCheck className="size-3.5 text-amber" />}
                  label="Only show results that survive a stress test"
                >
                  Still beats buying and holding at {data.stressCostBps} bps
                  instead of {data.costBps}, and still beats it with the
                  strategy&apos;s setting moved{" "}
                  {Math.round(data.neighbourShift * 100)}% either way. An edge
                  that only exists at one cost and one setting found noise.
                </Toggle>

                <Toggle
                  checked={filters.profitableOnly}
                  onChange={(v) => set("profitableOnly", v)}
                  icon={<Coins className="size-3.5 text-amber" />}
                  label="Hide strategies that still lost money"
                >
                  Some rows beat buying and holding by a wide margin while
                  losing you money, because the stock fell further. Losing less
                  than the stock did is a real property, but it is not a profit.
                </Toggle>
              </div>
            </>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <PanelHead
          title={`${fmtInt(sorted.length)} ${sorted.length === 1 ? "result" : "results"}`}
          right={
            <span className="flex items-center gap-2">
              <span className="hidden text-[10px] uppercase tracking-[0.12em] text-dim sm:inline">
                Sort
              </span>
              <Select
                value={sort}
                onChange={(v) => setSort(v as SortKey)}
                options={[
                  { value: "edge", label: "Edge over holding" },
                  { value: "return", label: "Strategy return" },
                  { value: "evidence", label: "Strength of evidence" },
                  { value: "trades", label: "Number of trades" },
                  { value: "symbol", label: "Ticker" },
                ]}
              />
            </span>
          }
        />

        {sorted.length === 0 ? (
          <Empty unknown={unknown} filters={effective} />
        ) : (
          <>
            <ResultsTable
              rows={sorted.slice(0, limit)}
              data={data}
              advanced={advanced}
            />
            {sorted.length > limit ? (
              <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
                <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                  Show {Math.min(PAGE, sorted.length - limit)} more
                </Button>
                <span className="text-[11px] text-dim">
                  showing {fmtInt(limit)} of {fmtInt(sorted.length)}
                </span>
              </div>
            ) : null}
          </>
        )}

        {unknown > 0 ? (
          <p className="prose-face flex items-start gap-2 border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
            <Info className="mt-0.5 size-3 shrink-0" />
            <span>
              {fmtInt(unknown)} {unknown === 1 ? "result was" : "results were"}{" "}
              hidden because the ticker has no value for a filter you set — an
              ETF has no P/E or sector, and a company losing money has no
              meaningful one. Missing is not the same as failing, so they are
              excluded rather than quietly counted as passes.
            </span>
          </p>
        ) : null}

        {/*
          The base-rate escape hatch.

          Without this, simple mode can only ever see strategies that worked,
          which would make the app look far more successful than it is. The
          count of what is being hidden is the honest headline.
        */}
        {effective.verdict !== "all" ? (
          <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
            Showing only what cleared the bar.{" "}
            <span className="text-muted">
              {fmtInt(data.pairs - (data.counts[effective.verdict] ?? 0))} of the{" "}
              {fmtInt(data.pairs)} combinations tested did not
            </span>{" "}
            — most strategies do not work on most stocks, and seeing that is the
            point of testing them.{" "}
            <button
              onClick={() => {
                setFilters((f) => ({ ...f, verdict: "all", robust: false }));
                setLimit(PAGE);
              }}
              className="text-amber underline-offset-2 hover:underline"
            >
              Show all {fmtInt(data.pairs)} that were tested
            </button>
          </p>
        ) : (
          <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
            Showing every verdict, including the{" "}
            {fmtInt(data.counts.weak ?? 0)} with no detectable edge and the{" "}
            {fmtInt(data.counts.inverted ?? 0)} that ran backwards.{" "}
            <button
              onClick={() => {
                setFilters((f) => ({
                  ...f,
                  verdict: "promising",
                  robust: true,
                }));
                setLimit(PAGE);
              }}
              className="text-amber underline-offset-2 hover:underline"
            >
              Back to what cleared the bar
            </button>
          </p>
        )}
      </Panel>

      <BaseRates data={data} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Header({ data }: { data: ScreenData }) {
  // The same shared preference the terminal writes, so switching here switches
  // there too rather than creating a second, conflicting notion of "advanced".
  const [mode, setMode] = useMode();
  // Computed once on mount rather than per render; the answer only changes
  // when the date does.
  const stale = React.useMemo(() => stalenessOf(data.asOf), [data.asOf]);
  const total = data.pairs;
  // A correlation test at |t| >= 2 clears by luck about 4.6% of the time.
  const byChance = Math.round(total * 0.0455);
  /**
   * Everything that cleared the significance bar, in either direction.
   *
   * This is the number the chance estimate must be compared against, not the
   * count of promising rows: "worth a closer look" is a stricter joint test
   * (significant AND the right way round AND enough trades AND beat holding),
   * so putting 45 beside ~47 would imply the whole screen is noise when the
   * real significant count is many times what luck produces.
   */
  const significant = data.rows.filter((r) => Math.abs(r.t) >= 2).length;

  return (
    <Panel>
      <PanelHead
        title="Screener"
        right={
          <span className="flex items-center gap-2.5">
            <Tag tone={stale.level === "fresh" ? "neutral" : stale.level === "aging" ? "amber" : "down"}>
              {stale.level !== "fresh" ? <AlertTriangle className="size-2.5" /> : null}
              as of{" "}
              {new Date(`${data.asOf}T00:00:00Z`).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
              {stale.sessions > 1 ? ` · ${stale.sessions} sessions ago` : null}
            </Tag>
            {/* Same preference the terminal uses, so the two stay in step. */}
            <ModeToggle mode={mode} onChange={setMode} />
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        <Stat label="Tickers" value={fmtInt(data.universe)} />
        <Stat label="Combinations tested" value={fmtInt(total)} />
        <Stat
          label="Worth a closer look"
          value={fmtInt(data.counts.promising ?? 0)}
          tone="text-up"
          sub="after every filter"
        />
        <Stat
          label="Statistically significant"
          value={fmtInt(significant)}
          tone="text-bright"
          sub={`vs ~${fmtInt(byChance)} expected by luck`}
        />
      </div>
      {stale.level !== "fresh" ? (
        <div
          className={cn(
            "flex items-start gap-2 border-t px-4 py-2.5",
            stale.level === "stale"
              ? "border-down/40 bg-down/[0.06]"
              : "border-amber/30 bg-amber/[0.06]",
          )}
        >
          <AlertTriangle
            className={cn(
              "mt-0.5 size-3.5 shrink-0",
              stale.level === "stale" ? "text-down" : "text-amber",
            )}
          />
          <p className="prose-face text-[12px] leading-relaxed text-text">
            <span className={stale.level === "stale" ? "text-down" : "text-amber"}>
              This screen is {stale.sessions} trading sessions old.
            </span>{" "}
            Entry and exit states move on the daily close, so the{" "}
            <span className="text-bright">holding</span> and{" "}
            <span className="text-bright">flat</span> labels below describe a
            market that has since moved on — the returns and statistics age far
            more slowly than those do. Rebuild it after a close with{" "}
            <code className="text-muted">node scripts/build-screen.mts</code>,
            or open a row in the terminal, which always fetches live.
          </p>
        </div>
      ) : null}

      <p className="prose-face border-t border-line px-4 py-2.5 text-[12px] leading-relaxed text-dim">
        Every strategy run at its default setting on {data.years} years of daily
        closes, charged {data.costBps} bps a round trip — the same numbers you
        get by typing the ticker into the{" "}
        <Link href="/dashboard" className="text-amber hover:underline">
          terminal
        </Link>
        . Company figures are today&apos;s snapshot and narrow which names you
        look at; they are never fed into the backtest.
      </p>
    </Panel>
  );
}

function Stat({
  label,
  value,
  tone = "text-bright",
  sub,
}: {
  label: string;
  value: string;
  tone?: string;
  sub?: string;
}) {
  return (
    <div className="bg-panel px-4 py-3">
      {/* Wraps rather than truncating: these labels are long enough that an
          ellipsis on a phone hides which number you are looking at. */}
      <span className="label block leading-snug">{label}</span>
      <span className={cn("tnum mt-1 block text-[19px]", tone)}>{value}</span>
      {sub ? (
        <span className="prose-face mt-0.5 block text-[11px] leading-snug text-dim">
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function ResultsTable({
  rows,
  data,
  advanced,
}: {
  rows: ScreenRow[];
  data: ScreenData;
  advanced: boolean;
}) {
  const [, setParams] = usePersistedParams();
  const router = useRouter();

  const open = (r: ScreenRow) => {
    setParams((prev) => ({ ...prev, symbol: r.s, factor: r.f, param: r.p }));
    router.push("/dashboard");
  };

  const headers = advanced
    ? ["Ticker", "Strategy", "Now", "Return", "Holding", "Edge", "Trades", "Win", "Out of sample", "t", "Cap", "P/E", "Liquidity", "Vol", "Checks", ""]
    : ["Ticker", "Strategy", "Now", "Return", "Holding", "Edge", "Trades", "Win", ""];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead className="bg-panel">
          <tr className="border-b border-line">
            {headers.map((h, i) => (
              <th
                key={h || i}
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-dim",
                  i === 0 || i === 1 ? "text-left" : "text-right",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const t = data.tickers[r.s];
            const edge = r.ret - r.bh;
            const meta = getFactor(r.f);

            return (
              <tr
                key={`${r.s}:${r.f}`}
                className="border-b border-line-soft last:border-0 hover:bg-raised/50"
              >
                <td className="px-3 py-2">
                  <button
                    onClick={() => open(r)}
                    title={`Open ${r.s} in the terminal`}
                    className="group flex flex-col items-start text-left"
                  >
                    <span className="tnum flex items-center gap-1.5 text-[13px] text-bright group-hover:text-amber">
                      {r.s}
                      {/*
                        A big edge over a stock that fell is not a profit. The
                        edge column goes green on these rows, which reads as
                        "this made money" to anyone who has not yet learned to
                        check the column beside it — so say it outright.
                      */}
                      {r.ret < 0 ? <Tag tone="amber">lost money</Tag> : null}
                      <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="block max-w-[150px] truncate text-[10px] text-dim">
                      {t?.name ?? ""}
                    </span>
                  </button>
                </td>

                <td className="whitespace-nowrap px-3 py-2">
                  <span className="text-text">{meta.name}</span>
                  <span className="tnum ml-1.5 text-dim">{r.p}</span>
                </td>

                <td className="px-3 py-2 text-right">
                  <Tag tone={r.state === "in" ? "up" : "neutral"}>
                    {r.state === "in" ? "holding" : "flat"}
                  </Tag>
                </td>

                <td
                  className={cn(
                    "tnum whitespace-nowrap px-3 py-2 text-right",
                    r.ret >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {fmtPct(r.ret, 1)}
                </td>

                <td className="tnum whitespace-nowrap px-3 py-2 text-right text-dim">
                  {fmtPct(r.bh, 1)}
                </td>

                <td
                  className={cn(
                    "tnum whitespace-nowrap px-3 py-2 text-right font-medium",
                    edge >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {fmtPct(edge, 1)}
                </td>

                <td className="tnum px-3 py-2 text-right text-muted">{r.n}</td>
                <td className="tnum px-3 py-2 text-right text-muted">{r.win}%</td>

                {advanced ? (
                  <>
                    <td className="tnum whitespace-nowrap px-3 py-2 text-right">
                      {r.oos === null ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <span
                          className={
                            r.oosBh !== null && r.oos > r.oosBh
                              ? "text-up"
                              : "text-down"
                          }
                          title={`held-out window: strategy ${fmtPct(r.oos, 1)} vs buy & hold ${r.oosBh === null ? "?" : fmtPct(r.oosBh, 1)}`}
                        >
                          {fmtPct(r.oos, 1)}
                          <span className="text-faint">
                            {" "}
                            / {r.oosBh === null ? "—" : fmtPct(r.oosBh, 1)}
                          </span>
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "tnum px-3 py-2 text-right",
                        Math.abs(r.t) >= 2 ? "text-bright" : "text-dim",
                      )}
                    >
                      {r.t.toFixed(2)}
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2 text-right text-muted">
                      {fmtCap(t?.marketCap ?? null)}
                    </td>
                    <td className="tnum px-3 py-2 text-right text-muted">
                      {t?.pe === null || t?.pe === undefined ? (
                        <span className="text-faint">—</span>
                      ) : (
                        t.pe.toFixed(1)
                      )}
                    </td>
                    <td
                      className={cn(
                        "tnum whitespace-nowrap px-3 py-2 text-right",
                        // Below ~$10M a day the modelled 10 bps is optimistic,
                        // so the edge shown is partly fiction.
                        liquidityBucket(t?.dollarVolume ?? null) === "low"
                          ? "text-amber"
                          : "text-muted",
                      )}
                      title={
                        liquidityBucket(t?.dollarVolume ?? null) === "low"
                          ? "Thin. The real spread is likely wider than the 10 bps this page charges."
                          : "Average daily traded value"
                      }
                    >
                      {fmtCap(t?.dollarVolume ?? null)}
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2 text-right text-muted">
                      {t?.volatility === null || t?.volatility === undefined ? (
                        <span className="text-faint">—</span>
                      ) : (
                        `${t.volatility.toFixed(0)}%`
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <span className="inline-flex gap-1">
                        <Check ok={r.costOk} label="costs" />
                        <Check ok={r.nbrOk} label="setting" />
                      </span>
                    </td>
                  </>
                ) : null}

                <td className="px-3 py-2">
                  <span className="flex justify-end">
                    <WatchButton symbol={r.s} factor={r.f} param={r.p} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={
        ok
          ? `Survives the ${label} stress test`
          : `Fails the ${label} stress test`
      }
      className={cn(
        "border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em]",
        ok ? "border-up/40 text-up" : "border-line text-faint line-through",
      )}
    >
      {label}
    </span>
  );
}

function Empty({ unknown, filters }: { unknown: number; filters: Filters }) {
  return (
    <div className="p-6">
      <p className="prose-face max-w-xl text-[13px] leading-relaxed text-text">
        Nothing matches.{" "}
        {hasFundamentalFilter(filters)
          ? "Company filters cut hard — most tickers fail at least one, and ETFs and crypto have no sector, P/E or beta at all."
          : "Try widening the verdict, or turning off the stress test to see what nearly qualified."}
      </p>
      {unknown > 0 ? (
        <p className="prose-face mt-2 max-w-xl text-[12px] leading-relaxed text-dim">
          {fmtInt(unknown)} were excluded for having no value to test.
        </p>
      ) : null}
    </div>
  );
}

function BaseRates({ data }: { data: ScreenData }) {
  const total = data.pairs;
  const significant = data.rows.filter((r) => Math.abs(r.t) >= 2).length;
  const pct = (n: number) => ((n / total) * 100).toFixed(1);
  const bars: { level: VerdictLevel; tone: string }[] = [
    { level: "promising", tone: "bg-up" },
    { level: "mixed", tone: "bg-amber" },
    { level: "inverted", tone: "bg-info" },
    { level: "weak", tone: "bg-edge" },
  ];

  return (
    <Panel>
      <PanelHead title="What the whole scan looks like" />

      <div className="p-4">
        <div className="flex h-2 w-full overflow-hidden">
          {bars.map((b) => (
            <div
              key={b.level}
              className={b.tone}
              style={{ width: `${((data.counts[b.level] ?? 0) / total) * 100}%` }}
              title={`${VERDICT_LABELS[b.level]}: ${data.counts[b.level] ?? 0}`}
            />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {bars.map((b) => (
            <div key={b.level}>
              <span className="flex items-center gap-1.5">
                <span className={cn("size-2", b.tone)} />
                <span className="tnum text-[15px] text-bright">
                  {fmtInt(data.counts[b.level] ?? 0)}
                </span>
                <span className="text-[11px] text-dim">
                  {pct(data.counts[b.level] ?? 0)}%
                </span>
              </span>
              <span className="prose-face mt-0.5 block text-[11px] leading-snug text-muted">
                {VERDICT_LABELS[b.level]}
              </span>
            </div>
          ))}
        </div>

        <p className="prose-face mt-4 max-w-3xl border-t border-line pt-3 text-[12px] leading-relaxed text-text">
          <span className="text-amber">Read this before trusting a row.</span>{" "}
          Testing {fmtInt(total)} combinations guarantees some look good by
          luck: about {fmtInt(Math.round(total * 0.0455))} would clear the
          significance bar from nothing at all.{" "}
          <span className="text-bright">{fmtInt(significant)} actually did</span>
          , so there is far more real structure here than chance explains — but
          most of it points the wrong way. {fmtInt(data.counts.inverted ?? 0)}{" "}
          strategies came back <em>backwards</em>, against{" "}
          {fmtInt(data.counts.promising ?? 0)} that worked as intended. That gap
          is why the stress test is on by default and why the out-of-sample
          column matters more than the headline return. A screen is a place to
          start looking, not a list of answers.{" "}
          <Link href="/guide" className="text-amber hover:underline">
            How to read these numbers
          </Link>
        </p>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Small controls
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** A titled row of filters, so the three kinds never blur together. */
function FilterGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line-soft pt-3">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
          {title}
        </span>
        <span className="prose-face text-[11px] leading-snug text-dim">
          {hint}
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-2.5">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  icon,
  label,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-3.5 accent-[#ffb020]"
      />
      <span>
        <span className="flex items-center gap-1.5 text-[12px] text-bright">
          {icon}
          {label}
        </span>
        <span className="prose-face mt-0.5 block max-w-2xl text-[11px] leading-relaxed text-dim">
          {children}
        </span>
      </span>
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 appearance-none border border-edge bg-base py-0 pl-2.5 pr-7 text-[13px] text-bright outline-none transition-colors hover:border-dim focus-visible:border-amber"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
