/**
 * Power curve interpolation, Gauss-Hermite expected power integration, and energy calculation.
 */
import { PowerCurve } from './parse';

export const STEP_H = 1 / 6; // 10-minute steps = 1/6 hour

export const HERMITE_X = [
  -5.55035187326468, -4.77399234341122, -4.12199554749184, -3.53197287713768,
  -2.9799912077046, -2.45355212451284, -1.94496294918625, -1.44893425065073,
  -0.961499634418369, -0.479450707079108, 0, 0.479450707079108,
  0.961499634418369, 1.44893425065073, 1.94496294918625, 2.45355212451284,
  2.9799912077046, 3.53197287713768, 4.12199554749184, 4.77399234341122,
  5.55035187326468,
];

export const HERMITE_W = [
  3.72036507013602e-14, 8.81861124204993e-11, 2.57123018005932e-08, 2.17188489805667e-06,
  7.47839886731006e-05, 0.00125498204172641, 0.0114140658374344, 0.0601796466589123,
  0.192120324066998, 0.381669073613502, 0.479023703120178, 0.381669073613502,
  0.192120324066998, 0.0601796466589123, 0.0114140658374344, 0.00125498204172641,
  7.47839886731006e-05, 2.17188489805667e-06, 2.57123018005932e-08, 8.81861124204993e-11,
  3.72036507013602e-14,
];

const INV_SQRT_PI = 1 / Math.sqrt(Math.PI);
const SQRT_2 = Math.SQRT2;

/**
 * Evaluates the power curve at wind speed v:
 * Linear interpolation; 0 below first point; last table value above last point; NaN for NaN wind.
 */
export function interpolatePower(curve: PowerCurve, v: number): number {
  if (Number.isNaN(v)) return NaN;
  const pts = curve.points;
  if (!pts || pts.length === 0) return NaN;

  if (v < pts[0].windSpeed) {
    return 0;
  }

  const lastIdx = pts.length - 1;
  if (v >= pts[lastIdx].windSpeed) {
    return pts[lastIdx].power;
  }

  // Binary search for bracket [pts[i], pts[i+1]]
  let low = 0;
  let high = lastIdx;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (pts[mid].windSpeed <= v) {
      if (mid === lastIdx || pts[mid + 1].windSpeed > v) {
        const p1 = pts[mid];
        const p2 = pts[mid + 1];
        const span = p2.windSpeed - p1.windSpeed;
        if (span <= 1e-9) return p1.power;
        const frac = (v - p1.windSpeed) / span;
        return p1.power + frac * (p2.power - p1.power);
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return pts[lastIdx].power;
}

/**
 * Computes expected power E[P] using 21-node Gauss-Hermite integration:
 * E[P] = (1/√π) Σ_i w_i · P(max(0, v̂ + √2·σ·x_i))
 */
export function calculateExpectedPower(
  curve: PowerCurve,
  vHat: number,
  sigma: number
): number {
  if (Number.isNaN(vHat) || Number.isNaN(sigma)) return NaN;

  let sum = 0;
  for (let i = 0; i < 21; i++) {
    const vSample = Math.max(0, vHat + SQRT_2 * sigma * HERMITE_X[i]);
    const p = interpolatePower(curve, vSample);
    sum += HERMITE_W[i] * p;
  }

  return INV_SQRT_PI * sum;
}

/**
 * Calculates energy in kWh = sum(power_kW) * 1/6.
 */
export function calculateEnergyKWh(powers: Float64Array | number[]): number {
  let sum = 0;
  for (let i = 0; i < powers.length; i++) {
    const p = powers[i];
    if (!Number.isNaN(p)) {
      sum += p;
    }
  }
  return sum * STEP_H;
}
