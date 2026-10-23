import { describe, it, expect } from 'vitest';
import { detectOutage, getKnownMask } from '../outage';
import { buildGrid } from '../grid';
import { ParsedTurbine } from '../parse';

describe('outage detection', () => {
  it('detects longest run of at least 6h where park is down and others >= 50% up', () => {
    const tStart = Date.UTC(2026, 8, 1, 0, 0, 0);
    const step10m = 600000;
    const totalStamps = 100; // 100 stamps = ~16.6h

    const tRows = [];
    const hRows = [];

    // Outage from stamp 20 to 60 (41 stamps = 6.83 hours > 6 hours)
    for (let i = 0; i < totalStamps; i++) {
      const ep = tStart + i * step10m;
      // H is always running
      hRows.push({
        epochMs: ep,
        windSpeed: 8.0,
        windDirection: 200,
        ambientTemperature: 15,
        airPressure: 1010,
        windSpeedStdDev: 0.5,
      });

      // T is down between 20 and 60
      if (i < 20 || i > 60) {
        tRows.push({
          epochMs: ep,
          windSpeed: 7.5,
          windDirection: 195,
          ambientTemperature: 15,
          airPressure: 1010,
          windSpeedStdDev: 0.5,
        });
      }
    }

    const tTurbine: ParsedTurbine = {
      turbineName: 'T1',
      park: 'T',
      fileName: 'T1.csv',
      rows: tRows,
    };
    const hTurbine: ParsedTurbine = {
      turbineName: 'H1',
      park: 'H',
      fileName: 'H1.csv',
      rows: hRows,
    };

    const grid = buildGrid([tTurbine, hTurbine]);
    const outage = detectOutage(grid);

    expect(outage).not.toBeNull();
    expect(outage?.targetPark).toBe('T');
    expect(outage?.startIndex).toBe(20);
    expect(outage?.endIndex).toBe(60);
    expect(outage?.stampsCount).toBe(41);
    expect(outage?.durationHours).toBeCloseTo(41 / 6, 2);

    // Test known mask
    const knownMask = getKnownMask(grid, ['T1'], 20, 60, 'all_measured');
    expect(knownMask[19]).toBe(true);
    expect(knownMask[20]).toBe(false);
    expect(knownMask[60]).toBe(false);
    expect(knownMask[61]).toBe(true);

    const beforeMask = getKnownMask(grid, ['T1'], 20, 60, 'before_outage');
    expect(beforeMask[19]).toBe(true);
    expect(beforeMask[20]).toBe(false);
    expect(beforeMask[61]).toBe(false); // excluded in before_outage
  });
});
