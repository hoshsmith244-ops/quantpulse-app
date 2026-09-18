/**
 * The text of a pre-close alert email.
 *
 * Imports NOTHING. Every value it needs — the strategy's display name, the
 * window constants — arrives as an argument, so it is a pure formatter that
 * scripts/check-alert-email.mts can drive directly under Node's type
 * stripping, with no module-resolution tricks.
 *
 * Worth that discipline because this message is the entire product of the
 * alert feature: it lands on a phone, is read in a hurry, and is acted on with
 * real money. Getting a word wrong here costs more than a bug in most of the
 * app.
 *
 * The rule that matters: A STAND-DOWN ALWAYS LEADS, in the subject and in the
 * body. It is the time-critical message, because the reader may be part-way
 * through placing the very trade it withdraws. Buried under a list of buys, it
 * would be missed.
 */

export type AlertLine = {
  symbol: string;
  /** Display name of the strategy, e.g. "Distance from trend". */
  strategy: string;
  dir: "in" | "out";
  price: number;
  /** "SYMBOL:factor" — used for dedup, not shown to the reader. */
  entryKey: string;
};

export type ComposedAlert = {
  subject: string;
  text: string;
  html: string;
};

const verb = (d: "in" | "out") => (d === "in" ? "BUY" : "SELL");

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string,
  );

export function composeAlert(args: {
  acts: AlertLine[];
  standDowns: AlertLine[];
  /** Minutes until on-close orders stop being accepted. */
  minutesToCutoff: number;
  /** Venue clock time of that cutoff, e.g. "3:50 PM". */
  cutoffAt: string;
  leadMinutes: number;
  cutoffMinutes: number;
}): ComposedAlert {
  const { acts, standDowns, minutesToCutoff, cutoffAt, leadMinutes, cutoffMinutes } = args;

  const subject = standDowns.length
    ? `Stand down — ${standDowns.map((s) => s.symbol).join(", ")}`
    : `${verb(acts[0].dir)} at the close — ${acts.map((a) => a.symbol).join(", ")}`;

  const lines: string[] = [];

  if (standDowns.length) {
    lines.push("STAND DOWN — these no longer trigger:");
    for (const s of standDowns) {
      lines.push(`  ${s.symbol} (${s.strategy}) — now ${s.price.toFixed(2)}.`);
      lines.push("  Do not place the order, or cancel it if you already did.");
    }
    lines.push("");
  }

  if (acts.length) {
    const mins =
      minutesToCutoff < 1
        ? "Under a minute"
        : `${minutesToCutoff} minute${minutesToCutoff === 1 ? "" : "s"}`;
    lines.push(`${mins} left to send a market-on-close order (cutoff ${cutoffAt}):`);
    for (const a of acts) {
      lines.push(
        `  ${verb(a.dir)} ${a.symbol} — ${a.strategy} would ${a.dir === "in" ? "enter" : "exit"} if today closed near ${a.price.toFixed(2)}.`,
      );
    }
    lines.push("");
    lines.push("Provisional: a move in the final minutes can change it, and you will");
    lines.push("get a stand-down here if it does.");
  }

  lines.push("");
  lines.push(
    `The window opens ${leadMinutes} minutes before the bell; on-close orders stop ${cutoffMinutes} minutes before it.`,
  );
  lines.push("Research tool — not investment advice.");

  const text = lines.join("\n");
  const html = `<pre style="font:13px ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`;

  return { subject, text, html };
}
