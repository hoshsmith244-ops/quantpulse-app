"use client";

import { Check, Eye, Info, RotateCcw } from "lucide-react";
import * as React from "react";

import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import {
  ACCENTS,
  GRIDS,
  MARKETS,
  SURFACES,
  isDefaultAppearance,
  type Appearance,
} from "@/lib/appearance";
import { fmtPct } from "@/lib/format";
import { useAppearance } from "@/lib/use-appearance";
import { cn } from "@/lib/utils";

/**
 * Appearance settings.
 *
 * Every control writes a data attribute on <html> and the CSS does the rest,
 * so the whole page updates the instant a swatch is clicked — there is no
 * "apply" button because there is nothing to apply.
 */
export function AppearanceSettings() {
  const { appearance, update, reset } = useAppearance();
  const isDefault = isDefaultAppearance(appearance);

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHead
          title="Appearance"
          right={
            !isDefault ? (
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-amber"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            ) : (
              <Tag tone="neutral">defaults</Tag>
            )
          }
        />
        <p className="prose-face border-b border-line px-4 py-2.5 text-[12px] leading-relaxed text-dim">
          Changes apply immediately and are saved in this browser. Nothing here
          affects a single number the tool produces — except the direction
          colours, which decide how you read every one of them.
        </p>

        <Choice
          label="Accent"
          hint="Used for highlights, active states and anything asking for attention."
          options={ACCENTS}
          value={appearance.accent}
          onChange={(accent) => update({ accent })}
        />

        <Choice
          label="Direction colours"
          hint="Which colour means a gain."
          options={MARKETS}
          value={appearance.market}
          onChange={(market) => update({ market })}
          emphasise
        />

        <Choice
          label="Background"
          hint="The base surface everything sits on."
          options={SURFACES}
          value={appearance.surface}
          onChange={(surface) => update({ surface })}
        />

        <Choice
          label="Grid weight"
          hint="How strongly the panel rules and borders read."
          options={GRIDS}
          value={appearance.grid}
          onChange={(grid) => update({ grid })}
        />

        <div className="border-t border-line p-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={appearance.texture}
              onChange={(e) => update({ texture: e.target.checked })}
              className="mt-0.5 size-3.5 accent-[#ffb020]"
            />
            <span>
              <span className="block text-[12px] text-bright">
                Lattice background
              </span>
              <span className="prose-face mt-0.5 block max-w-xl text-[11px] leading-relaxed text-dim">
                A faint graph-paper grid behind the interface. Off by default —
                it suits the terminal look but adds visual noise to the charts.
              </span>
            </span>
          </label>
        </div>
      </Panel>

      <Preview appearance={appearance} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Choice<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  emphasise = false,
}: {
  label: string;
  hint: string;
  options: { id: T; name: string; hint: string; swatch: string[] }[];
  value: T;
  onChange: (v: T) => void;
  emphasise?: boolean;
}) {
  const active = options.find((o) => o.id === value);

  return (
    <div className="border-t border-line p-4">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="label">{label}</span>
        <span className="prose-face text-[11px] leading-snug text-dim">
          {hint}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = o.id === value;
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              aria-pressed={selected}
              title={o.hint}
              className={cn(
                "flex items-center gap-2 border px-2.5 py-1.5 text-[12px] transition-colors",
                selected
                  ? "border-amber bg-amber/10 text-bright"
                  : "border-edge text-muted hover:border-dim hover:text-bright",
              )}
            >
              <span className="flex shrink-0 items-center gap-0.5">
                {o.swatch.map((c) => (
                  <span
                    key={c}
                    className="size-3 border border-black/40"
                    style={{ background: c }}
                  />
                ))}
              </span>
              {o.name}
              {selected ? <Check className="size-3 text-amber" /> : null}
            </button>
          );
        })}
      </div>

      {emphasise && active ? (
        <p className="prose-face mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
          <Info className="mt-0.5 size-3 shrink-0 text-amber" />
          {active.hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A live sample of the components the settings actually affect.
 *
 * Present because the direction colours are easy to pick and hard to imagine:
 * seeing a real gain and a real loss side by side is the only way to know
 * whether a palette reads correctly to you.
 */
function Preview({ appearance }: { appearance: Appearance }) {
  return (
    <Panel>
      <PanelHead
        title="Preview"
        right={
          <Tag tone="neutral">
            <Eye className="size-2.5" />
            live sample
          </Tag>
        }
      />

      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {[
          { label: "Signal return", value: fmtPct(24.5, 1), tone: "text-up" },
          { label: "Buy & hold", value: fmtPct(-4.8, 1), tone: "text-down" },
          { label: "Sharpe", value: "0.82", tone: "text-bright" },
          { label: "Max drawdown", value: "-10.9%", tone: "text-down" },
        ].map((s) => (
          <div key={s.label} className="bg-panel px-4 py-3">
            <span className="label block">{s.label}</span>
            <span className={cn("tnum mt-1 block text-[19px]", s.tone)}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="up">holding</Tag>
          <Tag tone="down">exited</Tag>
          <Tag tone="amber">act today · 7m</Tag>
          <Tag tone="neutral">settled</Tag>
        </div>

        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-line">
              {["Ticker", "Return", "Holding", "Edge"].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "px-2 py-1.5 text-[10px] uppercase tracking-[0.1em] text-dim",
                    i === 0 ? "text-left" : "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { s: "RIVN", ret: 80.3, bh: -34.5 },
              { s: "PG", ret: 24.5, bh: -4.8 },
              { s: "NKE", ret: -29.0, bh: -62.1 },
            ].map((r) => (
              <tr key={r.s} className="border-b border-line-soft last:border-0">
                <td className="tnum px-2 py-1.5 text-bright">{r.s}</td>
                <td
                  className={cn(
                    "tnum px-2 py-1.5 text-right",
                    r.ret >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {fmtPct(r.ret, 1)}
                </td>
                <td className="tnum px-2 py-1.5 text-right text-dim">
                  {fmtPct(r.bh, 1)}
                </td>
                <td
                  className={cn(
                    "tnum px-2 py-1.5 text-right font-medium",
                    r.ret - r.bh >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {fmtPct(r.ret - r.bh, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {appearance.market === "colorblind" ? (
        <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
          Blue and orange stay distinguishable under the common forms of
          red-green colour blindness, where the default green and red can look
          nearly identical.
        </p>
      ) : appearance.market === "inverted" ? (
        <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-amber">
          Red now means a gain. Worth being sure before you read a screen full
          of numbers this way.
        </p>
      ) : null}
    </Panel>
  );
}
