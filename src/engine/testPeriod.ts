/**
 * Test period evaluation (after the outage) according to the official BayWa protocol.
 */
import { Grid } from './grid';
import { OutageInfo } from './outage';
import { TurbineModel, predictWind, getModelSigma } from './model';
import { PowerCurve } from './parse';
import { calculateExpectedPower, interpolatePower } from './power';

export interface TurbineTestMetrics {
  turbineName: string;
  n: number;
  windRMSE: number;
  windMAE: number;
  windBias: number;
  r: number;
  powerRMSE: number;
  powerMAE: number;
  measuredEnergyKWh: number;
  predictedEnergyKWh: number;
  energyDevPct: number;
  // Arrays for charting
  timestamps: string[];
  measuredWind: number[];
  predictedWind: number[];
  measuredPower: number[];
  predictedPower: number[];
}

export interface TestPeriodResult {
  mode: 'flagged' | 'all_after';
  hasFlagged: boolean;
  startDateStr: string;
  endDateStr: string;
  stampsCount: number;
  turbines: Record<string, TurbineTestMetrics>;
  parkMeasuredEnergyKWh: number;
  parkPredictedEnergyKWh: number;
  parkEnergyDevPct: number;
  meanWindRMSE: number;
  meanWindMAE: number;
}

/**
 * Evaluates the test period after the outage.
 * - Test period = all 10-minute stamps AFTER the outage end.
 * - If mode is 'flagged' and test_set flags exist, uses only flagged stamps.
 * - Real power = power curve applied to measured wind (standard density).
 * - Predicted power = expected power integration applied to predicted wind (standard density).
 */
export function evaluateTestPeriod(
  grid: Grid,
  outage: OutageInfo,
  targetTurbines: string[],
  models: Record<string, TurbineModel>,
  powerCurves: Record<string, PowerCurve>,
  sectors: Float64Array,
  mode: 'flagged' | 'all_after' = 'flagged'
): TestPeriodResult {
  const { nRows, dateStrings, windSpeed, testSet } = grid;
  const { endIndex } = outage;

  // Identify all stamps after outage end
  const allAfterIndices: number[] = [];
  for (let i = endIndex + 1; i < nRows; i++) {
    allAfterIndices.push(i);
  }

  // Check if any target turbine has flagged stamps after the outage
  const flaggedIndices: number[] = [];
  for (const i of allAfterIndices) {
    let isFlagged = false;
    for (const tName of targetTurbines) {
      if (testSet?.[tName]?.[i]) {
        isFlagged = true;
        break;
      }
    }
    if (isFlagged) {
      flaggedIndices.push(i);
    }
  }

  const hasFlagged = flaggedIndices.length > 0;
  const activeMode: 'flagged' | 'all_after' = mode === 'flagged' && hasFlagged ? 'flagged' : 'all_after';
  const chosenIndices = activeMode === 'flagged' ? flaggedIndices : allAfterIndices;

  if (chosenIndices.length === 0) {
    return {
      mode: activeMode,
      hasFlagged,
      startDateStr: '',
      endDateStr: '',
      stampsCount: 0,
      turbines: {},
      parkMeasuredEnergyKWh: 0,
      parkPredictedEnergyKWh: 0,
      parkEnergyDevPct: 0,
      meanWindRMSE: 0,
      meanWindMAE: 0,
    };
  }

  const startDateStr = dateStrings[chosenIndices[0]] || '';
  const endDateStr = dateStrings[chosenIndices[chosenIndices.length - 1]] || '';
  const stampsCount = chosenIndices.length;

  const turbineMetrics: Record<string, TurbineTestMetrics> = {};
  let parkMeasuredEnergyKWh = 0;
  let parkPredictedEnergyKWh = 0;
  let sumWindRMSE = 0;
  let sumWindMAE = 0;
  let countTurbinesWithMetrics = 0;

  for (const tName of targetTurbines) {
    const model = models[tName];
    const pCurve = powerCurves[tName];
    const measuredWindSeries = windSpeed[tName];

    if (!model || !pCurve || !measuredWindSeries) continue;

    let sumWindSqErr = 0;
    let sumWindAbsErr = 0;
    let sumWindErr = 0;
    let sumPowerSqErr = 0;
    let sumPowerAbsErr = 0;
    let sumMeasuredPower = 0;
    let sumPredictedPower = 0;

    const validPredWind: number[] = [];
    const validMeasWind: number[] = [];
    const timestamps: string[] = [];
    const measuredWindArr: number[] = [];
    const predictedWindArr: number[] = [];
    const measuredPowerArr: number[] = [];
    const predictedPowerArr: number[] = [];

    for (const t of chosenIndices) {
      const wMeas = measuredWindSeries[t];
      const wPred = predictWind(model, t, sectors);

      // Skip stamps where either measured or predicted wind does not exist
      if (Number.isNaN(wMeas) || Number.isNaN(wPred)) {
        continue;
      }

      // Real power = power curve applied to measured wind (standard density)
      const pMeas = interpolatePower(pCurve, wMeas);
      // Predicted power = expected-power integration (standard density)
      const sigma = getModelSigma(model, wPred);
      const pPred = calculateExpectedPower(pCurve, wPred, sigma);

      if (Number.isNaN(pMeas) || Number.isNaN(pPred)) {
        continue;
      }

      const windErr = wPred - wMeas;
      const powerErr = pPred - pMeas;

      sumWindSqErr += windErr * windErr;
      sumWindAbsErr += Math.abs(windErr);
      sumWindErr += windErr;

      sumPowerSqErr += powerErr * powerErr;
      sumPowerAbsErr += Math.abs(powerErr);

      sumMeasuredPower += pMeas;
      sumPredictedPower += pPred;

      validPredWind.push(wPred);
      validMeasWind.push(wMeas);

      timestamps.push(dateStrings[t]);
      measuredWindArr.push(Number(wMeas.toFixed(2)));
      predictedWindArr.push(Number(wPred.toFixed(2)));
      measuredPowerArr.push(Math.round(pMeas));
      predictedPowerArr.push(Math.round(pPred));
    }

    const n = validPredWind.length;
    const windRMSE = n > 0 ? Math.sqrt(sumWindSqErr / n) : NaN;
    const windMAE = n > 0 ? sumWindAbsErr / n : NaN;
    const windBias = n > 0 ? sumWindErr / n : NaN;
    const powerRMSE = n > 0 ? Math.sqrt(sumPowerSqErr / n) : NaN;
    const powerMAE = n > 0 ? sumPowerAbsErr / n : NaN;
    const measuredEnergyKWh = sumMeasuredPower / 6;
    const predictedEnergyKWh = sumPredictedPower / 6;
    const energyDevPct =
      measuredEnergyKWh > 0 ? 100 * (predictedEnergyKWh / measuredEnergyKWh - 1) : 0;

    // Pearson correlation r
    let r = 0;
    if (n > 1) {
      let meanPred = 0;
      let meanMeas = 0;
      for (let i = 0; i < n; i++) {
        meanPred += validPredWind[i];
        meanMeas += validMeasWind[i];
      }
      meanPred /= n;
      meanMeas /= n;

      let cov = 0;
      let varPred = 0;
      let varMeas = 0;
      for (let i = 0; i < n; i++) {
        const dp = validPredWind[i] - meanPred;
        const dm = validMeasWind[i] - meanMeas;
        cov += dp * dm;
        varPred += dp * dp;
        varMeas += dm * dm;
      }
      const denom = Math.sqrt(varPred * varMeas);
      r = denom > 1e-9 ? cov / denom : 0;
    }

    turbineMetrics[tName] = {
      turbineName: tName,
      n,
      windRMSE,
      windMAE,
      windBias,
      r,
      powerRMSE,
      powerMAE,
      measuredEnergyKWh,
      predictedEnergyKWh,
      energyDevPct,
      timestamps,
      measuredWind: measuredWindArr,
      predictedWind: predictedWindArr,
      measuredPower: measuredPowerArr,
      predictedPower: predictedPowerArr,
    };

    parkMeasuredEnergyKWh += measuredEnergyKWh;
    parkPredictedEnergyKWh += predictedEnergyKWh;

    if (!Number.isNaN(windRMSE) && !Number.isNaN(windMAE)) {
      sumWindRMSE += windRMSE;
      sumWindMAE += windMAE;
      countTurbinesWithMetrics++;
    }
  }

  const parkEnergyDevPct =
    parkMeasuredEnergyKWh > 0
      ? 100 * (parkPredictedEnergyKWh / parkMeasuredEnergyKWh - 1)
      : 0;

  const meanWindRMSE =
    countTurbinesWithMetrics > 0 ? sumWindRMSE / countTurbinesWithMetrics : 0;
  const meanWindMAE =
    countTurbinesWithMetrics > 0 ? sumWindMAE / countTurbinesWithMetrics : 0;

  return {
    mode: activeMode,
    hasFlagged,
    startDateStr,
    endDateStr,
    stampsCount,
    turbines: turbineMetrics,
    parkMeasuredEnergyKWh,
    parkPredictedEnergyKWh,
    parkEnergyDevPct,
    meanWindRMSE,
    meanWindMAE,
  };
}
