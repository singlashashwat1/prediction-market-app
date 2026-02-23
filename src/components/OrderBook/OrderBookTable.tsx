"use client";

import { Box, Flex, Text, Grid } from "@chakra-ui/react";
import { OrderBookLevel } from "@/lib/types";
import { VenueView } from "./VenueFilter";

interface OrderBookTableProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  venueView: VenueView;
}

function getVenueColor(venue: string): string {
  return venue === "polymarket" ? "blue.400" : "green.400";
}

function formatPrice(price: number): string {
  return `$${price.toFixed(3)}`;
}

function formatSize(size: number): string {
  if (size >= 1000000) return `${(size / 1000000).toFixed(1)}M`;
  if (size >= 1000) return `${(size / 1000).toFixed(1)}K`;
  return size.toFixed(0);
}

function filterByVenue(
  levels: OrderBookLevel[],
  venueView: VenueView
): OrderBookLevel[] {
  if (venueView === "combined") return levels;
  return levels.filter((l) => l.venue === venueView);
}

function DepthBar({
  size,
  maxSize,
  side,
  venue,
}: {
  size: number;
  maxSize: number;
  side: "bid" | "ask";
  venue: string;
}) {
  const width = maxSize > 0 ? (size / maxSize) * 100 : 0;
  const color = getVenueColor(venue);
  const justify = side === "bid" ? "flex-end" : "flex-start";

  return (
    <Box position="absolute" top={0} bottom={0} {...(side === "bid" ? { right: 0 } : { left: 0 })} width="100%">
      <Box
        position="absolute"
        top={0}
        bottom={0}
        {...(side === "bid" ? { right: 0 } : { left: 0 })}
        width={`${Math.min(width, 100)}%`}
        bg={color}
        opacity={0.15}
        display="flex"
        justifyContent={justify}
      />
    </Box>
  );
}

function LevelRow({
  level,
  maxSize,
  side,
}: {
  level: OrderBookLevel;
  maxSize: number;
  side: "bid" | "ask";
}) {
  const textColor = side === "bid" ? "green.300" : "red.300";

  return (
    <Grid
      templateColumns="1fr 1fr 80px"
      py={1}
      px={3}
      position="relative"
      _hover={{ bg: "whiteAlpha.50" }}
      fontSize="sm"
      fontFamily="mono"
    >
      <DepthBar size={level.size} maxSize={maxSize} side={side} venue={level.venue} />
      <Text color={textColor} zIndex={1}>
        {formatPrice(level.price)}
      </Text>
      <Text textAlign="right" zIndex={1}>
        {formatSize(level.size)}
      </Text>
      <Text
        textAlign="right"
        fontSize="xs"
        color={getVenueColor(level.venue)}
        zIndex={1}
      >
        {level.venue === "polymarket" ? "PM" : "KL"}
      </Text>
    </Grid>
  );
}

export function OrderBookTable({
  bids,
  asks,
  venueView,
}: OrderBookTableProps) {
  const filteredBids = filterByVenue(bids, venueView);
  const filteredAsks = filterByVenue(asks, venueView);

  const allSizes = [...filteredBids, ...filteredAsks].map((l) => l.size);
  const maxSize = allSizes.length > 0 ? Math.max(...allSizes) : 1;

  return (
    <Flex direction={{ base: "column", md: "row" }} gap={0} width="100%">
      {/* Bids */}
      <Box flex={1} minW={0}>
        <Grid templateColumns="1fr 1fr 80px" px={3} py={2} borderBottom="1px solid" borderColor="whiteAlpha.200">
          <Text fontSize="xs" fontWeight="bold" color="green.300" textTransform="uppercase">
            Bid Price
          </Text>
          <Text fontSize="xs" fontWeight="bold" textAlign="right" textTransform="uppercase" color="fg.muted">
            Size
          </Text>
          <Text fontSize="xs" fontWeight="bold" textAlign="right" textTransform="uppercase" color="fg.muted">
            Venue
          </Text>
        </Grid>
        {filteredBids.length === 0 ? (
          <Text px={3} py={4} fontSize="sm" color="fg.muted" textAlign="center">
            No bids
          </Text>
        ) : (
          filteredBids.map((level, i) => (
            <LevelRow key={`bid-${i}`} level={level} maxSize={maxSize} side="bid" />
          ))
        )}
      </Box>

      {/* Divider */}
      <Box
        width={{ base: "100%", md: "1px" }}
        height={{ base: "1px", md: "auto" }}
        bg="whiteAlpha.200"
      />

      {/* Asks */}
      <Box flex={1} minW={0}>
        <Grid templateColumns="1fr 1fr 80px" px={3} py={2} borderBottom="1px solid" borderColor="whiteAlpha.200">
          <Text fontSize="xs" fontWeight="bold" color="red.300" textTransform="uppercase">
            Ask Price
          </Text>
          <Text fontSize="xs" fontWeight="bold" textAlign="right" textTransform="uppercase" color="fg.muted">
            Size
          </Text>
          <Text fontSize="xs" fontWeight="bold" textAlign="right" textTransform="uppercase" color="fg.muted">
            Venue
          </Text>
        </Grid>
        {filteredAsks.length === 0 ? (
          <Text px={3} py={4} fontSize="sm" color="fg.muted" textAlign="center">
            No asks
          </Text>
        ) : (
          filteredAsks.map((level, i) => (
            <LevelRow key={`ask-${i}`} level={level} maxSize={maxSize} side="ask" />
          ))
        )}
      </Box>
    </Flex>
  );
}
