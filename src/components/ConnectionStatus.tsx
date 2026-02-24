"use client";

import { Flex, Box, Text } from "@chakra-ui/react";
import { VenueStatus } from "@/lib/types";

interface ConnectionStatusProps {
  venues: Record<string, VenueStatus>;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "connected"
      ? "green.400"
      : status === "connecting"
        ? "yellow.400"
        : "red.400";

  return (
    <Box
      w={2}
      h={2}
      borderRadius="full"
      bg={color}
      boxShadow={
        status === "connected"
          ? `0 0 6px var(--chakra-colors-green-400)`
          : undefined
      }
    />
  );
}

export function ConnectionStatus({ venues }: ConnectionStatusProps) {
  return (
    <Flex gap={4} wrap="wrap">
      {Object.values(venues).map((venue) => (
        <Flex key={venue.venue} align="center" gap={1.5}>
          <StatusDot status={venue.status} />
          <Text fontSize="xs" textTransform="capitalize" fontWeight="medium">
            {venue.venue}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {venue.status}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}
