"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { OrderBookLevel } from "@/lib/types";
import { VenueView } from "./VenueFilter";

interface DepthVisualizationProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  venueView: VenueView;
}

function aggregateByPrice(
  levels: OrderBookLevel[],
  venueView: VenueView
): { price: number; polymarket: number; kalshi: number; total: number }[] {
  const priceMap = new Map<
    number,
    { polymarket: number; kalshi: number }
  >();

  for (const level of levels) {
    if (venueView !== "combined" && level.venue !== venueView) continue;

    const existing = priceMap.get(level.price) || {
      polymarket: 0,
      kalshi: 0,
    };
    if (level.venue === "polymarket") {
      existing.polymarket += level.size;
    } else {
      existing.kalshi += level.size;
    }
    priceMap.set(level.price, existing);
  }

  return Array.from(priceMap.entries()).map(([price, sizes]) => ({
    price,
    ...sizes,
    total: sizes.polymarket + sizes.kalshi,
  }));
}

function DepthRow({
  price,
  polymarket,
  kalshi,
  maxTotal,
  side,
}: {
  price: number;
  polymarket: number;
  kalshi: number;
  maxTotal: number;
  side: "bid" | "ask";
}) {
  const total = polymarket + kalshi;
  const pmWidth = maxTotal > 0 ? (polymarket / maxTotal) * 100 : 0;
  const klWidth = maxTotal > 0 ? (kalshi / maxTotal) * 100 : 0;

  return (
    <Flex align="center" gap={2} py={0.5} px={2}>
      <Text fontSize="xs" fontFamily="mono" w="60px" textAlign="right" color="fg.muted">
        ${price.toFixed(2)}
      </Text>
      <Flex flex={1} h="16px" direction={side === "bid" ? "row-reverse" : "row"}>
        {polymarket > 0 && (
          <Box
            w={`${pmWidth}%`}
            h="100%"
            bg="blue.500"
            opacity={0.7}
            borderRadius="sm"
          />
        )}
        {kalshi > 0 && (
          <Box
            w={`${klWidth}%`}
            h="100%"
            bg="green.500"
            opacity={0.7}
            borderRadius="sm"
          />
        )}
      </Flex>
      <Text fontSize="xs" fontFamily="mono" w="60px" color="fg.muted">
        {total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toFixed(0)}
      </Text>
    </Flex>
  );
}

export function DepthVisualization({
  bids,
  asks,
  venueView,
}: DepthVisualizationProps) {
  const aggBids = aggregateByPrice(bids, venueView).sort(
    (a, b) => b.price - a.price
  );
  const aggAsks = aggregateByPrice(asks, venueView).sort(
    (a, b) => a.price - b.price
  );

  const allTotals = [...aggBids, ...aggAsks].map((r) => r.total);
  const maxTotal = allTotals.length > 0 ? Math.max(...allTotals) : 1;

  return (
    <Box>
      <Flex justify="center" gap={4} mb={2}>
        <Flex align="center" gap={1}>
          <Box w={3} h={3} bg="blue.500" borderRadius="sm" opacity={0.7} />
          <Text fontSize="xs" color="fg.muted">Polymarket</Text>
        </Flex>
        <Flex align="center" gap={1}>
          <Box w={3} h={3} bg="green.500" borderRadius="sm" opacity={0.7} />
          <Text fontSize="xs" color="fg.muted">Kalshi</Text>
        </Flex>
      </Flex>

      <Flex direction={{ base: "column", md: "row" }} gap={4}>
        <Box flex={1}>
          <Text fontSize="xs" fontWeight="bold" color="green.300" mb={1} textAlign="center">
            BIDS
          </Text>
          {aggBids.slice(0, 10).map((row) => (
            <DepthRow
              key={`bid-${row.price}`}
              {...row}
              maxTotal={maxTotal}
              side="bid"
            />
          ))}
        </Box>
        <Box flex={1}>
          <Text fontSize="xs" fontWeight="bold" color="red.300" mb={1} textAlign="center">
            ASKS
          </Text>
          {aggAsks.slice(0, 10).map((row) => (
            <DepthRow
              key={`ask-${row.price}`}
              {...row}
              maxTotal={maxTotal}
              side="ask"
            />
          ))}
        </Box>
      </Flex>
    </Box>
  );
}
