"use client";

import { Box, Flex, Heading, Text, HStack } from "@chakra-ui/react";
import { AggregatedOrderBook } from "@/lib/types";
import { MARKET } from "@/config/markets";
import { formatCents } from "@/lib/formatters";

interface MarketHeaderProps {
  orderBook: AggregatedOrderBook;
}

export function MarketHeader({ orderBook }: MarketHeaderProps) {
  const bestBid = orderBook.bids.length > 0 ? orderBook.bids[0].price : null;
  const bestAsk = orderBook.asks.length > 0 ? orderBook.asks[0].price : null;

  const spread =
    bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;

  return (
    <Box>
      <Heading as="h1" size="xl" mb={2}>
        {MARKET.question}
      </Heading>
      <Flex gap={6} wrap="wrap" align="center">
        <HStack gap={2}>
          <Text fontSize="sm" color="fg.muted">
            Best Bid
          </Text>
          <Text
            fontSize="lg"
            fontWeight="bold"
            fontFamily="mono"
            color="green.300"
          >
            {bestBid !== null ? formatCents(bestBid) : "---"}
          </Text>
        </HStack>

        <HStack gap={2}>
          <Text fontSize="sm" color="fg.muted">
            Best Ask
          </Text>
          <Text
            fontSize="lg"
            fontWeight="bold"
            fontFamily="mono"
            color="red.300"
          >
            {bestAsk !== null ? formatCents(bestAsk) : "---"}
          </Text>
        </HStack>

        {spread !== null && (
          <HStack gap={2}>
            <Text fontSize="sm" color="fg.muted">
              Spread
            </Text>
            <Text fontSize="sm" fontFamily="mono" color="fg.muted">
              {formatCents(spread)}
            </Text>
          </HStack>
        )}

        <HStack gap={2}>
          <Text fontSize="sm" color="fg.muted">
            Displayed outcome
          </Text>
          <Box px={2} py={0.5} bg="green.500/20" borderRadius="md">
            <Text fontSize="xs" fontWeight="bold" color="green.300">
              Yes
            </Text>
          </Box>
        </HStack>
      </Flex>
    </Box>
  );
}
