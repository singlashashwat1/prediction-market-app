import WebSocket from "ws";
import { DFLOW_WS_URL } from "@/config/markets";
import { OrderBookLevel } from "@/lib/types";

/**
 * Connects to DFlow's public WebSocket to stream Kalshi order book data.
 * Data format: { yes_bids: { "0.22": 13353, ... }, no_bids: { "0.78": 13353, ... } }
 * YES bids -> our bids; NO bids -> our asks (ask_price = 1 - no_bid_price).
 */
export class KalshiClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isDestroyed = false;

  private yesBids: Map<number, number> = new Map();
  private noBids: Map<number, number> = new Map();

  constructor(
    private marketTicker: string,
    private onUpdate: (bids: OrderBookLevel[], asks: OrderBookLevel[]) => void,
    private onStatusChange: (
      status: "connected" | "disconnected" | "connecting",
    ) => void,
  ) {}

  connect(): void {
    if (this.isDestroyed) return;
    this.onStatusChange("connecting");

    try {
      this.ws = new WebSocket(DFLOW_WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      this.reconnectDelay = 1000;
      this.onStatusChange("connected");

      this.ws?.send(
        JSON.stringify({
          type: "subscribe",
          channel: "orderbook",
          tickers: [this.marketTicker],
        }),
      );
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.channel !== "orderbook") return;
        if (msg.market_ticker !== this.marketTicker) return;

        this.handleOrderBook(msg);
      } catch {
        // ignore non-JSON
      }
    });

    this.ws.on("close", () => {
      this.onStatusChange("disconnected");
      this.scheduleReconnect();
    });

    this.ws.on("error", () => {
      this.ws?.close();
    });
  }

  private handleOrderBook(msg: {
    yes_bids?: Record<string, number>;
    no_bids?: Record<string, number>;
  }): void {
    this.yesBids.clear();
    this.noBids.clear();

    if (msg.yes_bids) {
      for (const [priceStr, qty] of Object.entries(msg.yes_bids)) {
        const price = parseFloat(priceStr);
        if (qty > 0) this.yesBids.set(price, qty);
      }
    }

    if (msg.no_bids) {
      for (const [priceStr, qty] of Object.entries(msg.no_bids)) {
        const price = parseFloat(priceStr);
        if (qty > 0) this.noBids.set(price, qty);
      }
    }

    this.emitUpdate();
  }

  private emitUpdate(): void {
    const bids: OrderBookLevel[] = Array.from(this.yesBids.entries())
      .map(([price, size]) => ({ price, size, venue: "kalshi" as const }))
      .sort((a, b) => b.price - a.price);

    const asks: OrderBookLevel[] = Array.from(this.noBids.entries())
      .map(([noBidPrice, size]) => ({
        price: parseFloat((1 - noBidPrice).toFixed(4)),
        size,
        venue: "kalshi" as const,
      }))
      .sort((a, b) => a.price - b.price);

    this.onUpdate(bids, asks);
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed) return;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay,
    );
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }
}
