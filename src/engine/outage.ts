/**
 * Automatic and manual outage detection, target park assignment, and training masks.
 */
import { Grid, formatTimestamp } from './grid';

export interface OutageInfo {
  targetPark: string;
  targetTurbines: string[];
  startIndex: number;
  endIndex: number; // inclusive (last missing stamp)
  startTimestamp: number;
  endTimestamp: number;
  startDateStr: string;
  endDateStr: string;
  durationHours: number;
  stampsCount: number;
}

export type TrainingDataOption = 'notTest' | 'before_outage' | 'all_measured';

/**
 * Detects the longest outage of at least 6 hours (>= 36 stamps) across all parks.
 */
export function detectOutage(grid: Grid): OutageInfo | null {
  const { nRows, parks, parkTurbinesMap, windSpeed, turbines, timestamps, dateStrings } = grid;

  let longestRunLength = 0;
  let bestPark = '';
  let bestStart = -1;
  let bestEnd = -1;

  for (const p of parks) {
    const pTurbines = parkTurbinesMap[p];
    const otherTurbines = turbines.filter((t) => !pTurbines.includes(t));
    if (otherTurbines.length === 0) continue;

    let currentRunStart = -1;

    for (let t = 0; t < nRows; t++) {
      // Check if all turbines of P are NaN at t
      let allDown = true;
      for (const tName of pTurbines) {
        if (!Number.isNaN(windSpeed[tName][t])) {
          allDown = false;
          break;
        }
      }

      // Check if >= 50% of turbines of other parks have a value at t
      let otherValid = 0;
      for (const tName of otherTurbines) {
        if (!Number.isNaN(windSpeed[tName][t])) {
          otherValid++;
        }
      }
      const otherRatio = otherValid / otherTurbines.length;

      const isDown = allDown && otherRatio >= 0.5;

      if (isDown) {
        if (currentRunStart === -1) {
          currentRunStart = t;
        }
      } else {
        if (currentRunStart !== -1) {
          const runLength = t - currentRunStart;
          if (runLength >= 36 && runLength > longestRunLength) {
            longestRunLength = runLength;
            bestPark = p;
            bestStart = currentRunStart;
            bestEnd = t - 1; // inclusive
          }
          currentRunStart = -1;
        }
      }
    }

    // Check tail
    if (currentRunStart !== -1) {
      const runLength = nRows - currentRunStart;
      if (runLength >= 36 && runLength > longestRunLength) {
        longestRunLength = runLength;
        bestPark = p;
        bestStart = currentRunStart;
        bestEnd = nRows - 1;
      }
    }
  }

  if (bestStart === -1 || !bestPark) {
    return null;
  }

  const targetTurbines = [...parkTurbinesMap[bestPark]].sort();
  const stampsCount = bestEnd - bestStart + 1;
  const durationHours = stampsCount / 6;

  return {
    targetPark: bestPark,
    targetTurbines,
    startIndex: bestStart,
    endIndex: bestEnd,
    startTimestamp: timestamps[bestStart],
    endTimestamp: timestamps[bestEnd],
    startDateStr: dateStrings[bestStart],
    endDateStr: dateStrings[bestEnd],
    durationHours,
    stampsCount,
  };
}

/**
 * Creates custom OutageInfo for manual start/end override.
 */
export function createCustomOutage(
  grid: Grid,
  targetPark: string,
  startIndex: number,
  endIndex: number
): OutageInfo {
  const { parkTurbinesMap, timestamps, dateStrings } = grid;
  const targetTurbines = [...(parkTurbinesMap[targetPark] || [])].sort();
  const stampsCount = endIndex - startIndex + 1;
  const durationHours = stampsCount / 6;

  return {
    targetPark,
    targetTurbines,
    startIndex,
    endIndex,
    startTimestamp: timestamps[startIndex],
    endTimestamp: timestamps[endIndex],
    startDateStr: dateStrings[startIndex] || formatTimestamp(timestamps[startIndex]),
    endDateStr: dateStrings[endIndex] || formatTimestamp(timestamps[endIndex]),
    durationHours,
    stampsCount,
  };
}

/**
 * Returns a boolean array mask for known stamps:
 * known(t) = at least one target turbine has a value AND t is outside the outage.
 * If trainingOption is 'before_outage', additionally requires t < outage.startIndex.
 */
export function getKnownMask(
  grid: Grid,
  targetTurbines: string[],
  outageStartIndex: number,
  outageEndIndex: number,
  trainingOption: TrainingDataOption = 'all_measured'
): boolean[] {
  const { nRows, windSpeed } = grid;
  const mask = new Array<boolean>(nRows);

  for (let t = 0; t < nRows; t++) {
    const isOutsideOutage = t < outageStartIndex || t > outageEndIndex;

    let hasTargetValue = false;
    for (const tName of targetTurbines) {
      if (!Number.isNaN(windSpeed[tName][t])) {
        hasTargetValue = true;
        break;
      }
    }

    const isKnown = isOutsideOutage && hasTargetValue;

    if (trainingOption === 'before_outage') {
      mask[t] = isKnown && t < outageStartIndex;
    } else if (trainingOption === 'notTest') {
      let isTest = false;
      if (grid.testSet) {
        for (const tName of targetTurbines) {
          if (grid.testSet[tName]?.[t]) {
            isTest = true;
            break;
          }
        }
        if (!isTest) {
          for (const tName of grid.turbines) {
            if (grid.testSet[tName]?.[t]) {
              isTest = true;
              break;
            }
          }
        }
      }
      mask[t] = isKnown && !isTest;
    } else {
      mask[t] = isKnown;
    }
  }

  return mask;
}

/**
 * Validates that target turbines have at least 7 days (1,008 stamps) of measured data.
 */
export function validateTargetMeasuredData(grid: Grid, targetTurbines: string[]): boolean {
  const { nRows, windSpeed } = grid;
  let count = 0;
  for (let t = 0; t < nRows; t++) {
    for (const tName of targetTurbines) {
      if (!Number.isNaN(windSpeed[tName][t])) {
        count++;
        break;
      }
    }
  }
  // 7 days * 24 hours * 6 stamps/hour = 1008
  return count >= 1008;
}
