import { EngineResult } from '../engine';

export interface EngineResultView extends EngineResult {
  densityApplied: boolean;
  base: EngineResult;
}

/**
 * Checks if site air-density correction data is available in the engine result.
 */
export function densityAvailable(result: EngineResult | null | undefined): boolean {
  if (!result || !result.report || !result.report.airDensity) return false;
  const { airDensity, targetTurbines, turbines } = result.report;
  if (!airDensity.isApplicable) return false;
  return targetTurbines.every(
    (t) => turbines[t]?.densityEnergyKWh !== undefined && !Number.isNaN(turbines[t]?.densityEnergyKWh)
  );
}

/**
 * Generates an active view over the engine result.
 * When useDensity is true and density is available, replaces energyKWh, expectedPowerOutage,
 * and range80Lower/Upper on each target turbine, as well as parkEnergyKWh and parkRange80Lower/Upper
 * with the site-density corrected values.
 * The original base engine result is never mutated.
 */
export function applyDensityView(
  result: EngineResult | null,
  useDensity: boolean
): EngineResultView | null {
  if (!result) return null;
  if (!useDensity || !densityAvailable(result)) {
    return {
      ...result,
      densityApplied: false,
      base: result,
    };
  }

  const { report } = result;
  const { turbines, targetTurbines, airDensity } = report;

  const copiedTurbines = { ...turbines };
  for (const t of targetTurbines) {
    const est = turbines[t];
    if (est) {
      copiedTurbines[t] = {
        ...est,
        energyKWh: est.densityEnergyKWh ?? est.energyKWh,
        expectedPowerOutage: est.densityPowerOutage ?? est.expectedPowerOutage,
        range80LowerKWh: est.densityRange80LowerKWh ?? est.range80LowerKWh,
        range80UpperKWh: est.densityRange80UpperKWh ?? est.range80UpperKWh,
      };
    }
  }

  const copiedReport = {
    ...report,
    turbines: copiedTurbines,
    parkEnergyKWh: airDensity.correctedParkEnergyKWh ?? report.parkEnergyKWh,
    parkRange80LowerKWh: airDensity.correctedParkRange80LowerKWh ?? report.parkRange80LowerKWh,
    parkRange80UpperKWh: airDensity.correctedParkRange80UpperKWh ?? report.parkRange80UpperKWh,
    testPeriod: report.testPeriod,
    testPeriodAll: report.testPeriodAll,
  };

  return {
    ...result,
    report: copiedReport,
    testPeriod: result.testPeriod,
    testPeriodAll: result.testPeriodAll,
    densityApplied: true,
    base: result,
  };
}
