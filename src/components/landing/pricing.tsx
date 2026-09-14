import { Check, Minus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tier = {
  name: string;
  price: number;
  tagline: string;
  cta: string;
  featured?: boolean;
  features: Array<{ label: string; included: boolean }>;
};

const TIERS: Tier[] = [
  {
    name: "Basic",
    price: 19,
    tagline: "Research and alerting for a single trading account.",
    cta: "Start with Basic",
    features: [
      { label: "Unlimited strategy backtests", included: true },
      { label: "3 years of intraday & daily history", included: true },
      { label: "Full metrics suite + trade log export", included: true },
      { label: "Email & mobile push alerts", included: true },
      { label: "5 saved strategies", included: true },
      { label: "Live webhook triggers", included: false },
      { label: "Broker auto-execution", included: false },
      { label: "Priority signal routing", included: false },
    ],
  },
  {
    name: "Pro",
    price: 49,
    tagline: "Hands-off execution straight into your brokerage.",
    cta: "Upgrade to Pro",
    featured: true,
    features: [
      { label: "Everything in Basic", included: true },
      { label: "Unlimited webhook triggers", included: true },
      { label: "Alpaca & Interactive Brokers auto-execution", included: true },
      { label: "HMAC-signed endpoints + IP allowlist", included: true },
      { label: "Unlimited saved strategies", included: true },
      { label: "Position sizing & portfolio risk caps", included: true },
      { label: "Priority signal routing (p50 14ms)", included: true },
      { label: "Live terminal feed & replay", included: true },
    ],
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-16 border-b border-line py-16 lg:py-24"
    >
      <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="neutral">Pricing</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-bright sm:text-4xl">
            Two plans. No execution fees.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Backtest as much as you like on either plan. Pay more only when you
            want the signals to actually place orders.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={cn(
                "relative flex flex-col rounded-panel border bg-surface p-6",
                t.featured
                  ? "border-accent/40 shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_18px_50px_-24px_rgba(59,130,246,0.45)]"
                  : "border-line",
              )}
            >
              {t.featured ? (
                <span className="absolute -top-2.5 left-6">
                  <Badge tone="accent">Most popular</Badge>
                </span>
              ) : null}

              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-medium text-bright">
                  {t.name}
                </h3>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="tnum text-4xl font-semibold tracking-tight text-bright">
                  ${t.price}
                </span>
                <span className="text-[13px] text-dim">/mo</span>
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                {t.tagline}
              </p>

              <Button
                className="mt-6 w-full"
                variant={t.featured ? "primary" : "secondary"}
                asChild
              >
                <Link href="/dashboard">{t.cta}</Link>
              </Button>

              <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
                {t.features.map((f) => (
                  <li
                    key={f.label}
                    className={cn(
                      "flex items-start gap-2.5 text-[13px]",
                      f.included ? "text-text" : "text-faint",
                    )}
                  >
                    {f.included ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-profit" />
                    ) : (
                      <Minus className="mt-0.5 size-3.5 shrink-0 text-faint" />
                    )}
                    {f.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-[12px] leading-relaxed text-dim">
          Both plans bill monthly and cancel anytime. Backtested results are
          hypothetical and do not represent actual trading. Past performance is
          not indicative of future results.
        </p>
      </div>
    </section>
  );
}
