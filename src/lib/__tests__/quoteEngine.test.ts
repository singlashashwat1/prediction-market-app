import { describe, it, expect } from "vitest";
import { calculateQuote } from "../quoteEngine";
import type { AggregatedOrderBook, OrderBookLevel } from "../types";

const emptyVenues = {
  polymarket: {
    venue: "polymarket" as const,
    status: "connected" as const,
    lastUpdated: null,
  },
  kalshi: {
    venue: "kalshi" as const,
    status: "connected" as const,
    lastUpdated: null,
  },
};

function book(
  bids: OrderBookLevel[],
  asks: OrderBookLevel[],
): AggregatedOrderBook {
  return { bids, asks, venues: emptyVenues };
}

describe("calculateQuote", () => {
  it("returns zeros for non-positive dollar amount", () => {
    const b = book([], [{ price: 0.5, size: 100, venue: "polymarket" }]);
    expect(calculateQuote(b, 0, "Yes")).toMatchObject({
      totalShares: 0,
      avgPrice: 0,
      fills: [],
      totalCost: 0,
      unfilled: 0,
    });
    expect(calculateQuote(b, -10, "Yes").totalShares).toBe(0);
  });

  it("fills Yes by walking asks lowest price first", () => {
    const b = book(
      [],
      [
        { price: 0.5, size: 100, venue: "polymarket" },
        { price: 0.6, size: 100, venue: "kalshi" },
      ],
    );
    const q = calculateQuote(b, 10, "Yes");
    expect(q.totalCost).toBeCloseTo(10, 5);
    expect(q.unfilled).toBe(0);
    expect(q.totalShares).toBeCloseTo(20, 5); // 10 / 0.5
    expect(q.fills).toHaveLength(1);
    expect(q.fills[0].venue).toBe("polymarket");
    expect(q.fills[0].price).toBe(0.5);
  });

  it("spills across multiple ask levels for Yes", () => {
    const b = book(
      [],
      [
        { price: 0.4, size: 10, venue: "polymarket" },
        { price: 0.6, size: 10, venue: "kalshi" },
      ],
    );
    const q = calculateQuote(b, 10, "Yes");
    expect(q.fills).toHaveLength(2);
    expect(q.totalCost).toBeCloseTo(10, 5);
    expect(q.totalShares).toBeCloseTo(20, 2);
    expect(q.avgPrice).toBeCloseTo(0.5, 4);
    expect(q.unfilled).toBe(0);
  });

  it("reports unfilled dollars when book is too thin", () => {
    const b = book(
      [],
      [{ price: 0.5, size: 5, venue: "polymarket" }], // max cost 2.5
    );
    const q = calculateQuote(b, 10, "Yes");
    expect(q.totalCost).toBeCloseTo(2.5, 5);
    expect(q.unfilled).toBeCloseTo(7.5, 5);
    expect(q.totalShares).toBeCloseTo(5, 5);
  });

  it("fills No using inverted bid prices", () => {
    // Bid at 0.6 on Yes => buy No at 1 - 0.6 = 0.4
    const b = book([{ price: 0.6, size: 100, venue: "kalshi" }], []);
    const q = calculateQuote(b, 8, "No");
    expect(q.unfilled).toBe(0);
    expect(q.totalShares).toBeCloseTo(20, 5); // 8 / 0.4
    expect(q.fills[0].price).toBeCloseTo(0.4, 4);
    expect(q.fills[0].venue).toBe("kalshi");
  });

  it("skips levels with non-positive effective price", () => {
    const b = book(
      [{ price: 1, size: 100, venue: "polymarket" }], // No price = 0
      [{ price: 0.5, size: 100, venue: "polymarket" }],
    );
    const qNo = calculateQuote(b, 5, "No");
    expect(qNo.fills.length).toBe(0);
    expect(qNo.totalShares).toBe(0);
  });
});
