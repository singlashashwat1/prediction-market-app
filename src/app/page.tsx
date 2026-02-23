"use client";

import { useState } from "react";
import { Container, Box, VStack, Flex } from "@chakra-ui/react";
import { useOrderBook } from "@/hooks/useOrderBook";
import { MarketHeader } from "@/components/MarketHeader";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { OrderBookTable } from "@/components/OrderBook/OrderBookTable";
import { DepthVisualization } from "@/components/OrderBook/DepthVisualization";
import { VenueFilter, VenueView } from "@/components/OrderBook/VenueFilter";
import { QuoteCalculator } from "@/components/QuoteCalculator";

export default function Home() {
  const { orderBook, sseStatus } = useOrderBook();
  const [venueView, setVenueView] = useState<VenueView>("combined");

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Box>
          <MarketHeader orderBook={orderBook} />
          <Box mt={3}>
            <ConnectionStatus
              venues={orderBook.venues}
              sseStatus={sseStatus}
            />
          </Box>
        </Box>

        {/* Order Book */}
        <Box
          borderRadius="xl"
          border="1px solid"
          borderColor="whiteAlpha.200"
          bg="whiteAlpha.50"
          overflow="hidden"
        >
          <Flex justify="space-between" align="center" p={4} borderBottom="1px solid" borderColor="whiteAlpha.200">
            <Box fontSize="lg" fontWeight="bold">
              Order Book
            </Box>
            <VenueFilter active={venueView} onChange={setVenueView} />
          </Flex>
          <OrderBookTable
            bids={orderBook.bids}
            asks={orderBook.asks}
            venueView={venueView}
          />
        </Box>

        {/* Depth Visualization */}
        <Box
          borderRadius="xl"
          border="1px solid"
          borderColor="whiteAlpha.200"
          bg="whiteAlpha.50"
          p={4}
        >
          <Box fontSize="lg" fontWeight="bold" mb={3}>
            Depth
          </Box>
          <DepthVisualization
            bids={orderBook.bids}
            asks={orderBook.asks}
            venueView={venueView}
          />
        </Box>

        {/* Quote Calculator */}
        <QuoteCalculator orderBook={orderBook} />
      </VStack>
    </Container>
  );
}
