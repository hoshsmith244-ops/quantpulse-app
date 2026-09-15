import { CheckCircle2, MinusCircle } from "lucide-react";

import { Panel, PanelHead, Tag } from "@/components/ui/terminal";
import { analyse, getFactor, verdict } from "@/lib/alpha";
import { fmtPct } from "@/lib/format";
import { fetchHistory } from "@/lib/market";
import { cn } from "@/lib/utils";

/**
 * The hero panel, computed live on the server from the same engine the
 * terminal uses. Hard-coding a result here would quietly rot: prices move
 * every day, and a frozen "+1.2% so far" becomes a false claim within a week.
 *
 * Rendered with ISR (see `revalidate` on the page), so this costs one Yahoo
 * call an hour no matter how much traffic the landing page gets.
 */

const SAMPLE_SYMBOL = "AAPL";
const SAMPLE_FACTOR = "momentum" as const;

const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export async function LiveSample() {
  const factor = getFactor(SAMPLE_FACTOR);

  let data: Awaited<ReturnType<typeof fetchHistory>> | null = null;
  try {
    data = await fetchHistory(SAMPLE_SYMBOL, 3);
  } catch {
    // Yahoo unreachable at build or revalidate time. The landing page must
    // still render, so fall back to describing the tool rather than inventing
    // numbers that were never true.
    return <SampleUnavailable />;
  }

  const result = analyse(data.bars, factor.id, factor.def, 5);
  const v = verdict(result);
  const { signal, record } = result;
  const inPosition = signal.state === "in";
  const asOf = data.bars[data.bars.length - 1].date;

  return (
    <Panel>
      <PanelHead
        title={`${SAMPLE_SYMBOL} · ${factor.name.toLowerCase()} strategy`}
        right={
          <Tag tone="amber">
            <span className="size-1 bg-amber blink" />
            live
          </Tag>
        }
      />

      <div className="px-4 py-4">
        <span className="label">The strategy says</span>
        <div className="mt-2 flex items-center gap-2.5">
          {inPosition ? (
            <CheckCircle2 className="size-6 shrink-0 text-up" />
          ) : (
            <MinusCircle className="size-6 shrink-0 text-dim" />
          )}
          <span
            className={cn(
              "text-[26px] leading-none",
              inPosition ? "text-up" : "text-muted",
            )}
          >
            {inPosition ? "HOLD" : "STAY OUT"}
          </span>
        </div>

        <p className="prose-face mt-3 text-[12px] leading-relaxed text-text">
          {inPosition ? (
            <>
              Bought <span className="text-bright">{SAMPLE_SYMBOL}</span> on{" "}
              <span className="text-bright">
                {prettyDate(signal.entryDate ?? asOf)}
              </span>{" "}
              at{" "}
              <span className="tnum text-bright">
                {signal.entryPrice?.toFixed(2)}
              </span>
              , still holding.
              {signal.openReturnPct !== null ? (
                <>
                  {" "}
                  That position is{" "}
                  <span
                    className={
                      signal.openReturnPct >= 0 ? "text-up" : "text-down"
                    }
                  >
                    {fmtPct(signal.openReturnPct, 1)}
                  </span>{" "}
                  so far.
                </>
              ) : null}
            </>
          ) : (
            <>
              Not holding <span className="text-bright">{SAMPLE_SYMBOL}</span>{" "}
              right now — the conditions for entering are not met
              {signal.proximityPct !== null ? (
                <>
                  , and the signal sits{" "}
                  <span className="tnum text-amber">
                    {signal.proximityPct.toFixed(0)}%
                  </span>{" "}
                  of the way to a buy
                </>
              ) : null}
              .
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
        <Stat
          label="Win rate"
          value={record.completed ? `${record.winRatePct.toFixed(0)}%` : "—"}
          tone="text-bright"
        />
        <Stat
          label="Average win"
          value={record.completed ? fmtPct(record.avgWinPct, 1) : "—"}
          tone="text-up"
        />
        <Stat
          label="Average loss"
          value={record.completed ? fmtPct(record.avgLossPct, 1) : "—"}
          tone="text-down"
        />
        <Stat
          label="Typical hold"
          value={
            record.completed ? `${record.avgHoldDays.toFixed(0)} days` : "—"
          }
          tone="text-bright"
        />
      </div>

      <p className="prose-face border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-dim">
        Live reading as of{" "}
        <span className="tnum text-muted">{prettyDate(asOf)}</span>. The tool
        also gives you its verdict on the strategy itself —{" "}
        {/* The headline already refers to "this stock", so it is not repeated. */}
        <span
          className={
            v.tone === "up"
              ? "text-up"
              : v.tone === "amber"
                ? "text-amber"
                : "text-muted"
          }
        >
          {v.headline.toLowerCase()}
        </span>{" "}
        — which is more useful than a chart that only goes up.
      </p>
    </Panel>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="bg-panel px-3 py-2.5">
      <span className="label block truncate">{label}</span>
      <span className={cn("tnum mt-1 block text-[15px]", tone)}>{value}</span>
    </div>
  );
}

/** Shown when the market data provider cannot be reached. */
function SampleUnavailable() {
  return (
    <Panel>
      <PanelHead title="What you get" />
      <div className="px-4 py-4">
        <p className="prose-face text-[13px] leading-relaxed text-text">
          For any stock you type in, QuantPulse tells you whether the strategy
          would be holding it right now, when it would have bought, how every
          past trade turned out, and whether there is real evidence the strategy
          works on that stock at all.
        </p>
        <p className="prose-face mt-3 text-[11px] leading-relaxed text-dim">
          The live sample is unavailable at the moment — the market data
          provider is not responding. The terminal itself will tell you the same
          thing if you open it.
        </p>
      </div>
    </Panel>
  );
}
