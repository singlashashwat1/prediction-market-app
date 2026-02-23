# Prediction Market Aggregator

A real-time prediction market aggregator that combines order book data from **Polymarket** and **Kalshi** into a single unified view. Built as a take-home assessment demonstrating frontend correctness, real-time data handling, and production-grade architecture.

**Market:** Will JD Vance win the 2028 US Presidential Election?

## Quick Start

```bash
# Install dependencies
pnpm install

# (Optional) Add Kalshi WebSocket API keys for real-time WebSocket data
# Without keys, Kalshi falls back to REST polling every 2 seconds
cp .env.example .env.local
# Edit .env.local with your Kalshi API key

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
  Kalshi WS/REST ──→ normalize ──→ ┘

Browser:
  one EventSource hook → render UI + quote calculator
```

Both venue connections live **server-side** in a single Next.js API route (`/api/orderbook/stream`). The server normalizes data from each venue into a common format, aggregates them into a single order book, and streams updates to the browser via SSE.

The browser is a pure display layer — one `useOrderBook` hook connects to the SSE stream and feeds the UI.

### Why all-backend?

- **Consistent data pipeline** — both venues follow the same normalization path
- **Kalshi auth stays secure** — RSA keys never reach the browser
- **Connection sharing** — multiple browser tabs share one connection per exchange
- **Testable** — normalization and aggregation logic can be unit tested without React
- **Production-realistic** — this is how real trading platforms work

## Key Design Decisions

1. **In-memory aggregation, no database.** Order book data is ephemeral and changes every few milliseconds. A database would add latency for data with zero long-term value. The server holds the current state in plain JavaScript objects.

2. **SSE over WebSocket to the browser.** SSE is simpler, auto-reconnects via `EventSource`, and is sufficient for server-to-client streaming. No bidirectional communication is needed between browser and server.

3. **Venue-tagged order book levels.** Every price level carries its venue tag (`polymarket` or `kalshi`), enabling the combined/individual views and cross-venue fill calculations without maintaining separate data structures.

4. **Kalshi REST polling fallback.** Kalshi's WebSocket requires RSA key authentication. The app automatically falls back to REST polling every 2 seconds if API keys aren't configured — making it easy for reviewers to run immediately.

5. **Kalshi bid-only to bid/ask conversion.** Kalshi only returns bids for YES and NO sides. A NO bid at price X is converted to a YES ask at (1 - X).

## Assumptions & Tradeoffs

- **Single hardcoded market.** The app targets the JD Vance 2028 election market on both platforms. Making this configurable would require a market discovery/search feature.
- **Polymarket prices are 0-1 decimals; Kalshi prices are in cents.** Both are normalized to 0-1 decimals server-side.
- **Book depth capped at 20 levels per side.** This bounds memory and keeps the UI focused on actionable liquidity.
- **Quote calculator is a pricing exercise only.** No real orders are placed. Fills are simulated by walking the aggregated order book.
- **Next.js API routes are long-lived in dev mode** but would become serverless functions on Vercel. For production deployment, a dedicated Node.js server or container would be needed to maintain persistent WebSocket connections.

## What I Would Improve With More Time

- **Unit tests** for normalizer, aggregator, and quote engine
- **Market selector** to choose from multiple cross-listed markets
- **Historical price chart** with time-series data
- **Cumulative depth chart** (area chart) in addition to the bar visualization
- **Throttled SSE updates** — batch multiple WebSocket events and send to the browser at a fixed rate (e.g., 10 updates/sec) to reduce render churn
- **Connection health monitoring** with automatic stale-data warnings after N seconds without updates
- **Error boundary** components for graceful failure handling
- **Dedicated backend service** for production — separate the WebSocket connections from the Next.js render server

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
│   ├── kalshiClient.ts              # Kalshi WebSocket/REST client
│   └── kalshiAuth.ts                # RSA-PSS signing for Kalshi auth
├── components/
│   ├── MarketHeader.tsx              # Market question, best bid/ask, spread
│   ├── ConnectionStatus.tsx          # Live venue status indicators
│   ├── QuoteCalculator.tsx           # Dollar input → shares output with venue split
│   └── OrderBook/
│       ├── OrderBookTable.tsx        # Bid/ask table with venue colors
│       ├── DepthVisualization.tsx    # Stacked depth bars by venue
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

## Environment Variables

Create a `.env.local` file (optional — Kalshi works via REST polling without keys):

```
KALSHI_API_KEY_ID=your_key_id
KALSHI_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

Generate Kalshi API keys at https://kalshi.com or use their [demo environment](https://demo-api.kalshi.co).
