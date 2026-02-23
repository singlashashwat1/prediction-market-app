# Prediction Market Aggregator - Technical Plan

## Overview

Build a real-time prediction market aggregator with an all-backend architecture. Next.js API route connects to both Polymarket and Kalshi WebSockets server-side, normalizes and aggregates in-memory, and streams a single unified order book to the browser via SSE. Frontend is a pure display layer with a quote calculator.

---

## Architecture

```mermaid
graph TB
    subgraph browser [Browser]
        UI[React UI]
        HOOK[useOrderBook Hook]
        QUOTE[Quote Calculator]
        HOOK --> UI
        HOOK --> QUOTE
        QUOTE --> UI
    end

    subgraph server ["Next.js API Route /api/orderbook/stream"]
        PM_CLIENT[Polymarket WS Client]
        KL_CLIENT[Kalshi WS Client]
        NORM[Normalizer]
        AGG["Aggregator (in-memory)"]
        SSE[SSE Stream]
        PM_CLIENT --> NORM
        KL_CLIENT --> NORM
        NORM --> AGG
        AGG --> SSE
    end

    subgraph external [External APIs]
        POLY[Polymarket WS - wss://ws-subscriptions-clob.polymarket.com/ws/market]
        KALSHI_WS[Kalshi WS - wss://api.elections.kalshi.com/trade-api/ws/v2]
    end

    PM_CLIENT -->|"WebSocket (public)"| POLY
    KL_CLIENT -->|"WebSocket (RSA auth via .env)"| KALSHI_WS
    HOOK -->|"Single SSE connection"| SSE
```

---

## Data Flow and Normalization

**Key difference between venues:**

- **Polymarket**: Prices are 0-1 decimals (e.g., `"0.48"`). Provides both `bids` and `asks` arrays. Uses `asset_id` (token ID) per outcome. Public WebSocket, no auth.
- **Kalshi**: Prices in cents (1-99). Only returns bids for YES and NO sides; asks are implied (`100 - opposite_bid`). WebSocket requires RSA key auth; REST orderbook is public.

**Normalization strategy**: Convert both to a common format with prices as decimals 0-1, explicit bids/asks, and venue tags on every level.

---

## Data Sources Strategy

Both venue connections live server-side in a single Next.js API route (`/api/orderbook/stream`):

- **Polymarket** (server-side WS client):
  - Connects to `wss://ws-subscriptions-clob.polymarket.com/ws/market` (public, no auth)
  - Receives `book` snapshots + `price_change` deltas
  - Sends `PING` every 10s for keepalive
  - Auto-reconnects with exponential backoff

- **Kalshi** (server-side WS client):
  - Connects to `wss://api.elections.kalshi.com/trade-api/ws/v2` with RSA key auth
  - Subscribes to `orderbook_delta` channel for `orderbook_snapshot` + `orderbook_delta` events
  - Auth keys from `.env.local`: `KALSHI_API_KEY_ID` and `KALSHI_PRIVATE_KEY`
  - Auto-reconnects with exponential backoff

- **Aggregation** (in-memory):
  - Each venue updates its own normalized book in memory
  - On every update from either venue, re-merge into a combined book
  - Push the combined book + per-venue status to the browser via a single **SSE stream**

- **Browser**:
  - Single `EventSource` connection to `/api/orderbook/stream`
  - Receives pre-aggregated data -- no normalization or merging needed client-side

---

## Market Configuration

Hardcode a specific market that exists on both platforms (e.g., "Will JD Vance win the 2028 US Presidential Election?"). Store token IDs / tickers in `src/config/markets.ts`. Look up the actual IDs during implementation via each platform's REST API.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with Chakra Provider
│   ├── page.tsx                      # Main dashboard page
│   └── api/
│       └── orderbook/
│           └── stream/
│               └── route.ts          # SSE endpoint: both WS -> aggregate -> SSE
├── server/
│   ├── polymarketClient.ts           # Server-side Polymarket WS client
│   ├── kalshiClient.ts              # Server-side Kalshi WS client (RSA auth)
│   └── kalshiAuth.ts                # RSA signing helper for Kalshi
├── components/
│   ├── MarketHeader.tsx              # Market title, outcomes, best prices
│   ├── OrderBook/
│   │   ├── OrderBookTable.tsx        # Bid/ask table with venue colors
│   │   ├── DepthVisualization.tsx    # Horizontal depth bars by venue
│   │   └── VenueFilter.tsx           # Toggle: Combined / Polymarket / Kalshi
│   ├── QuoteCalculator.tsx           # Dollar input -> shares output
│   ├── VenueSplitDisplay.tsx         # Shows fill breakdown across venues
│   └── ConnectionStatus.tsx          # Live status indicators per venue
├── hooks/
│   └── useOrderBook.ts              # Single EventSource hook -> React state
├── lib/
│   ├── types.ts                      # Shared TypeScript interfaces
│   ├── normalizer.ts                 # Venue-specific -> common format (server)
│   ├── aggregator.ts                 # Merge order books, sort levels (server)
│   └── quoteEngine.ts               # Walk the book, calc fills (client)
└── config/
    └── markets.ts                    # Market IDs for both venues
```

---

## Key TypeScript Types (`src/lib/types.ts`)

```typescript
type Venue = "polymarket" | "kalshi";

interface OrderBookLevel {
  price: number;       // 0-1 decimal
  size: number;        // number of shares/contracts
  venue: Venue;
}

interface VenueOrderBook {
  venue: Venue;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdated: number | null;
  status: "connected" | "disconnected" | "connecting";
}

interface AggregatedOrderBook {
  bids: OrderBookLevel[];  // sorted descending by price
  asks: OrderBookLevel[];  // sorted ascending by price
  venues: Record<Venue, VenueOrderBook>;
}

interface QuoteResult {
  totalShares: number;
  avgPrice: number;
  fills: { venue: Venue; shares: number; price: number; cost: number }[];
  totalCost: number;
  unfilled: number;
}
```

---

## UI Layout

```
+--------------------------------------------------+
|  Market Header: "Will JD Vance win 2028?"        |
|  Best Bid: $0.42  |  Best Ask: $0.45             |
|  [Polymarket: connected] [Kalshi: connected]     |
+--------------------------------------------------+
|                                                    |
|  [Combined] [Polymarket] [Kalshi]  <- venue tabs  |
|                                                    |
|  BIDS (buy)          |  ASKS (sell)               |
|  ████████ 0.42  200  |  0.45  150  ██████         |
|  ██████   0.41  150  |  0.46  300  ████████████   |
|  ████     0.40  100  |  0.47   80  ████           |
|  (blue=Poly, green=Kalshi in stacked bars)        |
|                                                    |
+--------------------------------------------------+
|  Quote Calculator                                  |
|  I want to spend: [$___100___]                    |
|  Outcome: [Yes v]                                  |
|                                                    |
|  You would receive: ~222 shares @ avg $0.45        |
|  ┌──────────────────────────────────────┐          |
|  │ Polymarket: 150 shares @ $0.45 = $67 │          |
|  │ Kalshi:      72 shares @ $0.46 = $33 │          |
|  └──────────────────────────────────────┘          |
+--------------------------------------------------+
```

---

## Long-Running Behavior

- **Server-side WS clients**: Both auto-reconnect with exponential backoff. Each client tracks its own connection status.
- **SSE stream**: Sends periodic heartbeat events (every 5s) to keep connection alive. Includes per-venue status in every data event.
- **Browser EventSource**: Auto-reconnects natively if the SSE connection drops.
- **Memory**: In-memory order book is replaced (not appended) on every update. Limit depth to top N levels to bound memory.
- **Connection status**: Each venue shows a colored dot (green/yellow/red) + "connected" / "reconnecting" / "disconnected" with last-update timestamp.

---

## Environment Variables (`.env.local`)

```
KALSHI_API_KEY_ID=your_kalshi_api_key_id
KALSHI_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

Reviewers will need to generate a Kalshi API key at https://kalshi.com (or use the demo environment). Instructions will be in the README.

---

## Key Design Decisions

- **All-backend architecture**: Both venue WebSockets live server-side. Server handles normalization + aggregation. Frontend is a pure display layer with one SSE connection.
- **Why server-side for both**: Consistent data pipeline, easier to test, Kalshi auth stays secure, connection sharing across browser tabs/clients, production-realistic pattern.
- **SSE to browser (not WebSocket proxy)**: SSE is simpler, auto-reconnects natively via `EventSource`, and is sufficient for server-to-client streaming. No bidirectional communication needed.
- **In-memory aggregation (no DB)**: Order book data is ephemeral and high-frequency. A database would add latency for data with zero long-term value.
- **Venue-tagged levels**: Every order book level carries its venue tag, enabling the combined/individual views and split calculations without separate data structures.

---

## Implementation Todos

1. Create shared types (`types.ts`) and market configuration (`markets.ts`) with token IDs / tickers for both venues
2. Build server-side WebSocket clients for both Polymarket (public) and Kalshi (RSA auth) with reconnection logic
3. Implement `normalizer.ts` (venue-specific -> common format) and `aggregator.ts` (merge + sort both books) -- runs server-side
4. Build single Next.js API route `/api/orderbook/stream` that manages both WS connections, aggregates in-memory, and streams combined book via SSE
5. Build `useOrderBook` hook -- single EventSource connection to `/api/orderbook/stream`, parses SSE events into React state
6. Implement `quoteEngine.ts` -- walk the aggregated book to calculate fills, venue splits, and average price for a given dollar amount
7. Build OrderBookTable + DepthVisualization components with venue color coding and Combined/Polymarket/Kalshi toggle
8. Build QuoteCalculator + VenueSplitDisplay components
9. Build MarketHeader + ConnectionStatus components showing live venue health
10. Wire everything together in `page.tsx`, test with live data, handle edge cases (empty books, disconnections)
11. Write README with setup instructions, design decisions, assumptions, tradeoffs, and potential improvements
