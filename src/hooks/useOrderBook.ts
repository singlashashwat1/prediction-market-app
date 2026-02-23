"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AggregatedOrderBook } from "@/lib/types";

const EMPTY_BOOK: AggregatedOrderBook = {
  bids: [],
  asks: [],
  venues: {
    polymarket: {
      venue: "polymarket",
      status: "disconnected",
      lastUpdated: null,
    },
    kalshi: { venue: "kalshi", status: "disconnected", lastUpdated: null },
  },
};

export function useOrderBook() {
  const [orderBook, setOrderBook] = useState<AggregatedOrderBook>(EMPTY_BOOK);
  const [sseStatus, setSseStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setSseStatus("connecting");
    const es = new EventSource("/api/orderbook/stream");
    eventSourceRef.current = es;

    es.addEventListener("orderbook", (event) => {
      try {
        const data = JSON.parse(event.data) as AggregatedOrderBook;
        setOrderBook(data);
        setSseStatus("connected");
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("heartbeat", () => {
      setSseStatus("connected");
    });

    es.onerror = () => {
      setSseStatus("disconnected");
      // EventSource auto-reconnects
    };

    es.onopen = () => {
      setSseStatus("connected");
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return { orderBook, sseStatus };
}
