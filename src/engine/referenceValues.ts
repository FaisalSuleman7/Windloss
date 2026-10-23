/**
 * Reference check values and comparator for the Self-test page.
 */
import { EngineResult } from './index';

export interface SelfTestCheckItem {
  id: string;
  category: 'Grid & Outage' | 'Turbines & Screening' | 'Model & Lags' | 'Coefficients' | 'Predicted Wind & Error' | 'Energy & Range' | 'Density Sensitivity';
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
