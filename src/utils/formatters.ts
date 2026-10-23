/**
 * Number and string formatting utilities complying with technical specifications:
 * - Thousands separator
 * - kWh with 0 decimals
 * - Wind with 2 decimals
 * - Percentages with 1 decimal
 */

export function formatKWh(val: number): string {
  if (Number.isNaN(val)) return 'N/A';
  return `${Math.round(val).toLocaleString('en-US')} kWh`;
}

export function formatKWhRaw(val: number): string {
  if (Number.isNaN(val)) return 'N/A';
  return Math.round(val).toLocaleString('en-US');
}

export function formatWind(val: number): string {
  if (Number.isNaN(val)) return 'N/A';
  return `${val.toFixed(2)} m/s`;
}

export function formatPercent(val: number, showSign = false): string {
  if (Number.isNaN(val)) return 'N/A';
  const sign = showSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)} %`;
}

export function formatCoeff(val: number): string {
  if (Number.isNaN(val)) return 'N/A';
  return val.toFixed(3);
}

export function formatNumber(val: number, decimals = 2): string {
  if (Number.isNaN(val)) return 'N/A';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
