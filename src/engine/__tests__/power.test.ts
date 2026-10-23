import { describe, it, expect } from 'vitest';
import {
  interpolatePower,
  calculateExpectedPower,
  calculateEnergyKWh,
  STEP_H,
} from '../power';
import { PowerCurve } from '../parse';

describe('power and energy calculation', () => {
  const sampleCurve: PowerCurve = {
    turbineName: 'T1',
    points: [
      { windSpeed: 3.0, power: 0 },
      { windSpeed: 5.0, power: 250 },
      { windSpeed: 10.0, power: 1500 },
      { windSpeed: 15.0, power: 2500 },
    ],
  };

  it('interpolates power linearly and handles boundaries', () => {
    expect(interpolatePower(sampleCurve, 2.0)).toBe(0); // below min
    expect(interpolatePower(sampleCurve, 3.0)).toBe(0);
    expect(interpolatePower(sampleCurve, 4.0)).toBe(125); // midpoint of 3 and 5
    expect(interpolatePower(sampleCurve, 10.0)).toBe(1500);
    expect(interpolatePower(sampleCurve, 20.0)).toBe(2500); // above max
    expect(Number.isNaN(interpolatePower(sampleCurve, NaN))).toBe(true);
  });

  it('integrates expected power with Gauss-Hermite', () => {
    // With 0 sigma, expected power should equal point evaluation
    const pZeroSigma = calculateExpectedPower(sampleCurve, 7.5, 0.00001);
    const pDirect = interpolatePower(sampleCurve, 7.5);
    expect(pZeroSigma).toBeCloseTo(pDirect, 1);

    // With realistic sigma (e.g. 1.2), expected power accounts for curvature
    const pWithSigma = calculateExpectedPower(sampleCurve, 7.5, 1.2);
    expect(pWithSigma).toBeGreaterThan(0);
  });

  it('calculates energy with exactly 1/6 factor', () => {
    expect(STEP_H).toBeCloseTo(1 / 6, 6);
    // 6 stamps of 600 kW = 600 kWh
    const powers = [600, 600, 600, 600, 600, 600];
    expect(calculateEnergyKWh(powers)).toBeCloseTo(600, 4);
  });
});
