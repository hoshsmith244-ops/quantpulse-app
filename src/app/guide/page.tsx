import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Panel, PanelHead, Tag } from "@/components/ui/terminal";

export const metadata: Metadata = {
  title: "Guide",
  description:
    "How to use the QuantPulse alpha terminal: information coefficient, decay, quintile spread, and how to tell an edge from noise.",
};

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-3">
        <span className="tnum text-[11px] text-amber">{n}</span>
        <h2 className="text-[17px] font-medium tracking-[-0.01em] text-bright">
          {title}
        </h2>
      </div>
      <div className="prose-face mt-4 space-y-3.5 text-[13px] leading-[1.75] text-text">
        {children}
      </div>
    </section>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-amber">{children}</span>;
}

/** Reference table row. */
function Reading({
  when,
  means,
}: {
  when: string;
  means: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-line py-2.5 last:border-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <span className="tnum text-[12px] text-bright">{when}</span>
      <span className="prose-face text-[12px] leading-relaxed text-muted">
        {means}
      </span>
    </div>
  );
}

export default function GuidePage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[820px] px-5 py-10 lg:px-6">
        <Tag tone="amber">Guide</Tag>
        <h1 className="mt-4 text-[28px] font-medium leading-tight tracking-[-0.01em] text-bright">
          How to use this tool
        </h1>
        <p className="prose-face mt-3 text-[14px] leading-relaxed text-muted">
          QuantPulse answers one question: does this signal predict what happens
          next? Everything on the terminal exists to answer it honestly. Here is
          how to read it.
        </p>

        <div className="mt-10">
          <Section n="01" title="The idea behind a factor">
            <p>
              A <Term>factor</Term> is a rule that turns price history into a
              single number for each day. &ldquo;How much has this risen over six
              months?&rdquo; is a factor. So is &ldquo;how far below its average
              is it trading?&rdquo;
            </p>
            <p>
              On its own that number means nothing. It becomes useful only if
              today&apos;s score tells you something about{" "}
              <em>tomorrow&apos;s</em> return. A factor that correlates with the
              past is a description. A factor that correlates with the future is
              an edge. Telling those apart is the whole job.
            </p>
          </Section>

          <Section n="02" title="Information coefficient — the headline number">
            <p>
              The <Term>IC</Term> is the rank correlation between the factor
              score on a given day and the return over the following days. It
              runs from −1 to +1.
            </p>
            <p>
              Real factors are weak. A live equity factor with an IC of{" "}
              <Term>0.03</Term> is genuinely useful — funds are built on less.
              Anything above 0.10 on a single stock should make you suspicious
              rather than excited.
            </p>
            <div className="mt-4 border border-line">
              <Reading when="IC ≈ 0" means="No relationship. The factor tells you nothing about what comes next." />
              <Reading when="IC > 0" means="Higher scores tend to precede higher returns. The factor works in the direction you would expect." />
              <Reading when="IC < 0" means="The factor is inverted — high scores precede weaker returns. This is still information; a quant would flip the sign and trade it backwards." />
            </div>
          </Section>

          <Section n="03" title="t-statistic — is it real, or luck?">
            <p>
              Any two random series show <em>some</em> correlation. The{" "}
              <Term>t-statistic</Term> tells you whether the IC is large enough,
              given how many observations you have, to be unlikely by chance.
            </p>
            <p>
              The convention is simple: <Term>|t| &lt; 2</Term> means treat the
              IC as noise no matter how good it looks. Above 2, it is worth
              taking seriously. This is the single most important guardrail on
              the page — a beautiful IC with a t-stat of 0.8 is nothing.
            </p>
          </Section>

          <Section n="04" title="Decay — how long the edge lasts">
            <p>
              The decay chart recomputes the IC at 1, 5, 10, 21 and 63 days
              forward. The shape tells you what kind of signal you have.
            </p>
            <p>
              A line that peaks early and falls toward zero is a fast signal —
              act quickly or not at all. A line that holds or grows with horizon
              is a slow, position-trade signal. If the line crosses zero, the
              factor means opposite things at different horizons, which usually
              means it is unstable.
            </p>
          </Section>

          <Section n="05" title="Quintile ladder — where the return actually is">
            <p>
              Every day is sorted by its factor score and dropped into five
              buckets, lowest scores in <Term>Q1</Term> and highest in{" "}
              <Term>Q5</Term>. The chart shows the average forward return of
              each bucket.
            </p>
            <p>
              What you want is a <em>staircase</em>: each bucket a little better
              than the last. That means the factor is informative across its
              whole range. A flat ladder with one tall bar is usually a handful
              of lucky days, not an edge. The{" "}
              <Term>Q5 − Q1 spread</Term> summarises the ladder in one number.
            </p>
          </Section>

          <Section n="06" title="The equity curve — and why it is last">
            <p>
              Only after the statistics does the tool show what happens if you
              trade the signal: long whenever the score is in the top 40% of
              everything seen up to that day, flat otherwise.
            </p>
            <p>
              Two things make this a fair test rather than a curve fit. The
              threshold is computed from past scores only, so the rule never
              peeks at the future. And there is a one-year warm-up before the
              first trade. What it does <em>not</em> include is commission,
              spread or slippage — so treat the curve as an upper bound.
            </p>
            <p className="border-l-2 border-amber pl-3 text-muted">
              An equity curve is the most persuasive and least reliable thing on
              this page. If the IC is insignificant, a good-looking curve is
              luck. Read the statistics first, deliberately.
            </p>
          </Section>

          <Section n="07" title="A worked example">
            <p>
              Load <Term>AAPL</Term> with <Term>Momentum</Term> at a 126-day
              window and a 5-day horizon. You get an IC around −0.14 with a
              t-stat near −3.4.
            </p>
            <p>
              Read that carefully: the t-stat says the relationship is real, and
              the sign says it is <em>inverted</em>. Over this window, Apple
              rising strongly for six months tended to be followed by weaker
              short-term returns — classic mean reversion in a single large-cap
              name. The correct conclusion is not &ldquo;momentum is
              broken&rdquo;, it is &ldquo;on this asset, over this window,
              momentum reverses&rdquo;.
            </p>
            <p>
              Now change the horizon to 63 days. The IC strengthens. That tells
              you the reversal is a slow effect, not a one-week bounce.
            </p>
          </Section>

          <Section n="08" title="How to not fool yourself">
            <p>
              If you try enough combinations of ticker, factor and window, you
              will find something that looks brilliant. That is arithmetic, not
              skill. Three habits guard against it:
            </p>
            <ul className="ml-4 list-disc space-y-1.5 marker:text-amber">
              <li>
                Decide what you are testing before you test it, rather than
                hunting for the best-looking number.
              </li>
              <li>
                Prefer results that hold across neighbouring parameters. If 126
                days works and 120 and 130 do not, you found noise.
              </li>
              <li>
                Check the same factor on several tickers. An effect that only
                exists on one stock usually does not exist.
              </li>
            </ul>
          </Section>
        </div>

        <Panel className="mt-10">
          <PanelHead title="Ticker format" />
          <div className="p-4">
            <p className="prose-face text-[12px] leading-relaxed text-muted">
              The search box takes any symbol Yahoo Finance carries. Most US
              stocks are plain tickers. Others need a suffix:
            </p>
            <div className="tnum mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-3">
              {[
                ["AAPL", "US equity"],
                ["BRK-B", "share class"],
                ["BTC-USD", "crypto"],
                ["^GSPC", "index"],
                ["VOD.L", "London"],
                ["EURUSD=X", "FX"],
              ].map(([sym, what]) => (
                <div key={sym} className="flex items-baseline gap-2">
                  <span className="text-amber">{sym}</span>
                  <span className="text-[11px] text-dim">{what}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <Button variant="primary" asChild>
            <Link href="/dashboard">
              Open the terminal
              <ArrowRight />
            </Link>
          </Button>
          <span className="prose-face text-[12px] text-dim">
            Start with the worked example above.
          </span>
        </div>

        <p className="prose-face mt-8 text-[11px] leading-relaxed text-faint">
          Educational research tool. Hypothetical results exclude costs and
          slippage, and past behaviour does not predict future returns. Nothing
          here is investment advice.
        </p>
      </div>
    </AppShell>
  );
}
