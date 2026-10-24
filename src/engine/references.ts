/**
 * Reference turbine screening, correlation, park aggregation, and wind direction sectors.
 */
import { Grid } from './grid';
import { OutageInfo } from './outage';
import { pearsonCorrelation } from './linalg';

export interface TurbineScreening {
  turbineName: string;
  park: string;
  coverage: number;
  rWithTarget: number;
  isUsed: boolean;
  rejectionReason?: string;
}

export interface DirectionSectorResult {
  hasDirections: boolean;
  sectors: Float64Array; // 0=N, 1=E, 2=S, 3=W, or NaN
  referenceDirections: Float64Array; // degrees or NaN
  oneSectorForAllDirections: boolean;
}

export interface CorrelationRow {
  label: string;
  isParkMean: boolean;
  park: string;
  rValues: Record<string, number>;
}

export interface CorrelationAnalysisResult {
  targetTurbines: string[];
  rows: CorrelationRow[];
  singleNeighbourMinR: number;
  singleNeighbourMaxR: number;
}

export interface ReferenceScreeningResult {
  screenings: TurbineScreening[];
  usedTurbines: string[];
  usedParks: string[];
  parkMeans: Record<string, Float64Array>;
  targetParkMean: Float64Array;
  directionResult: DirectionSectorResult;
  correlationAnalysis: CorrelationAnalysisResult;
}

/**
 * Screens reference turbines and calculates park means and wind direction sectors.
 */
export function screenReferenceTurbines(
  grid: Grid,
  outage: OutageInfo,
  knownMask: boolean[]
): ReferenceScreeningResult {
  const { nRows, turbines, turbineParkMap, windSpeed, windDirection } = grid;
  const { targetPark, targetTurbines, startIndex, endIndex, stampsCount } = outage;

  // Compute target park mean at each row
  const targetParkMean = new Float64Array(nRows);
  for (let t = 0; t < nRows; t++) {
    let sum = 0;
    let count = 0;
    for (const tName of targetTurbines) {
      const v = windSpeed[tName][t];
      if (!Number.isNaN(v)) {
        sum += v;
        count++;
      }
    }
    targetParkMean[t] = count > 0 ? sum / count : NaN;
  }

  // Non-target candidate turbines
  const nonTargetTurbines = turbines.filter((tName) => turbineParkMap[tName] !== targetPark);

  const screenings: TurbineScreening[] = [];
  const usedTurbines: string[] = [];

  for (const c of nonTargetTurbines) {
    const ws = windSpeed[c];

    // Coverage during outage
    let validOutageStamps = 0;
    for (let t = startIndex; t <= endIndex; t++) {
      if (!Number.isNaN(ws[t])) {
        validOutageStamps++;
      }
    }
    const coverage = stampsCount > 0 ? validOutageStamps / stampsCount : 0;

    // Pearson correlation r with target mean over known stamps
    const xVals: number[] = [];
    const yVals: number[] = [];

    for (let t = 0; t < nRows; t++) {
      if (knownMask[t]) {
        const valC = ws[t];
        const valT = targetParkMean[t];
        if (!Number.isNaN(valC) && !Number.isNaN(valT)) {
          xVals.push(valC);
          yVals.push(valT);
        }
      }
    }

    const r = pearsonCorrelation(xVals, yVals);

    const isUsed = coverage >= 0.5 && r >= 0.5;
    let rejectionReason: string | undefined = undefined;

    if (!isUsed) {
      if (coverage < 0.5 && (Number.isNaN(r) || r < 0.5)) {
        rejectionReason = `Coverage (${(coverage * 100).toFixed(1)}% < 50%) and correlation (${Number.isNaN(r) ? 'NaN' : r.toFixed(2)} < 0.50)`;
      } else if (coverage < 0.5) {
        rejectionReason = `Coverage ${(coverage * 100).toFixed(1)}% < 50%`;
      } else if (Number.isNaN(r) || r < 0.5) {
        rejectionReason = `Correlation ${Number.isNaN(r) ? 'NaN' : r.toFixed(3)} < 0.50`;
      }
    } else {
      usedTurbines.push(c);
    }

    screenings.push({
      turbineName: c,
      park: turbineParkMap[c],
      coverage,
      rWithTarget: r,
      isUsed,
      rejectionReason,
    });
  }

  // Used reference parks
  const usedParksSet = new Set<string>();
  for (const tName of usedTurbines) {
    usedParksSet.add(turbineParkMap[tName]);
  }
  const usedParks = Array.from(usedParksSet).sort();

  // Compute park mean Park_P(t) for each used reference park
  const parkMeans: Record<string, Float64Array> = {};
  for (const p of usedParks) {
    const turbinesInP = usedTurbines.filter((t) => turbineParkMap[t] === p);
    const meanArr = new Float64Array(nRows);

    for (let t = 0; t < nRows; t++) {
      let sum = 0;
      let count = 0;
      for (const tName of turbinesInP) {
        const v = windSpeed[tName][t];
        if (!Number.isNaN(v)) {
          sum += v;
          count++;
        }
      }
      meanArr[t] = count > 0 ? sum / count : NaN;
    }

    parkMeans[p] = meanArr;
  }

  // Direction sector calculation
  let totalDirPossible = nRows * usedTurbines.length;
  let totalDirValid = 0;

  for (const tName of usedTurbines) {
    const wd = windDirection[tName];
    for (let t = 0; t < nRows; t++) {
      if (!Number.isNaN(wd[t])) {
        totalDirValid++;
      }
    }
  }

  const hasDirections = totalDirPossible > 0 && totalDirValid / totalDirPossible >= 0.5;
  const sectors = new Float64Array(nRows);
  const referenceDirections = new Float64Array(nRows);

  if (hasDirections) {
    for (let t = 0; t < nRows; t++) {
      let sumSin = 0;
      let sumCos = 0;
      let count = 0;

      for (const tName of usedTurbines) {
        const deg = windDirection[tName][t];
        if (!Number.isNaN(deg)) {
          const rad = (deg * Math.PI) / 180;
          sumSin += Math.sin(rad);
          sumCos += Math.cos(rad);
          count++;
        }
      }

      if (count > 0) {
        const thetaRad = Math.atan2(sumSin / count, sumCos / count);
        let deg = (thetaRad * 180) / Math.PI;
        deg = ((deg % 360) + 360) % 360;
        referenceDirections[t] = deg;
        sectors[t] = Math.floor(((deg + 45) % 360) / 90); // 0=N, 1=E, 2=S, 3=W
      } else {
        referenceDirections[t] = NaN;
        sectors[t] = NaN;
      }
    }
  } else {
    sectors.fill(0);
    referenceDirections.fill(NaN);
  }

  // Correlation analysis on training data before outage (0 <= t < startIndex)
  const correlationAnalysis = computeCorrelationAnalysis(
    grid,
    outage,
    usedTurbines,
    usedParks,
    parkMeans
  );

  return {
    screenings,
    usedTurbines,
    usedParks,
    parkMeans,
    targetParkMean,
    directionResult: {
      hasDirections,
      sectors,
      referenceDirections,
      oneSectorForAllDirections: !hasDirections,
    },
    correlationAnalysis,
  };
}

/**
 * Computes Pearson r correlation analysis for each reference turbine and reference park mean
 * against each target turbine on the training data before the outage.
 */
export function computeCorrelationAnalysis(
  grid: Grid,
  outage: OutageInfo,
  usedTurbines: string[],
  usedParks: string[],
  parkMeans: Record<string, Float64Array>
): CorrelationAnalysisResult {
  const { windSpeed, turbineParkMap } = grid;
  const { startIndex, targetTurbines } = outage;

  const rows: CorrelationRow[] = [];
  let singleNeighbourMinR = Infinity;
  let singleNeighbourMaxR = -Infinity;

  // 1. Every reference turbine
  for (const ref of usedTurbines) {
    const park = turbineParkMap[ref] || '';
    const rValues: Record<string, number> = {};
    const refSeries = windSpeed[ref];

    for (const tgt of targetTurbines) {
      const tgtSeries = windSpeed[tgt];
      const xVals: number[] = [];
      const yVals: number[] = [];

      for (let t = 0; t < startIndex; t++) {
        const xr = refSeries ? refSeries[t] : NaN;
        const yt = tgtSeries ? tgtSeries[t] : NaN;
        if (!Number.isNaN(xr) && !Number.isNaN(yt)) {
          xVals.push(xr);
          yVals.push(yt);
        }
      }

      const r = pearsonCorrelation(xVals, yVals);
      rValues[tgt] = r;
      if (!Number.isNaN(r)) {
        if (r < singleNeighbourMinR) singleNeighbourMinR = r;
        if (r > singleNeighbourMaxR) singleNeighbourMaxR = r;
      }
    }

    rows.push({
      label: ref,
      isParkMean: false,
      park,
      rValues,
    });
  }

  // 2. One row per reference park mean ("Park H mean", "Park O mean")
  for (const p of usedParks) {
    const meanSeries = parkMeans[p];
    const rValues: Record<string, number> = {};

    for (const tgt of targetTurbines) {
      const tgtSeries = windSpeed[tgt];
      const xVals: number[] = [];
      const yVals: number[] = [];

      for (let t = 0; t < startIndex; t++) {
        const xr = meanSeries ? meanSeries[t] : NaN;
        const yt = tgtSeries ? tgtSeries[t] : NaN;
        if (!Number.isNaN(xr) && !Number.isNaN(yt)) {
          xVals.push(xr);
          yVals.push(yt);
        }
      }

      const r = pearsonCorrelation(xVals, yVals);
      rValues[tgt] = r;
    }

    rows.push({
      label: `Park ${p} mean`,
      isParkMean: true,
      park: p,
      rValues,
    });
  }

  return {
    targetTurbines,
    rows,
    singleNeighbourMinR: singleNeighbourMinR === Infinity ? 0 : singleNeighbourMinR,
    singleNeighbourMaxR: singleNeighbourMaxR === -Infinity ? 0 : singleNeighbourMaxR,
  };
}
