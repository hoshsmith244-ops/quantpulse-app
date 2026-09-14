"use client";

import { Braces, Info } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

type PresetId = "entry" | "exit" | "bracket";

const PRESETS: Array<{
  id: PresetId;
  label: string;
  hint: string;
  body: (key: string) => Record<string, unknown>;
}> = [
  {
    id: "entry",
    label: "Market entry",
    hint: "Fires on strategy.entry(). Size comes from the Pine strategy.",
    body: (key) => ({
      key,
      symbol: "{{ticker}}",
      action: "{{strategy.order.action}}",
      qty: "{{strategy.order.contracts}}",
      price: "{{close}}",
      order_type: "market",
      time_in_force: "gtc",
      alert_id: "{{timenow}}",
    }),
  },
  {
    id: "exit",
    label: "Close position",
    hint: "Flattens whatever the account currently holds in this symbol.",
    body: (key) => ({
      key,
      symbol: "{{ticker}}",
      action: "close",
      price: "{{close}}",
      alert_id: "{{timenow}}",
    }),
  },
  {
    id: "bracket",
    label: "Bracket order",
    hint: "Entry plus attached stop and target, submitted as one OCO bracket.",
    body: (key) => ({
      key,
      symbol: "{{ticker}}",
      action: "{{strategy.order.action}}",
      qty: "{{strategy.order.contracts}}",
      price: "{{close}}",
      order_type: "market",
      time_in_force: "gtc",
      bracket: {
        stop_loss: { stop_price: "{{plot_0}}" },
        take_profit: { limit_price: "{{plot_1}}" },
      },
      alert_id: "{{timenow}}",
    }),
  },
];

const FIELD_DOCS: Array<[string, string]> = [
  ["key", "Your endpoint key. Required — the request is rejected without it."],
  ["symbol", "Ticker to trade. {{ticker}} resolves to the chart symbol."],
  ["action", "buy, sell, or close. Pine fills this automatically."],
  ["qty", "Units to trade. Omit to use the account default sizing rule."],
  ["order_type", "market or limit. Limit orders also need a limit_price."],
  ["alert_id", "Idempotency key. Repeats within 60s return 409 and are dropped."],
];

/** Syntax-highlights a JSON string without pulling in a highlighter library. */
function JsonBlock({ json }: { json: string }) {
  const lines = json.split("\n");
  return (
    <pre className="tnum overflow-x-auto px-4 py-3 text-[12px] leading-[1.7]">
      <code>
        {lines.map((line, i) => {
          const match = line.match(/^(\s*)"([^"]+)":\s*(.*)$/);
          return (
            <div key={i} className="flex">
              <span className="mr-4 w-5 shrink-0 select-none text-right text-faint">
                {i + 1}
              </span>
              <span className="min-w-0 whitespace-pre">
                {match ? (
                  <>
                    <span>{match[1]}</span>
                    <span className="text-accent">&quot;{match[2]}&quot;</span>
                    <span className="text-dim">: </span>
                    <ValueSpan raw={match[3]} />
                  </>
                ) : (
                  <span className="text-muted">{line}</span>
                )}
              </span>
            </div>
          );
        })}
      </code>
    </pre>
  );
}

function ValueSpan({ raw }: { raw: string }) {
  const trailing = raw.endsWith(",") ? "," : "";
  const value = trailing ? raw.slice(0, -1) : raw;

  if (value.startsWith('"')) {
    const isTemplate = value.includes("{{");
    return (
      <>
        <span className={isTemplate ? "text-warn" : "text-profit"}>{value}</span>
        <span className="text-dim">{trailing}</span>
      </>
    );
  }
  return (
    <>
      <span className="text-muted">{value}</span>
      <span className="text-dim">{trailing}</span>
    </>
  );
}

export function PayloadHelper({ webhookKey }: { webhookKey: string }) {
  const [preset, setPreset] = React.useState<PresetId>("entry");
  const active = PRESETS.find((p) => p.id === preset)!;
  const json = React.useMemo(
    () => JSON.stringify(active.body(webhookKey), null, 2),
    [active, webhookKey],
  );

  return (
    <Panel>
      <PanelHeader className="flex-wrap">
        <PanelTitle className="flex items-center gap-2">
          <Braces className="size-3.5 text-dim" />
          TradingView alert payload
        </PanelTitle>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">application/json</Badge>
          <CopyButton value={json} label="Copy JSON" />
        </div>
      </PanelHeader>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[12px] transition-colors",
              preset === p.id
                ? "border-line-strong bg-overlay text-bright"
                : "border-transparent text-dim hover:text-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="border-b border-line bg-base">
        <JsonBlock json={json} />
      </div>

      <div className="flex items-start gap-2 border-b border-line px-4 py-3">
        <Info className="mt-0.5 size-3.5 shrink-0 text-dim" />
        <p className="text-[12px] leading-relaxed text-muted">{active.hint}</p>
      </div>

      <div className="p-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
          Field reference
        </span>
        <dl className="mt-3 space-y-2">
          {FIELD_DOCS.map(([field, doc]) => (
            <div
              key={field}
              className="grid grid-cols-[92px_minmax(0,1fr)] items-baseline gap-3"
            >
              <dt className="tnum truncate text-[11px] text-accent">{field}</dt>
              <dd className="text-[12px] leading-relaxed text-muted">{doc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}
