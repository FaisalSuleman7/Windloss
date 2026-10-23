import { describe, it, expect } from 'vitest';
import {
  mean,
  sampleVariance,
  sampleStd,
  pearsonCorrelation,
  percentile,
  solveOLS,
} from '../linalg';

describe('linalg utilities', () => {
  it('computes mean correctly ignoring NaNs', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
    expect(mean([1, NaN, 3])).toBe(2);
    expect(Number.isNaN(mean([NaN, NaN]))).toBe(true);
  });

  it('computes sample variance and std (ddof = 1)', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9]: mean = 5, variance = 4.5714, std = 2.138
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const m = mean(data);
    const variance = sampleVariance(data, m);
    const std = sampleStd(data, m);
    expect(variance).toBeCloseTo(32 / 7, 4);
    expect(std).toBeCloseTo(Math.sqrt(32 / 7), 4);
  });

  it('computes Pearson correlation correctly', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    expect(pearsonCorrelation(x, y)).toBeCloseTo(1.0, 5);

    const yNeg = [10, 8, 6, 4, 2];
    expect(pearsonCorrelation(x, yNeg)).toBeCloseTo(-1.0, 5);

    const withNaNX = [1, NaN, 3, 4, 5];
    const withNaNY = [2, 999, 6, 8, 10];
    expect(pearsonCorrelation(withNaNX, withNaNY)).toBeCloseTo(1.0, 5);
  });

  it('computes percentiles with linear interpolation (numpy default)', () => {
    const arr = [15, 20, 35, 40, 50];
    // p0 = 15, p100 = 50, p50 = 35
    expect(percentile(arr, 0)).toBe(15);
    expect(percentile(arr, 100)).toBe(50);
    expect(percentile(arr, 50)).toBe(35);
    // index for p40: (5 - 1) * 0.4 = 1.6 -> arr[1]*(1 - 0.6) + arr[2]*0.6 = 20*0.4 + 35*0.6 = 8 + 21 = 29
    expect(percentile(arr, 40)).toBeCloseTo(29, 4);
  });

  it('solves OLS linear regression with intercept', () => {
    // y = 2 * x1 + 3 * x2 + 5
    const x1 = [1, 2, 3, 4, 5, 6, 7];
    const x2 = [2, 1, 4, 3, 5, 7, 6];
    const y = x1.map((v, i) => 2 * v + 3 * x2[i] + 5);

    const beta = solveOLS([x1, x2], y);
    expect(beta[0]).toBeCloseTo(2.0, 4); // coeff for x1
    expect(beta[1]).toBeCloseTo(3.0, 4); // coeff for x2
    expect(beta[2]).toBeCloseTo(5.0, 4); // intercept c
  });
});
