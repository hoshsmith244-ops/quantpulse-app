"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { thin } from "@/lib/backtest";
import { fmtDateShort, fmtUSD, fmtUSDCompact, fmtPct } from "@/lib/format";
import type { EquityPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const AXIS = "#475569";
const GRID = "#172032";

function EquityTooltip({
  active,
  payload,
  initialCapital,
}: {
  active?: boolean;
  payload?: Array<{ payload: EquityPoint }>;
  initialCapital: number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const stratPct = (p.equity / initialCapital - 1) * 100;
  const benchPct = (p.benchmark / initialCapital - 1) * 100;
  const edge = stratPct - benchPct;

  return (
    <div className="rounded-md border border-line-strong bg-overlay/95 px-3 py-2 shadow-xl shadow-black/60 backdrop-blur">
      <div className="tnum mb-2 text-[11px] text-muted">
        {new Date(`${p.date}T00:00:00Z`).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          timeZone: "UTC",
        })}
      </div>
      <Row
        swatch="bg-accent"
        label="Strategy"
        value={fmtUSD(p.equity)}
        delta={fmtPct(stratPct)}
        deltaTone={stratPct >= 0 ? "text-profit" : "text-loss"}
      />
      <Row
        swatch="bg-dim"
        label="S&P 500"
        value={fmtUSD(p.benchmark)}
        delta={fmtPct(benchPct)}
        deltaTone={benchPct >= 0 ? "text-profit" : "text-loss"}
      />
      <div className="mt-2 flex items-center justify-between gap-6 border-t border-line pt-2">
        <span className="text-[11px] text-dim">Edge</span>
        <span
          className={cn(
            "tnum text-[11px] font-medium",
            edge >= 0 ? "text-profit" : "text-loss",
          )}
        >
          {fmtPct(edge)}
        </span>
      </div>
      {p.drawdown < -0.01 ? (
        <div className="mt-1 flex items-center justify-between gap-6">
          <span className="text-[11px] text-dim">Drawdown</span>
          <span className="tnum text-[11px] text-loss">
            {p.drawdown.toFixed(2)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  swatch,
  label,
  value,
  delta,
  deltaTone,
}: {
  swatch: string;
  label: string;
  value: string;
  delta: string;
  deltaTone: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-0.5">
      <span className="flex items-center gap-1.5 text-[11px] text-muted">
        <span className={cn("size-1.5 rounded-[2px]", swatch)} />
        {label}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="tnum text-[11px] font-medium text-bright">{value}</span>
        <span className={cn("tnum w-14 text-right text-[11px]", deltaTone)}>
          {delta}
        </span>
      </span>
    </div>
  );
}

export function EquityChart({
  data,
  initialCapital,
  height = 320,
  showBenchmark = true,
  compact = false,
}: {
  data: EquityPoint[];
  initialCapital: number;
  height?: number;
  showBenchmark?: boolean;
  compact?: boolean;
}) {
  const points = React.useMemo(() => thin(data, compact ? 150 : 280), [data, compact]);
  const isUp = (points[points.length - 1]?.equity ?? 0) >= initialCapital;
  const stroke = isUp ? "#10b981" : "#ef4444";

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 4, bottom: 0, left: compact ? -12 : 4 }}
        >
          <defs>
            <linearGradient id="qp-equity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke={GRID}
            strokeDasharray="0"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tickFormatter={fmtDateShort}
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            minTickGap={compact ? 48 : 36}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => fmtUSDCompact(v)}
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={compact ? 46 : 58}
            domain={["auto", "auto"]}
          />

          <ReferenceLine
            y={initialCapital}
            stroke="#2b3a52"
            strokeDasharray="3 3"
          />

          <Tooltip
            content={<EquityTooltip initialCapital={initialCapital} />}
            cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "3 3" }}
          />

          {showBenchmark ? (
            <Area
              type="monotone"
              dataKey="benchmark"
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 3"
              fill="none"
              dot={false}
              isAnimationActive={false}
              name="S&P 500"
            />
          ) : null}

          <Area
            type="monotone"
            dataKey="equity"
            stroke={stroke}
            strokeWidth={1.75}
            fill="url(#qp-equity)"
            dot={false}
            isAnimationActive={false}
            name="Strategy"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Underwater / drawdown plot, rendered beneath the equity curve. */
export function DrawdownChart({
  data,
  height = 90,
}: {
  data: EquityPoint[];
  height?: number;
}) {
  const points = React.useMemo(() => thin(data, 280), [data]);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="qp-dd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fill: AXIS, fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={58}
            domain={["auto", 0]}
          />
          <Tooltip
            cursor={{ stroke: "#ef4444", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as EquityPoint;
              return (
                <div className="rounded-md border border-line-strong bg-overlay/95 px-2.5 py-1.5 text-[11px] shadow-xl shadow-black/60">
                  <div className="tnum text-muted">
                    {fmtDateShort(p.date)}
                  </div>
                  <div className="tnum font-medium text-loss">
                    {p.drawdown.toFixed(2)}%
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            strokeWidth={1}
            fill="url(#qp-dd)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
