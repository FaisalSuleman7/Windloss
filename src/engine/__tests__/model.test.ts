import { describe, it, expect } from 'vitest';
import { fitTurbineModel, predictWind } from '../model';

describe('turbine model fitting', () => {
  it('identifies lag and fits OLS regression', () => {
    const n = 100;
    const v_t = new Float64Array(n);
    const parkH = new Float64Array(n);
    const sectors = new Float64Array(n);
    const fitMask = new Array(n).fill(true);

    // Suppose parkH is shifted by 2 steps: parkH(t - 2) ~ v_t(t)
    for (let t = 0; t < n; t++) {
      parkH[t] = 5 + Math.sin(t / 4) * 3;
      sectors[t] = 0; // Sector N
    }

    for (let t = 0; t < n; t++) {
      const shifted = t >= 2 ? parkH[t - 2] : 5;
      v_t[t] = 0.8 * shifted + 1.2;
    }

    const model = fitTurbineModel(
      'T1',
      v_t,
      ['H'],
      { H: parkH },
      sectors,
      fitMask
    );

    expect(model.lags['H']).toBe(2);
    expect(model.globalCoefficients.aParks['H']).toBeCloseTo(0.8, 2);
    expect(model.globalCoefficients.c).toBeCloseTo(1.2, 2);

    // Predict at stamp 10
    const pred10 = predictWind(model, 10, sectors);
    expect(pred10).toBeCloseTo(v_t[10], 2);
  });
});
