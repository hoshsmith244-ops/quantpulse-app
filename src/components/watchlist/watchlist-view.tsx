"use client";

import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MinusCircle,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { FACTORS, getFactor, type FactorId } from "@/lib/alpha";
import { fmtPct } from "@/lib/format";
import { usePersistedParams } from "@/lib/use-persisted-params";
import { useWatchlistScan, type ScanRow } from "@/lib/use-watchlist-scan";
import { useWatchlist } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

type SortKey = "signal" | "symbol" | "evidence" | "edge";

export function WatchlistView() {
  const { entries, add, remove, clear, max } = useWatchlist();
  const { rows, scanning, scannedAt } = useWatchlistScan(entries);
  const [, setParams] = usePersistedParams();
  const router = useRouter();

  const [draft, setDraft] = React.useState("");
  const [draftFactor, setDraftFactor] = React.useState<FactorId>("momentum");
  const [sort, setSort] = React.useState<SortKey>("signal");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = draft.trim().toUpperCase();
    if (!s) return;
    add(s, draftFactor, getFactor(draftFactor).def);
    setDraft("");
  };

  /** Open a row in the terminal with its own preset loaded. */
  const openInTerminal = (row: ScanRow) => {
    setParams((prev) => ({
      ...prev,
      symbol: row.entry.symbol,
      factor: row.entry.factor,
      param: row.entry.param,
    }));
    router.push("/dashboard");
  };

  const sorted = React.useMemo(() => {
    const rank = (r: ScanRow) => {
      if (r.status !== "ok") return -1;
      // Freshly changed signals first, then anything currently holding.
      if (r.result.signal.freshToday) return 3;
      if (r.result.signal.state === "in") return 2;
      return 1;
    };
    const evidence = (r: ScanRow) =>
      r.status === "ok"
        ? { promising: 3, mixed: 2, inverted: 1, weak: 0 }[r.grade.level]
        : -1;
    const edge = (r: ScanRow) =>
      r.status === "ok"
        ? r.result.strategy.totalReturnPct - r.result.strategy.buyHoldReturnPct
        : -Infinity;

    return [...rows].sort((a, b) => {
      if (sort === "symbol") return a.entry.symbol.localeCompare(b.entry.symbol);
      if (sort === "evidence") return evidence(b) - evidence(a);
      if (sort === "edge") return edge(b) - edge(a);
      return rank(b) - rank(a);
    });
  }, [rows, sort]);

  const holding = rows.filter(
    (r) => r.status === "ok" && r.result.signal.state === "in",
  ).length;
  const changed = rows.filter(
    (r) => r.status === "ok" && r.result.signal.freshToday,
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 p-4 lg:p-6">
      {/* Add a ticker with its strategy */}
      <Panel>
        <PanelHead
          title="Watchlist"
          right={
            <span className="tnum text-[11px] text-dim">
              {entries.length} / {max}
            </span>
          }
        />
        <form
          onSubmit={submit}
          className="flex flex-wrap items-end gap-3 p-4"
        >
          <div>
            <Label>Ticker</Label>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="NVDA"
              aria-label="Ticker to add"
              spellCheck={false}
              className="mt-1.5 w-32 uppercase"
            />
          </div>
          <div>
            <Label>Strategy for this ticker</Label>
            <select
              value={draftFactor}
              onChange={(e) => setDraftFactor(e.target.value as FactorId)}
              aria-label="Strategy for this ticker"
              className="mt-1.5 h-8 w-56 border border-edge bg-base px-2.5 text-[13px] text-bright outline-none hover:border-dim focus-visible:border-amber"
            >
              {FACTORS.filter((f) => !f.external).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="primary">
            <Plus />
            Add
          </Button>

          {entries.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={clear}
              className="ml-auto"
            >
              Clear all
            </Button>
          ) : null}
        </form>

        <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
          Each row keeps its own strategy, because a factor that works on one
          stock usually does not work on another. Scanning runs every ticker the
          way you decided that ticker should be run.
        </p>
      </Panel>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <Panel className="overflow-hidden">
          <PanelHead
            className="flex-wrap gap-y-2"
            title={
              scanning
                ? "Scanning…"
                : `${holding} holding · ${changed} changed today`
            }
            right={
              <span className="flex items-center gap-3">
                <span className="flex items-center border border-edge">
                  {(
                    [
                      ["signal", "Signal"],
                      ["evidence", "Evidence"],
                      ["edge", "Edge"],
                      ["symbol", "A–Z"],
                    ] as const
                  ).map(([k, lbl]) => (
                    <button
                      key={k}
                      onClick={() => setSort(k)}
                      className={cn(
                        "px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] transition-colors",
                        sort === k
                          ? "bg-amber text-black"
                          : "text-dim hover:text-bright",
                      )}
                    >
                      {lbl}
                    </button>
                  ))}
                </span>
                {scanning ? (
                  <Loader2 className="size-3.5 animate-spin text-amber" />
                ) : scannedAt ? (
                  <span className="tnum text-[10px] text-faint">
                    {new Date(scannedAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}
              </span>
            }
          />

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line">
                  {[
                    "Ticker",
                    "Strategy",
                    "Signal",
                    "Held",
                    "Evidence",
                    "Strategy vs holding",
                    "",
                  ].map((h, i) => (
                    <th
                      key={h || i}
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-dim",
                        i >= 3 && i <= 5 ? "text-right" : "text-left",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <Row
                    key={`${row.entry.symbol}:${row.entry.factor}`}
                    row={row}
                    onOpen={() => openInTerminal(row)}
                    onRemove={() =>
                      remove(row.entry.symbol, row.entry.factor)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>

          <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
            Signals come from the most recent daily close, so an after-hours
            move is not reflected here. Open a row to see its live price,
            headlines and full statistics. Nothing on this page is a
            recommendation to trade.
          </p>
        </Panel>
      )}
    </div>
  );
}

function Row({
  row,
  onOpen,
  onRemove,
}: {
  row: ScanRow;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const meta = getFactor(row.entry.factor);

  if (row.status === "loading") {
    return (
      <tr className="border-b border-line-soft last:border-0">
        <td className="tnum px-3 py-2.5 text-bright">{row.entry.symbol}</td>
        <td className="px-3 py-2.5 text-dim">{meta.name}</td>
        <td colSpan={5} className="px-3 py-2.5 text-dim">
          <Loader2 className="inline size-3 animate-spin text-amber" />
        </td>
      </tr>
    );
  }

  if (row.status === "error") {
    return (
      <tr className="border-b border-line-soft last:border-0">
        <td className="tnum px-3 py-2.5 text-bright">{row.entry.symbol}</td>
        <td className="px-3 py-2.5 text-dim">{meta.name}</td>
        <td colSpan={4} className="px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[11px] text-down">
            <TriangleAlert className="size-3" />
            {row.message}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right">
          <RemoveButton onRemove={onRemove} symbol={row.entry.symbol} />
        </td>
      </tr>
    );
  }

  const { signal, strategy } = row.result;
  const inPos = signal.state === "in";
  const edge = strategy.totalReturnPct - strategy.buyHoldReturnPct;

  return (
    <tr
      className={cn(
        "border-b border-line-soft transition-colors last:border-0 hover:bg-raised/50",
        signal.freshToday && "bg-amber/[0.05]",
      )}
    >
      <td className="whitespace-nowrap px-3 py-2.5">
        <button onClick={onOpen} className="text-left">
          <span className="tnum block text-bright hover:text-amber">
            {row.entry.symbol}
          </span>
          <span className="block max-w-[180px] truncate text-[10px] text-faint">
            {row.history.quote.name}
          </span>
        </button>
      </td>

      <td className="whitespace-nowrap px-3 py-2.5">
        <span className="text-muted">{meta.name}</span>
        <span className="tnum ml-1.5 text-[10px] text-faint">
          {row.entry.param}d
        </span>
      </td>

      <td className="whitespace-nowrap px-3 py-2.5">
        <span className="flex items-center gap-1.5">
          {inPos ? (
            <CheckCircle2 className="size-3.5 text-up" />
          ) : (
            <MinusCircle className="size-3.5 text-dim" />
          )}
          <span className={inPos ? "text-up" : "text-muted"}>
            {inPos ? "HOLD" : "STAY OUT"}
          </span>
          {signal.freshToday ? <Tag tone="amber">new</Tag> : null}
        </span>
      </td>

      <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-dim">
        {signal.daysInState}d
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-right">
        <span
          className={cn(
            "text-[11px]",
            row.grade.tone === "up"
              ? "text-up"
              : row.grade.tone === "amber"
                ? "text-amber"
                : "text-dim",
          )}
        >
          {row.grade.headline}
        </span>
      </td>

      <td
        className={cn(
          "tnum whitespace-nowrap px-3 py-2.5 text-right",
          edge >= 0 ? "text-up" : "text-down",
        )}
      >
        {fmtPct(edge, 1)}
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-right">
        <span className="flex items-center justify-end gap-1">
          <button
            onClick={onOpen}
            className="text-[11px] text-amber transition-colors hover:text-bright"
          >
            Open
          </button>
          <RemoveButton onRemove={onRemove} symbol={row.entry.symbol} />
        </span>
      </td>
    </tr>
  );
}

function RemoveButton({
  onRemove,
  symbol,
}: {
  onRemove: () => void;
  symbol: string;
}) {
  return (
    <button
      onClick={onRemove}
      aria-label={`Remove ${symbol}`}
      className="ml-2 text-faint transition-colors hover:text-down"
    >
      <Trash2 className="size-3" />
    </button>
  );
}

function EmptyState() {
  return (
    <Panel>
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="prose-face max-w-xl text-[13px] leading-relaxed text-text">
          Nothing on the watchlist yet. Add a few tickers above, each with the
          strategy you want applied to it, and this page becomes a single scan:
          which of your names is signalling right now, and which of those
          signals has any evidence behind it.
        </p>
        <p className="prose-face max-w-xl text-[12px] leading-relaxed text-dim">
          You can also add whatever you are looking at straight from the
          terminal.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            Open the terminal
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </Panel>
  );
}
