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
 * Section B. Official protocol and final method (notTest, 8 sectors, smooth 5, turbulence).
 * Verifies the 13 demo files against the final BayWa benchmark per MSG12.
 */
export function runSectionBChecks(result: EngineResult): SelfTestCheckItem[] {
  const checks: SelfTestCheckItem[] = [];
  const { chosenCombination, allCombinations, report, screening } = result;
  const estT1 = report.turbines['T1'];
  const estT2 = report.turbines['T2'];
  const estT3 = report.turbines['T3'];

  // 1. Energy kWh (0.1%):
  // Park energy 314,518.7 kWh | T1 88,680.8 | T2 125,622.3 | T3 100,215.5
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

  checkEnergy('Park Total', 314518.7, report.parkEnergyKWh, 'b_final_energy_park');
  if (estT1) checkEnergy('T1', 88680.8, estT1.energyKWh, 'b_final_energy_T1');
  if (estT2) checkEnergy('T2', 125622.3, estT2.energyKWh, 'b_final_energy_T2');
  if (estT3) checkEnergy('T3', 100215.5, estT3.energyKWh, 'b_final_energy_T3');

  // 2. Park 80% range 281,060 - 362,437 kWh (0.5%)
  const expLower = 281060;
  const expUpper = 362437;
  const actLower = report.parkRange80LowerKWh;
  const actUpper = report.parkRange80UpperKWh;
  const diffLowerPct = Math.abs((actLower - expLower) / expLower) * 100;
  const diffUpperPct = Math.abs((actUpper - expUpper) / expUpper) * 100;

  checks.push({
    id: 'b_final_park_80_range',
    category: 'Energy & Range',
    name: 'Park 80% Uncertainty Range',
    expected: '281,060 – 362,437 kWh',
    actual: `${Math.round(actLower).toLocaleString('en-US')} – ${Math.round(actUpper).toLocaleString('en-US')} kWh`,
    passed: diffLowerPct <= 0.5 && diffUpperPct <= 0.5,
    tolerance: '±0.5 %',
    detail: `Lower err: ${diffLowerPct.toFixed(2)}%, Upper err: ${diffUpperPct.toFixed(2)}%`,
  });

  // 3. Backtest windows 23 (exact) | scores H 8.14 %, H+O 8.61 %, O 8.85 % (0.05); wind RMSE H 1.241, H+O 1.127, O 1.222 (0.002) -> chosen H+O
  checks.push({
    id: 'b_final_windows_count',
    category: 'Backtest Validation',
    name: 'Backtest Windows Evaluated (notTest)',
    expected: '23',
    actual: String(chosenCombination.windowsCount),
    passed: chosenCombination.windowsCount === 23,
    tolerance: 'exact',
  });

  const scoreH = allCombinations.find((c) => c.combinationKey === 'H')?.selectionScore;
  const scoreHO = allCombinations.find((c) => c.combinationKey === 'H+O')?.selectionScore;
  const scoreO = allCombinations.find((c) => c.combinationKey === 'O')?.selectionScore;

  checks.push({
    id: 'b_final_score_H',
    category: 'Backtest Validation',
    name: 'Combination Score: H',
    expected: '8.14 %',
    actual: scoreH !== undefined ? `${scoreH.toFixed(2)} %` : 'N/A',
    passed: scoreH !== undefined && Math.abs(scoreH - 8.14) <= 0.05,
    tolerance: '±0.05 %',
  });

  checks.push({
    id: 'b_final_score_HO',
    category: 'Backtest Validation',
    name: 'Combination Score: H+O',
    expected: '8.61 %',
    actual: scoreHO !== undefined ? `${scoreHO.toFixed(2)} %` : 'N/A',
    passed: scoreHO !== undefined && Math.abs(scoreHO - 8.61) <= 0.05,
    tolerance: '±0.05 %',
  });

  checks.push({
    id: 'b_final_score_O',
    category: 'Backtest Validation',
    name: 'Combination Score: O',
    expected: '8.85 %',
    actual: scoreO !== undefined ? `${scoreO.toFixed(2)} %` : 'N/A',
    passed: scoreO !== undefined && Math.abs(scoreO - 8.85) <= 0.05,
    tolerance: '±0.05 %',
  });

  const rmseH = allCombinations.find((c) => c.combinationKey === 'H')?.meanWindRMSE;
  const rmseHO = allCombinations.find((c) => c.combinationKey === 'H+O')?.meanWindRMSE;
  const rmseO = allCombinations.find((c) => c.combinationKey === 'O')?.meanWindRMSE;

  checks.push({
    id: 'b_final_rmse_H',
    category: 'Backtest Validation',
    name: 'Combination Wind RMSE: H',
    expected: '1.241 m/s',
    actual: rmseH !== undefined ? `${rmseH.toFixed(3)} m/s` : 'N/A',
    passed: rmseH !== undefined && Math.abs(rmseH - 1.241) <= 0.002,
    tolerance: '±0.002 m/s',
  });

  checks.push({
    id: 'b_final_rmse_HO',
    category: 'Backtest Validation',
    name: 'Combination Wind RMSE: H+O',
    expected: '1.127 m/s',
    actual: rmseHO !== undefined ? `${rmseHO.toFixed(3)} m/s` : 'N/A',
    passed: rmseHO !== undefined && Math.abs(rmseHO - 1.127) <= 0.002,
    tolerance: '±0.002 m/s',
  });

  checks.push({
    id: 'b_final_rmse_O',
    category: 'Backtest Validation',
    name: 'Combination Wind RMSE: O',
    expected: '1.222 m/s',
    actual: rmseO !== undefined ? `${rmseO.toFixed(3)} m/s` : 'N/A',
    passed: rmseO !== undefined && Math.abs(rmseO - 1.222) <= 0.002,
    tolerance: '±0.002 m/s',
  });

  checks.push({
    id: 'b_final_chosen_combination',
    category: 'Backtest Validation',
    name: 'Chosen Combination (Noise Band Rule)',
    expected: 'H+O',
    actual: chosenCombination.combinationKey,
    passed: chosenCombination.combinationKey === 'H+O',
    tolerance: 'exact',
    detail: 'H+O chosen because all within noise band and H+O has lowest wind RMSE (1.127 m/s)',
  });

  // 4. Lags T1 H:-3 O:0 | T2 H:-3 O:1 | T3 H:-3 O:0 (exact)
  if (estT1) {
    const lagStr = `H: ${estT1.model.lags['H']}, O: ${estT1.model.lags['O']}`;
    checks.push({
      id: 'b_final_lags_T1',
      category: 'Model & Lags',
      name: 'T1 Delay Lags (H / O)',
      expected: 'H: -3, O: 0',
      actual: lagStr,
      passed: estT1.model.lags['H'] === -3 && estT1.model.lags['O'] === 0,
      tolerance: 'exact',
    });
  }

  if (estT2) {
    const lagStr = `H: ${estT2.model.lags['H']}, O: ${estT2.model.lags['O']}`;
    checks.push({
      id: 'b_final_lags_T2',
      category: 'Model & Lags',
      name: 'T2 Delay Lags (H / O)',
      expected: 'H: -3, O: 1',
      actual: lagStr,
      passed: estT2.model.lags['H'] === -3 && estT2.model.lags['O'] === 1,
      tolerance: 'exact',
    });
  }

  if (estT3) {
    const lagStr = `H: ${estT3.model.lags['H']}, O: ${estT3.model.lags['O']}`;
    checks.push({
      id: 'b_final_lags_T3',
      category: 'Model & Lags',
      name: 'T3 Delay Lags (H / O)',
      expected: 'H: -3, O: 0',
      actual: lagStr,
      passed: estT3.model.lags['H'] === -3 && estT3.model.lags['O'] === 0,
      tolerance: 'exact',
    });
  }

  // 5. sigma_global T1 1.1872 | T2 1.0837 | T3 1.0829 (0.001)
  const checkSigma = (tName: string, expSig: number, actSig: number, id: string) => {
    const diff = Math.abs(actSig - expSig);
    checks.push({
      id,
      category: 'Model & Lags',
      name: `${tName} Global Residual Sigma`,
      expected: `${expSig.toFixed(4)} m/s`,
      actual: `${actSig.toFixed(4)} m/s`,
      passed: diff <= 0.001,
      tolerance: '±0.001 m/s',
      detail: `Diff: ${diff.toFixed(5)} m/s`,
    });
  };

  if (estT1) checkSigma('T1', 1.1872, estT1.model.sigmaGlobal, 'b_final_sigma_T1');
  if (estT2) checkSigma('T2', 1.0837, estT2.model.sigmaGlobal, 'b_final_sigma_T2');
  if (estT3) checkSigma('T3', 1.0829, estT3.model.sigmaGlobal, 'b_final_sigma_T3');

  // 6. T1 predicted wind stamps 0,1,2: 8.7673, 8.6820, 8.6362 (0.001)
  if (estT1 && estT1.predictedWindOutage.length >= 3) {
    const s0 = estT1.predictedWindOutage[0];
    const s1 = estT1.predictedWindOutage[1];
    const s2 = estT1.predictedWindOutage[2];

    const checkWindStamp = (stampIdx: number, expW: number, actW: number, id: string) => {
      const diff = Math.abs(actW - expW);
      checks.push({
        id,
        category: 'Predicted Wind',
        name: `T1 Predicted Wind Stamp [${stampIdx}]`,
        expected: `${expW.toFixed(4)} m/s`,
        actual: `${actW.toFixed(4)} m/s`,
        passed: diff <= 0.001,
        tolerance: '±0.001 m/s',
        detail: `Diff: ${diff.toFixed(5)} m/s`,
      });
    };

    checkWindStamp(0, 8.7673, s0, 'b_final_wind_t1_s0');
    checkWindStamp(1, 8.6820, s1, 'b_final_wind_t1_s1');
    checkWindStamp(2, 8.6362, s2, 'b_final_wind_t1_s2');
  }

  // 7. Density sensitivity -2.01 % (0.05) -> 308,212 kWh
  if (report.airDensity && report.airDensity.sensitivityPercent !== undefined) {
    const actSens = report.airDensity.sensitivityPercent;
    const expSens = -2.01;
    const diffSens = Math.abs(actSens - expSens);

    checks.push({
      id: 'b_final_density_sens',
      category: 'Air Density',
      name: 'Air Density Energy Sensitivity',
      expected: '-2.01 %',
      actual: `${actSens.toFixed(2)} %`,
      passed: diffSens <= 0.05,
      tolerance: '±0.05 %',
      detail: `Diff: ${diffSens.toFixed(3)}%`,
    });

    const actCorrKWh = report.airDensity.correctedParkEnergyKWh ?? 0;
    const expCorrKWh = 308212;
    const diffKWhPct = Math.abs((actCorrKWh - expCorrKWh) / expCorrKWh) * 100;

    checks.push({
      id: 'b_final_density_kwh',
      category: 'Air Density',
      name: 'Density-Corrected Park Energy',
      expected: '308,212 kWh',
      actual: `${Math.round(actCorrKWh).toLocaleString('en-US')} kWh`,
      passed: diffKWhPct <= 0.1,
      tolerance: '±0.1 %',
      detail: `Diff: ${diffKWhPct.toFixed(3)}%`,
    });
  }

  // 8. Test 4-9 Sep (864 stamps per turbine)
  const tp = result.testPeriod || report.testPeriod;
  if (tp && tp.turbines) {
    const tpT1 = tp.turbines['T1'];
    const tpT2 = tp.turbines['T2'];
    const tpT3 = tp.turbines['T3'];

    const checkTestTurbine = (
      tName: string,
      met: typeof tpT1,
      exp: {
        windRMSE: number;
        windMAE: number;
        r: number;
        powerRMSE: number;
        powerMAE: number;
        energyDevPct: number;
      },
      prefix: string
    ) => {
      if (!met) return;

      const diffRMSE = Math.abs(met.windRMSE - exp.windRMSE);
      checks.push({
        id: `${prefix}_rmse`,
        category: 'Test Period 4-9 Sep',
        name: `${tName} Test Wind RMSE`,
        expected: `${exp.windRMSE.toFixed(4)} m/s`,
        actual: `${met.windRMSE.toFixed(4)} m/s`,
        passed: diffRMSE <= 0.002,
        tolerance: '±0.002 m/s',
      });

      const diffMAE = Math.abs(met.windMAE - exp.windMAE);
      checks.push({
        id: `${prefix}_mae`,
        category: 'Test Period 4-9 Sep',
        name: `${tName} Test Wind MAE`,
        expected: `${exp.windMAE.toFixed(4)} m/s`,
        actual: `${met.windMAE.toFixed(4)} m/s`,
        passed: diffMAE <= 0.002,
        tolerance: '±0.002 m/s',
      });

      const diffR = Math.abs(met.r - exp.r);
      checks.push({
        id: `${prefix}_r`,
        category: 'Test Period 4-9 Sep',
        name: `${tName} Test Pearson r`,
        expected: exp.r.toFixed(4),
        actual: met.r.toFixed(4),
        passed: diffR <= 0.002,
        tolerance: '±0.002',
      });

      const diffPRMSE = Math.abs((met.powerRMSE - exp.powerRMSE) / exp.powerRMSE) * 100;
      checks.push({
        id: `${prefix}_p_rmse`,
        category: 'Test Period 4-9 Sep',
        name: `${tName} Test Power RMSE`,
        expected: `${exp.powerRMSE.toFixed(2)} kW`,
        actual: `${met.powerRMSE.toFixed(2)} kW`,
        passed: diffPRMSE <= 0.2,
        tolerance: '±0.2 %',
      });

      const diffPMAE = Math.abs((met.powerMAE - exp.powerMAE) / exp.powerMAE) * 100;
      checks.push({
        id: `${prefix}_p_mae`,
        category: 'Test Period 4-9 Sep',
        name: `${tName} Test Power MAE`,
        expected: `${exp.powerMAE.toFixed(2)} kW`,
        actual: `${met.powerMAE.toFixed(2)} kW`,
        passed: diffPMAE <= 0.2,
        tolerance: '±0.2 %',
      });

      const diffDev = Math.abs(met.energyDevPct - exp.energyDevPct);
      checks.push({
        id: `${prefix}_dev`,
        category: 'Test Period 4-9 Sep',
        name: `${tName} Test Energy Dev %`,
        expected: `${exp.energyDevPct >= 0 ? '+' : ''}${exp.energyDevPct.toFixed(2)} %`,
        actual: `${met.energyDevPct >= 0 ? '+' : ''}${met.energyDevPct.toFixed(2)} %`,
        passed: diffDev <= 0.05,
        tolerance: '±0.05 points',
      });
    };

    if (tpT1) {
      checkTestTurbine(
        'T1',
        tpT1,
        {
          windRMSE: 1.3941,
          windMAE: 1.0910,
          r: 0.8495,
          powerRMSE: 822.16,
          powerMAE: 615.34,
          energyDevPct: 13.20,
        },
        'b_final_t1'
      );
    }

    if (tpT2) {
      checkTestTurbine(
        'T2',
        tpT2,
        {
          windRMSE: 1.2103,
          windMAE: 0.9009,
          r: 0.8975,
          powerRMSE: 732.29,
          powerMAE: 504.47,
          energyDevPct: -1.02,
        },
        'b_final_t2'
      );
    }

    if (tpT3) {
      checkTestTurbine(
        'T3',
        tpT3,
        {
          windRMSE: 1.3069,
          windMAE: 0.9989,
          r: 0.8570,
          powerRMSE: 814.79,
          powerMAE: 583.67,
          energyDevPct: -3.37,
        },
        'b_final_t3'
      );
    }

    // Park level test metrics
    const diffMeasPark = Math.abs((tp.parkMeasuredEnergyKWh - 797057) / 797057) * 100;
    checks.push({
      id: 'b_final_test_park_meas',
      category: 'Test Period 4-9 Sep',
      name: 'Park Test Measured Energy',
      expected: '797,057 kWh',
      actual: `${Math.round(tp.parkMeasuredEnergyKWh).toLocaleString('en-US')} kWh`,
      passed: diffMeasPark <= 0.1,
      tolerance: '±0.1 %',
    });

    const diffPredPark = Math.abs((tp.parkPredictedEnergyKWh - 812865) / 812865) * 100;
    checks.push({
      id: 'b_final_test_park_pred',
      category: 'Test Period 4-9 Sep',
      name: 'Park Test Predicted Energy',
      expected: '812,865 kWh',
      actual: `${Math.round(tp.parkPredictedEnergyKWh).toLocaleString('en-US')} kWh`,
      passed: diffPredPark <= 0.1,
      tolerance: '±0.1 %',
    });

    const diffParkDev = Math.abs(tp.parkEnergyDevPct - 1.98);
    checks.push({
      id: 'b_final_test_park_dev',
      category: 'Test Period 4-9 Sep',
      name: 'Park Test Energy Dev %',
      expected: '+1.98 %',
      actual: `${tp.parkEnergyDevPct >= 0 ? '+' : ''}${tp.parkEnergyDevPct.toFixed(2)} %`,
      passed: diffParkDev <= 0.05,
      tolerance: '±0.05 points',
    });

    const diffPooledRMSE = Math.abs(tp.meanWindRMSE - 1.3059);
    checks.push({
      id: 'b_final_test_park_rmse',
      category: 'Test Period 4-9 Sep',
      name: 'Park Test Pooled Wind RMSE',
      expected: '1.3059 m/s',
      actual: `${tp.meanWindRMSE.toFixed(4)} m/s`,
      passed: diffPooledRMSE <= 0.002,
      tolerance: '±0.002 m/s',
    });

    const diffPooledMAE = Math.abs(tp.meanWindMAE - 0.9969);
    checks.push({
      id: 'b_final_test_park_mae',
      category: 'Test Period 4-9 Sep',
      name: 'Park Test Pooled Wind MAE',
      expected: '0.9969 m/s',
      actual: `${tp.meanWindMAE.toFixed(4)} m/s`,
      passed: diffPooledMAE <= 0.002,
      tolerance: '±0.002 m/s',
    });
  }

  // 9. Correlation on the training data: O1-O2 0.9688, H3-H5 0.9158, T2-T3 0.8922, H2-T1 0.6508 ; mean of all references vs T1 0.7547, T2 0.8247, T3 0.8005 (0.002)
  const corr = screening.correlationAnalysis;
  if (corr) {
    if (corr.allTurbinesMap && corr.allTurbinesMap.matrix) {
      const { turbines, matrix } = corr.allTurbinesMap;
      const checkMatrixVal = (tA: string, tB: string, expR: number, id: string) => {
        const i = turbines.indexOf(tA);
        const j = turbines.indexOf(tB);
        const val = i !== -1 && j !== -1 ? matrix[i][j] : NaN;
        const diff = Math.abs(val - expR);
        checks.push({
          id,
          category: 'Correlation on Training Data',
          name: `Pair Correlation: ${tA} ↔ ${tB}`,
          expected: expR.toFixed(4),
          actual: !Number.isNaN(val) ? val.toFixed(4) : 'N/A',
          passed: diff <= 0.002,
          tolerance: '±0.002',
          detail: `Diff: ${diff.toFixed(5)}`,
        });
      };

      checkMatrixVal('O1', 'O2', 0.9688, 'b_final_corr_O1_O2');
      checkMatrixVal('H3', 'H5', 0.9158, 'b_final_corr_H3_H5');
      checkMatrixVal('T2', 'T3', 0.8922, 'b_final_corr_T2_T3');
      checkMatrixVal('H2', 'T1', 0.6508, 'b_final_corr_H2_T1');
    }

    const meanRow = corr.rows.find((r) => r.label === 'Mean of all reference turbines');
    if (meanRow) {
      const checkMeanRef = (tgt: string, expR: number, id: string) => {
        const val = meanRow.rValues[tgt] ?? NaN;
        const diff = Math.abs(val - expR);
        checks.push({
          id,
          category: 'Correlation on Training Data',
          name: `Mean of All References vs ${tgt}`,
          expected: expR.toFixed(4),
          actual: !Number.isNaN(val) ? val.toFixed(4) : 'N/A',
          passed: diff <= 0.002,
          tolerance: '±0.002',
          detail: `Diff: ${diff.toFixed(5)}`,
        });
      };

      checkMeanRef('T1', 0.7547, 'b_final_corr_mean_T1');
      checkMeanRef('T2', 0.8247, 'b_final_corr_mean_T2');
      checkMeanRef('T3', 0.8005, 'b_final_corr_mean_T3');
    }

    // 10. Best time shifts: T1 H -30 min O 0 ; T2 H -30 O +10 ; T3 H -30 O 0 (exact)
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

      checkShift('T1', -30, 0, 'b_final_shift_T1');
      checkShift('T2', -30, 10, 'b_final_shift_T2');
      checkShift('T3', -30, 0, 'b_final_shift_T3');
    }
  }

  // 11. BayWa-format export (standard density)
  const t1W0 = estT1?.predictedWindOutage[0] ?? NaN;
  const t2W0 = estT2?.predictedWindOutage[0] ?? NaN;
  const t3W0 = estT3?.predictedWindOutage[0] ?? NaN;
  const p0 = (estT1?.expectedPowerOutage[0] ?? 0) + (estT2?.expectedPowerOutage[0] ?? 0) + (estT3?.expectedPowerOutage[0] ?? 0);
  const e0 = p0 / 6;

  const row1Expected = '2026-09-01 00:00,8.7673,9.3974,8.8191,9879.75,1646.624';
  const row1Actual = `${report.outageDates[0] || '2026-09-01 00:00'},${t1W0.toFixed(4)},${t2W0.toFixed(4)},${t3W0.toFixed(4)},${p0.toFixed(2)},${e0.toFixed(3)}`;
  const row1Matches =
    Math.abs(t1W0 - 8.7673) <= 0.002 &&
    Math.abs(t2W0 - 9.3974) <= 0.002 &&
    Math.abs(t3W0 - 8.8191) <= 0.002 &&
    Math.abs(p0 - 9879.75) <= 1.0;

  checks.push({
    id: 'b_final_export_first_row',
    category: 'BayWa Export Verification',
    name: 'BayWa Export First Row (Standard Density)',
    expected: row1Expected,
    actual: row1Actual,
    passed: row1Matches,
    tolerance: 'wind ±0.002 m/s, power ±1 kW',
  });

  const lastIdx = (estT1?.predictedWindOutage.length ?? 1) - 1;
  const t1WLast = estT1?.predictedWindOutage[lastIdx] ?? NaN;
  const t2WLast = estT2?.predictedWindOutage[lastIdx] ?? NaN;
  const t3WLast = estT3?.predictedWindOutage[lastIdx] ?? NaN;
  const pLast = (estT1?.expectedPowerOutage[lastIdx] ?? 0) + (estT2?.expectedPowerOutage[lastIdx] ?? 0) + (estT3?.expectedPowerOutage[lastIdx] ?? 0);
  const eLast = pLast / 6;

  const rowLastExpected = '2026-09-03 23:50,5.8158,6.9492,6.3752,4216.33,702.722';
  const rowLastActual = `${report.outageDates[lastIdx] || '2026-09-03 23:50'},${t1WLast.toFixed(4)},${t2WLast.toFixed(4)},${t3WLast.toFixed(4)},${pLast.toFixed(2)},${eLast.toFixed(3)}`;
  const rowLastMatches =
    Math.abs(t1WLast - 5.8158) <= 0.002 &&
    Math.abs(t2WLast - 6.9492) <= 0.002 &&
    Math.abs(t3WLast - 6.3752) <= 0.002 &&
    Math.abs(pLast - 4216.33) <= 1.0;

  checks.push({
    id: 'b_final_export_last_row',
    category: 'BayWa Export Verification',
    name: 'BayWa Export Last Row (Standard Density)',
    expected: rowLastExpected,
    actual: rowLastActual,
    passed: rowLastMatches,
    tolerance: 'wind ±0.002 m/s, power ±1 kW',
  });

  const diffBayWaSum = Math.abs((report.parkEnergyKWh - 314518.7) / 314518.7) * 100;
  checks.push({
    id: 'b_final_export_sum',
    category: 'BayWa Export Verification',
    name: 'BayWa Export Park Energy Sum',
    expected: '314,518.7 kWh',
    actual: `${report.parkEnergyKWh.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`,
    passed: diffBayWaSum <= 0.1,
    tolerance: '±0.1 %',
  });

  return checks;
}

export const runOfficialProtocolFinalChecks = runSectionBChecks;

/**
 * Section C. Variant: training before the outage, 4 sectors.
 * (Renamed from former Section B, 42 checks unchanged).
 */
export const runVariantBefore4SectorsChecks = runOfficialProtocolChecks;

/**
 * Section C. Variant: training before the outage, 4 sectors (legacy alias).
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

