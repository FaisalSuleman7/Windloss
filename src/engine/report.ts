/**
 * Final estimation report, uncertainty intervals, and air density sensitivity.
 */
import { Grid } from './grid';
import { OutageInfo } from './outage';
import {
  TurbineModel,
  fitTurbineModel,
  predictWind,
  getModelSigma,
  computeCenteredRunningMean,
  computeTurbulenceSeries,
} from './model';
import { PowerCurve } from './parse';
import { calculateExpectedPower, STEP_H } from './power';
import { ParkCombinationResult } from './backtest';
import { percentile, sampleStd, mean } from './linalg';
import { TestPeriodResult } from './testPeriod';

export const R_DRY = 287.05;
export const RHO_STD = 1.225;

export interface TurbineFinalEstimate {
  turbineName: string;
  model: TurbineModel;
  predictedWindOutage: Float64Array; // outage stamps
  expectedPowerOutage: Float64Array; // outage stamps in kW
  energyKWh: number;
  d10: number;
  d50: number;
  d90: number;
  range80LowerKWh: number;
  range80UpperKWh: number;
  densityPowerOutage?: Float64Array;
  densityEnergyKWh?: number;
  densityRange80LowerKWh?: number;
  densityRange80UpperKWh?: number;
}

export interface AirDensityResult {
  isApplicable: boolean;
  referenceParkUsed?: string;
  deltaP_hPa?: number;
  meanRhoOutage?: number;
  correctedParkEnergyKWh?: number;
  sensitivityPercent?: number; // 100 * (E_corrected / E - 1)
  reason?: string;
  rhoOutage?: Float64Array;
  correctedParkRange80LowerKWh?: number;
  correctedParkRange80UpperKWh?: number;
}

export interface FinalReport {
  targetPark: string;
  targetTurbines: string[];
  chosenParks: string[];
  trainingOption: string;
  methodOptions?: {
    nSectors: number;
    smooth: number;
    turbulence: boolean;
  };
  turbulenceNote?: string;
  turbines: Record<string, TurbineFinalEstimate>;
  parkEnergyKWh: number;
  park_d10: number;
  park_d50: number;
  park_d90: number;
  parkRange80LowerKWh: number;
  parkRange80UpperKWh: number;
  airDensity: AirDensityResult;
  outageDates: string[];
  outageTimestamps: Float64Array;
  testPeriod?: TestPeriodResult;
  testPeriodAll?: TestPeriodResult;
}

/**
 * Computes the final loss estimation and uncertainty intervals.
 */
export function generateFinalReport(
  grid: Grid,
  outage: OutageInfo,
  knownMask: boolean[],
  trainingOption: string,
  chosenCombination: ParkCombinationResult,
  parkMeans: Record<string, Float64Array>,
  sectors: Float64Array,
  powerCurves: Record<string, PowerCurve>,
  usedTurbines: string[],
  nSectors: number = 8,
  smooth: number = 5,
  turbulence: boolean = true
): FinalReport {
  const { timestamps, dateStrings, windSpeed, airPressure, ambientTemperature, turbineParkMap } =
    grid;
  const { targetPark, targetTurbines, startIndex, endIndex, stampsCount } = outage;
  const chosenParks = chosenCombination.parks;

  // Smoothed park means for the regression and prediction features
  const smoothedParkMeans: Record<string, Float64Array> = {};
  for (const p of chosenParks) {
    if (parkMeans[p]) {
      smoothedParkMeans[p] = computeCenteredRunningMean(parkMeans[p], smooth);
    }
  }

  // Pre-calculate turbulence series if requested
  let turbulenceSeries: Float64Array | null = null;
  let turbulenceNote: string | undefined = undefined;

  if (turbulence) {
    const turbRes = computeTurbulenceSeries(
      grid.windSpeedStdDev,
      grid.nRows,
      usedTurbines,
      smooth,
      knownMask
    );
    if (turbRes.hasTurbulenceData) {
      turbulenceSeries = turbRes.turbulenceSeries;
    } else {
      turbulenceNote = 'no turbulence data - input skipped';
    }
  }

  const outageTimestamps = new Float64Array(stampsCount);
  const outageDates: string[] = new Array(stampsCount);
  for (let i = 0; i < stampsCount; i++) {
    const idx = startIndex + i;
    outageTimestamps[i] = timestamps[idx];
    outageDates[i] = dateStrings[idx];
  }

  const turbineEstimates: Record<string, TurbineFinalEstimate> = {};
  let parkEnergyKWh = 0;

  for (const tName of targetTurbines) {
    const v_t = windSpeed[tName];
    const pCurve = powerCurves[tName];
    if (!pCurve) {
      throw new Error(`Missing power curve for target turbine ${tName}`);
    }

    // Fit on all known stamps respecting training option
    const model = fitTurbineModel(
      tName,
      v_t,
      chosenParks,
      parkMeans,
      sectors,
      knownMask,
      nSectors,
      smoothedParkMeans,
      turbulenceSeries
    );

    const predictedWindOutage = new Float64Array(stampsCount);
    const expectedPowerOutage = new Float64Array(stampsCount);

    let sumPower = 0;

    for (let i = 0; i < stampsCount; i++) {
      const tau = startIndex + i;
      const vHat = predictWind(model, tau, sectors);
      predictedWindOutage[i] = vHat;

      const sigma = getModelSigma(model, vHat);
      const pExp = calculateExpectedPower(pCurve, vHat, sigma);
      expectedPowerOutage[i] = pExp;

      if (!Number.isNaN(pExp)) {
        sumPower += pExp;
      }
    }

    const energyKWh = sumPower * STEP_H;
    parkEnergyKWh += energyKWh;

    // Uncertainty percentiles from backtest
    const deltaEArray = chosenCombination.turbineDeltaEArrays[tName] || [];
    const d10 = percentile(deltaEArray, 10);
    const d50 = percentile(deltaEArray, 50);
    const d90 = percentile(deltaEArray, 90);

    // 80% range = [E / (1 + d90/100), E / (1 + d10/100)] (division, not multiplication)
    const range80LowerKWh = !Number.isNaN(d90) ? energyKWh / (1 + d90 / 100) : NaN;
    const range80UpperKWh = !Number.isNaN(d10) ? energyKWh / (1 + d10 / 100) : NaN;

    turbineEstimates[tName] = {
      turbineName: tName,
      model,
      predictedWindOutage,
      expectedPowerOutage,
      energyKWh,
      d10,
      d50,
      d90,
      range80LowerKWh,
      range80UpperKWh,
    };
  }

  // Park-level uncertainty from backtest
  const parkDeltaEArray = chosenCombination.parkDeltaEArray || [];
  const park_d10 = percentile(parkDeltaEArray, 10);
  const park_d50 = percentile(parkDeltaEArray, 50);
  const park_d90 = percentile(parkDeltaEArray, 90);

  const parkRange80LowerKWh = !Number.isNaN(park_d90)
    ? parkEnergyKWh / (1 + park_d90 / 100)
    : NaN;
  const parkRange80UpperKWh = !Number.isNaN(park_d10)
    ? parkEnergyKWh / (1 + park_d10 / 100)
    : NaN;

  // 3.10 Air density sensitivity
  let airDensityResult: AirDensityResult = {
    isApplicable: false,
    reason: 'Air pressure data not available or not sufficiently varying.',
  };

  // Find a used reference park that has a real pressure series (std > 0.5 hPa)
  let refPressurePark: string | undefined = undefined;
  for (const p of chosenParks) {
    const turbinesInP = usedTurbines.filter((t) => turbineParkMap[t] === p);
    const stds: number[] = [];
    for (const tName of turbinesInP) {
      const s = sampleStd(airPressure[tName]);
      if (!Number.isNaN(s)) stds.push(s);
    }
    const meanStd = mean(stds);
    if (!Number.isNaN(meanStd) && meanStd > 0.5) {
      refPressurePark = p;
      break;
    }
  }

  // Check target park pressure
  const targetPressureStds: number[] = [];
  for (const tName of targetTurbines) {
    const s = sampleStd(airPressure[tName]);
    if (!Number.isNaN(s)) targetPressureStds.push(s);
  }
  const hasTargetPressure = targetPressureStds.length > 0 && mean(targetPressureStds) > 0.1;

  if (refPressurePark && hasTargetPressure) {
    // Delta_p = mean over known of (target-park mean pressure - that park's mean pressure)
    const refParkTurbines = usedTurbines.filter((t) => turbineParkMap[t] === refPressurePark);

    const diffs: number[] = [];
    for (let t = 0; t < grid.nRows; t++) {
      if (knownMask[t]) {
        // Target park mean pressure
        let tSum = 0, tCnt = 0;
        for (const tName of targetTurbines) {
          const v = airPressure[tName][t];
          if (!Number.isNaN(v)) {
            tSum += v;
            tCnt++;
          }
        }

        // Ref park mean pressure
        let rSum = 0, rCnt = 0;
        for (const tName of refParkTurbines) {
          const v = airPressure[tName][t];
          if (!Number.isNaN(v)) {
            rSum += v;
            rCnt++;
          }
        }

        if (tCnt > 0 && rCnt > 0) {
          diffs.push(tSum / tCnt - rSum / rCnt);
        }
      }
    }

    const deltaP = mean(diffs);

    if (!Number.isNaN(deltaP)) {
      // Compute rho(t) during outage
      const rhoOutage = new Float64Array(stampsCount);

      for (let i = 0; i < stampsCount; i++) {
        const tau = startIndex + i;

        // p_ref(t)
        let rSum = 0, rCnt = 0;
        for (const tName of refParkTurbines) {
          const v = airPressure[tName][tau];
          if (!Number.isNaN(v)) {
            rSum += v;
            rCnt++;
          }
        }
        const pRef = rCnt > 0 ? rSum / rCnt : NaN;

        // T_ref(t)
        let tSum = 0, tCnt = 0;
        for (const tName of refParkTurbines) {
          const v = ambientTemperature[tName][tau];
          if (!Number.isNaN(v)) {
            tSum += v;
            tCnt++;
          }
        }
        const tRef = tCnt > 0 ? tSum / tCnt : NaN;

        if (!Number.isNaN(pRef) && !Number.isNaN(tRef)) {
          // rho = (p_ref(t) + deltaP) * 100 / (287.05 * (T_ref(t) + 273.15))
          const rho = ((pRef + deltaP) * 100) / (R_DRY * (tRef + 273.15));
          rhoOutage[i] = rho;
        } else {
          rhoOutage[i] = NaN;
        }
      }

      // Forward-fill then backward-fill
      let lastVal = NaN;
      for (let i = 0; i < stampsCount; i++) {
        if (!Number.isNaN(rhoOutage[i])) {
          lastVal = rhoOutage[i];
        } else if (!Number.isNaN(lastVal)) {
          rhoOutage[i] = lastVal;
        }
      }
      for (let i = stampsCount - 1; i >= 0; i--) {
        if (!Number.isNaN(rhoOutage[i])) {
          lastVal = rhoOutage[i];
        } else if (!Number.isNaN(lastVal)) {
          rhoOutage[i] = lastVal;
        }
      }

      // If still NaN anywhere, default to RHO_STD
      for (let i = 0; i < stampsCount; i++) {
        if (Number.isNaN(rhoOutage[i])) {
          rhoOutage[i] = RHO_STD;
        }
      }

      // Calculate corrected energy
      let correctedParkEnergy = 0;

      for (const tName of targetTurbines) {
        const est = turbineEstimates[tName];
        const pCurve = powerCurves[tName];
        const corrPowers = new Float64Array(stampsCount);
        let sumCorrPower = 0;

        for (let i = 0; i < stampsCount; i++) {
          const vHat = est.predictedWindOutage[i];
          const rho = rhoOutage[i];
          // v_corrected = v * (rho / 1.225)^(1/3)
          const vCorr = vHat * Math.pow(rho / RHO_STD, 1 / 3);
          const sigma = getModelSigma(est.model, vHat);
          const pCorr = calculateExpectedPower(pCurve, vCorr, sigma);
          corrPowers[i] = pCorr;
          if (!Number.isNaN(pCorr)) {
            sumCorrPower += pCorr;
          }
        }

        const eCorr = sumCorrPower * STEP_H;
        est.densityPowerOutage = corrPowers;
        est.densityEnergyKWh = eCorr;
        est.densityRange80LowerKWh = !Number.isNaN(est.d90) ? eCorr / (1 + est.d90 / 100) : NaN;
        est.densityRange80UpperKWh = !Number.isNaN(est.d10) ? eCorr / (1 + est.d10 / 100) : NaN;

        correctedParkEnergy += eCorr;
      }

      const sensitivityPercent =
        parkEnergyKWh > 0 ? 100 * (correctedParkEnergy / parkEnergyKWh - 1) : 0;

      const correctedParkRange80LowerKWh = !Number.isNaN(park_d90)
        ? correctedParkEnergy / (1 + park_d90 / 100)
        : NaN;
      const correctedParkRange80UpperKWh = !Number.isNaN(park_d10)
        ? correctedParkEnergy / (1 + park_d10 / 100)
        : NaN;

      airDensityResult = {
        isApplicable: true,
        referenceParkUsed: refPressurePark,
        deltaP_hPa: deltaP,
        meanRhoOutage: mean(rhoOutage),
        correctedParkEnergyKWh: correctedParkEnergy,
        sensitivityPercent,
        rhoOutage,
        correctedParkRange80LowerKWh,
        correctedParkRange80UpperKWh,
      };
    }
  }

  return {
    targetPark,
    targetTurbines,
    chosenParks,
    trainingOption,
    methodOptions: {
      nSectors,
      smooth,
      turbulence,
    },
    turbulenceNote,
    turbines: turbineEstimates,
    parkEnergyKWh,
    park_d10,
    park_d50,
    park_d90,
    parkRange80LowerKWh,
    parkRange80UpperKWh,
    airDensity: airDensityResult,
    outageDates,
    outageTimestamps,
  };
}
