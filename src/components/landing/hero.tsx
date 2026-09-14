import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

import { HeroBacktest } from "@/components/landing/hero-backtest";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Grid wash, faded out toward the bottom */}
      <div className="pointer-events-none absolute inset-0 grid-wash mask-fade-b opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-[1400px] px-5 pb-16 pt-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <Link
              href="#workflow"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1 text-[12px] text-muted transition-colors hover:border-line-strong hover:text-bright"
            >
              <Zap className="size-3 text-warn" />
              Webhook execution now averaging
              <span className="tnum font-medium text-bright">14ms</span>
              <ArrowRight className="size-3" />
            </Link>

            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-bright sm:text-5xl lg:text-[3.4rem]">
              Backtest the signal.
              <br />
              <span className="text-muted">Then let it trade itself.</span>
            </h1>

            <p className="mt-5 max-w-lg text-pretty text-[15px] leading-relaxed text-muted">
              QuantPulse runs your strategy against three years of market
              structure, reports the metrics that actually matter, and routes
              every live signal to your broker over a signed webhook — in the
              same afternoon.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Start backtesting free
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/dashboard/webhooks">View webhook docs</Link>
              </Button>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              {[
                { k: "Signals routed", v: "2.4M" },
                { k: "Median latency", v: "14ms" },
                { k: "Broker uptime", v: "99.98%" },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-dim">
                    {s.k}
                  </dt>
                  <dd className="tnum mt-1 text-lg font-medium text-bright">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div id="backtest" className="scroll-mt-20">
            <HeroBacktest />
          </div>
        </div>
      </div>
    </section>
  );
}
