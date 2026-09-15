"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CurvePoint, ICPoint, QuantileBucket } from "@/lib/alpha";
import { fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const AXIS = "#5d6a7d";
const GRID = "#141a25";
const AMBER = "#ffb020";
const UP = "#00d492";
const DOWN = "#ff4d4d";

const tipBox =
  "border border-edge bg-overlay px-2.5 py-1.5 text-[11px] shadow-lg shadow-black/70";

function thin<T>(rows: T[], max = 260): T[] {
  if (rows.length <= max) return rows;
  const step = rows.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(rows[Math.floor(i * step)]);
  const last = rows[rows.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });

/** Signal equity vs buy & hold, both rebased to 1.00. */
export function EquityChart({
  data,
  height = 260,
}: {
  data: CurvePoint[];
  height?: number;
}) {
  const points = React.useMemo(() => thin(data), [data]);
  const last = points[points.length - 1];
  const beat = (last?.strategy ?? 0) >= (last?.buyHold ?? 0);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="qp-eq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={beat ? UP : DOWN} stopOpacity={0.2} />
              <stop offset="100%" stopColor={beat ? UP : DOWN} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            minTickGap={44}
          />
          <YAxis
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v: number) => `${v.toFixed(2)}x`}
            domain={["auto", "auto"]}
          />
          <ReferenceLine y={1} stroke="#2a3446" strokeDasharray="2 2" />
          <Tooltip
            cursor={{ stroke: AMBER, strokeWidth: 1, strokeDasharray: "2 2" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as CurvePoint;
              return (
                <div className={tipBox}>
                  <div className="tnum mb-1 text-muted">{p.date}</div>
                  <Row label="Signal" value={`${p.strategy.toFixed(3)}x`} tone="text-bright" />
                  <Row label="Buy & hold" value={`${p.buyHold.toFixed(3)}x`} tone="text-dim" />
                  <Row
                    label="Position"
                    value={p.inMarket ? "LONG" : "FLAT"}
                    tone={p.inMarket ? "text-up" : "text-faint"}
                  />
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="buyHold"
            stroke="#5d6a7d"
            strokeWidth={1}
            strokeDasharray="3 2"
            fill="none"
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="strategy"
            stroke={beat ? UP : DOWN}
            strokeWidth={1.6}
            fill="url(#qp-eq)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="text-dim">{label}</span>
      <span className={cn("tnum", tone)}>{value}</span>
    </div>
  );
}

/** IC by forward horizon — how fast the edge decays. */
export function DecayChart({
  data,
  active,
  height = 150,
}: {
  data: ICPoint[];
  active: number;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="horizon"
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            tickFormatter={(v: number) => `${v}d`}
          />
          <YAxis
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            // Wide enough that a leading minus sign is never clipped.
            width={52}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <ReferenceLine y={0} stroke="#2a3446" />
          <ReferenceLine x={active} stroke={AMBER} strokeDasharray="2 2" />
          <Tooltip
            cursor={false}
            content={({ active: a, payload }) => {
              if (!a || !payload?.length) return null;
              const p = payload[0].payload as ICPoint;
              return (
                <div className={tipBox}>
                  <div className="tnum text-muted">{p.horizon}-day forward</div>
                  <Row label="IC" value={p.ic.toFixed(3)} tone="text-bright" />
                  <Row label="t-stat" value={p.tStat.toFixed(2)} tone={Math.abs(p.tStat) >= 2 ? "text-up" : "text-dim"} />
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="ic"
            stroke={AMBER}
            strokeWidth={1.6}
            dot={{ r: 2.5, fill: AMBER, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Mean forward return by factor quintile — the payoff ladder. */
export function QuantileChart({
  data,
  current,
  height = 150,
}: {
  data: QuantileBucket[];
  current: number | null;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            tickFormatter={(v: number) => `Q${v}`}
          />
          <YAxis
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            // Negative bars need room for the minus sign.
            width={54}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          />
          <ReferenceLine y={0} stroke="#2a3446" />
          <Tooltip
            cursor={{ fill: "rgba(255,176,32,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as QuantileBucket;
              return (
                <div className={tipBox}>
                  <div className="tnum mb-1 text-muted">
                    Quintile {p.bucket}
                    {p.bucket === 5 ? " (highest scores)" : p.bucket === 1 ? " (lowest)" : ""}
                  </div>
                  <Row
                    label="Mean forward"
                    value={fmtPct(p.meanForwardPct)}
                    tone={p.meanForwardPct >= 0 ? "text-up" : "text-down"}
                  />
                  <Row label="Hit rate" value={`${p.hitRatePct.toFixed(0)}%`} tone="text-muted" />
                  <Row label="Samples" value={String(p.count)} tone="text-dim" />
                </div>
              );
            }}
          />
          <Bar dataKey="meanForwardPct" isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.bucket}
                fill={d.meanForwardPct >= 0 ? UP : DOWN}
                fillOpacity={current === d.bucket ? 1 : 0.45}
                stroke={current === d.bucket ? AMBER : undefined}
                strokeWidth={current === d.bucket ? 1 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
