import { MarketConfig } from "@/lib/types";

export const MARKET: MarketConfig = {
  question: "Will JD Vance win the 2028 US Presidential Election?",
  outcomes: ["Yes", "No"],
  polymarket: {
    conditionId:
      "0x7ad403c3508f8e3912940fd1a913f227591145ca0614074208e0b962d5fcc422",
    yesTokenId:
      "16040015440196279900485035793550429453516625694844857319147506590755961451627",
    noTokenId:
      "94476829201604408463453426454480212459887267917122244941405244686637914508323",
  },
  kalshi: {
    eventTicker: "KXPRESPERSON-28",
    marketTicker: "KXPRESPERSON-28-JVAN",
  },
};

export const POLYMARKET_WS_URL =
  "wss://ws-subscriptions-clob.polymarket.com/ws/market";

export const KALSHI_WS_URL =
  "wss://api.elections.kalshi.com/trade-api/ws/v2";

export const KALSHI_REST_BASE =
  "https://api.elections.kalshi.com/trade-api/v2";

export const MAX_BOOK_DEPTH = 20;
