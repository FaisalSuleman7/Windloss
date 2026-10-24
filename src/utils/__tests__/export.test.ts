import { describe, it, expect } from 'vitest';
import { generateJudgesPredictionsCSV, generateBayWaFormatPredictionsCSV } from '../export';
import { EngineResult } from '../../engine';

describe('Judges predictions CSV export', () => {
  it('formats turbine CSV with exact headers and 4-decimal wind and 2-decimal power', () => {
    const mockResult = {
      report: {
        targetPark: 'T',
        targetTurbines: ['T1'],
        outageDates: ['2026-09-01 00:00', '2026-09-01 00:10'],
        turbines: {
          T1: {
            turbineName: 'T1',
            predictedWindOutage: new Float64Array([8.418732, 8.088123]),
            expectedPowerOutage: new Float64Array([2854.249, 2750.123]),
          },
        },
      },
    } as unknown as EngineResult;

    const csv = generateJudgesPredictionsCSV(mockResult, 'T1');
    const lines = csv.split('\n');

    expect(lines[0]).toBe('turbine_name,timestamp,wind_speed,power_kw');
    expect(lines[1]).toBe('T1,2026-09-01 00:00,8.4187,2854.25');
    expect(lines[2]).toBe('T1,2026-09-01 00:10,8.0881,2750.12');
    expect(lines.length).toBe(3); // 1 header + 2 data rows
  });

  it('formats official BayWa predictions CSV with exact schema', () => {
    const mockResult = {
      report: {
        targetPark: 'T',
        targetTurbines: ['T1', 'T2', 'T3'],
        outageDates: ['2026-09-01 00:00', '2026-09-03 23:50'],
        turbines: {
          T1: {
            turbineName: 'T1',
            predictedWindOutage: new Float64Array([8.07912, 6.21921]),
            expectedPowerOutage: new Float64Array([2850.10, 1500.10]),
          },
          T2: {
            turbineName: 'T2',
            predictedWindOutage: new Float64Array([9.08501, 7.00662]),
            expectedPowerOutage: new Float64Array([3000.10, 1600.10]),
          },
          T3: {
            turbineName: 'T3',
            predictedWindOutage: new Float64Array([8.23473, 6.40344]),
            expectedPowerOutage: new Float64Array([2870.09, 1519.65]),
          },
        },
      },
    } as unknown as EngineResult;

    const csv = generateBayWaFormatPredictionsCSV(mockResult);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('timestamp,T1_wind_speed_ms,T2_wind_speed_ms,T3_wind_speed_ms,park_power_kw,park_energy_kwh');
    expect(lines[1]).toBe('2026-09-01 00:00,8.0791,9.0850,8.2347,8720.29,1453.382');
    expect(lines[2]).toBe('2026-09-03 23:50,6.2192,7.0066,6.4034,4619.85,769.975');
    expect(lines.length).toBe(3);
  });
});
