# Prediction Market Aggregator

A real-time prediction market aggregator that combines order book data from **Polymarket** and **Kalshi** into a single unified view. Built as a take-home assessment demonstrating frontend correctness, real-time data handling, and production-grade architecture.

**Market:** Will JD Vance win the 2028 US Presidential Election?

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Chakra UI v3** for the component library
- **Server-Sent Events (SSE)** for real-time browser streaming
- **WebSocket** (ws) for server-side exchange connections
- **pnpm** as package manager

## Architecture

```
Server (Next.js API Route):
  Polymarket WS ──→ normalize ──→ ┐
                                    ├─→ merged book (in-memory) ──→ single SSE stream
  Kalshi (via DFlow WS) ──→ normalize ──→ ┘

Browser:
  one EventSource hook → render UI + quote calculator
```

Both venue connections live **server-side** in a single Next.js API route (`/api/orderbook/stream`). The server normalizes data from each venue into a common format, aggregates them into a single order book, and streams updates to the browser via SSE.

The browser is a pure display layer — one `useOrderBook` hook connects to the SSE stream and feeds the UI.

The UI intentionally displays the order book for a single outcome (**YES**) to match the assignment requirement; NO-side interest is represented through implied pricing (e.g., NO bid at `X` maps to YES ask at `1 - X`).

### Why all-backend?

- **Consistent data pipeline** — both venues follow the same normalization path
- **No Kalshi API keys needed** — DFlow WebSocket provides market stream access
- **Connection sharing** — multiple browser tabs share one connection per exchange
- **Testable** — normalization and aggregation logic can be unit tested without React
- **Production-realistic** — this is how real trading platforms work

## Assumptions & Tradeoffs

- **Polymarket prices are 0-1 decimals; Kalshi prices are in cents.** Both are normalized to 0-1 decimals server-side.
- **Book depth capped at 50 levels per side.** This bounds memory while preserving enough depth for quoting and venue comparison.
- **Quote calculator is a pricing exercise only.** No real orders are placed. Fills are simulated by walking the aggregated order book.

## What I Would Improve With More Time

- **Unit tests** for normalizer, aggregator, and quote engine
- **Throttled SSE updates** — batch multiple WebSocket events and send to the browser at a fixed rate (e.g., 10 updates/sec) to reduce render churn
- **Connection health monitoring** with automatic stale-data warnings after N seconds without updates
- **Error boundary** components for graceful failure handling

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with Chakra UI Provider
│   ├── page.tsx                      # Main dashboard (client component)
│   └── api/orderbook/stream/
│       └── route.ts                  # SSE endpoint
├── server/
│   ├── orderBookManager.ts           # Singleton: manages both WS clients + aggregation
│   ├── polymarketClient.ts           # Polymarket WebSocket client
│   └── kalshiClient.ts              # Kalshi stream client (via DFlow WebSocket)
├── components/
│   ├── MarketHeader.tsx              # Market question, best bid/ask, spread
│   ├── ConnectionStatus.tsx          # Live venue status indicators
│   ├── QuoteCalculator.tsx           # Dollar input → shares output with venue split
│   └── OrderBook/
│       ├── OrderBookTable.tsx        # Bid/ask table with venue colors
│       └── VenueFilter.tsx          # Combined / Polymarket / Kalshi toggle
├── hooks/
│   └── useOrderBook.ts              # EventSource → React state
├── lib/
│   ├── types.ts                      # Shared TypeScript interfaces
│   ├── aggregator.ts                 # Merge order books from both venues
│   └── quoteEngine.ts               # Simulate fills across venues
└── config/
    └── markets.ts                    # Market IDs for both platforms
```
