import { describe, it, expect } from 'vitest';
import { buildGrid, formatTimestamp } from '../grid';
import { ParsedTurbine } from '../parse';

describe('grid builder', () => {
  it('formats wall-clock timestamps correctly', () => {
    const epoch = Date.UTC(2026, 8, 1, 0, 0, 0);
    expect(formatTimestamp(epoch)).toBe('2026-09-01 00:00');
    const epoch2 = Date.UTC(2026, 8, 3, 23, 50, 0);
    expect(formatTimestamp(epoch2)).toBe('2026-09-03 23:50');
  });

  it('builds a continuous 10-minute grid across multiple turbines', () => {
    const tStart = Date.UTC(2026, 8, 1, 0, 0, 0);
    const step10m = 600000;

    const t1: ParsedTurbine = {
      turbineName: 'T1',
      park: 'T',
      fileName: 'T1.csv',
      rows: [
        {
          epochMs: tStart,
          windSpeed: 5.5,
          windDirection: 180,
          ambientTemperature: 20,
          airPressure: 1013,
          windSpeedStdDev: 0.5,
        },
        {
          epochMs: tStart + step10m,
          windSpeed: 6.0,
          windDirection: 182,
          ambientTemperature: 20.1,
          airPressure: 1013,
          windSpeedStdDev: 0.6,
        },
      ],
    };

    const h1: ParsedTurbine = {
      turbineName: 'H1',
      park: 'H',
      fileName: 'H1.csv',
      rows: [
        {
          epochMs: tStart,
          windSpeed: 7.0,
          windDirection: 185,
          ambientTemperature: 19.5,
          airPressure: 1012,
          windSpeedStdDev: 0.7,
        },
        {
          epochMs: tStart + 2 * step10m, // skips step 1
          windSpeed: 8.0,
          windDirection: 190,
          ambientTemperature: 19.8,
          airPressure: 1012,
          windSpeedStdDev: 0.8,
        },
      ],
    };

    const grid = buildGrid([t1, h1]);
    expect(grid.nRows).toBe(3);
    expect(grid.turbines).toEqual(['H1', 'T1']);
    expect(grid.parks).toEqual(['H', 'T']);

    // Check data alignment
    expect(grid.windSpeed['T1'][0]).toBe(5.5);
    expect(grid.windSpeed['T1'][1]).toBe(6.0);
    expect(Number.isNaN(grid.windSpeed['T1'][2])).toBe(true);

    expect(grid.windSpeed['H1'][0]).toBe(7.0);
    expect(Number.isNaN(grid.windSpeed['H1'][1])).toBe(true); // gap
    expect(grid.windSpeed['H1'][2]).toBe(8.0);
  });
});
