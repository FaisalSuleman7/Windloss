/**
 * Reference check values and comparator for the Self-test page.
 */
import { EngineResult } from './index';

export interface SelfTestCheckItem {
  id: string;
  category: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  tolerance?: string;
  detail?: string;
}

export function runSelfTestChecks(result: EngineResult): SelfTestCheckItem[] {
  const checks: SelfTestCheckItem[] = [];

  const { grid, outage, screening, allCombinations, chosenCombination, report } = result;

  // 1. Grid rows (exact 13,248)
  checks.push({
    id: 'grid_rows',
    category: 'Grid & Outage',
    name: 'Common Grid Total Rows',
    expected: '13,248',
    actual: grid.nRows.toLocaleString('de-DE'),
    passed: grid.nRows === 13248,
    tolerance: 'exact',
  });

  // 2. Outage park (exact T)
  checks.push({
    id: 'outage_park',
    category: 'Grid & Outage',
    name: 'Outage Target Park',
    expected: 'T',
    actual: outage.targetPark,
    passed: outage.targetPark === 'T',
    tolerance: 'exact',
  });

  // 3. Outage start (exact 2026-09-01 00:00)
  checks.push({
    id: 'outage_start',
    category: 'Grid & Outage',
    name: 'Outage Start Timestamp',
    expected: '2026-09-01 00:00',
    actual: outage.startDateStr,
    passed: outage.startDateStr === '2026-09-01 00:00',
    tolerance: 'exact',
  });

  // 4. Outage end (exact 2026-09-03 23:50)
  checks.push({
    id: 'outage_end',
    category: 'Grid & Outage',
    name: 'Outage End Timestamp (inclusive)',
    expected: '2026-09-03 23:50',
    actual: outage.endDateStr,
    passed: outage.endDateStr === '2026-09-03 23:50',
    tolerance: 'exact',
  });

  // 5. Outage duration (exact 72 h)
  checks.push({
    id: 'outage_duration',
    category: 'Grid & Outage',
    name: 'Outage Duration (hours)',
    expected: '72.0 h',
    actual: `${outage.durationHours.toFixed(1)} h`,
    passed: Math.abs(outage.durationHours - 72) < 1e-6,
    tolerance: 'exact',
  });

  // 6. Target turbines (exact T1, T2, T3)
  const targetsStr = outage.targetTurbines.join(', ');
  checks.push({
    id: 'target_turbines',
    category: 'Grid & Outage',
    name: 'Target Turbines Identified',
    expected: 'T1, T2, T3',
    actual: targetsStr,
    passed: targetsStr === 'T1, T2, T3',
    tolerance: 'exact',
  });

  // 7. Reference turbines used (exact 7)
  checks.push({
    id: 'used_turbines_count',
    category: 'Turbines & Screening',
    name: 'Used Reference Turbines Count',
    expected: '7',
    actual: String(screening.usedTurbines.length),
    passed: screening.usedTurbines.length === 7,
    tolerance: 'exact',
    detail: `Turbines: ${screening.usedTurbines.join(', ')}`,
  });

  // 8. Park combination scores (H+O 8.64, H 10.60, O 11.69 % ±0.05)
  const scoreHO = allCombinations.find((c) => c.combinationKey === 'H+O')?.selectionScore;
  const scoreH = allCombinations.find((c) => c.combinationKey === 'H')?.selectionScore;
  const scoreO = allCombinations.find((c) => c.combinationKey === 'O')?.selectionScore;

  checks.push({
    id: 'score_HO',
    category: 'Turbines & Screening',
    name: 'Combination Score: H+O',
    expected: '8.64 %',
    actual: scoreHO !== undefined ? `${scoreHO.toFixed(2)} %` : 'N/A',
    passed: scoreHO !== undefined && Math.abs(scoreHO - 8.64) <= 0.05,
    tolerance: '±0.05 %',
  });

  checks.push({
    id: 'score_H',
    category: 'Turbines & Screening',
    name: 'Combination Score: H',
    expected: '10.60 %',
    actual: scoreH !== undefined ? `${scoreH.toFixed(2)} %` : 'N/A',
    passed: scoreH !== undefined && Math.abs(scoreH - 10.60) <= 0.05,
    tolerance: '±0.05 %',
  });

  checks.push({
    id: 'score_O',
    category: 'Turbines & Screening',
    name: 'Combination Score: O',
    expected: '11.69 %',
    actual: scoreO !== undefined ? `${scoreO.toFixed(2)} %` : 'N/A',
    passed: scoreO !== undefined && Math.abs(scoreO - 11.69) <= 0.05,
    tolerance: '±0.05 %',
  });

  // 9. Chosen combination (exact H+O)
  checks.push({
    id: 'chosen_combination',
    category: 'Turbines & Screening',
    name: 'Chosen Reference Park Combination',
    expected: 'H+O',
    actual: chosenCombination.combinationKey,
    passed: chosenCombination.combinationKey === 'H+O',
    tolerance: 'exact',
  });

  // 10. Windows count (exact 24 windows)
  checks.push({
    id: 'windows_count',
    category: 'Turbines & Screening',
    name: 'Backtest Windows Evaluated',
    expected: '24',
    actual: String(chosenCombination.windowsCount),
    passed: chosenCombination.windowsCount === 24,
    tolerance: 'exact',
  });

  // 11. Lags in 10-minute steps: T1 {H -2, O 0}, T2 {H -3, O +1}, T3 {H -2, O 0}
  const estT1 = report.turbines['T1'];
  const estT2 = report.turbines['T2'];
  const estT3 = report.turbines['T3'];

  if (estT1) {
    const lagStr = `H: ${estT1.model.lags['H']}, O: ${estT1.model.lags['O']}`;
    checks.push({
      id: 'lag_T1',
      category: 'Model & Lags',
      name: 'T1 Lags (10-min steps)',
      expected: 'H: -2, O: 0',
      actual: lagStr,
      passed: estT1.model.lags['H'] === -2 && estT1.model.lags['O'] === 0,
      tolerance: 'exact',
    });
  }

  if (estT2) {
    const lagStr = `H: ${estT2.model.lags['H']}, O: ${estT2.model.lags['O']}`;
    checks.push({
      id: 'lag_T2',
      category: 'Model & Lags',
      name: 'T2 Lags (10-min steps)',
      expected: 'H: -3, O: 1',
      actual: lagStr,
      passed: estT2.model.lags['H'] === -3 && estT2.model.lags['O'] === 1,
      tolerance: 'exact',
    });
  }

  if (estT3) {
    const lagStr = `H: ${estT3.model.lags['H']}, O: ${estT3.model.lags['O']}`;
    checks.push({
      id: 'lag_T3',
      category: 'Model & Lags',
      name: 'T3 Lags (10-min steps)',
      expected: 'H: -2, O: 0',
      actual: lagStr,
      passed: estT3.model.lags['H'] === -2 && estT3.model.lags['O'] === 0,
      tolerance: 'exact',
    });
  }

  // 12. T1 Coefficients (±0.002):
  // N: a_H 0.286, a_O 0.534, c 0.713
  // E: a_H 0.520, a_O 0.364, c 0.612
  // S: a_H 0.423, a_O 0.226, c 1.125
  // W: a_H 0.419, a_O 0.343, c 0.565
  if (estT1) {
    const secN = estT1.model.sectorModels[0];
    const secE = estT1.model.sectorModels[1];
    const secS = estT1.model.sectorModels[2];
    const secW = estT1.model.sectorModels[3];

    const checkSector = (sec: typeof secN, name: string, expH: number, expO: number, expC: number) => {
      const aH = sec.aParks['H'];
      const aO = sec.aParks['O'];
      const c = sec.c;
      const passed =
        Math.abs(aH - expH) <= 0.002 &&
        Math.abs(aO - expO) <= 0.002 &&
        Math.abs(c - expC) <= 0.002;

      checks.push({
        id: `coeff_T1_${name}`,
        category: 'Coefficients',
        name: `T1 Sector ${name} Coefficients (a_H, a_O, c)`,
        expected: `a_H=${expH.toFixed(3)}, a_O=${expO.toFixed(3)}, c=${expC.toFixed(3)}`,
        actual: `a_H=${aH.toFixed(3)}, a_O=${aO.toFixed(3)}, c=${c.toFixed(3)}`,
        passed,
        tolerance: '±0.002',
      });
    };

    checkSector(secN, 'N', 0.286, 0.534, 0.713);
    checkSector(secE, 'E', 0.520, 0.364, 0.612);
    checkSector(secS, 'S', 0.423, 0.226, 1.125);
    checkSector(secW, 'W', 0.419, 0.343, 0.565);
  }

  // 13. σ_global T1 1.3028, T2 1.1521, T3 1.1594 (±0.001)
  const checkSigma = (tName: string, expected: number, est?: (typeof report.turbines)['T1']) => {
    if (!est) return;
    const actual = est.model.sigmaGlobal;
    checks.push({
      id: `sigma_${tName}`,
      category: 'Predicted Wind & Error',
      name: `σ_global ${tName}`,
      expected: expected.toFixed(4),
      actual: actual.toFixed(4),
      passed: Math.abs(actual - expected) <= 0.001,
      tolerance: '±0.001',
    });
  };

  checkSigma('T1', 1.3028, estT1);
  checkSigma('T2', 1.1521, estT2);
  checkSigma('T3', 1.1594, estT3);

  // 14. Predicted wind at first 3 outage stamps: T1 8.4187, 8.0881, 8.2920 m/s (±0.001)
  if (estT1 && estT1.predictedWindOutage.length >= 3) {
    const p1 = estT1.predictedWindOutage[0];
    const p2 = estT1.predictedWindOutage[1];
    const p3 = estT1.predictedWindOutage[2];

    const passed =
      Math.abs(p1 - 8.4187) <= 0.001 &&
      Math.abs(p2 - 8.0881) <= 0.001 &&
      Math.abs(p3 - 8.292) <= 0.001;

    checks.push({
      id: 'pred_wind_T1_first3',
      category: 'Predicted Wind & Error',
      name: 'T1 Predicted Wind (Stamps 0, 1, 2)',
      expected: '8.4187, 8.0881, 8.2920 m/s',
      actual: `${p1.toFixed(4)}, ${p2.toFixed(4)}, ${p3.toFixed(4)} m/s`,
      passed,
      tolerance: '±0.001 m/s',
    });
  }

  // 15. Energy kWh (±0.1 %):
  // T1: 92,105.2
  // T2: 123,716.9
  // T3: 101,531.7
  // Park: 317,353.8
  const checkEnergy = (tName: string, expKWh: number, actualKWh: number) => {
    const diffPct = Math.abs((actualKWh - expKWh) / expKWh) * 100;
    checks.push({
      id: `energy_${tName}`,
      category: 'Energy & Range',
      name: `${tName} Lost Energy`,
      expected: `${expKWh.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`,
      actual: `${actualKWh.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`,
      passed: diffPct <= 0.1,
      tolerance: '±0.1 %',
      detail: `Rel diff: ${diffPct.toFixed(3)} %`,
    });
  };

  if (estT1) checkEnergy('T1', 92105.2, estT1.energyKWh);
  if (estT2) checkEnergy('T2', 123716.9, estT2.energyKWh);
  if (estT3) checkEnergy('T3', 101531.7, estT3.energyKWh);
  checkEnergy('Park Total', 317353.8, report.parkEnergyKWh);

  // 16. Park 80% range (±0.5%): 280,181 – 367,170 kWh
  const expLower = 280181;
  const expUpper = 367170;
  const actLower = report.parkRange80LowerKWh;
  const actUpper = report.parkRange80UpperKWh;
  const diffLowerPct = Math.abs((actLower - expLower) / expLower) * 100;
  const diffUpperPct = Math.abs((actUpper - expUpper) / expUpper) * 100;

  checks.push({
    id: 'park_80_range',
    category: 'Energy & Range',
    name: 'Park 80% Uncertainty Range',
    expected: '280,181 – 367,170 kWh',
    actual: `${Math.round(actLower).toLocaleString('en-US')} – ${Math.round(actUpper).toLocaleString('en-US')} kWh`,
    passed: diffLowerPct <= 0.5 && diffUpperPct <= 0.5,
    tolerance: '±0.5 %',
    detail: `Lower err: ${diffLowerPct.toFixed(2)}%, Upper err: ${diffUpperPct.toFixed(2)}%`,
  });

  // 17. Air density sensitivity −1.99 % (±0.05)
  const sens = report.airDensity.sensitivityPercent;
  const sensPassed = sens !== undefined && Math.abs(sens - -1.99) <= 0.05;
  checks.push({
    id: 'density_sensitivity',
    category: 'Density Sensitivity',
    name: 'Air Density Sensitivity',
    expected: '-1.99 %',
    actual: sens !== undefined ? `${sens.toFixed(2)} %` : 'N/A',
    passed: sensPassed,
    tolerance: '±0.05 %',
    detail: report.airDensity.isApplicable
      ? `Δp = ${report.airDensity.deltaP_hPa?.toFixed(1)} hPa, Ref Park = ${report.airDensity.referenceParkUsed}`
      : report.airDensity.reason,
  });

  return checks;
}

/**
 * Section B. Official protocol reference checks (training before outage).
 * Verifies the 13 demo files against the official BayWa evaluation benchmarks.
 */
export function runOfficialProtocolChecks(result: EngineResult): SelfTestCheckItem[] {
  const checks: SelfTestCheckItem[] = [];
  const { chosenCombination, allCombinations, report } = result;
  const estT1 = report.turbines['T1'];
  const estT2 = report.turbines['T2'];
  const estT3 = report.turbines['T3'];

  // 1. Energy kWh (0.1%):
  // Park energy 316,117.7 kWh | T1 91,454.2 | T2 124,805.6 | T3 99,857.9
  const checkEnergy = (tName: string, expKWh: number, actualKWh: number, id: string) => {
    const diffPct = Math.abs((actualKWh - expKWh) / expKWh) * 100;
    checks.push({
      id,
      category: 'Energy & Range',
      name: `${tName} Lost Energy`,
      expected: `${expKWh.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`,
      actual: `${actualKWh.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`,
      passed: diffPct <= 0.1,
      tolerance: '±0.1 %',
      detail: `Rel diff: ${diffPct.toFixed(3)} %`,
    });
  };

  checkEnergy('Park Total', 316117.7, report.parkEnergyKWh, 'b_energy_park');
  if (estT1) checkEnergy('T1', 91454.2, estT1.energyKWh, 'b_energy_T1');
  if (estT2) checkEnergy('T2', 124805.6, estT2.energyKWh, 'b_energy_T2');
  if (estT3) checkEnergy('T3', 99857.9, estT3.energyKWh, 'b_energy_T3');

  // 2. Park 80% range 273,684 - 360,428 kWh (0.5%)
  const expLower = 273684;
  const expUpper = 360428;
  const actLower = report.parkRange80LowerKWh;
  const actUpper = report.parkRange80UpperKWh;
  const diffLowerPct = Math.abs((actLower - expLower) / expLower) * 100;
  const diffUpperPct = Math.abs((actUpper - expUpper) / expUpper) * 100;

  checks.push({
    id: 'b_park_80_range',
    category: 'Energy & Range',
    name: 'Park 80% Uncertainty Range',
    expected: '273,684 – 360,428 kWh',
    actual: `${Math.round(actLower).toLocaleString('en-US')} – ${Math.round(actUpper).toLocaleString('en-US')} kWh`,
    passed: diffLowerPct <= 0.5 && diffUpperPct <= 0.5,
    tolerance: '±0.5 %',
    detail: `Lower err: ${diffLowerPct.toFixed(2)}%, Upper err: ${diffUpperPct.toFixed(2)}%`,
  });

  // 3. Backtest windows 16 (exact) | chosen H+O, score 8.98% ; O 10.60% ; H 10.74% (0.05%)
  checks.push({
    id: 'b_windows_count',
    category: 'Backtest Validation',
    name: 'Backtest Windows Evaluated (before outage)',
    expected: '16',
    actual: String(chosenCombination.windowsCount),
    passed: chosenCombination.windowsCount === 16,
    tolerance: 'exact',
  });

  checks.push({
    id: 'b_chosen_combination',
    category: 'Backtest Validation',
    name: 'Chosen Reference Park Combination',
    expected: 'H+O',
    actual: chosenCombination.combinationKey,
    passed: chosenCombination.combinationKey === 'H+O',
    tolerance: 'exact',
  });

  const scoreHO = allCombinations.find((c) => c.combinationKey === 'H+O')?.selectionScore;
  const scoreO = allCombinations.find((c) => c.combinationKey === 'O')?.selectionScore;
  const scoreH = allCombinations.find((c) => c.combinationKey === 'H')?.selectionScore;

  checks.push({
    id: 'b_score_HO',
    category: 'Backtest Validation',
    name: 'Combination Score: H+O',
    expected: '8.98 %',
    actual: scoreHO !== undefined ? `${scoreHO.toFixed(2)} %` : 'N/A',
    passed: scoreHO !== undefined && Math.abs(scoreHO - 8.98) <= 0.05,
    tolerance: '±0.05 %',
  });

  checks.push({
    id: 'b_score_O',
    category: 'Backtest Validation',
    name: 'Combination Score: O',
    expected: '10.60 %',
    actual: scoreO !== undefined ? `${scoreO.toFixed(2)} %` : 'N/A',
    passed: scoreO !== undefined && Math.abs(scoreO - 10.60) <= 0.05,
    tolerance: '±0.05 %',
  });

  checks.push({
    id: 'b_score_H',
    category: 'Backtest Validation',
    name: 'Combination Score: H',
    expected: '10.74 %',
    actual: scoreH !== undefined ? `${scoreH.toFixed(2)} %` : 'N/A',
    passed: scoreH !== undefined && Math.abs(scoreH - 10.74) <= 0.05,
    tolerance: '±0.05 %',
  });

  // 4. Lags T1 H:-3 O:0 | T2 H:-3 O:1 | T3 H:-3 O:1 (exact)
  if (estT1) {
    const lagStr = `H: ${estT1.model.lags['H']}, O: ${estT1.model.lags['O']}`;
    checks.push({
      id: 'b_lag_T1',
      category: 'Model & Lags',
      name: 'T1 Lags (10-min steps)',
      expected: 'H: -3, O: 0',
      actual: lagStr,
      passed: estT1.model.lags['H'] === -3 && estT1.model.lags['O'] === 0,
      tolerance: 'exact',
    });
  }

  if (estT2) {
    const lagStr = `H: ${estT2.model.lags['H']}, O: ${estT2.model.lags['O']}`;
    checks.push({
      id: 'b_lag_T2',
      category: 'Model & Lags',
      name: 'T2 Lags (10-min steps)',
      expected: 'H: -3, O: 1',
      actual: lagStr,
      passed: estT2.model.lags['H'] === -3 && estT2.model.lags['O'] === 1,
      tolerance: 'exact',
    });
  }

  if (estT3) {
    const lagStr = `H: ${estT3.model.lags['H']}, O: ${estT3.model.lags['O']}`;
    checks.push({
      id: 'b_lag_T3',
      category: 'Model & Lags',
      name: 'T3 Lags (10-min steps)',
      expected: 'H: -3, O: 1',
      actual: lagStr,
      passed: estT3.model.lags['H'] === -3 && estT3.model.lags['O'] === 1,
      tolerance: 'exact',
    });
  }

  // 5. sigma_global T1 1.2999 | T2 1.1768 | T3 1.1630 (0.001)
  const checkSigma = (tName: string, expected: number, est?: (typeof report.turbines)['T1']) => {
    if (!est) return;
    const actual = est.model.sigmaGlobal;
    checks.push({
      id: `b_sigma_${tName}`,
      category: 'Predicted Wind & Error',
      name: `σ_global ${tName}`,
      expected: expected.toFixed(4),
      actual: actual.toFixed(4),
      passed: Math.abs(actual - expected) <= 0.001,
      tolerance: '±0.001',
    });
  };

  checkSigma('T1', 1.2999, estT1);
  checkSigma('T2', 1.1768, estT2);
  checkSigma('T3', 1.1630, estT3);

  // 6. T1 predicted wind stamps 0,1,2: 8.0791, 8.2097, 7.9612 (0.001)
  if (estT1 && estT1.predictedWindOutage.length >= 3) {
    const p1 = estT1.predictedWindOutage[0];
    const p2 = estT1.predictedWindOutage[1];
    const p3 = estT1.predictedWindOutage[2];

    const passed =
      Math.abs(p1 - 8.0791) <= 0.001 &&
      Math.abs(p2 - 8.2097) <= 0.001 &&
      Math.abs(p3 - 7.9612) <= 0.001;

    checks.push({
      id: 'b_pred_wind_T1_first3',
      category: 'Predicted Wind & Error',
      name: 'T1 Predicted Wind (Stamps 0, 1, 2)',
      expected: '8.0791, 8.2097, 7.9612 m/s',
      actual: `${p1.toFixed(4)}, ${p2.toFixed(4)}, ${p3.toFixed(4)} m/s`,
      passed,
      tolerance: '±0.001 m/s',
    });
  }

  // 7. Density sensitivity -2.00 % (0.05)
  const sens = report.airDensity.sensitivityPercent;
  const sensPassed = sens !== undefined && Math.abs(sens - -2.00) <= 0.05;
  checks.push({
    id: 'b_density_sensitivity',
    category: 'Density Sensitivity',
    name: 'Air Density Sensitivity',
    expected: '-2.00 %',
    actual: sens !== undefined ? `${sens.toFixed(2)} %` : 'N/A',
    passed: sensPassed,
    tolerance: '±0.05 %',
    detail: report.airDensity.isApplicable
      ? `Δp = ${report.airDensity.deltaP_hPa?.toFixed(1)} hPa, Ref Park = ${report.airDensity.referenceParkUsed}`
      : report.airDensity.reason,
  });

  // 8. Test period (flagged, 2026-09-04 00:00 - 2026-09-09 23:50, 864 stamps per turbine)
  const tpFlagged = report.testPeriod;
  if (tpFlagged) {
    // Dates and count check
    const datesPassed =
      tpFlagged.startDateStr === '2026-09-04 00:00' &&
      tpFlagged.endDateStr === '2026-09-09 23:50' &&
      tpFlagged.stampsCount === 864;

    checks.push({
      id: 'b_tp_flagged_window',
      category: 'Test Period (Flagged)',
      name: 'Flagged Test Period Window & Stamps',
      expected: '2026-09-04 00:00 to 2026-09-09 23:50 (864 stamps)',
      actual: `${tpFlagged.startDateStr} to ${tpFlagged.endDateStr} (${tpFlagged.stampsCount} stamps)`,
      passed: datesPassed,
      tolerance: 'exact',
    });

    // Per-turbine flagged checks:
    // T1: wind RMSE 1.5197 MAE 1.2001 r 0.8112 power RMSE 915.67 MAE 691.18 energy dev +11.50 %
    // T2: wind RMSE 1.2335 MAE 0.9219 r 0.8897 power RMSE 750.80 MAE 529.63 energy dev -1.93 %
    // T3: wind RMSE 1.3256 MAE 0.9985 r 0.8496 power RMSE 842.73 MAE 604.31 energy dev -5.29 %
    // (tolerance: wind 0.002, r 0.002, power 0.2 %, energy dev 0.05 points)
    const checkTurbineFlagged = (
      tName: string,
      expWindRMSE: number,
      expWindMAE: number,
      expR: number,
      expPowerRMSE: number,
      expPowerMAE: number,
      expDevPct: number
    ) => {
      const tm = tpFlagged.turbines[tName];
      if (!tm) return;

      const pWindRMSE = Math.abs(tm.windRMSE - expWindRMSE) <= 0.002;
      const pWindMAE = Math.abs(tm.windMAE - expWindMAE) <= 0.002;
      const pR = Math.abs(tm.r - expR) <= 0.002;
      const pPowerRMSE = Math.abs((tm.powerRMSE - expPowerRMSE) / expPowerRMSE) * 100 <= 0.2;
      const pPowerMAE = Math.abs((tm.powerMAE - expPowerMAE) / expPowerMAE) * 100 <= 0.2;
      const pDev = Math.abs(tm.energyDevPct - expDevPct) <= 0.05;

      const allTurbinePassed = pWindRMSE && pWindMAE && pR && pPowerRMSE && pPowerMAE && pDev;

      checks.push({
        id: `b_tp_flagged_${tName}`,
        category: 'Test Period (Flagged)',
        name: `${tName} Metrics (Wind RMSE/MAE/r, Power RMSE/MAE, ΔE%)`,
        expected: `wRMSE=${expWindRMSE.toFixed(4)}, wMAE=${expWindMAE.toFixed(4)}, r=${expR.toFixed(4)}, pRMSE=${expPowerRMSE.toFixed(2)}, pMAE=${expPowerMAE.toFixed(2)}, ΔE=${expDevPct >= 0 ? '+' : ''}${expDevPct.toFixed(2)}%`,
        actual: `wRMSE=${tm.windRMSE.toFixed(4)}, wMAE=${tm.windMAE.toFixed(4)}, r=${tm.r.toFixed(4)}, pRMSE=${tm.powerRMSE.toFixed(2)}, pMAE=${tm.powerMAE.toFixed(2)}, ΔE=${tm.energyDevPct >= 0 ? '+' : ''}${tm.energyDevPct.toFixed(2)}%`,
        passed: allTurbinePassed,
        tolerance: 'wind±0.002, r±0.002, power±0.2%, dev±0.05%',
        detail: `Wind RMSE: ${tm.windRMSE.toFixed(4)}, Wind MAE: ${tm.windMAE.toFixed(4)}, r: ${tm.r.toFixed(4)}, Power RMSE: ${tm.powerRMSE.toFixed(2)} kW, Power MAE: ${tm.powerMAE.toFixed(2)} kW, Energy dev: ${tm.energyDevPct.toFixed(2)}%`,
      });
    };

    checkTurbineFlagged('T1', 1.5197, 1.2001, 0.8112, 915.67, 691.18, 11.50);
    checkTurbineFlagged('T2', 1.2335, 0.9219, 0.8897, 750.80, 529.63, -1.93);
    checkTurbineFlagged('T3', 1.3256, 0.9985, 0.8496, 842.73, 604.31, -5.29);

    // Park energy measured 797,057 kWh, predicted 801,166 kWh, dev +0.52 %
    const expParkMeas = 797057;
    const expParkPred = 801166;
    const expParkDev = 0.52;
    const actParkMeas = tpFlagged.parkMeasuredEnergyKWh;
    const actParkPred = tpFlagged.parkPredictedEnergyKWh;
    const actParkDev = tpFlagged.parkEnergyDevPct;

    const pMeas = Math.abs((actParkMeas - expParkMeas) / expParkMeas) * 100 <= 0.1;
    const pPred = Math.abs((actParkPred - expParkPred) / expParkPred) * 100 <= 0.1;
    const pDev = Math.abs(actParkDev - expParkDev) <= 0.05;

    checks.push({
      id: 'b_tp_flagged_park',
      category: 'Test Period (Flagged)',
      name: 'Park Total Energy & Deviation (Flagged)',
      expected: `Meas 797,057 kWh, Pred 801,166 kWh, Dev +0.52 %`,
      actual: `Meas ${Math.round(actParkMeas).toLocaleString('en-US')} kWh, Pred ${Math.round(actParkPred).toLocaleString('en-US')} kWh, Dev ${actParkDev >= 0 ? '+' : ''}${actParkDev.toFixed(2)} %`,
      passed: pMeas && pPred && pDev,
      tolerance: 'energy±0.1%, dev±0.05%',
      detail: `Measured: ${Math.round(actParkMeas).toLocaleString('en-US')} kWh, Predicted: ${Math.round(actParkPred).toLocaleString('en-US')} kWh, Dev: ${actParkDev.toFixed(2)}%`,
    });
  }

  // 9. Test period "all data after the outage" (2026-09-04 00:00 - 2026-09-30 23:50)
  // T1 RMSE 1.3254 MAE 1.0052 ; T2 1.1021 / 0.8539 ; T3 1.1585 / 0.8974 ; park energy dev -2.23 %
  const tpAll = report.testPeriodAll;
  if (tpAll) {
    const tmT1 = tpAll.turbines['T1'];
    const tmT2 = tpAll.turbines['T2'];
    const tmT3 = tpAll.turbines['T3'];

    if (tmT1) {
      const pRMSE = Math.abs(tmT1.windRMSE - 1.3254) <= 0.002;
      const pMAE = Math.abs(tmT1.windMAE - 1.0052) <= 0.002;
      checks.push({
        id: 'b_tp_all_T1',
        category: 'Test Period (All Data After Outage)',
        name: 'T1 All-After Wind RMSE & MAE',
        expected: 'RMSE 1.3254 m/s, MAE 1.0052 m/s',
        actual: `RMSE ${tmT1.windRMSE.toFixed(4)} m/s, MAE ${tmT1.windMAE.toFixed(4)} m/s`,
        passed: pRMSE && pMAE,
        tolerance: '±0.002 m/s',
      });
    }

    if (tmT2) {
      const pRMSE = Math.abs(tmT2.windRMSE - 1.1021) <= 0.002;
      const pMAE = Math.abs(tmT2.windMAE - 0.8539) <= 0.002;
      checks.push({
        id: 'b_tp_all_T2',
        category: 'Test Period (All Data After Outage)',
        name: 'T2 All-After Wind RMSE & MAE',
        expected: 'RMSE 1.1021 m/s, MAE 0.8539 m/s',
        actual: `RMSE ${tmT2.windRMSE.toFixed(4)} m/s, MAE ${tmT2.windMAE.toFixed(4)} m/s`,
        passed: pRMSE && pMAE,
        tolerance: '±0.002 m/s',
      });
    }

    if (tmT3) {
      const pRMSE = Math.abs(tmT3.windRMSE - 1.1585) <= 0.002;
      const pMAE = Math.abs(tmT3.windMAE - 0.8974) <= 0.002;
      checks.push({
        id: 'b_tp_all_T3',
        category: 'Test Period (All Data After Outage)',
        name: 'T3 All-After Wind RMSE & MAE',
        expected: 'RMSE 1.1585 m/s, MAE 0.8974 m/s',
        actual: `RMSE ${tmT3.windRMSE.toFixed(4)} m/s, MAE ${tmT3.windMAE.toFixed(4)} m/s`,
        passed: pRMSE && pMAE,
        tolerance: '±0.002 m/s',
      });
    }

    const pParkDev = Math.abs(tpAll.parkEnergyDevPct - -2.23) <= 0.05;
    checks.push({
      id: 'b_tp_all_park_dev',
      category: 'Test Period (All Data After Outage)',
      name: 'Park Energy Deviation (All Data After Outage)',
      expected: '-2.23 %',
      actual: `${tpAll.parkEnergyDevPct.toFixed(2)} %`,
      passed: pParkDev,
      tolerance: '±0.05 points',
    });
  }

  // 10. Correlation analysis (training data before outage)
  // H1-T1 0.667, O1-T2 0.767, Park O mean-T3 0.745 (tolerance 0.002)
  const corr = result.screening.correlationAnalysis;
  if (corr) {
    const checkCorr = (rowLabel: string, targetTurbine: string, expected: number, id: string) => {
      const row = corr.rows.find((r) => r.label === rowLabel);
      const actual = row?.rValues[targetTurbine];
      const passed = actual !== undefined && Math.abs(actual - expected) <= 0.002;
      checks.push({
        id,
        category: 'Correlation Analysis',
        name: `Correlation ${rowLabel} vs ${targetTurbine} (before outage)`,
        expected: expected.toFixed(3),
        actual: actual !== undefined ? actual.toFixed(3) : 'N/A',
        passed,
        tolerance: '±0.002',
      });
    };

    checkCorr('H1', 'T1', 0.667, 'b_corr_H1_T1');
    checkCorr('O1', 'T2', 0.767, 'b_corr_O1_T2');
    checkCorr('Park O mean', 'T3', 0.745, 'b_corr_ParkO_T3');

    // 11. Mean of all reference turbines vs target turbines (T1: 0.725, T2: 0.798, T3: 0.776 ±0.002)
    const allRefRow = corr.rows.find((r) => r.label === 'Mean of all reference turbines');
    const checkAllRef = (tgt: string, expR: number, id: string) => {
      const actR = allRefRow?.rValues[tgt];
      const passed = actR !== undefined && Math.abs(actR - expR) <= 0.002;
      checks.push({
        id,
        category: 'Correlation Analysis',
        name: `Mean of All References vs ${tgt}`,
        expected: expR.toFixed(3),
        actual: actR !== undefined ? actR.toFixed(3) : 'N/A',
        passed,
        tolerance: '±0.002',
      });
    };

    checkAllRef('T1', 0.725, 'b_all_ref_T1');
    checkAllRef('T2', 0.798, 'b_all_ref_T2');
    checkAllRef('T3', 0.776, 'b_all_ref_T3');

    // 12. Correlation map key values (O1-O2 0.9675, H3-H5 0.9053, T2-T3 0.8827, H2-T1 0.6099 ±0.002)
    if (corr.allTurbinesMap) {
      const checkMatrixVal = (tA: string, tB: string, expR: number, id: string) => {
        const idxA = corr.allTurbinesMap!.turbines.indexOf(tA);
        const idxB = corr.allTurbinesMap!.turbines.indexOf(tB);
        const actR = idxA >= 0 && idxB >= 0 ? corr.allTurbinesMap!.matrix[idxA][idxB] : undefined;
        const passed = actR !== undefined && Math.abs(actR - expR) <= 0.002;
        checks.push({
          id,
          category: 'Correlation Matrix (10x10)',
          name: `Correlation ${tA} ↔ ${tB}`,
          expected: expR.toFixed(4),
          actual: actR !== undefined ? actR.toFixed(4) : 'N/A',
          passed,
          tolerance: '±0.002',
        });
      };

      checkMatrixVal('O1', 'O2', 0.9675, 'b_mat_O1_O2');
      checkMatrixVal('H3', 'H5', 0.9053, 'b_mat_H3_H5');
      checkMatrixVal('T2', 'T3', 0.8827, 'b_mat_T2_T3');
      checkMatrixVal('H2', 'T1', 0.6099, 'b_mat_H2_T1');
    }

    // 13. Best time-delay shifts (T1: H -30 / O 0, T2: H -30 / O +10, T3: H -30 / O +10)
    if (corr.timeDelayAnalysis) {
      const checkShift = (tgt: string, expH: number, expO: number, id: string) => {
        const td = corr.timeDelayAnalysis!.find((a) => a.targetTurbine === tgt);
        const actH = td?.bestShiftH;
        const actO = td?.bestShiftO;
        const passed = actH === expH && actO === expO;
        const fmt = (m: number) => (m > 0 ? `+${m}` : `${m}`);
        checks.push({
          id,
          category: 'Time Delay Screening',
          name: `Optimal Shift ${tgt} (H / O)`,
          expected: `H: ${fmt(expH)} min, O: ${fmt(expO)} min`,
          actual: td ? `H: ${fmt(actH!)} min, O: ${fmt(actO!)} min` : 'N/A',
          passed,
          tolerance: 'exact',
        });
      };

      checkShift('T1', -30, 0, 'b_td_shift_T1');
      checkShift('T2', -30, 10, 'b_td_shift_T2');
      checkShift('T3', -30, 10, 'b_td_shift_T3');
    }
  }

  // 14. BayWa format export sum & row 1 power
  const row1Power =
    (estT1?.expectedPowerOutage[0] ?? 0) +
    (estT2?.expectedPowerOutage[0] ?? 0) +
    (estT3?.expectedPowerOutage[0] ?? 0);

  const bayWaSumPassed = Math.abs(report.parkEnergyKWh - 316117.7) <= 0.1;
  checks.push({
    id: 'b_export_baywa_sum',
    category: 'BayWa Export Verification',
    name: 'BayWa Format Export Park Energy Sum',
    expected: '316,117.7 kWh',
    actual: `${report.parkEnergyKWh.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`,
    passed: bayWaSumPassed,
    tolerance: '±0.1 kWh',
  });

  const row1Passed = Math.abs(row1Power - 8720.29) <= 0.1;
  checks.push({
    id: 'b_export_baywa_row1_power',
    category: 'BayWa Export Verification',
    name: 'BayWa Format Export Row 1 Power (T1+T2+T3)',
    expected: '8,720.29 kW',
    actual: `${row1Power.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kW`,
    passed: row1Passed,
    tolerance: '±0.10 kW',
    detail: `T1: ${estT1?.expectedPowerOutage[0]?.toFixed(2) ?? 'N/A'} kW, T2: ${estT2?.expectedPowerOutage[0]?.toFixed(2) ?? 'N/A'} kW, T3: ${estT3?.expectedPowerOutage[0]?.toFixed(2) ?? 'N/A'} kW`,
  });

  return checks;
}

