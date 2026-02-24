import { OrderBookLevel } from "./types";
import { MAX_BOOK_DEPTH } from "@/config/markets";

/**
 * Merge order book levels from multiple venues.
 * Levels at the same price remain separate (tagged by venue)
 * so the UI can show venue attribution.
 */
export function aggregateOrderBook(
  polymarketBids: OrderBookLevel[],
  polymarketAsks: OrderBookLevel[],
  kalshiBids: OrderBookLevel[],
  kalshiAsks: OrderBookLevel[],
): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
  const allBids = [...polymarketBids, ...kalshiBids].sort(
    (a, b) => b.price - a.price,
  );

  const allAsks = [...polymarketAsks, ...kalshiAsks].sort(
    (a, b) => a.price - b.price,
  );

  return {
    bids: allBids.slice(0, MAX_BOOK_DEPTH),
    asks: allAsks.slice(0, MAX_BOOK_DEPTH),
  };
}
