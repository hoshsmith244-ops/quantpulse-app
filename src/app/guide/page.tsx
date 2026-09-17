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

          <Section n="09" title="The screener, and why it needs extra care">
            <p>
              The{" "}
              <Link href="/screener" className="text-amber hover:underline">
                screener
              </Link>{" "}
              runs every strategy against every ticker so you can see where an
              edge might exist instead of guessing which symbol to type. It is
              the fastest way to find a candidate — and the fastest way to fool
              yourself, because it does the exact thing section 08 warns about,
              a thousand times over.
            </p>
            <p>
              Trying a thousand combinations means some will look excellent
              purely by luck. Around one in twenty clears the significance bar
              by chance, so a scan that size produces roughly fifty convincing
              results from nothing at all. The screen shows that expected number
              next to the real one, on purpose. If they are close, the list is
              mostly noise.
            </p>
            <p>Two defences are built in, and both are on by default:</p>
            <ul className="ml-4 list-disc space-y-1.5 marker:text-amber">
              <li>
                <Term>The stress test.</Term> A result only shows if it still
                beats buying and holding when trading costs are raised from 10
                to 25 basis points, and when the strategy&apos;s setting is
                moved 20% either way. An edge that exists at one cost and one
                setting is the signature of a curve fit.
              </li>
              <li>
                <Term>The out-of-sample column.</Term> What that same setting
                did on the most recent 40% of history, next to what holding did
                over the same stretch. If the strategy wins the headline column and
                loses this one, believe this one.
              </li>
            </ul>
            <p>
              Company filters — sector, industry, market cap, P/E, dividend,
              profitability, revenue growth — narrow{" "}
              <em>which names you look at</em>. They are today&apos;s figures and
              are never fed into the backtest: today&apos;s P/E did not exist
              three years ago, so scoring a three-year simulation with it would
              be the plainest kind of cheating. Use them to search a corner of
              the market you understand, not to explain a result.
            </p>
            <p>
              <Term>Liquidity deserves more attention than any of them.</Term>{" "}
              Every result on this site charges a flat 10 basis points a round
              trip, which is a fair assumption for a stock that trades heavily
              and a fantasy for one that does not. On a name turning over less
              than roughly $10M a day the real spread is wider than the cost
              being modelled, so the edge on screen is partly an accounting
              fiction. The screener shows daily dollar volume and turns it amber
              when it is thin — treat those rows as ideas to investigate, never
              as results.
            </p>
            <p>
              A last warning that the numbers will not give you. Most of what
              survives a scan in a given period survives for the{" "}
              <em>same reason</em> — a trend filter that sat out a falling
              market, say. Add six of them and you do not have six ideas, you
              have one idea six times, and they will fail together.
            </p>
          </Section>

          <Section n="10" title="When to actually place the trade">
            <p>
              Every strategy here reads the daily <Term>closing price</Term>.
              That creates a timing problem most tools quietly ignore: by the
              time the close exists, that price is gone. The backtest fills at
              the close of the signal day, so a signal you read the next morning
              is not the trade it measured.
            </p>
            <p>
              The way this is traded in practice is to decide shortly before the
              bell, using the current price as a stand-in for the close, and
              send a <Term>market-on-close</Term> order — an order that fills at
              the official closing price, whatever it turns out to be. That is
              the same price every figure on the terminal is measured against.
            </p>
            <p>
              Which leaves a narrow window, and both edges of it matter:
            </p>
            <ul className="ml-4 list-disc space-y-1.5 marker:text-amber">
              <li>
                <Term>Twenty minutes before the close</Term> the window opens
                and the app will alert you. Earlier than that, a provisional
                reading is a guess about hours of trading still to come — the
                terminal will show it, but greyed out and labelled too early,
                and no alert is sent. That restraint is the point.
              </li>
              <li>
                <Term>Ten minutes before the close</Term> the exchange stops
                accepting new on-close orders. After that the app stops
                advising one, because it would be advising a trade that cannot
                be placed.
              </li>
              <li>
                <Term>If it changes its mind</Term>, you get a stand-down. A
                price that moves back inside the window can un-trigger the rule,
                and an alert that never gets withdrawn is worse than no alert —
                it walks you into a trade the strategy does not want.
              </li>
            </ul>
            <p>
              These come from each venue&apos;s own calendar, so a New York
              close puts the window at 3:40–3:50pm, London&apos;s at
              4:10–4:20pm, and a half-day holiday shifts it automatically.
              Crypto never closes, so none of it applies — the daily bar simply
              rolls over at midnight UTC and there is no bell to trade into.
            </p>
            <p>
              Two practical caveats. Your <em>broker</em> may stop accepting
              on-close orders earlier than the exchange does, and plenty of
              retail brokers do not offer them at all — check before you rely on
              the last minute. And if you buy at tomorrow&apos;s open instead,
              that is a legitimate choice but it is a{" "}
              <em>different trade</em> than the one measured: an overnight gap
              can move the price before you are filled, and nothing on these
              pages accounts for that.
            </p>
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
