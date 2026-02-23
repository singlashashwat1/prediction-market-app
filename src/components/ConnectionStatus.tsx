"use client";

import { Flex, Box, Text } from "@chakra-ui/react";
import { VenueStatus } from "@/lib/types";

interface ConnectionStatusProps {
  venues: Record<string, VenueStatus>;
  sseStatus: string;
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
      boxShadow={status === "connected" ? `0 0 6px var(--chakra-colors-green-400)` : undefined}
    />
  );
}

function formatLastUpdate(timestamp: number | null): string {
  if (!timestamp) return "never";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 2) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function ConnectionStatus({
  venues,
  sseStatus,
}: ConnectionStatusProps) {
  return (
    <Flex gap={4} wrap="wrap">
      {Object.values(venues).map((venue) => (
        <Flex key={venue.venue} align="center" gap={1.5}>
          <StatusDot status={venue.status} />
          <Text fontSize="xs" textTransform="capitalize" fontWeight="medium">
            {venue.venue}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {venue.status === "connected"
              ? formatLastUpdate(venue.lastUpdated)
              : venue.status}
          </Text>
        </Flex>
      ))}
      <Flex align="center" gap={1.5}>
        <StatusDot status={sseStatus} />
        <Text fontSize="xs" fontWeight="medium">
          Stream
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {sseStatus}
        </Text>
      </Flex>
    </Flex>
  );
}
