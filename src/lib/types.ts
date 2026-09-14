export type Bar = {
  /** ISO date, YYYY-MM-DD */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type StrategyId = "dma" | "rsi" | "breakout";

export type Side = "BUY" | "SELL";

export type ExecutionStatus = "FILLED" | "PARTIAL" | "PENDING" | "REJECTED";

export type Trade = {
  id: number;
  entryDate: string;
  exitDate: string | null;
  side: Side;
  entryPrice: number;
  exitPrice: number | null;
  /** number of shares/units */
  qty: number;
  /** notional at entry */
  notional: number;
  pnl: number;
  pnlPct: number;
  /** why the position closed */
  exitReason: "SIGNAL" | "STOP_LOSS" | "TAKE_PROFIT" | "OPEN";
  status: ExecutionStatus;
  barsHeld: number;
};

export type EquityPoint = {
  date: string;
  /** strategy equity in dollars */
  equity: number;
  /** buy & hold benchmark equity in dollars */
  benchmark: number;
  /** strategy drawdown as a negative percentage */
  drawdown: number;
};

export type Metrics = {
  totalReturnPct: number;
  benchmarkReturnPct: number;
  cagr: number;
  benchmarkCagr: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgTradePct: number;
  exposurePct: number;
  finalEquity: number;
  volatility: number;
};

export type BacktestResult = {
  equity: EquityPoint[];
  trades: Trade[];
  metrics: Metrics;
};

export type BacktestConfig = {
  symbol: string;
  strategy: StrategyId;
  lookback: number;
  initialCapital: number;
  /** percent, e.g. 5 means a 5% stop */
  stopLossPct: number;
  /** percent, e.g. 12 means a 12% target */
  takeProfitPct: number;
};
