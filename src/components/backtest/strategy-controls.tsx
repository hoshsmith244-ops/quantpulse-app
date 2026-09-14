"use client";

import { RotateCcw } from "lucide-react";
import * as React from "react";

import { AffixInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ASSETS } from "@/lib/market-data";
import { STRATEGIES, getStrategy } from "@/lib/strategies";
import type { BacktestConfig, StrategyId } from "@/lib/types";
import { DEFAULT_CONFIG } from "@/lib/use-backtest";
import { cn } from "@/lib/utils";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}

export function StrategyControls({
  config,
  update,
  setConfig,
  layout = "stack",
  showReset = true,
}: {
  config: BacktestConfig;
  update: <K extends keyof BacktestConfig>(
    key: K,
    value: BacktestConfig[K],
  ) => void;
  setConfig?: React.Dispatch<React.SetStateAction<BacktestConfig>>;
  layout?: "stack" | "grid";
  showReset?: boolean;
}) {
  const meta = getStrategy(config.strategy);
  const grouped = React.useMemo(
    () => ({
      ETF: ASSETS.filter((a) => a.klass === "ETF"),
      Equity: ASSETS.filter((a) => a.klass === "Equity"),
      Crypto: ASSETS.filter((a) => a.klass === "Crypto"),
    }),
    [],
  );

  return (
    <div
      className={cn(
        layout === "grid"
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          : "space-y-4",
      )}
    >
      <Field label="Asset">
        <Select
          value={config.symbol}
          onValueChange={(v) => update("symbol", v)}
        >
          <SelectTrigger aria-label="Asset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(grouped) as Array<keyof typeof grouped>).map((k) => (
              <SelectGroup key={k}>
                <SelectLabel>{k}</SelectLabel>
                {grouped[k].map((a) => (
                  <SelectItem key={a.symbol} value={a.symbol}>
                    <span className="tnum font-medium">{a.symbol}</span>
                    <span className="ml-2 text-dim">{a.name}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Strategy">
        <Select
          value={config.strategy}
          onValueChange={(v) => update("strategy", v as StrategyId)}
        >
          <SelectTrigger aria-label="Strategy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STRATEGIES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label={meta.lookbackLabel}
        hint={
          <span className="tnum text-[12px] font-medium text-bright">
            {config.lookback}
            <span className="ml-1 text-dim">bars</span>
          </span>
        }
      >
        <Slider
          value={[config.lookback]}
          min={meta.lookbackMin}
          max={meta.lookbackMax}
          step={1}
          onValueChange={([v]) => update("lookback", v)}
          aria-label={meta.lookbackLabel}
        />
        <div className="tnum flex justify-between text-[10px] text-faint">
          <span>{meta.lookbackMin}</span>
          <span>{meta.lookbackMax}</span>
        </div>
      </Field>

      <Field label="Initial capital">
        <AffixInput
          prefix="$"
          type="number"
          min={1000}
          step={1000}
          value={config.initialCapital}
          onChange={(e) =>
            update(
              "initialCapital",
              Math.max(1000, Number(e.target.value) || 0),
            )
          }
          aria-label="Initial capital"
        />
      </Field>

      <Field label="Stop loss">
        <AffixInput
          suffix="%"
          type="number"
          min={0}
          max={90}
          step={0.5}
          value={config.stopLossPct}
          onChange={(e) =>
            update(
              "stopLossPct",
              Math.min(90, Math.max(0, Number(e.target.value) || 0)),
            )
          }
          aria-label="Stop loss percent"
        />
      </Field>

      <Field label="Take profit">
        <AffixInput
          suffix="%"
          type="number"
          min={0}
          max={500}
          step={0.5}
          value={config.takeProfitPct}
          onChange={(e) =>
            update(
              "takeProfitPct",
              Math.min(500, Math.max(0, Number(e.target.value) || 0)),
            )
          }
          aria-label="Take profit percent"
        />
      </Field>

      <div
        className={cn(
          "space-y-3",
          layout === "grid" && "sm:col-span-2 lg:col-span-3",
        )}
      >
        <p className="border-l-2 border-line pl-3 text-[12px] leading-relaxed text-muted">
          {meta.blurb}
        </p>
        {showReset && setConfig ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfig({ ...DEFAULT_CONFIG })}
            className="w-full"
          >
            <RotateCcw />
            Reset to defaults
          </Button>
        ) : null}
      </div>
    </div>
  );
}
