/**
 * Color definitions complying with specifications:
 * - Navy: #1D3557
 * - Target turbines: #0072B2
 * - Reference park palette: ['#E69F00','#009E73','#7A5195','#D55E00','#56B4E9','#CC9A06','#8E6C8A']
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

export const REF_PARK_PALETTE = [
  '#E69F00',
  '#009E73',
  '#7A5195',
  '#D55E00',
  '#56B4E9',
  '#CC9A06',
  '#8E6C8A',
];

export function makeParkColors(parks: string[], targetPark: string): (park: string) => string {
  const normTarget = targetPark.toUpperCase();
  const refParks = Array.from(new Set(parks.map((p) => p.toUpperCase())))
    .filter((p) => p !== normTarget)
    .sort();
  const map: Record<string, string> = {};
  map[normTarget] = '#0072B2';
  refParks.forEach((p, idx) => {
    map[p] = REF_PARK_PALETTE[idx % REF_PARK_PALETTE.length];
  });

  return (park: string) => {
    const up = park.toUpperCase();
    return map[up] || (up === normTarget ? '#0072B2' : REF_PARK_PALETTE[0]);
  };
}

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

export function getTurbineParkShade(
  park: string,
  indexInPark: number,
  _totalInPark = 4
): string {
  const p = park.toUpperCase();
  if (p === 'T') {
    const shades = ['#0072B2', '#3399D4', '#004E7A', '#66B2E0'];
    return shades[indexInPark % shades.length];
  }
  if (p === 'H') {
    const shades = ['#E69F00', '#F0B738', '#B87A00', '#F5CD70', '#8A5C00'];
    return shades[indexInPark % shades.length];
  }
  if (p === 'O') {
    const shades = ['#009E73', '#2EB891', '#006B4E', '#5CD1AF'];
    return shades[indexInPark % shades.length];
  }
  // Generic fallback:
  const base = getParkColor(park);
  const shades = [base, '#7A5195', '#D55E00', '#56B4E9'];
  return shades[indexInPark % shades.length];
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const toHexPart = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`.toUpperCase();
}

function mixWithWhite([r, g, b]: [number, number, number], whiteRatio: number): string {
  return toHex([
    r * (1 - whiteRatio) + 255 * whiteRatio,
    g * (1 - whiteRatio) + 255 * whiteRatio,
    b * (1 - whiteRatio) + 255 * whiteRatio,
  ]);
}

function mixWithBlack([r, g, b]: [number, number, number], blackRatio: number): string {
  return toHex([
    r * (1 - blackRatio),
    g * (1 - blackRatio),
    b * (1 - blackRatio),
  ]);
}

export function getParkSpeedBinColors(park: string, baseColor?: string): string[] {
  const p = park.toUpperCase();
  if (p === 'H' || p === 'B') {
    return ['#FBE3B0', '#F5C766', '#E69F00', '#B37A00', '#6B4900'];
  }
  if (p === 'O' || p === 'C') {
    return ['#B8E6D6', '#66C7A8', '#009E73', '#00704F', '#00402D'];
  }
  if (p === 'T' || p === 'A') {
    return ['#BBD9EE', '#6FB0DB', '#0072B2', '#00507D', '#002E48'];
  }
  const color = baseColor || getParkColor(park);
  const rgb = parseHex(color);
  return [
    mixWithWhite(rgb, 0.70),
    mixWithWhite(rgb, 0.40),
    color,
    mixWithBlack(rgb, 0.30),
    mixWithBlack(rgb, 0.60),
  ];
}

