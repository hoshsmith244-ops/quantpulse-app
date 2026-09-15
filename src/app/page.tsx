import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Label, Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { FACTORS } from "@/lib/alpha";

const STEPS = [
  {
    n: "01",
    title: "Pick a ticker",
    body: "Any symbol Yahoo Finance carries. Three years of daily bars load in under a second.",
  },
  {
    n: "02",
    title: "Choose a factor",
    body: "Momentum, reversal, trend distance, volume thrust. Each turns price history into one score per day.",
  },
  {
    n: "03",
    title: "Read the evidence",
    body: "Information coefficient, decay curve, quintile ladder. The statistics that separate an edge from a coincidence.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 flex h-11 items-center gap-5 border-b border-line bg-base/90 px-4 backdrop-blur lg:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-[18px]" />
          <span className="text-[13px] font-medium tracking-[0.02em] text-bright">
            QUANTPULSE
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/guide"
            className="px-3 py-1.5 text-[12px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-bright"
          >
            Guide
          </Link>
          <Link
            href="/membership"
            className="px-3 py-1.5 text-[12px] uppercase tracking-[0.1em] text-dim transition-colors hover:text-bright"
          >
            Membership
          </Link>
          <Button size="sm" variant="primary" asChild className="ml-2">
            <Link href="/dashboard">Open terminal</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 grid-paper mask-fade-b opacity-60" />
        <div className="relative mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-24">
          <Tag tone="amber">Introduction to quant</Tag>

          <h1 className="mt-5 max-w-3xl text-[32px] font-medium leading-[1.12] tracking-[-0.01em] text-bright sm:text-[42px]">
            Most trading signals are noise.
            <br />
            <span className="text-amber">This tells you which ones aren&apos;t.</span>
          </h1>

          <p className="prose-face mt-5 max-w-xl text-[14px] leading-relaxed text-muted">
            QuantPulse runs real quant factor research on live market data. Pick
            a stock, pick a factor, and see whether it actually predicts the next
            move — measured the way a quant fund measures it, not with a
            back-fitted equity curve.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Button size="lg" variant="primary" asChild>
              <Link href="/dashboard">
                Run your first analysis
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/guide">Read the guide</Link>
            </Button>
          </div>

          {/* Terminal sketch */}
          <div className="mt-14 max-w-2xl">
            <Panel>
              <PanelHead
                title="AAPL · momentum · 5d forward"
                right={<Tag tone="amber">sample</Tag>}
              />
              <pre className="tnum overflow-x-auto px-4 py-3 text-[12px] leading-[1.9] text-text">
{`  INFORMATION COEFF     -0.137   `}<span className="text-down">inverted</span>{`
  T-STATISTIC            -3.43   `}<span className="text-up">significant</span>{`
  Q5 - Q1 SPREAD        -1.22%
  HIT RATE               53.0%
  SAMPLE                   614 observations

  QUINTILE LADDER  `}<span className="text-up">▇▇▇</span>{` `}<span className="text-up">▇▇▇▇▇</span>{` `}<span className="text-up">▇▇</span>{` `}<span className="text-up">▇▇</span>{` `}<span className="text-down">▇</span>{`
                    Q1    Q2   Q3  Q4 Q5`}
              </pre>
              <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
                A real result. Momentum on Apple is{" "}
                <span className="text-down">negatively</span> predictive over
                this window — high scores precede weaker returns. Knowing that is
                worth more than a chart that only goes up.
              </p>
            </Panel>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 py-14 lg:px-6">
          <Label>How it works</Label>
          <div className="mt-6 grid grid-cols-1 gap-px bg-line md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-base p-5">
                <span className="tnum text-[11px] text-amber">{s.n}</span>
                <h3 className="mt-2 text-[14px] text-bright">{s.title}</h3>
                <p className="prose-face mt-2 text-[12px] leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Factors */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 py-14 lg:px-6">
          <Label>Factor library</Label>
          <h2 className="mt-3 text-[24px] font-medium tracking-[-0.01em] text-bright">
            Five classical factors, tested honestly
          </h2>
          <div className="mt-6 divide-y divide-line border border-line">
            {FACTORS.map((f) => (
              <div
                key={f.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <div className="flex w-56 shrink-0 items-baseline gap-2">
                  <span className="text-[13px] text-bright">{f.name}</span>
                </div>
                <p className="prose-face flex-1 text-[12px] leading-relaxed text-muted">
                  {f.thesis}
                </p>
                <Tag tone="neutral" className="shrink-0">
                  {f.family}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest close */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 py-14 lg:px-6">
          <div className="max-w-2xl">
            <Label>What this is not</Label>
            <p className="prose-face mt-3 text-[14px] leading-relaxed text-text">
              This is a research tool, not a signal service. It will often tell
              you a factor <em>doesn&apos;t</em> work on the stock you chose —
              that is the correct answer most of the time, and learning to read
              it is the point.
            </p>
            <p className="prose-face mt-3 text-[13px] leading-relaxed text-dim">
              There is no order routing, no brokerage connection, and nothing
              here is investment advice. Backtested results are hypothetical and
              exclude costs and slippage.
            </p>
            <Button size="lg" variant="primary" asChild className="mt-6">
              <Link href="/dashboard">
                Open the terminal
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-8 text-[11px] text-faint sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <span>© {new Date().getFullYear()} QuantPulse</span>
        <span className="flex gap-4">
          <Link href="/guide" className="hover:text-amber">
            Guide
          </Link>
          <Link href="/membership" className="hover:text-amber">
            Membership
          </Link>
          <span>Data: Yahoo Finance</span>
        </span>
      </footer>
    </div>
  );
}
