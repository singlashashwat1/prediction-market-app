import { describe, it, expect } from "vitest";
import { aggregateOrderBook } from "../aggregator";
import type { OrderBookLevel } from "../types";

const pm = (price: number, size: number): OrderBookLevel => ({
  price,
  size,
  venue: "polymarket",
});

const ks = (price: number, size: number): OrderBookLevel => ({
  price,
  size,
  venue: "kalshi",
});

describe("aggregateOrderBook", () => {
  it("merges bids from both venues and sorts descending by price", () => {
    const { bids } = aggregateOrderBook(
      [pm(0.5, 10), pm(0.52, 5)],
      [],
      [ks(0.51, 8)],
      [],
    );
    expect(bids.map((b) => b.price)).toEqual([0.52, 0.51, 0.5]);
    expect(bids.map((b) => b.venue)).toEqual([
      "polymarket",
      "kalshi",
      "polymarket",
    ]);
  });

  it("merges asks from both venues and sorts ascending by price", () => {
    const { asks } = aggregateOrderBook(
      [],
      [pm(0.48, 10), pm(0.5, 5)],
      [],
      [ks(0.49, 12)],
    );
    expect(asks.map((a) => a.price)).toEqual([0.48, 0.49, 0.5]);
  });

  it("returns empty sides when all inputs are empty", () => {
    const out = aggregateOrderBook([], [], [], []);
    expect(out.bids).toEqual([]);
    expect(out.asks).toEqual([]);
  });

  it("keeps duplicate prices as separate levels (venue attribution)", () => {
    const { bids } = aggregateOrderBook(
      [pm(0.5, 1)],
      [],
      [ks(0.5, 2)],
      [],
    );
    expect(bids).toHaveLength(2);
    expect(bids.every((b) => b.price === 0.5)).toBe(true);
  });
});
