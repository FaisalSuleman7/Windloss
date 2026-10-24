/**
 * Turbine wind speed model: park lags, OLS regression (global and sector-blended),
 * 50-minute smoothing, turbulence input, prediction with missing park imputation,
 * and residual error spread.
 * Pure serializable data structures compatible with postMessage / structured cloning.
 */
import { solveOLS, sampleStd, pearsonCorrelation } from './linalg';

export interface SectorCoefficients {
  sector: number; // 0..nSectors-1
  name: string;
  nRows: number;
  weight: number;
  aParks: Record<string, number>;
  dTurbulence?: number;
  c: number;
  betaRaw: number[];
  betaBlended: number[];
}

export interface TurbineModel {
  turbineName: string;
  refParks: string[]; // sorted
  lags: Record<string, number>; // lag k in -6..+6 per park
  features: Record<string, Float64Array>; // X_P(tau) = Park_P_smooth(tau - lag_P)
  turbulenceFeature?: Float64Array;
  hasTurbulence: boolean;
  betaGlobal: number[];
  globalCoefficients: {
    aParks: Record<string, number>;
    dTurbulence?: number;
    c: number;
  };
  sectorModels: SectorCoefficients[];
  blendedBetas: number[][];
  sigmaGlobal: number;
  sigmaBins: number[]; // length 15 (bins 0..14)
}

export const SECTOR_NAMES_4 = ['N', 'E', 'S', 'W'];
export const SECTOR_NAMES_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * Computes centred running mean over `smoothSteps` stamps (e.g. 5 steps = t-2..t+2),
 * averaging only available values (missing if none).
 */
export function computeCenteredRunningMean(
  series: Float64Array,
  smoothSteps: number
): Float64Array {
  const n = series.length;
  if (smoothSteps <= 1) {
    return new Float64Array(series);
  }
  const radius = Math.floor(smoothSteps / 2);
  const result = new Float64Array(n);

  for (let t = 0; t < n; t++) {
    const start = Math.max(0, t - radius);
    const end = Math.min(n - 1, t + radius);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= end; j++) {
      const v = series[j];
      if (!Number.isNaN(v)) {
        sum += v;
        count++;
      }
    }
    result[t] = count > 0 ? sum / count : NaN;
  }

  return result;
}

/**
 * Computes the turbulence input series S(t):
 * - mean of wind_speed_stddev over the USED reference turbines whose stddev column is > 50% filled
 * - centred running mean over `smoothSteps` stamps
 * - missing values replaced by the median of S over the fit mask; no time shift
 */
export function computeTurbulenceSeries(
  windSpeedStdDev: Record<string, Float64Array>,
  nRows: number,
  usedTurbines: string[],
  smoothSteps: number,
  fitMask: boolean[]
): {
  turbulenceSeries: Float64Array | null;
  hasTurbulenceData: boolean;
  qualifyingTurbines: string[];
} {
  const qualifyingTurbines: string[] = [];

  for (const tName of usedTurbines) {
    const stdArr = windSpeedStdDev[tName];
    if (!stdArr) continue;
    let validCount = 0;
    for (let t = 0; t < nRows; t++) {
      if (!Number.isNaN(stdArr[t])) {
        validCount++;
      }
    }
    if (nRows > 0 && validCount / nRows > 0.5) {
      qualifyingTurbines.push(tName);
    }
  }

  if (qualifyingTurbines.length === 0) {
    return {
      turbulenceSeries: null,
      hasTurbulenceData: false,
      qualifyingTurbines: [],
    };
  }

  // 1. S(t) = mean of wind_speed_stddev over qualifying reference turbines
  const rawS = new Float64Array(nRows);
  for (let t = 0; t < nRows; t++) {
    let sum = 0;
    let count = 0;
    for (const tName of qualifyingTurbines) {
      const v = windSpeedStdDev[tName][t];
      if (!Number.isNaN(v)) {
        sum += v;
        count++;
      }
    }
    rawS[t] = count > 0 ? sum / count : NaN;
  }

  // 2. Centred running mean
  const smoothedS = computeCenteredRunningMean(rawS, smoothSteps);

  // 3. Impute missing values with median of S over the fit mask
  const fitValues: number[] = [];
  for (let t = 0; t < nRows; t++) {
    if (fitMask[t] && !Number.isNaN(smoothedS[t])) {
      fitValues.push(smoothedS[t]);
    }
  }
  fitValues.sort((a, b) => a - b);
  const medianVal =
    fitValues.length > 0
      ? fitValues.length % 2 === 1
        ? fitValues[Math.floor(fitValues.length / 2)]
        : (fitValues[fitValues.length / 2 - 1] + fitValues[fitValues.length / 2]) / 2
      : 0;

  for (let t = 0; t < nRows; t++) {
    if (Number.isNaN(smoothedS[t])) {
      smoothedS[t] = medianVal;
    }
  }

  return {
    turbulenceSeries: smoothedS,
    hasTurbulenceData: true,
    qualifyingTurbines,
  };
}

/**
 * Predicts wind speed at timestamp row `tau` using sector-blended OLS
 * and missing park feature imputation.
 */
export function predictWind(
  model: TurbineModel,
  tau: number,
  sectors: Float64Array
): number {
  const s = sectors[tau];
  const beta =
    Number.isNaN(s) || s < 0 || s >= model.blendedBetas.length || Math.floor(s) !== s
      ? model.betaGlobal
      : model.blendedBetas[s];

  const M = model.refParks.length;
  const a = beta.slice(0, M);
  const d = model.hasTurbulence ? beta[M] : 0;
  const c = model.hasTurbulence ? beta[M + 1] : beta[M];
  const sVal = model.hasTurbulence && model.turbulenceFeature ? model.turbulenceFeature[tau] || 0 : 0;

  let sumAllA = 0;
  for (let i = 0; i < M; i++) sumAllA += a[i];

  let allPresent = true;
  let anyPresent = false;
  let sumPresentA = 0;
  let weightedPresentSum = 0;

  for (let i = 0; i < M; i++) {
    const p = model.refParks[i];
    const val = model.features[p][tau];
    if (!Number.isNaN(val)) {
      anyPresent = true;
      sumPresentA += a[i];
      weightedPresentSum += a[i] * val;
    } else {
      allPresent = false;
    }
  }

  const turbTerm = model.hasTurbulence ? d * sVal : 0;

  if (allPresent) {
    return weightedPresentSum + turbTerm + c;
  }

  if (anyPresent) {
    if (sumPresentA !== 0) {
      return sumAllA * (weightedPresentSum / sumPresentA) + turbTerm + c;
    }
    return weightedPresentSum + turbTerm + c;
  }

  return NaN;
}

/**
 * Retrieves the appropriate residual standard deviation σ based on predicted wind speed bin.
 */
export function getModelSigma(model: TurbineModel, vHat: number): number {
  if (Number.isNaN(vHat)) return model.sigmaGlobal;
  const b = Math.max(0, Math.min(14, Math.floor(vHat)));
  return model.sigmaBins[b];
}

/**
 * Fits a model for target turbine `t` on a boolean mask `fitMask`.
 * - Lag search: performed on unsmoothed rawParkMeans
 * - Features: smoothedParkMeans shifted by lag
 * - Turbulence input: optional S(t) added as extra regression input
 */
export function fitTurbineModel(
  turbineName: string,
  v_t: Float64Array,
  refParks: string[],
  rawParkMeans: Record<string, Float64Array>,
  sectors: Float64Array,
  fitMask: boolean[],
  nSectors: number = 8,
  smoothedParkMeans?: Record<string, Float64Array>,
  turbulenceSeries: Float64Array | null = null
): TurbineModel {
  const nRows = v_t.length;
  const sortedParks = [...refParks].sort();
  const activeSmoothedParkMeans = smoothedParkMeans || rawParkMeans;
  const hasTurbulence = turbulenceSeries !== null;

  // 1. Delay per reference park P: lag_P = k in -6..+6 maximizing Pearson r on UNSMOOTHED park means
  const lags: Record<string, number> = {};

  for (const p of sortedParks) {
    const parkSeries = rawParkMeans[p];
    let bestR = -Infinity;
    let bestK = 0;

    for (let k = -6; k <= 6; k++) {
      // Shifted series: Park_P(tau - k)
      const xVals: number[] = [];
      const yVals: number[] = [];

      for (let tau = 0; tau < nRows; tau++) {
        if (!fitMask[tau]) continue;
        const j = tau - k;
        if (j < 0 || j >= nRows) continue;

        const xVal = parkSeries[j];
        const yVal = v_t[tau];
        if (!Number.isNaN(xVal) && !Number.isNaN(yVal)) {
          xVals.push(xVal);
          yVals.push(yVal);
        }
      }

      const r = pearsonCorrelation(xVals, yVals);
      if (!Number.isNaN(r) && r > bestR) {
        bestR = r;
        bestK = k;
      }
    }

    lags[p] = bestK;
  }

  // 2. Features X_P(tau) = Park_P_smooth(tau - lag_P)
  const features: Record<string, Float64Array> = {};
  const featureColumns: Float64Array[] = [];

  for (const p of sortedParks) {
    const parkSeries = activeSmoothedParkMeans[p];
    const lag = lags[p];
    const feat = new Float64Array(nRows);

    for (let tau = 0; tau < nRows; tau++) {
      const j = tau - lag;
      if (j >= 0 && j < nRows) {
        feat[tau] = parkSeries[j];
      } else {
        feat[tau] = NaN;
      }
    }

    features[p] = feat;
    featureColumns.push(feat);
  }

  // If turbulence is active, add turbulenceSeries as an extra feature column
  if (hasTurbulence && turbulenceSeries) {
    featureColumns.push(turbulenceSeries);
  }

  // 3. Global OLS formula
  const globalFitRows: number[] = [];
  for (let tau = 0; tau < nRows; tau++) {
    if (!fitMask[tau]) continue;
    if (Number.isNaN(v_t[tau])) continue;
    let allXPresent = true;
    for (const p of sortedParks) {
      if (Number.isNaN(features[p][tau])) {
        allXPresent = false;
        break;
      }
    }
    if (hasTurbulence && turbulenceSeries && Number.isNaN(turbulenceSeries[tau])) {
      allXPresent = false;
    }
    if (allXPresent) {
      globalFitRows.push(tau);
    }
  }

  const betaGlobal = solveOLS(featureColumns, v_t, globalFitRows);

  const M = sortedParks.length;
  const globalCoeffs: {
    aParks: Record<string, number>;
    dTurbulence?: number;
    c: number;
  } = {
    aParks: {},
    c: hasTurbulence ? betaGlobal[M + 1] : betaGlobal[M],
  };

  for (let idx = 0; idx < M; idx++) {
    globalCoeffs.aParks[sortedParks[idx]] = betaGlobal[idx];
  }
  if (hasTurbulence) {
    globalCoeffs.dTurbulence = betaGlobal[M];
  }

  // 4. Sector formulas: OLS per sector with blended beta
  const sectorModels: SectorCoefficients[] = [];
  const blendedBetas: number[][] = [];
  const sectorNames = nSectors === 4 ? SECTOR_NAMES_4 : SECTOR_NAMES_8;

  for (let s = 0; s < nSectors; s++) {
    const sectorFitRows: number[] = [];
    for (const tau of globalFitRows) {
      if (sectors[tau] === s) {
        sectorFitRows.push(tau);
      }
    }

    const n_s = sectorFitRows.length;
    let betaRaw: number[];
    let betaBlended: number[];
    let weight = 0;

    if (n_s >= 30) {
      betaRaw = solveOLS(featureColumns, v_t, sectorFitRows);
      weight = n_s / (n_s + 300);
      betaBlended = new Array(betaGlobal.length);
      for (let i = 0; i < betaGlobal.length; i++) {
        betaBlended[i] = weight * betaRaw[i] + (1 - weight) * betaGlobal[i];
      }
    } else {
      betaRaw = [...betaGlobal];
      betaBlended = [...betaGlobal];
      weight = 0;
    }

    blendedBetas[s] = betaBlended;

    const aParks: Record<string, number> = {};
    for (let idx = 0; idx < M; idx++) {
      aParks[sortedParks[idx]] = betaBlended[idx];
    }

    sectorModels.push({
      sector: s,
      name: sectorNames[s] || `S${s}`,
      nRows: n_s,
      weight,
      aParks,
      dTurbulence: hasTurbulence ? betaBlended[M] : undefined,
      c: hasTurbulence ? betaBlended[M + 1] : betaBlended[M],
      betaRaw,
      betaBlended,
    });
  }

  // Intermediate model object to compute predictions
  const intermediateModel: TurbineModel = {
    turbineName,
    refParks: sortedParks,
    lags,
    features,
    turbulenceFeature: hasTurbulence && turbulenceSeries ? turbulenceSeries : undefined,
    hasTurbulence,
    betaGlobal,
    globalCoefficients: globalCoeffs,
    sectorModels,
    blendedBetas,
    sigmaGlobal: 0,
    sigmaBins: [],
  };

  // 5. Error spread sigma from in-sample residuals on fitMask
  const allResiduals: number[] = [];
  const residualsByBin: number[][] = Array.from({ length: 15 }, () => []);

  for (let tau = 0; tau < nRows; tau++) {
    if (!fitMask[tau]) continue;
    const yReal = v_t[tau];
    if (Number.isNaN(yReal)) continue;

    const yHat = predictWind(intermediateModel, tau, sectors);
    if (Number.isNaN(yHat)) continue;

    const residual = yReal - yHat;
    allResiduals.push(residual);

    const b = Math.max(0, Math.min(14, Math.floor(yHat)));
    residualsByBin[b].push(residual);
  }

  const sigmaGlobal = sampleStd(allResiduals);

  const sigmaBins: number[] = new Array(15);
  for (let b = 0; b < 15; b++) {
    if (residualsByBin[b].length >= 50) {
      sigmaBins[b] = sampleStd(residualsByBin[b]);
    } else {
      sigmaBins[b] = sigmaGlobal;
    }
  }

  return {
    turbineName,
    refParks: sortedParks,
    lags,
    features,
    turbulenceFeature: hasTurbulence && turbulenceSeries ? turbulenceSeries : undefined,
    hasTurbulence,
    betaGlobal,
    globalCoefficients: globalCoeffs,
    sectorModels,
    blendedBetas,
    sigmaGlobal,
    sigmaBins,
  };
}
