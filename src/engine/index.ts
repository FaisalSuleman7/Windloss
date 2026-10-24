/**
 * Main calculation engine orchestration for the Wind Outage Loss Estimator.
 * Pure TypeScript functions, no React imports.
 */
import {
  ParsedTurbine,
  PowerCurve,
  parseTurbineContent,
  parsePowerCurveContent,
} from './parse';
import { Grid, buildGrid } from './grid';
import {
  OutageInfo,
  detectOutage,
  createCustomOutage,
  getKnownMask,
  validateTargetMeasuredData,
  TrainingDataOption,
} from './outage';
import {
  ReferenceScreeningResult,
  screenReferenceTurbines,
} from './references';
import {
  ParkCombinationResult,
  evaluateAllParkCombinations,
  runBacktestForCombination,
} from './backtest';
import { FinalReport, generateFinalReport } from './report';
import { TestPeriodResult, evaluateTestPeriod } from './testPeriod';

export * from './linalg';
export * from './parse';
export * from './grid';
export * from './outage';
export * from './references';
export * from './model';
export * from './power';
export * from './backtest';
export * from './report';
export * from './testPeriod';
export * from './referenceValues';

export interface CalculationOptions {
  manualOutage?: {
    targetPark: string;
    startIndex: number;
    endIndex: number;
  };
  manualParkCombination?: string[]; // user override of chosen combination
  trainingOption?: TrainingDataOption;
}

export interface EngineResult {
  grid: Grid;
  outage: OutageInfo;
  screening: ReferenceScreeningResult;
  allCombinations: ParkCombinationResult[];
  chosenCombination: ParkCombinationResult;
  report: FinalReport;
  testPeriod?: TestPeriodResult;
  testPeriodAll?: TestPeriodResult;
  errors: string[];
  warnings: string[];
}

export type ProgressCallback = (stage: string, percent: number, detail: string) => void;

/**
 * Runs the full calculation pipeline.
 */
export function runLossEstimation(
  turbines: ParsedTurbine[],
  powerCurves: PowerCurve[],
  options: CalculationOptions = {},
  onProgress?: ProgressCallback
): EngineResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Build common grid
  if (onProgress) onProgress('grid', 10, 'Building common 10-minute grid...');
  const grid = buildGrid(turbines);

  // 2. Outage detection
  if (onProgress) onProgress('outage', 25, 'Detecting outage...');
  let outage: OutageInfo | null = null;

  if (options.manualOutage) {
    outage = createCustomOutage(
      grid,
      options.manualOutage.targetPark,
      options.manualOutage.startIndex,
      options.manualOutage.endIndex
    );
  } else {
    outage = detectOutage(grid);
  }

  if (!outage) {
    throw new Error('No outage of at least 6 hours could be automatically detected.');
  }

  // Validate target turbines have measured data
  if (!validateTargetMeasuredData(grid, outage.targetTurbines)) {
    warnings.push('Fewer than 7 days of measured data with target turbines available.');
  }

  // Validate power curves for all target turbines
  const powerCurvesMap: Record<string, PowerCurve> = {};
  for (const pc of powerCurves) {
    powerCurvesMap[pc.turbineName] = pc;
  }

  for (const tName of outage.targetTurbines) {
    if (!powerCurvesMap[tName]) {
      throw new Error(`Missing power curve for target turbine ${tName}. Each target turbine requires a corresponding power curve file.`);
    }
  }

  // 3. Known stamps mask - default is now 'before_outage' (official protocol)
  const trainingOption = options.trainingOption || 'before_outage';
  const knownMask = getKnownMask(
    grid,
    outage.targetTurbines,
    outage.startIndex,
    outage.endIndex,
    trainingOption
  );

  // 4. Screening reference turbines and direction sectors
  if (onProgress) onProgress('screening', 40, 'Screening reference turbines and sectors...');
  const screening = screenReferenceTurbines(grid, outage, knownMask);

  if (screening.usedTurbines.length === 0) {
    throw new Error('No reference turbines met the screening criteria (coverage >= 50% and r >= 0.50).');
  }

  // 5. Backtesting park combinations
  if (onProgress) onProgress('backtest', 50, 'Evaluating reference park combinations...');
  const { results: allCombinations, chosenCombination: autoChosen } = evaluateAllParkCombinations(
    grid,
    outage,
    knownMask,
    screening.usedParks,
    screening.parkMeans,
    screening.directionResult.sectors,
    powerCurvesMap,
    (curr, total, key) => {
      if (onProgress) {
        const pct = Math.round(50 + (curr / total) * 35);
        onProgress('backtest', pct, `Backtesting park combination ${key} (${curr}/${total})...`);
      }
    }
  );

  // User override if requested
  let activeChosen = autoChosen;
  if (options.manualParkCombination && options.manualParkCombination.length > 0) {
    const key = [...options.manualParkCombination].sort().join('+');
    const found = allCombinations.find((c) => c.combinationKey === key);
    if (found) {
      for (const c of allCombinations) c.isChosen = false;
      found.isChosen = true;
      activeChosen = found;
    } else {
      // Re-run backtest for this custom combination
      const customRes = runBacktestForCombination(
        grid,
        outage,
        knownMask,
        options.manualParkCombination,
        screening.parkMeans,
        screening.directionResult.sectors,
        powerCurvesMap
      );
      customRes.isChosen = true;
      activeChosen = customRes;
    }
  }

  // 6. Final report and uncertainty estimation
  if (onProgress) onProgress('final', 90, 'Generating final loss estimate and uncertainty...');
  const report = generateFinalReport(
    grid,
    outage,
    knownMask,
    trainingOption,
    activeChosen,
    screening.parkMeans,
    screening.directionResult.sectors,
    powerCurvesMap,
    screening.usedTurbines
  );

  // 7. Evaluate test period (after the outage)
  const modelsMap: Record<string, any> = {};
  for (const tName of outage.targetTurbines) {
    if (report.turbines[tName]?.model) {
      modelsMap[tName] = report.turbines[tName].model;
    }
  }

  const testPeriod = evaluateTestPeriod(
    grid,
    outage,
    outage.targetTurbines,
    modelsMap,
    powerCurvesMap,
    screening.directionResult.sectors,
    'flagged'
  );

  const testPeriodAll = evaluateTestPeriod(
    grid,
    outage,
    outage.targetTurbines,
    modelsMap,
    powerCurvesMap,
    screening.directionResult.sectors,
    'all_after'
  );

  report.testPeriod = testPeriod;
  report.testPeriodAll = testPeriodAll;

  if (onProgress) onProgress('complete', 100, 'Calculation complete.');

  return {
    grid,
    outage,
    screening,
    allCombinations,
    chosenCombination: activeChosen,
    report,
    testPeriod,
    testPeriodAll,
    errors,
    warnings,
  };
}

/**
 * Parses raw file inputs into parsed turbine datasets and power curves.
 */
export function parseRawFiles(
  files: { name: string; content: string | ArrayBuffer }[]
): {
  turbines: ParsedTurbine[];
  powerCurves: PowerCurve[];
  errors: string[];
} {
  const turbines: ParsedTurbine[] = [];
  const powerCurves: PowerCurve[] = [];
  const errors: string[] = [];

  for (const f of files) {
    const isPowerCurve =
      f.name.toLowerCase().includes('power_curve') ||
      f.name.toLowerCase().includes('powercurve') ||
      f.name.toLowerCase().includes('kennlinie');

    if (isPowerCurve) {
      const res = parsePowerCurveContent(f.content, f.name);
      if (res.error) {
        errors.push(res.error);
      } else if (res.powerCurve) {
        powerCurves.push(res.powerCurve);
      }
    } else {
      const res = parseTurbineContent(f.content, f.name);
      if (res.error) {
        errors.push(res.error);
      } else if (res.turbine) {
        turbines.push(res.turbine);
      }
    }
  }

  return { turbines, powerCurves, errors };
}
