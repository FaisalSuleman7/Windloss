/**
 * Linear algebra and statistical utilities for the Wind Outage Loss Estimator.
 * Pure functions using standard arrays and Float64Array.
 */

/**
 * Calculates the mean of an array of numbers, ignoring NaNs.
 */
export function mean(arr: Float64Array | number[]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    if (!Number.isNaN(val)) {
      sum += val;
      count++;
    }
  }
  return count > 0 ? sum / count : NaN;
}

/**
 * Calculates sample variance (ddof = 1) ignoring NaNs.
 */
export function sampleVariance(arr: Float64Array | number[], knownMean?: number): number {
  const m = knownMean !== undefined ? knownMean : mean(arr);
  if (Number.isNaN(m)) return NaN;

  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    if (!Number.isNaN(val)) {
      const diff = val - m;
      sumSq += diff * diff;
      count++;
    }
  }
  return count > 1 ? sumSq / (count - 1) : count === 1 ? 0 : NaN;
}

/**
 * Calculates sample standard deviation (ddof = 1) ignoring NaNs.
 */
export function sampleStd(arr: Float64Array | number[], knownMean?: number): number {
  const v = sampleVariance(arr, knownMean);
  return Number.isNaN(v) ? NaN : Math.sqrt(v);
}

/**
 * Calculates Pearson correlation coefficient between two series (pairwise complete).
 */
export function pearsonCorrelation(
  x: Float64Array | number[],
  y: Float64Array | number[]
): number {
  const n = Math.min(x.length, y.length);
  let count = 0;
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (!Number.isNaN(xi) && !Number.isNaN(yi)) {
      sumX += xi;
      sumY += yi;
      count++;
    }
  }

  if (count < 2) return NaN;

  const meanX = sumX / count;
  const meanY = sumY / count;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (!Number.isNaN(xi) && !Number.isNaN(yi)) {
      const dx = xi - meanX;
      const dy = yi - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
  }

  const den = Math.sqrt(denX * denY);
  if (den <= 1e-12) return 0;
  return num / den;
}

/**
 * Calculates percentile with linear interpolation (numpy default method).
 * arr: numbers (will be copied and sorted, NaNs ignored).
 * q: percentile in [0, 100].
 */
export function percentile(arr: number[] | Float64Array, q: number): number {
  const valid: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (!Number.isNaN(arr[i])) {
      valid.push(arr[i]);
    }
  }
  if (valid.length === 0) return NaN;
  valid.sort((a, b) => a - b);

  if (q <= 0) return valid[0];
  if (q >= 100) return valid[valid.length - 1];

  const index = (valid.length - 1) * (q / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return valid[lower] * (1 - weight) + valid[upper] * weight;
}

/**
 * Solves OLS linear regression y = X * beta using Cholesky decomposition of normal equations (X^T X) beta = X^T y.
 * X is given as an array of columns [col0, col1, ..., col_{p-1}], length n each.
 * An intercept column of all 1s is automatically appended (so beta has p + 1 coefficients: [a_0, a_1, ..., a_{p-1}, c]).
 * rowsMask: optional boolean mask to select rows.
 */
export function solveOLS(
  columns: (Float64Array | number[])[],
  y: Float64Array | number[],
  rowIndices?: number[]
): number[] {
  const p = columns.length; // number of features
  const m = p + 1; // plus intercept

  // Determine rows to include
  const indices: number[] = [];
  if (rowIndices) {
    for (let k = 0; k < rowIndices.length; k++) {
      const idx = rowIndices[k];
      const yVal = y[idx];
      if (Number.isNaN(yVal)) continue;
      let valid = true;
      for (let j = 0; j < p; j++) {
        if (Number.isNaN(columns[j][idx])) {
          valid = false;
          break;
        }
      }
      if (valid) indices.push(idx);
    }
  } else {
    const totalRows = y.length;
    for (let idx = 0; idx < totalRows; idx++) {
      const yVal = y[idx];
      if (Number.isNaN(yVal)) continue;
      let valid = true;
      for (let j = 0; j < p; j++) {
        if (Number.isNaN(columns[j][idx])) {
          valid = false;
          break;
        }
      }
      if (valid) indices.push(idx);
    }
  }

  if (indices.length < m) {
    // Underdetermined
    return new Array(m).fill(NaN);
  }

  // Construct Normal Equations: A = X^T X (size m x m), b = X^T y (size m)
  const A: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const b: number[] = new Array(m).fill(0);

  for (let k = 0; k < indices.length; k++) {
    const row = indices[k];
    const yVal = y[row];

    // Feature values for this row: [X_0, X_1, ..., 1]
    const rowFeatures = new Float64Array(m);
    for (let j = 0; j < p; j++) {
      rowFeatures[j] = columns[j][row];
    }
    rowFeatures[p] = 1.0;

    for (let i = 0; i < m; i++) {
      const fi = rowFeatures[i];
      b[i] += fi * yVal;
      for (let j = i; j < m; j++) {
        A[i][j] += fi * rowFeatures[j];
      }
    }
  }

  // Fill symmetric lower triangle
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < i; j++) {
      A[i][j] = A[j][i];
    }
  }

  // Cholesky decomposition of A: A = L L^T
  // Add small ridge if needed for numerical stability
  const L: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }

      if (i === j) {
        let val = A[i][i] - sum;
        if (val <= 1e-12) {
          // Regularize slightly
          val = Math.max(val, 1e-12);
        }
        L[i][j] = Math.sqrt(val);
      } else {
        L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
  }

  // Forward substitution: L z = b
  const z = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let k = 0; k < i; k++) {
      sum += L[i][k] * z[k];
    }
    z[i] = (b[i] - sum) / L[i][i];
  }

  // Backward substitution: L^T beta = z
  const beta = new Array(m).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    let sum = 0;
    for (let k = i + 1; k < m; k++) {
      sum += L[k][i] * beta[k];
    }
    beta[i] = (z[i] - sum) / L[i][i];
  }

  return beta;
}
