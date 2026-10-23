/**
 * Color definitions complying with specifications:
 * - Navy: #1D3557
 * - Target turbines: #0072B2
 * - Park H: #E69F00
 * - Park O: #009E73
 * - Outage period: #CC79A7
 */

export const COLORS = {
  navy: '#1D3557',
  target: '#0072B2',
  parkH: '#E69F00',
  parkO: '#009E73',
  outage: '#CC79A7',
  outageBg: 'rgba(204, 121, 167, 0.25)',
  gridLine: '#E2E8F0',
  cardBg: '#FFFFFF',
  textMain: '#1E293B',
  textMuted: '#64748B',
};

export const TURBINE_COLORS = [
  '#0072B2', // Target blue
  '#005B8E', // Darker blue
  '#2C90D1', // Lighter blue
  '#4BA4E0',
  '#1D3557',
];

export function getParkColor(park: string): string {
  const p = park.toUpperCase();
  if (p === 'T' || p === 'A') return COLORS.target;
  if (p === 'H' || p === 'B') return COLORS.parkH;
  if (p === 'O' || p === 'C') return COLORS.parkO;
  return COLORS.navy;
}

export function getTurbineColor(index: number, isTarget = true): string {
  if (isTarget) {
    return TURBINE_COLORS[index % TURBINE_COLORS.length];
  }
  return COLORS.navy;
}
