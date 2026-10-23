import { describe, it, expect } from 'vitest';
import { generateJudgesPredictionsCSV } from '../export';
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
});
