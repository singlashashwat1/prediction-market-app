export type Venue = "polymarket" | "kalshi";

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export type Outcome = "Yes" | "No";

export interface OrderBookLevel {
  price: number;
  size: number;
  venue: Venue;
}

export interface VenueStatus {
  venue: Venue;
  status: ConnectionStatus;
  lastUpdated: number | null;
}

export interface AggregatedOrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  venues: Record<Venue, VenueStatus>;
}

export interface QuoteFill {
  venue: Venue;
  shares: number;
  price: number;
  cost: number;
}

export interface QuoteResult {
  totalShares: number;
  avgPrice: number;
  fills: QuoteFill[];
  totalCost: number;
  unfilled: number;
}

export interface MarketConfig {
  question: string;
  outcomes: [string, string];
  polymarket: {
    conditionId: string;
    yesTokenId: string;
    noTokenId: string;
  };
  kalshi: {
    eventTicker: string;
    marketTicker: string;
  };
}

export interface SSEMessage {
  type: "orderbook" | "status" | "heartbeat";
  data: AggregatedOrderBook;
  timestamp: number;
}
