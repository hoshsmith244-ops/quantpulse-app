"use client";

import { Check, Star } from "lucide-react";
import * as React from "react";

import { type FactorId } from "@/lib/alpha";
import { useWatchlist } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

/**
 * Saves the current view — ticker AND strategy — to the watchlist, so the
 * scan later runs this name the way it is being looked at now.
 */
export function WatchButton({
  symbol,
  factor,
  param,
}: {
  symbol: string;
  factor: FactorId;
  param: number;
}) {
  const { entries, add, remove } = useWatchlist();

  const saved = entries.some(
    (e) => e.symbol === symbol && e.factor === factor,
  );

  return (
    <button
      onClick={() => (saved ? remove(symbol, factor) : add(symbol, factor, param))}
      aria-pressed={saved}
      title={
        saved
          ? `Remove ${symbol} (${factor}) from the watchlist`
          : `Watch ${symbol} with this strategy`
      }
      className={cn(
        "flex items-center gap-1.5 border px-2 py-1 text-[11px] uppercase tracking-[0.1em] transition-colors",
        saved
          ? "border-amber bg-amber/10 text-amber"
          : "border-edge text-dim hover:border-amber hover:text-amber",
      )}
    >
      {saved ? <Check className="size-3" /> : <Star className="size-3" />}
      <span className="hidden sm:inline">{saved ? "Watching" : "Watch"}</span>
    </button>
  );
}
