export type FeedLevel = "info" | "success" | "warn" | "error";

export type FeedEvent = {
  id: string;
  /** epoch ms */
  ts: number;
  level: FeedLevel;
  symbol: string;
  action: "BUY" | "SELL" | "CLOSE";
  qty: number;
  price: number;
  /** milliseconds end-to-end */
  latency: number;
  status: number;
  broker: "Alpaca" | "IBKR" | "Paper";
  message: string;
  orderId: string;
};

const SYMBOLS = ["SPY", "QQQ", "AAPL", "NVDA", "BTC/USD", "ETH/USD"] as const;
const BROKERS = ["Alpaca", "IBKR", "Paper"] as const;

const REF_PRICE: Record<string, number> = {
  SPY: 514.2,
  QQQ: 428.6,
  AAPL: 214.1,
  NVDA: 134.0,
  "BTC/USD": 52_140,
  "ETH/USD": 2_712,
};

let counter = 0;

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function orderId() {
  const hex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
  return `ord_${hex}${(counter % 1000).toString().padStart(3, "0")}`;
}

/**
 * Synthesises a plausible inbound webhook event. ~86% clean fills, the rest a
 * mix of the failures a real endpoint actually sees.
 */
export function makeEvent(now = Date.now()): FeedEvent {
  counter++;
  const symbol = pick(SYMBOLS);
  const action = pick(["BUY", "SELL", "CLOSE"] as const);
  const broker = pick(BROKERS);
  const base = REF_PRICE[symbol];
  const price = base * (1 + (Math.random() - 0.5) * 0.02);
  const qty =
    symbol.includes("/")
      ? Math.round(Math.random() * 40 + 2) / 100
      : Math.round(Math.random() * 180 + 5);

  const roll = Math.random();

  if (roll > 0.94) {
    return {
      id: `${now}-${counter}`,
      ts: now,
      level: "error",
      symbol,
      action,
      qty,
      price,
      latency: Math.round(180 + Math.random() * 900),
      status: 401,
      broker,
      message: "signature mismatch — HMAC digest rejected",
      orderId: orderId(),
    };
  }

  if (roll > 0.9) {
    return {
      id: `${now}-${counter}`,
      ts: now,
      level: "warn",
      symbol,
      action,
      qty,
      price,
      latency: Math.round(40 + Math.random() * 120),
      status: 409,
      broker,
      message: "duplicate alert id — idempotency key already processed",
      orderId: orderId(),
    };
  }

  if (roll > 0.86) {
    return {
      id: `${now}-${counter}`,
      ts: now,
      level: "warn",
      symbol,
      action,
      qty,
      price,
      latency: Math.round(20 + Math.random() * 60),
      status: 202,
      broker,
      message: "queued — outside regular trading hours",
      orderId: orderId(),
    };
  }

  return {
    id: `${now}-${counter}`,
    ts: now,
    level: "success",
    symbol,
    action,
    qty,
    price,
    latency: Math.round(9 + Math.random() * 26),
    status: 200,
    broker,
    message: "filled",
    orderId: orderId(),
  };
}

/** Deterministic-ish seed batch so the feed is never empty on first paint. */
export function seedEvents(count = 14, now = Date.now()): FeedEvent[] {
  const out: FeedEvent[] = [];
  for (let i = count; i > 0; i--) {
    out.push(makeEvent(now - i * (1800 + Math.random() * 5200)));
  }
  return out.reverse();
}

export const WEBHOOK_KEY = "wh_live_8f2c41d9a6b3e057";
export const ENDPOINT = `https://api.quantpulse.io/v1/webhook/${WEBHOOK_KEY}`;

export const SAMPLE_PAYLOAD = {
  key: WEBHOOK_KEY,
  symbol: "{{ticker}}",
  action: "{{strategy.order.action}}",
  qty: "{{strategy.order.contracts}}",
  price: "{{close}}",
  order_type: "market",
  time_in_force: "gtc",
  alert_id: "{{timenow}}",
};

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
