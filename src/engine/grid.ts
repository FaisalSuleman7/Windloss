/**
 * Unified 10-minute time grid across all turbine datasets.
 */
import { ParsedTurbine } from './parse';

export interface Grid {
  nRows: number;
  timestamps: Float64Array; // epoch ms
  dateStrings: string[];
  turbines: string[]; // sorted by name
  parks: string[]; // sorted unique park prefixes
  turbineParkMap: Record<string, string>;
  parkTurbinesMap: Record<string, string[]>;
  windSpeed: Record<string, Float64Array>;
  windDirection: Record<string, Float64Array>;
  ambientTemperature: Record<string, Float64Array>;
  airPressure: Record<string, Float64Array>;
  windSpeedStdDev: Record<string, Float64Array>;
}

/**
 * Formats wall-clock epoch ms to 'YYYY-MM-DD HH:MM'.
 */
export function formatTimestamp(epochMs: number): string {
  if (Number.isNaN(epochMs)) return '';
  const d = new Date(epochMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

/**
 * Builds the common 10-minute grid from the earliest to the latest timestamp of all files.
 */
export function buildGrid(turbines: ParsedTurbine[]): Grid {
  if (turbines.length === 0) {
    throw new Error('No turbine data provided to build grid.');
  }

  // Find min and max timestamp
  let minEpoch = Infinity;
  let maxEpoch = -Infinity;

  for (const t of turbines) {
    for (const r of t.rows) {
      if (r.epochMs < minEpoch) minEpoch = r.epochMs;
      if (r.epochMs > maxEpoch) maxEpoch = r.epochMs;
    }
  }

  if (minEpoch === Infinity || maxEpoch === -Infinity) {
    throw new Error('No valid timestamps found in turbine data.');
  }

  // 10-minute step in ms
  const STEP_MS = 600000;
  const nRows = Math.round((maxEpoch - minEpoch) / STEP_MS) + 1;

  const timestamps = new Float64Array(nRows);
  const dateStrings: string[] = new Array(nRows);

  for (let i = 0; i < nRows; i++) {
    const ep = minEpoch + i * STEP_MS;
    timestamps[i] = ep;
    dateStrings[i] = formatTimestamp(ep);
  }

  // Sort turbines by name
  const sortedTurbines = [...turbines].sort((a, b) => a.turbineName.localeCompare(b.turbineName));
  const turbineNames = sortedTurbines.map((t) => t.turbineName);

  const turbineParkMap: Record<string, string> = {};
  const parkTurbinesMap: Record<string, string[]> = {};

  for (const t of sortedTurbines) {
    turbineParkMap[t.turbineName] = t.park;
    if (!parkTurbinesMap[t.park]) {
      parkTurbinesMap[t.park] = [];
    }
    parkTurbinesMap[t.park].push(t.turbineName);
  }

  const parks = Object.keys(parkTurbinesMap).sort();

  // Initialize matrices filled with NaN
  const windSpeed: Record<string, Float64Array> = {};
  const windDirection: Record<string, Float64Array> = {};
  const ambientTemperature: Record<string, Float64Array> = {};
  const airPressure: Record<string, Float64Array> = {};
  const windSpeedStdDev: Record<string, Float64Array> = {};

  for (const name of turbineNames) {
    const ws = new Float64Array(nRows);
    const wd = new Float64Array(nRows);
    const temp = new Float64Array(nRows);
    const press = new Float64Array(nRows);
    const std = new Float64Array(nRows);

    ws.fill(NaN);
    wd.fill(NaN);
    temp.fill(NaN);
    press.fill(NaN);
    std.fill(NaN);

    windSpeed[name] = ws;
    windDirection[name] = wd;
    ambientTemperature[name] = temp;
    airPressure[name] = press;
    windSpeedStdDev[name] = std;
  }

  // Populate data
  for (const t of sortedTurbines) {
    const wsArr = windSpeed[t.turbineName];
    const wdArr = windDirection[t.turbineName];
    const tempArr = ambientTemperature[t.turbineName];
    const pressArr = airPressure[t.turbineName];
    const stdArr = windSpeedStdDev[t.turbineName];

    for (const r of t.rows) {
      const idx = Math.round((r.epochMs - minEpoch) / STEP_MS);
      if (idx >= 0 && idx < nRows) {
        wsArr[idx] = r.windSpeed;
        wdArr[idx] = r.windDirection;
        tempArr[idx] = r.ambientTemperature;
        pressArr[idx] = r.airPressure;
        stdArr[idx] = r.windSpeedStdDev;
      }
    }
  }

  return {
    nRows,
    timestamps,
    dateStrings,
    turbines: turbineNames,
    parks,
    turbineParkMap,
    parkTurbinesMap,
    windSpeed,
    windDirection,
    ambientTemperature,
    airPressure,
    windSpeedStdDev,
  };
}
