import { describe, it, expect } from 'vitest';
import {
  detectDelimiter,
  extractTurbineName,
  parseNumber,
  parseTimestamp,
  parseTurbineContent,
  parsePowerCurveContent,
} from '../parse';

describe('parse utilities', () => {
  it('detects CSV delimiter by header line', () => {
    expect(detectDelimiter('timestamp;wind_speed;direction')).toBe(';');
    expect(detectDelimiter('timestamp,wind_speed,direction')).toBe(',');
    expect(detectDelimiter('timestamp\twind_speed\tdirection')).toBe('\t');
  });

  it('extracts turbine name and park prefix', () => {
    expect(extractTurbineName('T1_data.csv')).toEqual({ turbineName: 'T1', park: 'T' });
    expect(extractTurbineName('A2.csv')).toEqual({ turbineName: 'A2', park: 'A' });
    expect(extractTurbineName('WP12_scada.csv')).toEqual({ turbineName: 'WP12', park: 'WP' });
    expect(extractTurbineName('H3_power_curve.csv')).toEqual({ turbineName: 'H3', park: 'H' });
  });

  it('parses numbers and handles decimal comma', () => {
    expect(parseNumber('5,3')).toBe(5.3);
    expect(parseNumber('12.45')).toBe(12.45);
    expect(parseNumber(null)).toBeNaN();
    expect(parseNumber('NaN')).toBeNaN();
    expect(parseNumber('')).toBeNaN();
    expect(parseNumber('invalid')).toBeNaN();
  });

  it('parses ISO and German day-first timestamps', () => {
    const isoEpoch = parseTimestamp('2026-09-01 00:10:00', false);
    const dayFirstEpoch = parseTimestamp('01.09.2026 00:10', true);
    expect(isoEpoch).toBe(dayFirstEpoch);
    expect(isoEpoch).toBe(Date.UTC(2026, 8, 1, 0, 10, 0));
  });

  it('parses turbine CSV with European semicolon and comma format', () => {
    const csvContent = `timestamp;wind_speed;wind_direction
01.09.2026 00:00;5,4;180
01.09.2026 00:10;6,2;185
01.09.2026 00:20;6,8;190`;

    const res = parseTurbineContent(csvContent, 'T1_data.csv');
    expect(res.error).toBeUndefined();
    expect(res.turbine).toBeDefined();
    expect(res.turbine?.turbineName).toBe('T1');
    expect(res.turbine?.park).toBe('T');
    expect(res.turbine?.rows.length).toBe(3);
    expect(res.turbine?.rows[0].windSpeed).toBe(5.4);
    expect(res.turbine?.rows[0].windDirection).toBe(180);
  });

  it('fails with clear error if wind speed column has < 5% readable numbers', () => {
    const csvContent = `timestamp;wind_speed
2026-09-01 00:00;corrupted
2026-09-01 00:10;corrupted
2026-09-01 00:20;corrupted`;

    const res = parseTurbineContent(csvContent, 'T1_corrupt.csv');
    expect(res.error).toBeDefined();
    expect(res.error).toContain('T1_corrupt.csv');
    expect(res.error).toContain('less than 5%');
  });

  it('parses power curve file and sorts by wind speed', () => {
    const pcCsv = `wind_speed,power_kw
10,1200
5,250
3,0
15,2000`;

    const res = parsePowerCurveContent(pcCsv, 'T1_power_curve.csv');
    expect(res.error).toBeUndefined();
    expect(res.powerCurve?.turbineName).toBe('T1');
    expect(res.powerCurve?.points.length).toBe(4);
    // Should be sorted ascending
    expect(res.powerCurve?.points[0].windSpeed).toBe(3);
    expect(res.powerCurve?.points[3].windSpeed).toBe(15);
  });
});
