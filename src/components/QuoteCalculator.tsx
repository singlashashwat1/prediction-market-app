"use client";

import { useState, useMemo } from "react";
import { Box, Flex, Text, Input, VStack, HStack } from "@chakra-ui/react";
import { AggregatedOrderBook, Outcome, QuoteFill } from "@/lib/types";
import { calculateQuote } from "@/lib/quoteEngine";

interface QuoteCalculatorProps {
  orderBook: AggregatedOrderBook;
}

function VenueSplitDisplay({ fills }: { fills: QuoteFill[] }) {
  const polyFills = fills.filter((f) => f.venue === "polymarket");
  const kalshiFills = fills.filter((f) => f.venue === "kalshi");

  const polyShares = polyFills.reduce((s, f) => s + f.shares, 0);
  const polyCost = polyFills.reduce((s, f) => s + f.cost, 0);
  const kalshiShares = kalshiFills.reduce((s, f) => s + f.shares, 0);
  const kalshiCost = kalshiFills.reduce((s, f) => s + f.cost, 0);

  return (
    <VStack gap={2} width="100%">
      {polyShares > 0 && (
        <Flex
          justify="space-between"
          width="100%"
          p={2}
          bg="blue.500/10"
          borderRadius="md"
          borderLeft="3px solid"
          borderColor="blue.400"
        >
          <Text fontSize="sm" fontWeight="medium">
            Polymarket
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            {polyShares.toFixed(1)} shares &middot; ${polyCost.toFixed(2)}
          </Text>
        </Flex>
      )}
      {kalshiShares > 0 && (
        <Flex
          justify="space-between"
          width="100%"
          p={2}
          bg="green.500/10"
          borderRadius="md"
          borderLeft="3px solid"
          borderColor="green.400"
        >
          <Text fontSize="sm" fontWeight="medium">
            Kalshi
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            {kalshiShares.toFixed(1)} shares &middot; ${kalshiCost.toFixed(2)}
          </Text>
        </Flex>
      )}
    </VStack>
  );
}

export function QuoteCalculator({ orderBook }: QuoteCalculatorProps) {
  const [amount, setAmount] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("Yes");

  const dollarAmount = parseFloat(amount) || 0;

  const quote = useMemo(
    () => calculateQuote(orderBook, dollarAmount, outcome),
    [orderBook, dollarAmount, outcome]
  );

  return (
    <Box p={5} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200" bg="whiteAlpha.50">
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Quote Calculator
      </Text>

      <VStack gap={4} align="stretch">
        <Box>
          <Text fontSize="sm" color="fg.muted" mb={1}>
            I want to spend
          </Text>
          <Input
            type="number"
            placeholder="Enter dollar amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            size="lg"
            fontFamily="mono"
          />
        </Box>

        <Box>
          <Text fontSize="sm" color="fg.muted" mb={1}>
            Outcome
          </Text>
          <HStack gap={2}>
            <Box
              as="button"
              flex={1}
              py={2}
              px={4}
              borderRadius="md"
              fontWeight="semibold"
              bg={outcome === "Yes" ? "green.500" : "whiteAlpha.100"}
              color={outcome === "Yes" ? "white" : "fg.muted"}
              onClick={() => setOutcome("Yes")}
              cursor="pointer"
              textAlign="center"
              _hover={{ opacity: 0.8 }}
            >
              Yes
            </Box>
            <Box
              as="button"
              flex={1}
              py={2}
              px={4}
              borderRadius="md"
              fontWeight="semibold"
              bg={outcome === "No" ? "red.500" : "whiteAlpha.100"}
              color={outcome === "No" ? "white" : "fg.muted"}
              onClick={() => setOutcome("No")}
              cursor="pointer"
              textAlign="center"
              _hover={{ opacity: 0.8 }}
            >
              No
            </Box>
          </HStack>
        </Box>

        {dollarAmount > 0 && (
          <Box pt={2} borderTop="1px solid" borderColor="whiteAlpha.200">
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm" color="fg.muted">
                You would receive
              </Text>
              <Text fontSize="lg" fontWeight="bold" fontFamily="mono">
                {quote.totalShares.toLocaleString()} shares
              </Text>
            </Flex>
            <Flex justify="space-between" mb={3}>
              <Text fontSize="sm" color="fg.muted">
                Avg price
              </Text>
              <Text fontSize="sm" fontFamily="mono">
                ${quote.avgPrice.toFixed(4)}
              </Text>
            </Flex>
            {quote.unfilled > 0 && (
              <Text fontSize="xs" color="orange.300" mb={3}>
                ${quote.unfilled.toFixed(2)} could not be filled (insufficient
                liquidity)
              </Text>
            )}

            <Text fontSize="sm" fontWeight="medium" mb={2}>
              Fill breakdown
            </Text>
            <VenueSplitDisplay fills={quote.fills} />
          </Box>
        )}
      </VStack>
    </Box>
  );
}
