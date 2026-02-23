import WebSocket from "ws";
import { KALSHI_WS_URL, KALSHI_REST_BASE } from "@/config/markets";
import { createKalshiAuthHeaders } from "./kalshiAuth";
import { OrderBookLevel } from "@/lib/types";

/**
 * Kalshi order book uses only bids for YES and NO sides.
 * YES bids are bids. NO bids become asks: ask_price = 1 - no_bid_price.
 * Prices come in dollars (e.g., "0.2200") or cents (22).
 * We normalize everything to 0-1 decimals.
 */
export class KalshiClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isDestroyed = false;
  private messageId = 1;
  private useWebSocket: boolean;

  private yesBids: Map<number, number> = new Map();
  private noBids: Map<number, number> = new Map();

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private marketTicker: string,
    private onUpdate: (bids: OrderBookLevel[], asks: OrderBookLevel[]) => void,
    private onStatusChange: (
      status: "connected" | "disconnected" | "connecting",
    ) => void,
  ) {
    this.useWebSocket = !!(
      process.env.KALSHI_API_KEY_ID && process.env.KALSHI_PRIVATE_KEY
    );
  }

  connect(): void {
    if (this.isDestroyed) return;

    if (this.useWebSocket) {
      this.connectWebSocket();
    } else {
      this.startPolling();
    }
  }

  private connectWebSocket(): void {
    this.onStatusChange("connecting");

    let headers: Record<string, string>;
    try {
      headers = createKalshiAuthHeaders();
    } catch {
      console.error("[Kalshi] Auth failed, falling back to REST polling");
      this.useWebSocket = false;
      this.startPolling();
      return;
    }

    try {
      this.ws = new WebSocket(KALSHI_WS_URL, { headers });
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      this.reconnectDelay = 1000;
      this.onStatusChange("connected");

      const subscribeMsg = JSON.stringify({
        id: this.messageId++,
        cmd: "subscribe",
        params: {
          channels: ["orderbook_delta"],
          market_ticker: this.marketTicker,
        },
      });
      this.ws?.send(subscribeMsg);
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleWsMessage(msg);
      } catch {
        // ignore
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

  private handleWsMessage(msg: {
    type?: string;
    msg?: Record<string, unknown>;
  }): void {
    if (msg.type === "orderbook_snapshot") {
      this.handleSnapshot(msg.msg as Record<string, unknown>);
    } else if (msg.type === "orderbook_delta") {
      this.handleDelta(msg.msg as Record<string, unknown>);
    }
  }

  private handleSnapshot(data: Record<string, unknown>): void {
    this.yesBids.clear();
    this.noBids.clear();

    const yes = data.yes as [number, number][] | undefined;
    const no = data.no as [number, number][] | undefined;

    if (yes) {
      for (const [priceCents, qty] of yes) {
        this.yesBids.set(priceCents / 100, qty);
      }
    }

    if (no) {
      for (const [priceCents, qty] of no) {
        this.noBids.set(priceCents / 100, qty);
      }
    }

    this.emitUpdate();
  }

  private handleDelta(data: Record<string, unknown>): void {
    const price = data.price as number;
    const delta = data.delta as number;
    const side = data.side as string;

    const normalizedPrice = price > 1 ? price / 100 : price;
    const book = side === "yes" ? this.yesBids : this.noBids;

    const current = book.get(normalizedPrice) || 0;
    const newQty = current + delta;

    if (newQty <= 0) {
      book.delete(normalizedPrice);
    } else {
      book.set(normalizedPrice, newQty);
    }

    this.emitUpdate();
  }

  private startPolling(): void {
    this.onStatusChange("connecting");
    this.fetchOrderBook();

    this.pollInterval = setInterval(() => {
      this.fetchOrderBook();
    }, 2000);
  }

  private async fetchOrderBook(): Promise<void> {
    try {
      const url = `${KALSHI_REST_BASE}/markets/${this.marketTicker}/orderbook`;
      const res = await fetch(url);

      if (!res.ok) {
        this.onStatusChange("disconnected");
        return;
      }

      const data = await res.json();
      this.onStatusChange("connected");

      this.yesBids.clear();
      this.noBids.clear();

      const ob = data.orderbook;
      if (ob?.yes) {
        for (const [priceCents, qty] of ob.yes as [number, number][]) {
          this.yesBids.set(priceCents / 100, qty);
        }
      }
      if (ob?.no) {
        for (const [priceCents, qty] of ob.no as [number, number][]) {
          this.noBids.set(priceCents / 100, qty);
        }
      }

      this.emitUpdate();
    } catch {
      this.onStatusChange("disconnected");
    }
  }

  /**
   * Convert Kalshi's bid-only format to standard bids/asks.
   * YES bids -> our bids (someone wants to buy YES at this price)
   * NO bids -> our asks (a NO bid at X cents = YES ask at (1 - X) dollars)
   */
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
      this.connectWebSocket();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay,
    );
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
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
