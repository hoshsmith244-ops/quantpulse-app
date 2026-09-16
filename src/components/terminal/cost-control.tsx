"use client";

import { Receipt } from "lucide-react";
import * as React from "react";

import { DEFAULT_COST_BPS } from "@/lib/alpha";
import { cn } from "@/lib/utils";

/**
 * Trading costs.
 *
 * Every return in the app used to assume trading was free. It is not:
 * commission plus half the spread is charged on the way in and again on the
 * way out. That is nothing on a rule holding for months and decisive on one
 * turning over a hundred times — short-term reversal on AAPL goes from +4.1%
 * to roughly break-even at ten basis points.
 *
 * Defaults to on, because zero is the unrealistic setting.
 */

const PRESETS = [
  { bps: 0, label: "Free", hint: "No costs — the number a backtest flatters you with" },
  { bps: 5, label: "5 bps", hint: "Large-cap, tight spread, zero commission" },
  { bps: 10, label: "10 bps", hint: "Typical liquid US stock" },
  { bps: 25, label: "25 bps", hint: "Smaller names or wider spreads" },
];

export function CostControl({
  costBps,
  onChange,
  className,
}: {
  costBps: number;
  onChange: (bps: number) => void;
  className?: string;
}) {
  const active = PRESETS.find((p) => p.bps === costBps);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <span className="flex items-center gap-1.5">
        <Receipt className="size-3 text-dim" />
        <span className="label">Trading cost</span>
      </span>

      <span className="flex items-center border border-edge">
        {PRESETS.map((p) => (
          <button
            key={p.bps}
            onClick={() => onChange(p.bps)}
            title={p.hint}
            aria-pressed={costBps === p.bps}
            className={cn(
              "px-2 py-0.5 text-[11px] transition-colors",
              costBps === p.bps
                ? p.bps === 0
                  ? "bg-dim text-black"
                  : "bg-amber text-black"
                : "text-dim hover:text-bright",
            )}
          >
            {p.label}
          </button>
        ))}
      </span>

      <span className="prose-face text-[11px] leading-relaxed text-dim">
        {costBps === 0 ? (
          <span className="text-amber">
            Costs off — every figure below is better than reality.
          </span>
        ) : (
          <>per round trip{active ? ` · ${active.hint.toLowerCase()}` : ""}</>
        )}
      </span>
    </div>
  );
}

export { DEFAULT_COST_BPS };
