"use client";

import {
  Eye,
  EyeOff,
  Globe,
  Link2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { WEBHOOK_KEY } from "@/lib/webhook";

function randomKey() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `wh_live_${hex}`;
}

export function EndpointGenerator({
  onKeyChange,
}: {
  onKeyChange?: (key: string) => void;
}) {
  // The starting key is a fixed value, so it renders identically on the server
  // and the client. Only rotation produces a random key, and that is triggered
  // by a user action rather than during render.
  const [key, setKey] = React.useState<string>(WEBHOOK_KEY);
  const [revealed, setRevealed] = React.useState(false);
  const [rotating, setRotating] = React.useState(false);

  const rotate = () => {
    setRotating(true);
    setTimeout(() => {
      const next = randomKey();
      setKey(next);
      onKeyChange?.(next);
      setRotating(false);
      setRevealed(true);
    }, 500);
  };

  const url = `https://api.quantpulse.io/v1/webhook/${key}`;
  const masked = `https://api.quantpulse.io/v1/webhook/${key.slice(0, 11)}${"•".repeat(12)}`;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Link2 className="size-3.5 text-dim" />
          Endpoint
        </PanelTitle>
        <Badge tone="profit">
          <span className="size-1 rounded-full bg-profit animate-pulse-dot" />
          Active
        </Badge>
      </PanelHeader>

      <div className="space-y-4 p-4">
        <div>
          <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
            Your unique webhook URL
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-md border border-line bg-base px-3 py-2">
              <code className="tnum min-w-0 flex-1 truncate text-[12px] text-accent">
                {revealed ? url : masked}
              </code>
              <button
                onClick={() => setRevealed((v) => !v)}
                className="ml-2 shrink-0 text-dim transition-colors hover:text-bright"
                aria-label={revealed ? "Hide endpoint" : "Reveal endpoint"}
              >
                {revealed ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>
            <CopyButton value={url} label="Copy URL" />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-dim">
            Paste this into the TradingView alert dialog under{" "}
            <span className="text-muted">Notifications → Webhook URL</span>.
            Anyone holding this URL can submit orders to your account.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-3">
          <Detail icon={ShieldCheck} label="Signing" value="HMAC-SHA256" />
          <Detail icon={Globe} label="Region" value="us-east-1" />
          <Detail icon={RefreshCw} label="Rotated" value="14 days ago" />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={rotate}
            disabled={rotating}
          >
            <RefreshCw className={rotating ? "animate-spin" : undefined} />
            {rotating ? "Rotating…" : "Rotate key"}
          </Button>
          <span className="text-[11px] text-dim">
            Rotating invalidates the old URL immediately.
          </span>
        </div>
      </div>
    </Panel>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded border border-line bg-raised">
        <Icon className="size-3.5 text-dim" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-[0.12em] text-dim">
          {label}
        </span>
        <span className="tnum block truncate text-[12px] text-bright">
          {value}
        </span>
      </span>
    </div>
  );
}
