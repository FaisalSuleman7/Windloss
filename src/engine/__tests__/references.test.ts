import { describe, it, expect } from 'vitest';
import { screenReferenceTurbines } from '../references';
import { buildGrid } from '../grid';
import { OutageInfo } from '../outage';
import { ParsedTurbine } from '../parse';

describe('reference screening and sectors', () => {
  it('screens reference turbines by coverage and Pearson correlation', () => {
    const tStart = Date.UTC(2026, 8, 1, 0, 0, 0);
    const step10m = 600000;
    const n = 50;

    const tRows = [];
    const goodRefRows = [];
    const lowCorrRefRows = [];

    for (let i = 0; i < n; i++) {
      const ep = tStart + i * step10m;
      const baseWind = 5 + Math.sin(i / 5) * 3;

      goodRefRows.push({
        epochMs: ep,
        windSpeed: baseWind + 0.2, // high correlation
        windDirection: 180,
        ambientTemperature: 15,
        airPressure: 1010,
        windSpeedStdDev: 0.5,
      });

      lowCorrRefRows.push({
        epochMs: ep,
        windSpeed: 5 + (i % 2 === 0 ? 4 : -4), // uncorrelated noise
        windDirection: 180,
        ambientTemperature: 15,
        airPressure: 1010,
        windSpeedStdDev: 0.5,
      });

      // Target down in 10..30
      if (i < 10 || i > 30) {
        tRows.push({
          epochMs: ep,
          windSpeed: baseWind,
          windDirection: 180,
          ambientTemperature: 15,
          airPressure: 1010,
          windSpeedStdDev: 0.5,
        });
      }
    }

    const grid = buildGrid([
      { turbineName: 'T1', park: 'T', fileName: 'T1.csv', rows: tRows },
      { turbineName: 'H1', park: 'H', fileName: 'H1.csv', rows: goodRefRows },
      { turbineName: 'O1', park: 'O', fileName: 'O1.csv', rows: lowCorrRefRows },
    ]);

    const outage: OutageInfo = {
      targetPark: 'T',
      targetTurbines: ['T1'],
      startIndex: 10,
      endIndex: 30,
      startTimestamp: tStart + 10 * step10m,
      endTimestamp: tStart + 30 * step10m,
      startDateStr: '2026-09-01 01:40',
      endDateStr: '2026-09-01 05:00',
      durationHours: 21 / 6,
      stampsCount: 21,
    };

    const knownMask = new Array(n).fill(true);
    for (let i = 10; i <= 30; i++) knownMask[i] = false;

    const screening = screenReferenceTurbines(grid, outage, knownMask);
    expect(screening.usedTurbines).toContain('H1');
    const h1Screening = screening.screenings.find((s) => s.turbineName === 'H1');
    expect(h1Screening?.isUsed).toBe(true);
    expect(h1Screening?.coverage).toBe(1.0);
    expect(h1Screening?.rWithTarget).toBeGreaterThan(0.9);

    const o1Screening = screening.screenings.find((s) => s.turbineName === 'O1');
    expect(o1Screening?.rejectionReason).toBeDefined();
  });
});
