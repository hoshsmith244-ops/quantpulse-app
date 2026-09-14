"use client";

import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Trash2,
} from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

type ApiKey = {
  id: string;
  name: string;
  secret: string;
  scope: "read" | "trade" | "admin";
  created: string;
  lastUsed: string | null;
  calls: number;
  env: "Live" | "Paper";
};

const KEYS: ApiKey[] = [
  {
    id: "k1",
    name: "TradingView production",
    secret: "qp_live_sk_4d81c93af0e27b65",
    scope: "trade",
    created: "2026-02-14",
    lastUsed: "2 minutes ago",
    calls: 48_213,
    env: "Live",
  },
  {
    id: "k2",
    name: "Backtest research script",
    secret: "qp_live_sk_a71f2e60c4d8935b",
    scope: "read",
    created: "2026-05-02",
    lastUsed: "6 hours ago",
    calls: 1_904,
    env: "Live",
  },
  {
    id: "k3",
    name: "Paper sandbox",
    secret: "qp_test_sk_30bc5e19d7af428c",
    scope: "admin",
    created: "2026-07-21",
    lastUsed: null,
    calls: 0,
    env: "Paper",
  },
];

const SCOPE_TONE = {
  read: "neutral",
  trade: "accent",
  admin: "warn",
} as const;

export default function ApiKeysPage() {
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({});

  return (
    <>
      <PageHeader
        title="API keys"
        description="Keys authenticate programmatic access to backtests, signals and order routing. Treat a trade-scoped key like a password to your brokerage."
        actions={
          <Button size="sm">
            <Plus />
            Create key
          </Button>
        }
      />

      <div className="space-y-4 p-4 lg:p-6">
        <div className="flex items-start gap-3 rounded-panel border border-warn/25 bg-warn/[0.05] px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <div>
            <p className="text-[13px] font-medium text-bright">
              Secrets are shown once at creation
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
              The values below are masked previews. If you have lost a key,
              rotate it — QuantPulse cannot recover the original.
            </p>
          </div>
        </div>

        <Panel className="overflow-hidden">
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <KeyRound className="size-3.5 text-dim" />
              Active keys
            </PanelTitle>
            <span className="tnum text-[11px] text-dim">
              {KEYS.length} of 10 used
            </span>
          </PanelHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line">
                  {[
                    "Name",
                    "Secret",
                    "Scope",
                    "Environment",
                    "Requests",
                    "Last used",
                    "",
                  ].map((h, i) => (
                    <th
                      key={h || i}
                      className={cn(
                        "whitespace-nowrap px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-dim",
                        i === 4 ? "text-right" : "text-left",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KEYS.map((k) => {
                  const shown = revealed[k.id];
                  const display = shown
                    ? k.secret
                    : `${k.secret.slice(0, 11)}${"•".repeat(14)}`;
                  return (
                    <tr
                      key={k.id}
                      className="border-b border-line-soft last:border-0 hover:bg-raised/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="block font-medium text-bright">
                          {k.name}
                        </span>
                        <span className="tnum block text-[11px] text-dim">
                          Created {k.created}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <code className="tnum text-[11px] text-muted">
                            {display}
                          </code>
                          <button
                            onClick={() =>
                              setRevealed((p) => ({ ...p, [k.id]: !p[k.id] }))
                            }
                            className="text-dim transition-colors hover:text-bright"
                            aria-label={shown ? "Hide key" : "Reveal key"}
                          >
                            {shown ? (
                              <EyeOff className="size-3.5" />
                            ) : (
                              <Eye className="size-3.5" />
                            )}
                          </button>
                          <CopyButton
                            value={k.secret}
                            variant="ghost"
                            iconOnly
                            label="Copy key"
                          />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={SCOPE_TONE[k.scope]}>{k.scope}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={k.env === "Live" ? "profit" : "neutral"}>
                          {k.env}
                        </Badge>
                      </td>
                      <td className="tnum whitespace-nowrap px-4 py-3 text-right text-muted">
                        {k.calls.toLocaleString("en-US")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {k.lastUsed ?? (
                          <span className="text-faint">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-dim hover:text-loss"
                          aria-label={`Revoke ${k.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Authenticating a request</PanelTitle>
          </PanelHeader>
          <div className="bg-base">
            <pre className="tnum overflow-x-auto px-4 py-3 text-[12px] leading-[1.7] text-muted">
              <code>{`curl -X POST https://api.quantpulse.io/v1/webhook/wh_live_8f2c41d9a6b3e057 \\
  -H "Content-Type: application/json" \\
  -H "X-QP-Signature: sha256=\$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$QP_SECRET" -r | cut -d' ' -f1)" \\
  -d "$BODY"`}</code>
            </pre>
          </div>
          <div className="px-4 py-3">
            <p className="text-[12px] leading-relaxed text-muted">
              Sign the raw request body with your key secret and send the digest
              in{" "}
              <code className="tnum text-accent">X-QP-Signature</code>. Requests
              without a valid signature are rejected with{" "}
              <code className="tnum text-loss">401</code>.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
