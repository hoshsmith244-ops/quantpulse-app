import { rollingMax, rollingMin, rsi, sma } from "./indicators";
import type { Bar, StrategyId } from "./types";

export type StrategyMeta = {
  id: StrategyId;
  name: string;
  blurb: string;
  /** what the lookback slider controls for this strategy */
  lookbackLabel: string;
  lookbackMin: number;
  lookbackMax: number;
  lookbackDefault: number;
};

export const STRATEGIES: StrategyMeta[] = [
  {
    id: "dma",
    name: "Dual Moving Average",
    blurb:
      "Long while the fast SMA sits above the slow SMA; flat on the cross back down.",
    lookbackLabel: "Slow SMA period",
    lookbackMin: 20,
    lookbackMax: 200,
    lookbackDefault: 90,
  },
  {
    id: "rsi",
    name: "RSI Reversion",
    blurb:
      "Buy oversold below RSI 30, exit into strength above RSI 62. Counter-trend.",
    lookbackLabel: "RSI period",
    lookbackMin: 5,
    lookbackMax: 40,
    lookbackDefault: 14,
  },
  {
    id: "breakout",
    name: "Breakout Momentum",
    blurb:
      "Donchian channel: long on a new N-bar high, exit on a new half-N-bar low.",
    lookbackLabel: "Channel length",
    lookbackMin: 10,
    lookbackMax: 120,
    lookbackDefault: 45,
  },
];

export const getStrategy = (id: StrategyId): StrategyMeta =>
  STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0];

/**
 * Desired exposure per bar: 1 = long, 0 = flat.
 * Signals are evaluated on bar close, matching how a TradingView alert fires.
 */
export function buildSignals(
  bars: Bar[],
  strategy: StrategyId,
  lookback: number,
): (0 | 1)[] {
  const close = bars.map((b) => b.close);
  const target: (0 | 1)[] = new Array(bars.length).fill(0);

  if (strategy === "dma") {
    const slow = sma(close, lookback);
    const fast = sma(close, Math.max(3, Math.round(lookback / 3)));
    for (let i = 0; i < bars.length; i++) {
      const f = fast[i];
      const s = slow[i];
      target[i] = f !== null && s !== null && f > s ? 1 : 0;
    }
    return target;
  }

  if (strategy === "rsi") {
    const r = rsi(close, lookback);
    let held: 0 | 1 = 0;
    for (let i = 0; i < bars.length; i++) {
      const v = r[i];
      if (v === null) {
        target[i] = 0;
        continue;
      }
      if (held === 0 && v < 30) held = 1;
      else if (held === 1 && v > 62) held = 0;
      target[i] = held;
    }
    return target;
  }

  const upper = rollingMax(close, lookback);
  const lower = rollingMin(close, Math.max(5, Math.round(lookback / 2)));
  let held: 0 | 1 = 0;
  for (let i = 0; i < bars.length; i++) {
    const hi = upper[i];
    const lo = lower[i];
    if (hi === null || lo === null) {
      target[i] = 0;
      continue;
    }
    if (held === 0 && close[i] > hi) held = 1;
    else if (held === 1 && close[i] < lo) held = 0;
    target[i] = held;
  }
  return target;
}
