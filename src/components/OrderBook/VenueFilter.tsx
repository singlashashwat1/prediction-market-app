"use client";

import { HStack, Button } from "@chakra-ui/react";
import { Venue } from "@/lib/types";

export type VenueView = "combined" | Venue;

interface VenueFilterProps {
  active: VenueView;
  onChange: (view: VenueView) => void;
}

const OPTIONS: { value: VenueView; label: string }[] = [
  { value: "combined", label: "Combined" },
  { value: "polymarket", label: "Polymarket" },
  { value: "kalshi", label: "Kalshi" },
];

export function VenueFilter({ active, onChange }: VenueFilterProps) {
  return (
    <HStack gap={1}>
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          variant={active === opt.value ? "solid" : "outline"}
          colorPalette={active === opt.value ? "blue" : "gray"}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </HStack>
  );
}
