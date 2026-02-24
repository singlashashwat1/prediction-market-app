export function formatCents(price: number, fractionDigits = 1): string {
  const cents = price * 100;
  const formatted = cents.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${formatted}¢`;
}

export function formatSize(size: number): string {
  if (Number.isInteger(size)) return size.toLocaleString();
  return size.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
