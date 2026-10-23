/**
 * Backtesting engine for model evaluation, park combination selection, and uncertainty distribution.
 */
import { Grid } from './grid';
import { OutageInfo } from './outage';
import { fitTurbineModel, predictWind, getModelSigma } from './model';
import { interpolatePower, calculateExpectedPower, STEP_H } from './power';
import { PowerCurve } from './parse';
import { percentile, mean } from './linalg';

export interface TurbineWindowResult {
  turbineName: string;
  windRMSE: number;
  windMAE: number;
  powerRMSE: number;
  powerMAE: number;
  trueEnergyKWh: number;
  predEnergyKWh: number;
  deltaEPercent: number; // 100 * (E_pred / E_true - 1)
}

export interface WindowResult {
  windowIndex: number;
  startIndex: number;
  endIndex: number;
  testStampsCount: number;
  turbines: Record<string, TurbineWindowResult>;
  parkTrueEnergyKWh: number;
  parkPredEnergyKWh: number;
  parkDeltaEPercent: number;
}

export interface ParkCombinationResult {
  combinationKey: string; // e.g. "H+O", "H", "O"
  parks: string[];
  selectionScore: number; // mean of median |ΔE%|
  meanWindRMSE: number;
  windowsCount: number;
  isChosen: boolean;
  windows: WindowResult[];
  turbineMedians: Record<string, number>; // median |ΔE%| per turbine
  turbineDeltaEArrays: Record<string, number[]>; // array of ΔE% over all windows
  parkDeltaEArray: number[]; // array of park ΔE% over all windows
}

/**
 * Generates all non-empty combinations of an array of park names.
 */
export function getParkCombinations(parks: string[]): string[][] {
  const result: string[][] = [];
  const n = parks.length;
  const total = 1 << n;

  for (let mask = 1; mask < total; mask++) {
    const subset: string[] = [];
    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) !== 0) {
        subset.push(parks[i]);
      }
    }
    result.push(subset.sort());
  }

  // Sort combinations: single parks first, then pairs, etc., alphabetically
  result.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return a.join('+').localeCompare(b.join('+'));
  });

  return result;
}

/**
 * Runs backtest for a specific combination of reference parks.
 */
export function runBacktestForCombination(
  grid: Grid,
  outage: OutageInfo,
  knownMask: boolean[],
  combinationParks: string[],
  parkMeans: Record<string, Float64Array>,
  sectors: Float64Array,
  powerCurves: Record<string, PowerCurve>
): ParkCombinationResult {
  const { nRows, windSpeed } = grid;
  const { durationHours, targetTurbines } = outage;

  // Window length L in hours, stamps count = L * 6
  const L = durationHours;
  const nWindowStamps = Math.round(L * 6);
  const stepStamps = Math.round((L + 12) * 6); // step = L + 12h
  const bufferStamps = 72; // 12 hours = 72 10-minute stamps

  // Find first and last known stamp index
  let firstKnownIdx = -1;
  let lastKnownIdx = -1;
  for (let t = 0; t < nRows; t++) {
    if (knownMask[t]) {
      if (firstKnownIdx === -1) firstKnownIdx = t;
      lastKnownIdx = t;
    }
  }

  if (firstKnownIdx === -1 || lastKnownIdx === -1) {
    throw new Error('No known stamps available for backtest.');
  }

  const combinationKey = combinationParks.join('+');
  const windows: WindowResult[] = [];
  const turbineWindRMSELists: Record<string, number[]> = {};
  const turbineDeltaEArrays: Record<string, number[]> = {};
  const parkDeltaEArray: number[] = [];

  for (const tName of targetTurbines) {
    turbineWindRMSELists[tName] = [];
    turbineDeltaEArrays[tName] = [];
  }

  let wStart = firstKnownIdx;
  let wIdx = 0;

  while (wStart + nWindowStamps - 1 <= lastKnownIdx) {
    const wEnd = wStart + nWindowStamps - 1;

    // test = stamps in [wStart, wEnd] that are known
    const testStamps: number[] = [];
    let targetValuesCount = 0;

    for (let t = wStart; t <= wEnd; t++) {
      if (knownMask[t]) {
        testStamps.push(t);
        for (const tName of targetTurbines) {
          if (!Number.isNaN(windSpeed[tName][t])) {
            targetValuesCount++;
          }
        }
      }
    }

    // Skip condition:
    // "skip the window if the target turbines have on average < 50 % values there or test has < L·6·0.5 stamps."
    const expectedValues = targetTurbines.length * nWindowStamps;
    const avgTargetRatio = expectedValues > 0 ? targetValuesCount / expectedValues : 0;
    const minTestStamps = nWindowStamps * 0.5;

    if (avgTargetRatio < 0.5 || testStamps.length < minTestStamps) {
      wStart += stepStamps;
      continue;
    }

    // fit = known minus [wStart - 12h, wEnd + 12h]
    const windowFitMask = new Array<boolean>(nRows);
    const excludeStart = wStart - bufferStamps;
    const excludeEnd = wEnd + bufferStamps;

    for (let t = 0; t < nRows; t++) {
      windowFitMask[t] = knownMask[t] && (t < excludeStart || t > excludeEnd);
    }

    // Fit model on fit, predict test
    const turbineResults: Record<string, TurbineWindowResult> = {};
    let windowParkTrueE = 0;
    let windowParkPredE = 0;

    for (const tName of targetTurbines) {
      const v_t = windSpeed[tName];
      const pCurve = powerCurves[tName];
      if (!pCurve) {
        throw new Error(`Missing power curve for target turbine ${tName}`);
      }

      const model = fitTurbineModel(
        tName,
        v_t,
        combinationParks,
        parkMeans,
        sectors,
        windowFitMask
      );

      let sumSqWind = 0;
      let sumAbsWind = 0;
      let sumSqPower = 0;
      let sumAbsPower = 0;
      let countWind = 0;
      let sumTruePower = 0;
      let sumPredPower = 0;

      for (const tau of testStamps) {
        const vReal = v_t[tau];
        const vHat = predictWind(model, tau, sectors);

        if (!Number.isNaN(vReal) && !Number.isNaN(vHat)) {
          const eWind = vReal - vHat;
          sumSqWind += eWind * eWind;
          sumAbsWind += Math.abs(eWind);
          countWind++;

          const pTrue = interpolatePower(pCurve, vReal);
          const sigma = getModelSigma(model, vHat);
          const pPred = calculateExpectedPower(pCurve, vHat, sigma);

          if (!Number.isNaN(pTrue) && !Number.isNaN(pPred)) {
            const ePower = pTrue - pPred;
            sumSqPower += ePower * ePower;
            sumAbsPower += Math.abs(ePower);
            sumTruePower += pTrue;
            sumPredPower += pPred;
          }
        }
      }

      const windRMSE = countWind > 0 ? Math.sqrt(sumSqWind / countWind) : NaN;
      const windMAE = countWind > 0 ? sumAbsWind / countWind : NaN;
      const powerRMSE = countWind > 0 ? Math.sqrt(sumSqPower / countWind) : NaN;
      const powerMAE = countWind > 0 ? sumAbsPower / countWind : NaN;

      const trueEnergyKWh = sumTruePower * STEP_H;
      const predEnergyKWh = sumPredPower * STEP_H;
      const deltaEPercent =
        trueEnergyKWh > 0 ? 100 * (predEnergyKWh / trueEnergyKWh - 1) : 0;

      turbineResults[tName] = {
        turbineName: tName,
        windRMSE,
        windMAE,
        powerRMSE,
        powerMAE,
        trueEnergyKWh,
        predEnergyKWh,
        deltaEPercent,
      };

      if (!Number.isNaN(windRMSE)) {
        turbineWindRMSELists[tName].push(windRMSE);
      }
      turbineDeltaEArrays[tName].push(deltaEPercent);

      windowParkTrueE += trueEnergyKWh;
      windowParkPredE += predEnergyKWh;
    }

    const parkDeltaEPercent =
      windowParkTrueE > 0 ? 100 * (windowParkPredE / windowParkTrueE - 1) : 0;
    parkDeltaEArray.push(parkDeltaEPercent);

    windows.push({
      windowIndex: wIdx,
      startIndex: wStart,
      endIndex: wEnd,
      testStampsCount: testStamps.length,
      turbines: turbineResults,
      parkTrueEnergyKWh: windowParkTrueE,
      parkPredEnergyKWh: windowParkPredE,
      parkDeltaEPercent,
    });

    wIdx++;
    wStart += stepStamps;
  }

  // Selection score = mean over target turbines of the median |ΔE%| over the windows
  const turbineMedians: Record<string, number> = {};
  const mediansList: number[] = [];
  const allWindRMSEs: number[] = [];

  for (const tName of targetTurbines) {
    const absList = turbineDeltaEArrays[tName].map((d) => Math.abs(d));
    const med = percentile(absList, 50);
    turbineMedians[tName] = med;
    mediansList.push(med);

    for (const r of turbineWindRMSELists[tName]) {
      allWindRMSEs.push(r);
    }
  }

  const selectionScore = mean(mediansList);
  const meanWindRMSE = mean(allWindRMSEs);

  return {
    combinationKey,
    parks: combinationParks,
    selectionScore,
    meanWindRMSE,
    windowsCount: windows.length,
    isChosen: false,
    windows,
    turbineMedians,
    turbineDeltaEArrays,
    parkDeltaEArray,
  };
}

/**
 * Runs backtest for all non-empty park combinations and chooses the lowest score.
 */
export function evaluateAllParkCombinations(
  grid: Grid,
  outage: OutageInfo,
  knownMask: boolean[],
  usedParks: string[],
  parkMeans: Record<string, Float64Array>,
  sectors: Float64Array,
  powerCurves: Record<string, PowerCurve>,
  onProgress?: (combIndex: number, total: number, key: string) => void
): { results: ParkCombinationResult[]; chosenCombination: ParkCombinationResult } {
  const combinations = getParkCombinations(usedParks);
  const results: ParkCombinationResult[] = [];

  for (let i = 0; i < combinations.length; i++) {
    const comb = combinations[i];
    if (onProgress) {
      onProgress(i + 1, combinations.length, comb.join('+'));
    }

    const res = runBacktestForCombination(
      grid,
      outage,
      knownMask,
      comb,
      parkMeans,
      sectors,
      powerCurves
    );
    results.push(res);
  }

  // Find lowest selection score
  let bestScore = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].selectionScore < bestScore) {
      bestScore = results[i].selectionScore;
      bestIdx = i;
    }
  }

  results[bestIdx].isChosen = true;

  return {
    results,
    chosenCombination: results[bestIdx],
  };
}
