"use client";

import * as React from "react";

import { runBacktest } from "./backtest";
import { getStrategy } from "./strategies";
import type { BacktestConfig, BacktestResult, StrategyId } from "./types";

export const DEFAULT_CONFIG: BacktestConfig = {
  symbol: "SPY",
  strategy: "dma",
  lookback: 90,
  initialCapital: 10_000,
  stopLossPct: 8,
  takeProfitPct: 20,
};

/**
 * Runs the engine synchronously but through a deferred value, so dragging the
 * lookback slider stays responsive while the recompute happens at lower priority.
 */
export function useBacktest(initial: Partial<BacktestConfig> = {}) {
  const [config, setConfig] = React.useState<BacktestConfig>({
    ...DEFAULT_CONFIG,
    ...initial,
  });

  const deferred = React.useDeferredValue(config);
  const isPending = config !== deferred;

  const result: BacktestResult = React.useMemo(
    () => runBacktest(deferred),
    [deferred],
  );

  const update = React.useCallback(
    <K extends keyof BacktestConfig>(key: K, value: BacktestConfig[K]) => {
      setConfig((prev) => {
        if (key !== "strategy") return { ...prev, [key]: value };
        // Switching strategy retargets the lookback to that strategy's default,
        // since a 90-bar RSI is meaningless.
        const meta = getStrategy(value as StrategyId);
        return { ...prev, strategy: value as StrategyId, lookback: meta.lookbackDefault };
      });
    },
    [],
  );

  return { config, setConfig, update, result, isPending };
}
