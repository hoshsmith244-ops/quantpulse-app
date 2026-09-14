import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Radio,
  ShieldCheck,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    icon: Radio,
    kicker: "01 · Source",
    title: "Strategy alert",
    body: "A TradingView alert or a QuantPulse engine signal fires on bar close.",
    detail: "POST /v1/webhook/:key",
    meta: ["TradingView", "Pine Script", "QP Engine"],
    accent: "text-accent",
    ring: "border-accent/25 bg-accent/[0.06]",
  },
  {
    icon: ShieldCheck,
    kicker: "02 · Gateway",
    title: "Webhook API",
    body: "HMAC signature verified, payload validated, duplicates dropped, risk limits applied.",
    detail: "verify → dedupe → risk → route",
    meta: ["HMAC-SHA256", "Idempotent", "Rate-limited"],
    accent: "text-warn",
    ring: "border-warn/25 bg-warn/[0.06]",
  },
  {
    icon: Building2,
    kicker: "03 · Execution",
    title: "Broker order",
    body: "Normalised order hits your brokerage account and the fill streams back.",
    detail: "201 Created · filled",
    meta: ["Alpaca", "Interactive Brokers", "Paper"],
    accent: "text-profit",
    ring: "border-profit/25 bg-profit/[0.06]",
  },
];

function Connector({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      aria-hidden
    >
      {/* Horizontal on wide screens */}
      <svg
        className="hidden h-8 w-full lg:block"
        viewBox="0 0 120 32"
        preserveAspectRatio="none"
        fill="none"
      >
        <line
          x1="0"
          y1="16"
          x2="104"
          y2="16"
          stroke="#2b3a52"
          strokeWidth="1.5"
          className="animate-flow"
        />
        <path
          d="M104 11L112 16L104 21Z"
          fill="#2b3a52"
        />
      </svg>
      {/* Vertical when stacked */}
      <svg
        className="h-8 w-8 lg:hidden"
        viewBox="0 0 32 32"
        fill="none"
      >
        <line
          x1="16"
          y1="0"
          x2="16"
          y2="22"
          stroke="#2b3a52"
          strokeWidth="1.5"
          className="animate-flow"
        />
        <path d="M11 22L16 30L21 22Z" fill="#2b3a52" />
      </svg>
    </div>
  );
}

export function Workflow() {
  return (
    <section
      id="workflow"
      className="scroll-mt-16 border-b border-line py-16 lg:py-24"
    >
      <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
        <div className="max-w-2xl">
          <Badge tone="accent">Execution pipeline</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-bright sm:text-4xl">
            From alert to fill in one hop
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            No polling loops, no desktop bridge, no VPS babysitting. Point your
            alert at the endpoint and QuantPulse handles verification, risk
            checks and broker translation.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-0 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {STAGES.map((s, i) => (
            <div key={s.title} className="contents">
              <article className="rounded-panel border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md border",
                      s.ring,
                    )}
                  >
                    <s.icon className={cn("size-4", s.accent)} />
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
                    {s.kicker}
                  </span>
                </div>

                <h3 className="mt-4 text-[15px] font-medium text-bright">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  {s.body}
                </p>

                <code className="tnum mt-4 block truncate rounded border border-line bg-base px-2.5 py-1.5 text-[11px] text-accent">
                  {s.detail}
                </code>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.meta.map((m) => (
                    <span
                      key={m}
                      className="rounded border border-line bg-raised px-1.5 py-0.5 text-[10px] text-dim"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </article>

              {i < STAGES.length - 1 ? <Connector className="py-1" /> : null}
            </div>
          ))}
        </div>

        {/* Return path */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-panel border border-dashed border-line bg-surface/50 px-5 py-3">
          <CheckCircle2 className="size-3.5 text-profit" />
          <span className="text-[12px] text-muted">
            Fill confirmation streams back to your dashboard, trade log and
            alerting channel
          </span>
          <ArrowRight className="size-3 text-faint" />
          <span className="tnum text-[11px] text-dim">
            round trip <span className="text-profit">14ms</span> p50 ·{" "}
            <span className="text-bright">38ms</span> p99
          </span>
        </div>

        <div className="mt-10 flex items-center gap-3 text-[12px] text-dim">
          <Webhook className="size-3.5" />
          Works with any platform that can send an HTTP POST — TradingView,
          Zapier, a cron job, or your own code.
        </div>
      </div>
    </section>
  );
}
