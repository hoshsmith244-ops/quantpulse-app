import { getSeries } from "./market-data";
import { buildSignals } from "./strategies";
import type {
  BacktestConfig,
  BacktestResult,
  Bar,
  EquityPoint,
  Metrics,
  Trade,
} from "./types";

/** Cost applied on entry and on exit, 5 bps a side. */
const FEE_BPS = 5;
const TRADING_DAYS_PER_YEAR = 252;
/** Bars to wait before re-entering after a stop or target fires. */
const RISK_EXIT_COOLDOWN = 5;

export function runBacktest(config: BacktestConfig): BacktestResult {
  const bars = getSeries(config.symbol);
  const signals = buildSignals(bars, config.strategy, config.lookback);

  const { initialCapital, stopLossPct, takeProfitPct } = config;
  const stop = stopLossPct > 0 ? stopLossPct / 100 : null;
  const target = takeProfitPct > 0 ? takeProfitPct / 100 : null;

  let cash = initialCapital;
  let qty = 0;
  let entryPrice = 0;
  let entryIndex = -1;
  let tradeId = 0;
  /** bar index before which re-entry is suppressed after a risk exit */
  let cooldownUntil = -1;

  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  let peak = initialCapital;
  let barsInMarket = 0;

  const benchShares = initialCapital / bars[0].close;

  const closeAt = (
    bar: Bar,
    price: number,
    index: number,
    reason: Trade["exitReason"],
  ) => {
    const gross = qty * price;
    const fee = gross * (FEE_BPS / 10_000);
    cash += gross - fee;

    const entryNotional = qty * entryPrice;
    const pnl = gross - fee - entryNotional;
    trades.push({
      id: ++tradeId,
      entryDate: bars[entryIndex].date,
      exitDate: bar.date,
      side: "BUY",
      entryPrice,
      exitPrice: price,
      qty,
      notional: entryNotional,
      pnl,
      pnlPct: (pnl / entryNotional) * 100,
      exitReason: reason,
      status: "FILLED",
      barsHeld: index - entryIndex,
    });
    qty = 0;
    entryPrice = 0;
    entryIndex = -1;
  };

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const want = signals[i];

    if (qty > 0) {
      barsInMarket++;

      // Risk exits are checked against the bar range and take priority.
      const stopPrice = stop ? entryPrice * (1 - stop) : null;
      const targetPrice = target ? entryPrice * (1 + target) : null;

      if (stopPrice !== null && bar.low <= stopPrice) {
        closeAt(bar, stopPrice, i, "STOP_LOSS");
        cooldownUntil = i + RISK_EXIT_COOLDOWN;
      } else if (targetPrice !== null && bar.high >= targetPrice) {
        closeAt(bar, targetPrice, i, "TAKE_PROFIT");
        cooldownUntil = i + RISK_EXIT_COOLDOWN;
      } else if (want === 0) {
        closeAt(bar, bar.close, i, "SIGNAL");
      }
    }

    if (qty === 0 && want === 1 && i >= cooldownUntil && cash > 0) {
      const fee = cash * (FEE_BPS / 10_000);
      qty = (cash - fee) / bar.close;
      entryPrice = bar.close;
      entryIndex = i;
      cash = 0;
    }

    const mark = cash + qty * bar.close;
    peak = Math.max(peak, mark);

    equity.push({
      date: bar.date,
      equity: mark,
      benchmark: benchShares * bar.close,
      drawdown: ((mark - peak) / peak) * 100,
    });
  }

  // Surface a still-open position in the trade log.
  if (qty > 0) {
    const last = bars[bars.length - 1];
    const entryNotional = qty * entryPrice;
    const gross = qty * last.close;
    trades.push({
      id: ++tradeId,
      entryDate: bars[entryIndex].date,
      exitDate: null,
      side: "BUY",
      entryPrice,
      exitPrice: null,
      qty,
      notional: entryNotional,
      pnl: gross - entryNotional,
      pnlPct: ((gross - entryNotional) / entryNotional) * 100,
      exitReason: "OPEN",
      status: "PENDING",
      barsHeld: bars.length - 1 - entryIndex,
    });
  }

  const metrics = computeMetrics(
    equity,
    trades,
    initialCapital,
    barsInMarket,
    bars.length,
  );

  return { equity, trades: trades.reverse(), metrics };
}

function computeMetrics(
  equity: EquityPoint[],
  trades: Trade[],
  initialCapital: number,
  barsInMarket: number,
  totalBars: number,
): Metrics {
  const last = equity[equity.length - 1];
  const finalEquity = last?.equity ?? initialCapital;
  const years = totalBars / TRADING_DAYS_PER_YEAR;

  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const prev = equity[i - 1].equity;
    if (prev > 0) rets.push(equity[i].equity / prev - 1);
  }

  const mean = rets.length
    ? rets.reduce((a, b) => a + b, 0) / rets.length
    : 0;
  const variance =
    rets.length > 1
      ? rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1)
      : 0;
  const sd = Math.sqrt(variance);

  const downside = rets.filter((r) => r < 0);
  const downsideSd =
    downside.length > 1
      ? Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / downside.length)
      : 0;

  const annFactor = Math.sqrt(TRADING_DAYS_PER_YEAR);
  const sharpe = sd > 0 ? (mean / sd) * annFactor : 0;
  const sortino = downsideSd > 0 ? (mean / downsideSd) * annFactor : 0;

  const maxDrawdown = equity.reduce((min, p) => Math.min(min, p.drawdown), 0);

  const closed = trades.filter((t) => t.exitDate !== null);
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl <= 0);
  const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));

  const benchFinal = last?.benchmark ?? initialCapital;

  return {
    totalReturnPct: (finalEquity / initialCapital - 1) * 100,
    benchmarkReturnPct: (benchFinal / initialCapital - 1) * 100,
    cagr:
      years > 0 ? ((finalEquity / initialCapital) ** (1 / years) - 1) * 100 : 0,
    benchmarkCagr:
      years > 0 ? ((benchFinal / initialCapital) ** (1 / years) - 1) * 100 : 0,
    sharpe,
    sortino,
    maxDrawdown,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    profitFactor:
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0,
    totalTrades: closed.length,
    avgTradePct: closed.length
      ? closed.reduce((a, t) => a + t.pnlPct, 0) / closed.length
      : 0,
    exposurePct: totalBars ? (barsInMarket / totalBars) * 100 : 0,
    finalEquity,
    volatility: sd * annFactor * 100,
  };
}

/** Downsample a series for charting without losing its shape. */
export function thin<T>(rows: T[], maxPoints = 260): T[] {
  if (rows.length <= maxPoints) return rows;
  const step = rows.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(rows[Math.floor(i * step)]);
  const lastRow = rows[rows.length - 1];
  if (out[out.length - 1] !== lastRow) out.push(lastRow);
  return out;
}
