import WebSocket from "ws";
import { POLYMARKET_WS_URL } from "@/config/markets";
import { OrderBookLevel } from "@/lib/types";

interface PolymarketBookEvent {
  event_type: "book";
  asset_id: string;
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
  timestamp: string;
}

interface PolymarketPriceChangeEvent {
  event_type: "price_change";
  price_changes: {
    asset_id: string;
    price: string;
    size: string;
    side: "BUY" | "SELL";
  }[];
  timestamp: string;
}

type PolymarketEvent = PolymarketBookEvent | PolymarketPriceChangeEvent;

export class PolymarketClient {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isDestroyed = false;

  private bids: Map<number, number> = new Map();
  private asks: Map<number, number> = new Map();

  constructor(
    private yesTokenId: string,
    private noTokenId: string,
    private onUpdate: (bids: OrderBookLevel[], asks: OrderBookLevel[]) => void,
    private onStatusChange: (status: "connected" | "disconnected" | "connecting") => void,
  ) {}

  connect(): void {
    if (this.isDestroyed) return;
    this.onStatusChange("connecting");

    try {
      this.ws = new WebSocket(POLYMARKET_WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      this.reconnectDelay = 1000;
      this.onStatusChange("connected");

      this.sendSubscribe();

      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send("PING");
        }
      }, 10000);

      // Re-subscribe every 30s to force a fresh book snapshot
      this.refreshInterval = setInterval(() => {
        this.sendSubscribe();
      }, 30000);
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      const raw = data.toString();
      if (raw === "PONG") {
        // Re-emit current book so lastUpdated stays fresh while connected
        this.emitUpdate();
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        // Polymarket wraps messages in arrays
        const events: PolymarketEvent[] = Array.isArray(parsed)
          ? parsed
          : [parsed];
        for (const event of events) {
          this.handleEvent(event);
        }
      } catch {
        // ignore non-JSON messages
      }
    });

    this.ws.on("close", () => {
      this.cleanup();
      this.onStatusChange("disconnected");
      this.scheduleReconnect();
    });

    this.ws.on("error", () => {
      this.ws?.close();
    });
  }

  private sendSubscribe(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        assets_ids: [this.yesTokenId],
        type: "market",
      })
    );
  }

  private handleEvent(event: PolymarketEvent): void {
    // event_type may be explicit or inferred from structure
    const raw = event as unknown as Record<string, unknown>;
    if (
      event.event_type === "book" ||
      ("bids" in raw && "asks" in raw && !("price_changes" in raw))
    ) {
      this.handleBookSnapshot(event as PolymarketBookEvent);
    } else if (
      event.event_type === "price_change" ||
      "price_changes" in raw
    ) {
      this.handlePriceChange(event as PolymarketPriceChangeEvent);
    }
  }

  private handleBookSnapshot(event: PolymarketBookEvent): void {
    if (event.asset_id !== this.yesTokenId) return;

    this.bids.clear();
    this.asks.clear();

    for (const level of event.bids) {
      const price = parseFloat(level.price);
      const size = parseFloat(level.size);
      if (size > 0) this.bids.set(price, size);
    }

    for (const level of event.asks) {
      const price = parseFloat(level.price);
      const size = parseFloat(level.size);
      if (size > 0) this.asks.set(price, size);
    }

    this.emitUpdate();
  }

  private handlePriceChange(event: PolymarketPriceChangeEvent): void {
    for (const change of event.price_changes) {
      if (change.asset_id !== this.yesTokenId) continue;

      const price = parseFloat(change.price);
      const size = parseFloat(change.size);
      const book = change.side === "BUY" ? this.bids : this.asks;

      if (size === 0) {
        book.delete(price);
      } else {
        book.set(price, size);
      }
    }

    this.emitUpdate();
  }

  private emitUpdate(): void {
    const bids: OrderBookLevel[] = Array.from(this.bids.entries())
      .map(([price, size]) => ({ price, size, venue: "polymarket" as const }))
      .sort((a, b) => b.price - a.price);

    const asks: OrderBookLevel[] = Array.from(this.asks.entries())
      .map(([price, size]) => ({ price, size, venue: "polymarket" as const }))
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
      this.maxReconnectDelay
    );
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
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
