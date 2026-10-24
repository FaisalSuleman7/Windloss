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

export interface TurbineCorrelationMap {
  turbines: string[];
  parkMap: Record<string, string>;
  parksOrder: string[];
  matrix: number[][];
}

export interface TimeShiftPoint {
  shiftMin: number;
  r: number;
}

export interface TimeDelayPoint {
  shiftMinutes: number;
  parkHCorrelation: number;
  parkOCorrelation: number;
}

export interface TurbineTimeDelayAnalysis {
  targetTurbine: string;
  bestShiftH: number;
  bestShiftO: number;
  bestCorrH: number;
  bestCorrO: number;
  points: TimeDelayPoint[];
  parks?: {
    park: string;
    bestShiftMin: number;
    bestR: number;
    curve: TimeShiftPoint[];
  }[];
}

export interface CorrelationAnalysisResult {
  targetTurbines: string[];
  referenceTurbines: string[];
  rows: CorrelationRow[];
  allTurbinesMap: TurbineCorrelationMap;
  timeDelayAnalysis: TurbineTimeDelayAnalysis[];
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
  knownMask: boolean[],
  nSectors: number = 8
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
        const halfSector = 180 / nSectors;
        const sectorWidth = 360 / nSectors;
        sectors[t] = Math.floor((((deg + halfSector) % 360) + 360) % 360 / sectorWidth);
      } else {
        referenceDirections[t] = NaN;
        sectors[t] = NaN;
      }
    }
  } else {
    sectors.fill(0);
    referenceDirections.fill(NaN);
  }

  // Correlation analysis on current training data mask
  const correlationAnalysis = computeCorrelationAnalysis(
    grid,
    outage,
    usedTurbines,
    usedParks,
    parkMeans,
    knownMask
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
  parkMeans: Record<string, Float64Array>,
  knownMask?: boolean[]
): CorrelationAnalysisResult {
  const { windSpeed, turbineParkMap, nRows } = grid;
  const { startIndex, targetTurbines, targetPark } = outage;
  const isIncluded = (t: number) => (knownMask ? knownMask[t] : t < startIndex);

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

      for (let t = 0; t < nRows; t++) {
        if (!isIncluded(t)) continue;
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

      for (let t = 0; t < nRows; t++) {
        if (!isIncluded(t)) continue;
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

  // 3. Row "Mean of all reference turbines" (mean of all used reference turbines at each stamp)
  const allRefMeanSeries = new Float64Array(nRows);
  for (let t = 0; t < nRows; t++) {
    if (!isIncluded(t)) {
      allRefMeanSeries[t] = NaN;
      continue;
    }
    let sum = 0;
    let count = 0;
    for (const ref of usedTurbines) {
      const v = windSpeed[ref]?.[t];
      if (!Number.isNaN(v)) {
        sum += v;
        count++;
      }
    }
    allRefMeanSeries[t] = count > 0 ? sum / count : NaN;
  }

  const allRefMeanRValues: Record<string, number> = {};
  for (const tgt of targetTurbines) {
    const tgtSeries = windSpeed[tgt];
    const xVals: number[] = [];
    const yVals: number[] = [];

    for (let t = 0; t < nRows; t++) {
      if (!isIncluded(t)) continue;
      const xr = allRefMeanSeries[t];
      const yt = tgtSeries ? tgtSeries[t] : NaN;
      if (!Number.isNaN(xr) && !Number.isNaN(yt)) {
        xVals.push(xr);
        yVals.push(yt);
      }
    }

    const r = pearsonCorrelation(xVals, yVals);
    allRefMeanRValues[tgt] = r;
  }

  rows.push({
    label: 'Mean of all reference turbines',
    isParkMean: true,
    park: 'All',
    rValues: allRefMeanRValues,
  });

  // 4. Full correlation map of ALL turbines in the data ordered by park, target park last
  // Collect all unique parks from grid.turbines
  const allParksSet = new Set<string>();
  for (const t of grid.turbines) {
    const p = turbineParkMap[t];
    if (p && p !== targetPark) {
      allParksSet.add(p);
    }
  }
  const parksOrder = [...Array.from(allParksSet).sort(), targetPark];

  const orderedTurbines: string[] = [];
  for (const p of parksOrder) {
    const pTurbines = grid.turbines
      .filter((t) => turbineParkMap[t] === p)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    orderedTurbines.push(...pTurbines);
  }

  const matrix: number[][] = [];
  for (let i = 0; i < orderedTurbines.length; i++) {
    matrix[i] = [];
    const tA = orderedTurbines[i];
    const sA = windSpeed[tA];

    for (let j = 0; j < orderedTurbines.length; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
        continue;
      }

      const tB = orderedTurbines[j];
      const sB = windSpeed[tB];
      const xVals: number[] = [];
      const yVals: number[] = [];

      for (let t = 0; t < nRows; t++) {
        if (!isIncluded(t)) continue;
        const va = sA ? sA[t] : NaN;
        const vb = sB ? sB[t] : NaN;
        if (!Number.isNaN(va) && !Number.isNaN(vb)) {
          xVals.push(va);
          yVals.push(vb);
        }
      }

      matrix[i][j] = pearsonCorrelation(xVals, yVals);
    }
  }

  const allTurbinesMap: TurbineCorrelationMap = {
    turbines: orderedTurbines,
    parkMap: turbineParkMap,
    parksOrder,
    matrix,
  };

  // 5. Time delay: correlation vs time shift (-60 to +60 min in 10-min steps)
  // For each target turbine, compute curve for each reference park mean
  const timeDelayAnalysis: TurbineTimeDelayAnalysis[] = [];

  for (const tgt of targetTurbines) {
    const tgtSeries = windSpeed[tgt];
    const parkCurves: {
      park: string;
      bestShiftMin: number;
      bestR: number;
      curve: TimeShiftPoint[];
    }[] = [];

    for (const p of usedParks) {
      const parkSeries = parkMeans[p];
      const curve: TimeShiftPoint[] = [];
      let bestR = -Infinity;
      let bestShiftMin = 0;

      for (let k = -6; k <= 6; k++) {
        const shiftMin = k * 10;
        const xVals: number[] = [];
        const yVals: number[] = [];

        for (let tau = 0; tau < nRows; tau++) {
          if (!isIncluded(tau)) continue;
          const j = tau - k;
          if (j < 0 || j >= nRows) continue;

          const xVal = parkSeries ? parkSeries[j] : NaN;
          const yVal = tgtSeries ? tgtSeries[tau] : NaN;
          if (!Number.isNaN(xVal) && !Number.isNaN(yVal)) {
            xVals.push(xVal);
            yVals.push(yVal);
          }
        }

        const r = pearsonCorrelation(xVals, yVals);
        curve.push({ shiftMin, r });

        if (!Number.isNaN(r) && r > bestR) {
          bestR = r;
          bestShiftMin = shiftMin;
        }
      }

      parkCurves.push({
        park: p,
        bestShiftMin,
        bestR,
        curve,
      });
    }

    const hData = parkCurves.find((c) => c.park === 'H');
    const oData = parkCurves.find((c) => c.park === 'O');
    const bestShiftH = hData?.bestShiftMin ?? 0;
    const bestCorrH = hData?.bestR ?? 0;
    const bestShiftO = oData?.bestShiftMin ?? 0;
    const bestCorrO = oData?.bestR ?? 0;

    const points: TimeDelayPoint[] = [];
    for (let k = -6; k <= 6; k++) {
      const shiftMinutes = k * 10;
      const ptH = hData?.curve.find((c) => c.shiftMin === shiftMinutes);
      const ptO = oData?.curve.find((c) => c.shiftMin === shiftMinutes);
      points.push({
        shiftMinutes,
        parkHCorrelation: ptH ? ptH.r : NaN,
        parkOCorrelation: ptO ? ptO.r : NaN,
      });
    }

    timeDelayAnalysis.push({
      targetTurbine: tgt,
      bestShiftH,
      bestShiftO,
      bestCorrH,
      bestCorrO,
      points,
      parks: parkCurves,
    });
  }

  return {
    targetTurbines,
    referenceTurbines: usedTurbines,
    rows,
    allTurbinesMap,
    timeDelayAnalysis,
    singleNeighbourMinR: singleNeighbourMinR === Infinity ? 0 : singleNeighbourMinR,
    singleNeighbourMaxR: singleNeighbourMaxR === -Infinity ? 0 : singleNeighbourMaxR,
  };
}
