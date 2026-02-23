import { OrderBookLevel, QuoteResult, QuoteFill, Outcome } from "./types";
import { AggregatedOrderBook } from "./types";

/**
 * Walk the order book to calculate how many shares a user
 * would receive for a given dollar amount.
 *
 * For "Yes" outcome: buy from the asks (lowest ask first)
 * For "No" outcome: buy from the bids (highest bid first, inverted)
 *
 * Since this is a binary market, buying "No" at price P is
 * equivalent to selling "Yes" at price P, but for simplicity
 * we model it as buying "No" shares at (1 - ask_price) from the
 * bid side.
 */
export function calculateQuote(
  book: AggregatedOrderBook,
  dollarAmount: number,
  outcome: Outcome,
): QuoteResult {
  if (dollarAmount <= 0) {
    return {
      totalShares: 0,
      avgPrice: 0,
      fills: [],
      totalCost: 0,
      unfilled: 0,
    };
  }

  // For "Yes": walk the ask side (buy Yes shares at ask prices)
  // For "No": walk the ask side conceptually, but use bids inverted
  //   A bid at price P means you can buy "No" at (1 - P)
  const levels: OrderBookLevel[] =
    outcome === "Yes"
      ? [...book.asks]
      : [...book.bids]
          .map((b) => ({
            ...b,
            price: parseFloat((1 - b.price).toFixed(4)),
          }))
          .sort((a, b) => a.price - b.price);

  let remaining = dollarAmount;
  const fills: QuoteFill[] = [];

  for (const level of levels) {
    if (remaining <= 0) break;
    if (level.price <= 0) continue;

    const maxSharesAtLevel = level.size;
    const costPerShare = level.price;
    const maxCostAtLevel = maxSharesAtLevel * costPerShare;

    const costAtLevel = Math.min(remaining, maxCostAtLevel);
    const sharesAtLevel = costAtLevel / costPerShare;

    if (sharesAtLevel > 0) {
      fills.push({
        venue: level.venue,
        shares: parseFloat(sharesAtLevel.toFixed(2)),
        price: level.price,
        cost: parseFloat(costAtLevel.toFixed(2)),
      });
      remaining -= costAtLevel;
    }
  }

  const totalCost = dollarAmount - Math.max(remaining, 0);
  const totalShares = fills.reduce((sum, f) => sum + f.shares, 0);
  const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;

  return {
    totalShares: parseFloat(totalShares.toFixed(2)),
    avgPrice: parseFloat(avgPrice.toFixed(4)),
    fills,
    totalCost: parseFloat(totalCost.toFixed(2)),
    unfilled: parseFloat(Math.max(remaining, 0).toFixed(2)),
  };
}
