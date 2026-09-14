import { Info } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "profit" | "loss" | "accent" | "auto";

const toneClass: Record<Exclude<Tone, "auto">, string> = {
  neutral: "text-bright",
  profit: "text-profit",
  loss: "text-loss",
  accent: "text-accent",
};

/**
 * A single quantitative readout. Values are always tabular so a column of
 * metrics aligns digit-for-digit.
 */
export function Metric({
  label,
  value,
  sub,
  tone = "neutral",
  hint,
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  hint?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "text-[15px]",
    md: "text-xl",
    lg: "text-[26px]",
  } as const;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
          {label}
        </span>
        {hint ? (
          <span title={hint} className="text-faint">
            <Info className="size-2.5" aria-hidden />
            <span className="sr-only">{hint}</span>
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "tnum mt-1 font-medium leading-none",
          sizes[size],
          tone !== "auto" && toneClass[tone],
        )}
      >
        {value}
      </div>
      {sub ? (
        <div className="tnum mt-1.5 text-[11px] leading-none text-dim">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

/** Metric wrapped in its own bordered cell, for dashboard stat rows. */
export function MetricCard(
  props: React.ComponentProps<typeof Metric> & { footer?: React.ReactNode },
) {
  const { footer, className, ...rest } = props;
  return (
    <div
      className={cn(
        "rounded-panel border border-line bg-surface p-4",
        className,
      )}
    >
      <Metric {...rest} />
      {footer}
    </div>
  );
}
