import { PolymarketClient } from "./polymarketClient";
import { KalshiClient } from "./kalshiClient";
import { aggregateOrderBook } from "@/lib/aggregator";
import {
  OrderBookLevel,
  AggregatedOrderBook,
  VenueStatus,
  ConnectionStatus,
} from "@/lib/types";
import { MARKET } from "@/config/markets";

type Listener = (book: AggregatedOrderBook) => void;

class OrderBookManager {
  private polymarketClient: PolymarketClient | null = null;
  private kalshiClient: KalshiClient | null = null;
  private listeners: Set<Listener> = new Set();
  private started = false;

  private polymarketBids: OrderBookLevel[] = [];
  private polymarketAsks: OrderBookLevel[] = [];
  private kalshiBids: OrderBookLevel[] = [];
  private kalshiAsks: OrderBookLevel[] = [];

  private polymarketStatus: VenueStatus = {
    venue: "polymarket",
    status: "disconnected",
    lastUpdated: null,
  };

  private kalshiStatus: VenueStatus = {
    venue: "kalshi",
    status: "disconnected",
    lastUpdated: null,
  };

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);

    if (!this.started) {
      this.start();
    }

    const currentBook = this.getAggregatedBook();
    listener(currentBook);

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  private start(): void {
    if (this.started) return;
    this.started = true;

    this.polymarketClient = new PolymarketClient(
      MARKET.polymarket.yesTokenId,
      MARKET.polymarket.noTokenId,
      (bids, asks) => {
        this.polymarketBids = bids;
        this.polymarketAsks = asks;
        this.polymarketStatus.lastUpdated = Date.now();
        this.broadcast();
      },
      (status: ConnectionStatus) => {
        this.polymarketStatus.status = status;
        this.broadcast();
      }
    );

    this.kalshiClient = new KalshiClient(
      MARKET.kalshi.marketTicker,
      (bids, asks) => {
        this.kalshiBids = bids;
        this.kalshiAsks = asks;
        this.kalshiStatus.lastUpdated = Date.now();
        this.broadcast();
      },
      (status: ConnectionStatus) => {
        this.kalshiStatus.status = status;
        this.broadcast();
      }
    );

    this.polymarketClient.connect();
    this.kalshiClient.connect();

    this.heartbeatInterval = setInterval(() => {
      this.broadcast();
    }, 5000);
  }

  private stop(): void {
    if (!this.started) return;
    this.started = false;

    this.polymarketClient?.destroy();
    this.kalshiClient?.destroy();
    this.polymarketClient = null;
    this.kalshiClient = null;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.polymarketBids = [];
    this.polymarketAsks = [];
    this.kalshiBids = [];
    this.kalshiAsks = [];
  }

  private getAggregatedBook(): AggregatedOrderBook {
    const { bids, asks } = aggregateOrderBook(
      this.polymarketBids,
      this.polymarketAsks,
      this.kalshiBids,
      this.kalshiAsks
    );

    return {
      bids,
      asks,
      venues: {
        polymarket: { ...this.polymarketStatus },
        kalshi: { ...this.kalshiStatus },
      },
    };
  }

  private broadcast(): void {
    const book = this.getAggregatedBook();
    for (const listener of this.listeners) {
      try {
        listener(book);
      } catch {
        // listener error shouldn't crash the manager
      }
    }
  }
}

export const orderBookManager = new OrderBookManager();
