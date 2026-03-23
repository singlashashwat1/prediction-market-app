import { describe, it, expect } from "vitest";
import { formatCents, formatSize } from "../formatters";

describe("formatCents", () => {
  it("converts decimal price to cents string with default fraction digits", () => {
    expect(formatCents(0.5)).toMatch(/50/);
    expect(formatCents(0.5)).toContain("¢");
  });

  it("respects fractionDigits", () => {
    const s = formatCents(0.1234, 2);
    expect(s).toContain("¢");
    expect(s.replace(/[^\d.]/g, "")).toMatch(/12\.34/);
  });
});

describe("formatSize", () => {
  it("formats integers without fractional decimals", () => {
    expect(formatSize(42)).toBe("42");
    expect(formatSize(1000)).toMatch(/^1[,\u202f.]?000$/);
  });

  it("formats non-integers with two decimal places", () => {
    const out = formatSize(10.5);
    expect(out).toMatch(/10[.,]50/);
  });
});
