"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  CircleDashed,
  Download,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtNum, fmtPct, fmtUSD } from "@/lib/format";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey =
  | "entryDate"
  | "exitDate"
  | "entryPrice"
  | "qty"
  | "notional"
  | "pnl"
  | "pnlPct"
  | "barsHeld";

type SortDir = "asc" | "desc";

const COLUMNS: Array<{
  key: SortKey | null;
  label: string;
  align: "left" | "right";
  className?: string;
}> = [
  { key: "entryDate", label: "Entry", align: "left" },
  { key: "exitDate", label: "Exit", align: "left" },
  { key: null, label: "Signal", align: "left" },
  { key: "entryPrice", label: "Price", align: "right" },
  { key: "qty", label: "Size", align: "right" },
  { key: "notional", label: "Notional", align: "right", className: "hidden lg:table-cell" },
  { key: "pnl", label: "P/L $", align: "right" },
  { key: "pnlPct", label: "P/L %", align: "right" },
  { key: "barsHeld", label: "Bars", align: "right", className: "hidden xl:table-cell" },
  { key: null, label: "Status", align: "left" },
];

const EXIT_LABEL: Record<Trade["exitReason"], string> = {
  SIGNAL: "Signal exit",
  STOP_LOSS: "Stop loss",
  TAKE_PROFIT: "Take profit",
  OPEN: "Open position",
};

export function TradeLog({
  trades,
  symbol,
  pageSize = 12,
}: {
  trades: Trade[];
  symbol: string;
  pageSize?: number;
}) {
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir }>({
    key: "entryDate",
    dir: "desc",
  });
  const [filter, setFilter] = React.useState<"all" | "wins" | "losses">("all");
  const [page, setPage] = React.useState(0);

  const rows = React.useMemo(() => {
    const filtered = trades.filter((t) =>
      filter === "all"
        ? true
        : filter === "wins"
          ? t.pnl > 0
          : t.pnl <= 0,
    );

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      // Open trades (null exit) always sort to the top.
      if (av === null) return -1;
      if (bv === null) return 1;
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
  }, [trades, sort, filter]);

  // Reset to the first page whenever the view changes underneath us. Adjusting
  // during render is React's recommended alternative to a reset effect.
  const viewKey = `${symbol}|${filter}|${sort.key}|${sort.dir}`;
  const [prevViewKey, setPrevViewKey] = React.useState(viewKey);
  if (viewKey !== prevViewKey) {
    setPrevViewKey(viewKey);
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const view = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggle = (key: SortKey) =>
    setSort((p) =>
      p.key === key
        ? { key, dir: p.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );

  const exportCsv = () => {
    const head = [
      "entry_date",
      "exit_date",
      "symbol",
      "side",
      "entry_price",
      "exit_price",
      "qty",
      "notional",
      "pnl",
      "pnl_pct",
      "exit_reason",
    ].join(",");
    const body = rows
      .map((t) =>
        [
          t.entryDate,
          t.exitDate ?? "",
          symbol,
          t.side,
          t.entryPrice.toFixed(4),
          t.exitPrice?.toFixed(4) ?? "",
          t.qty.toFixed(6),
          t.notional.toFixed(2),
          t.pnl.toFixed(2),
          t.pnlPct.toFixed(4),
          t.exitReason,
        ].join(","),
      )
      .join("\n");

    const blob = new Blob([`${head}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quantpulse-trades-${symbol.replace("/", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-[13px] font-medium text-bright">Trade log</h3>
          <span className="tnum text-[11px] text-dim">
            {rows.length} {rows.length === 1 ? "trade" : "trades"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-line bg-raised p-0.5">
            {(["all", "wins", "losses"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                  filter === f
                    ? "bg-overlay text-bright"
                    : "text-dim hover:text-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={exportCsv} title="Export CSV">
            <Download />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-line">
              {COLUMNS.map((c) => (
                <th
                  key={c.label}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-3 py-2 text-[10px] font-medium uppercase tracking-[0.1em] text-dim",
                    c.align === "right" ? "text-right" : "text-left",
                    c.className,
                  )}
                >
                  {c.key ? (
                    <button
                      onClick={() => toggle(c.key!)}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-muted",
                        sort.key === c.key && "text-bright",
                      )}
                    >
                      {c.label}
                      {sort.key === c.key ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-30" />
                      )}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-3 py-14 text-center text-[12px] text-dim"
                >
                  No trades matched. This strategy never entered the market with
                  the current parameters.
                </td>
              </tr>
            ) : (
              view.map((t) => {
                const up = t.pnl > 0;
                return (
                  <tr
                    key={t.id}
                    className="border-b border-line-soft transition-colors last:border-0 hover:bg-raised/60"
                  >
                    <td className="tnum whitespace-nowrap px-3 py-2 text-muted">
                      {fmtDate(t.entryDate)}
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2 text-muted">
                      {t.exitDate ? (
                        fmtDate(t.exitDate)
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={t.side === "BUY" ? "profit" : "loss"}>
                        {t.side}
                      </Badge>
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2 text-right text-text">
                      {fmtUSD(t.entryPrice)}
                      {t.exitPrice !== null ? (
                        <span className="text-faint">
                          {" → "}
                          {fmtUSD(t.exitPrice)}
                        </span>
                      ) : null}
                    </td>
                    <td className="tnum px-3 py-2 text-right text-muted">
                      {fmtNum(t.qty, t.qty < 10 ? 4 : 2)}
                    </td>
                    <td className="tnum hidden px-3 py-2 text-right text-muted lg:table-cell">
                      {fmtUSD(t.notional)}
                    </td>
                    <td
                      className={cn(
                        "tnum px-3 py-2 text-right font-medium",
                        up ? "text-profit" : "text-loss",
                      )}
                    >
                      {up ? "+" : ""}
                      {fmtUSD(t.pnl)}
                    </td>
                    <td
                      className={cn(
                        "tnum px-3 py-2 text-right font-medium",
                        up ? "text-profit" : "text-loss",
                      )}
                    >
                      {fmtPct(t.pnlPct)}
                    </td>
                    <td className="tnum hidden px-3 py-2 text-right text-dim xl:table-cell">
                      {t.barsHeld}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className="flex items-center gap-1.5 text-[11px] text-muted"
                        title={EXIT_LABEL[t.exitReason]}
                      >
                        {t.status === "FILLED" ? (
                          <CheckCircle2 className="size-3 text-profit" />
                        ) : (
                          <CircleDashed className="size-3 animate-pulse-dot text-accent" />
                        )}
                        {t.status === "FILLED" ? "Filled" : "Open"}
                        <span className="hidden text-faint 2xl:inline">
                          · {EXIT_LABEL[t.exitReason]}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
          <span className="tnum text-[11px] text-dim">
            {safePage * pageSize + 1}–
            {Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
