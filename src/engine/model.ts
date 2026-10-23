/**
 * Turbine wind speed model: park lags, OLS regression (global and sector-blended),
 * prediction with missing park imputation, and residual error spread.
 * Pure serializable data structures compatible with postMessage / structured cloning.
 */
import { solveOLS, sampleStd, pearsonCorrelation } from './linalg';

export interface SectorCoefficients {
  sector: number; // 0=N, 1=E, 2=S, 3=W
  name: string;
  nRows: number;
  weight: number;
  aParks: Record<string, number>;
  c: number;
  betaRaw: number[];
  betaBlended: number[];
}

export interface TurbineModel {
  turbineName: string;
  refParks: string[]; // sorted
  lags: Record<string, number>; // lag k in -6..+6 per park
  features: Record<string, Float64Array>; // X_P(tau) = Park_P(tau - lag_P)
  betaGlobal: number[];
  globalCoefficients: { aParks: Record<string, number>; c: number };
  sectorModels: SectorCoefficients[];
  blendedBetas: number[][];
  sigmaGlobal: number;
  sigmaBins: number[]; // length 15 (bins 0..14)
}

const SECTOR_NAMES = ['N', 'E', 'S', 'W'];

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
    Number.isNaN(s) || s < 0 || s > 3 || Math.floor(s) !== s
      ? model.betaGlobal
      : model.blendedBetas[s];

  const M = model.refParks.length;
  const a = beta.slice(0, M);
  const c = beta[M];

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

  if (allPresent) {
    return weightedPresentSum + c;
  }

  if (anyPresent) {
    if (sumPresentA !== 0) {
      return sumAllA * (weightedPresentSum / sumPresentA) + c;
    }
    return weightedPresentSum + c;
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
 */
export function fitTurbineModel(
  turbineName: string,
  v_t: Float64Array,
  refParks: string[],
  parkMeans: Record<string, Float64Array>,
  sectors: Float64Array,
  fitMask: boolean[]
): TurbineModel {
  const nRows = v_t.length;
  const sortedParks = [...refParks].sort();

  // 1. Delay per reference park P: lag_P = k in -6..+6 maximizing Pearson r
  const lags: Record<string, number> = {};

  for (const p of sortedParks) {
    const parkSeries = parkMeans[p];
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

  // 2. Features X_P(tau) = Park_P(tau - lag_P)
  const features: Record<string, Float64Array> = {};
  const featureColumns: Float64Array[] = [];

  for (const p of sortedParks) {
    const parkSeries = parkMeans[p];
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
    if (allXPresent) {
      globalFitRows.push(tau);
    }
  }

  const betaGlobal = solveOLS(featureColumns, v_t, globalFitRows);

  const globalCoeffs = {
    aParks: {} as Record<string, number>,
    c: betaGlobal[sortedParks.length],
  };
  for (let idx = 0; idx < sortedParks.length; idx++) {
    globalCoeffs.aParks[sortedParks[idx]] = betaGlobal[idx];
  }

  // 4. Sector formulas: OLS per sector with blended beta
  const sectorModels: SectorCoefficients[] = [];
  const blendedBetas: number[][] = [];

  for (let s = 0; s < 4; s++) {
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
    for (let idx = 0; idx < sortedParks.length; idx++) {
      aParks[sortedParks[idx]] = betaBlended[idx];
    }

    sectorModels.push({
      sector: s,
      name: SECTOR_NAMES[s],
      nRows: n_s,
      weight,
      aParks,
      c: betaBlended[sortedParks.length],
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
    betaGlobal,
    globalCoefficients: globalCoeffs,
    sectorModels,
    blendedBetas,
    sigmaGlobal: 0,
    sigmaBins: [],
  };

  // 5. Error spread sigma
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
    betaGlobal,
    globalCoefficients: globalCoeffs,
    sectorModels,
    blendedBetas,
    sigmaGlobal,
    sigmaBins,
  };
}
