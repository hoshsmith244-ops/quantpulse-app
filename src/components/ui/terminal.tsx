import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Terminal furniture. Square corners, visible rules, mono labels — the panel
 * chrome reads like an instrument rather than a card.
 */

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border border-line bg-panel", className)}
      {...props}
    />
  );
}

/** Panel header with a bracketed title, like a windowed TUI. */
export function PanelHead({
  title,
  right,
  className,
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line bg-raised/50 px-3 py-1.5",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted">
        <span className="text-amber">/</span>
        <span className="truncate">{title}</span>
      </span>
      {right ? <span className="shrink-0">{right}</span> : null}
    </div>
  );
}

export function Label({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("label block", className)} {...props} />;
}

/** A labelled figure. Everything numeric in the app renders through this. */
export function Readout({
  label,
  value,
  sub,
  tone = "bright",
  size = "md",
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "bright" | "up" | "down" | "amber" | "dim";
  size?: "sm" | "md" | "lg";
  hint?: string;
  className?: string;
}) {
  const tones = {
    bright: "text-bright",
    up: "text-up",
    down: "text-down",
    amber: "text-amber",
    dim: "text-dim",
  } as const;
  const sizes = {
    sm: "text-[14px]",
    md: "text-[19px]",
    lg: "text-[26px]",
  } as const;

  return (
    <div className={cn("min-w-0", className)} title={hint}>
      <span className="label block truncate">{label}</span>
      <span
        className={cn(
          "tnum mt-1 block leading-none",
          sizes[size],
          tones[tone],
        )}
      >
        {value}
      </span>
      {sub ? (
        <span className="tnum mt-1.5 block truncate text-[11px] leading-none text-dim">
          {sub}
        </span>
      ) : null}
    </div>
  );
}

/** Status chip. Square, bordered, uppercase. */
export function Tag({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & {
  tone?: "neutral" | "up" | "down" | "amber" | "info";
}) {
  const tones = {
    neutral: "border-edge text-muted",
    up: "border-up/40 bg-up/10 text-up",
    down: "border-down/40 bg-down/10 text-down",
    amber: "border-amber/40 bg-amber/10 text-amber",
    info: "border-info/40 bg-info/10 text-info",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-px text-[10px] uppercase tracking-[0.1em] leading-[1.5]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Horizontal rule with a centred caption, like a section break in a report. */
export function RuleLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="label">{children}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Solid-block meter — a bar built from glyph-like segments. */
export function Meter({
  value,
  max = 100,
  tone = "amber",
  segments = 20,
  className,
}: {
  value: number;
  max?: number;
  tone?: "amber" | "up" | "down";
  segments?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, Math.abs(value) / max));
  const filled = Math.round(pct * segments);
  const tones = {
    amber: "bg-amber",
    up: "bg-up",
    down: "bg-down",
  } as const;

  return (
    <div className={cn("flex gap-px", className)} aria-hidden>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 flex-1",
            i < filled ? tones[tone] : "bg-line",
          )}
        />
      ))}
    </div>
  );
}
