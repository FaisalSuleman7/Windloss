/**
 * Export helpers for CSV predictions, summary tables, and claim email text.
 */
import { EngineResult } from '../engine';

/**
 * Triggers a browser file download.
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. Generates predictions CSV (per turbine):
 * timestamp,turbine,wind_speed_pred,power_pred_kw
 */
export function generatePredictionsCSV(result: EngineResult): string {
  const { report } = result;
  const rows: string[] = ['timestamp,turbine,wind_speed_pred,power_pred_kw'];

  for (const tName of report.targetTurbines) {
    const est = report.turbines[tName];
    if (!est) continue;

    for (let i = 0; i < report.outageDates.length; i++) {
      const ts = report.outageDates[i];
      const ws = est.predictedWindOutage[i];
      const p = est.expectedPowerOutage[i];
      rows.push(
        `"${ts}",${tName},${Number.isNaN(ws) ? '' : ws.toFixed(4)},${
          Number.isNaN(p) ? '' : p.toFixed(2)
        }`
      );
    }
  }

  return rows.join('\n');
}

/**
 * Generates single-turbine predictions CSV matching the judges' input format:
 * turbine_name,timestamp,wind_speed,power_kw
 */
export function generateJudgesPredictionsCSV(
  result: EngineResult,
  turbineName: string
): string {
  const { report } = result;
  const est = report.turbines[turbineName];
  if (!est) return '';

  const rows: string[] = ['turbine_name,timestamp,wind_speed,power_kw'];

  for (let i = 0; i < report.outageDates.length; i++) {
    const ts = report.outageDates[i];
    const ws = est.predictedWindOutage[i];
    const p = est.expectedPowerOutage[i];
    const wsStr = Number.isNaN(ws) ? '0.0000' : ws.toFixed(4);
    const pStr = Number.isNaN(p) ? '0.00' : p.toFixed(2);
    rows.push(`${turbineName},${ts},${wsStr},${pStr}`);
  }

  return rows.join('\n');
}


/**
 * 2. Generates wide predictions CSV + park total:
 * timestamp,{T}_wind_speed_pred,{T}_power_pred_kw...,park_power_pred_kw
 */
export function generatePredictionsWideCSV(result: EngineResult): string {
  const { report } = result;
  const targets = report.targetTurbines;

  const headerParts = ['timestamp'];
  for (const t of targets) {
    headerParts.push(`${t}_wind_speed_pred`, `${t}_power_pred_kw`);
  }
  headerParts.push('park_power_pred_kw');

  const rows: string[] = [headerParts.join(',')];

  for (let i = 0; i < report.outageDates.length; i++) {
    const ts = report.outageDates[i];
    const rowParts: string[] = [`"${ts}"`];
    let sumParkPower = 0;

    for (const t of targets) {
      const est = report.turbines[t];
      const ws = est ? est.predictedWindOutage[i] : NaN;
      const p = est ? est.expectedPowerOutage[i] : NaN;

      rowParts.push(Number.isNaN(ws) ? '' : ws.toFixed(4));
      rowParts.push(Number.isNaN(p) ? '' : p.toFixed(2));

      if (!Number.isNaN(p)) {
        sumParkPower += p;
      }
    }

    rowParts.push(sumParkPower.toFixed(2));
    rows.push(rowParts.join(','));
  }

  return rows.join('\n');
}

/**
 * Generates predictions CSV in the mentors' official format:
 * timestamp,{T1}_wind_speed_ms,{T2}_wind_speed_ms...,park_power_kw,park_energy_kwh
 */
export function generateBayWaFormatPredictionsCSV(result: EngineResult): string {
  const { report } = result;
  const targets = report.targetTurbines;

  const headerParts = ['timestamp', ...targets.map((t) => `${t}_wind_speed_ms`), 'park_power_kw', 'park_energy_kwh'];
  const rows: string[] = [headerParts.join(',')];

  for (let i = 0; i < report.outageDates.length; i++) {
    const ts = report.outageDates[i];
    let sumParkPower = 0;
    const windCols: string[] = [];

    for (const t of targets) {
      const est = report.turbines[t];
      const ws = est ? est.predictedWindOutage[i] : NaN;
      const p = est ? (est.densityPowerOutage ? est.densityPowerOutage[i] : est.expectedPowerOutage[i]) : NaN;

      const wsVal = Number.isNaN(ws) ? 0 : ws;
      const pVal = Number.isNaN(p) ? 0 : p;

      windCols.push(wsVal.toFixed(4));
      sumParkPower += pVal;
    }

    const parkPowerKw = sumParkPower.toFixed(2);
    const parkEnergyKwh = (sumParkPower / 6).toFixed(3);

    rows.push([ts, ...windCols, parkPowerKw, parkEnergyKwh].join(','));
  }

  return rows.join('\n');
}

/**
 * 3. Generates full period CSV (measured + reconstructed across all grid stamps):
 * timestamp,turbine,wind_speed_measured,wind_speed_pred,power_pred_kw,in_outage
 */
export function generateFullPeriodCSV(result: EngineResult): string {
  const { grid, outage, report } = result;
  const rows: string[] = [
    'timestamp,turbine,wind_speed_measured,wind_speed_pred,power_pred_kw,in_outage',
  ];

  for (const tName of report.targetTurbines) {
    const est = report.turbines[tName];
    const measuredSeries = grid.windSpeed[tName];

    for (let i = 0; i < grid.nRows; i++) {
      const ts = grid.dateStrings[i];
      const measured = measuredSeries ? measuredSeries[i] : NaN;
      const inOutage = i >= outage.startIndex && i <= outage.endIndex ? 1 : 0;

      let predWind = '';
      let predPower = '';

      if (inOutage === 1 && est) {
        const outageOffset = i - outage.startIndex;
        const ws = est.predictedWindOutage[outageOffset];
        const p = est.expectedPowerOutage[outageOffset];
        predWind = !Number.isNaN(ws) ? ws.toFixed(4) : '';
        predPower = !Number.isNaN(p) ? p.toFixed(2) : '';
      }

      rows.push(
        `"${ts}",${tName},${!Number.isNaN(measured) ? measured.toFixed(4) : ''},${predWind},${predPower},${inOutage}`
      );
    }
  }

  return rows.join('\n');
}

/**
 * 4. Generates summary CSV:
 * turbine,mean_wind_ms,lost_kwh,range_low_kwh,range_high_kwh,power_curve_basis
 */
export function generateSummaryCSV(result: EngineResult): string {
  const { report } = result;
  const isDensityApplied = (result as any).densityApplied === true;
  const powerCurveBasis = isDensityApplied ? 'site_air_density' : 'standard_air_density';

  const rows: string[] = [
    'turbine,mean_wind_ms,lost_kwh,range_low_kwh,range_high_kwh,power_curve_basis',
  ];

  for (const tName of report.targetTurbines) {
    const est = report.turbines[tName];
    if (!est) continue;

    let sumW = 0, countW = 0;
    for (let i = 0; i < est.predictedWindOutage.length; i++) {
      const w = est.predictedWindOutage[i];
      if (!Number.isNaN(w)) {
        sumW += w;
        countW++;
      }
    }
    const meanWind = countW > 0 ? (sumW / countW).toFixed(2) : '';

    rows.push(
      `${tName},${meanWind},${Math.round(est.energyKWh)},${Math.round(
        est.range80LowerKWh
      )},${Math.round(est.range80UpperKWh)},${powerCurveBasis}`
    );
  }

  // Add park total row
  rows.push(
    `Park_${report.targetPark},,${Math.round(report.parkEnergyKWh)},${Math.round(
      report.parkRange80LowerKWh
    )},${Math.round(report.parkRange80UpperKWh)},${powerCurveBasis}`
  );

  const tpSummary = formatTestPeriodSummary(result);
  if (tpSummary) {
    rows.push('');
    rows.push(`test_period_result,"${tpSummary}"`);
  }

  return rows.join('\n');
}

/**
 * Formats the standard test period evaluation sentence.
 * "On the test period after the outage (dates, n stamps) the predicted wind had RMSE x.xx m/s and MAE x.xx m/s; the predicted energy deviated by +x.x % from the measured energy (park)."
 */
export function formatTestPeriodSummary(result: EngineResult): string {
  const tp = result.testPeriod || result.report.testPeriod;
  if (!tp || tp.stampsCount === 0) return '';
  const dates = `${tp.startDateStr} to ${tp.endDateStr}`;
  const n = tp.stampsCount.toLocaleString('en-US');
  const rmse = tp.meanWindRMSE.toFixed(2);
  const mae = tp.meanWindMAE.toFixed(2);
  const sign = tp.parkEnergyDevPct >= 0 ? '+' : '';
  const dev = `${sign}${tp.parkEnergyDevPct.toFixed(1)} %`;
  return `On the test period after the outage (${dates}, ${n} stamps) the predicted wind had RMSE ${rmse} m/s and MAE ${mae} m/s; the predicted energy deviated by ${dev} from the measured energy (park).`;
}

/**
 * Generates test_metrics_Park_{T}.csv export with columns:
 * turbine,n,wind_rmse_ms,wind_mae_ms,wind_bias_ms,r,power_rmse_kw,power_mae_kw,energy_measured_kwh,energy_predicted_kwh,energy_dev_pct,test_period_start,test_period_end
 */
export function generateTestMetricsCSV(result: EngineResult): string {
  const tp = result.testPeriod || result.report.testPeriod;
  if (!tp) return '';

  const rows = [
    'turbine,n,wind_rmse_ms,wind_mae_ms,wind_bias_ms,r,power_rmse_kw,power_mae_kw,energy_measured_kwh,energy_predicted_kwh,energy_dev_pct,test_period_start,test_period_end',
  ];

  for (const tName of result.report.targetTurbines) {
    const met = tp.turbines[tName];
    if (!met) continue;
    rows.push(
      `${tName},${met.n},${met.windRMSE.toFixed(4)},${met.windMAE.toFixed(4)},${met.windBias.toFixed(4)},${met.r.toFixed(4)},${met.powerRMSE.toFixed(2)},${met.powerMAE.toFixed(2)},${Math.round(met.measuredEnergyKWh)},${Math.round(met.predictedEnergyKWh)},${met.energyDevPct.toFixed(2)},"${tp.startDateStr}","${tp.endDateStr}"`
    );
  }

  // Park row
  rows.push(
    `Park_${result.report.targetPark},${tp.stampsCount},${tp.meanWindRMSE.toFixed(4)},${tp.meanWindMAE.toFixed(4)},,,,,,${Math.round(tp.parkMeasuredEnergyKWh)},${Math.round(tp.parkPredictedEnergyKWh)},${tp.parkEnergyDevPct.toFixed(2)},"${tp.startDateStr}","${tp.endDateStr}"`
  );

  return rows.join('\n');
}

/**
 * Generates the business-interruption insurance email content based on the exact template.
 * Supports 3 cases for air density:
 * 1. Site density applied
 * 2. Standard density with site density sensitivity calculated
 * 3. Density not applicable / no varying pressure data
 */
export function generateClaimEmail(result: EngineResult): string {
  const { report, outage, chosenCombination } = result;
  const isDensityApplied = (result as any).densityApplied === true;
  const baseResult = (result as any).base as EngineResult | undefined;

  const targetList = report.targetTurbines.join(', ');
  const parkKWh = Math.round(report.parkEnergyKWh).toLocaleString('en-US');
  const lowKWh = Math.round(report.parkRange80LowerKWh).toLocaleString('en-US');
  const highKWh = Math.round(report.parkRange80UpperKWh).toLocaleString('en-US');

  const turbineEntries = report.targetTurbines
    .map((tName) => {
      const est = report.turbines[tName];
      const val = est ? Math.round(est.energyKWh).toLocaleString('en-US') : '0';
      return `${tName} ${val} kWh`;
    })
    .join(', ');

  const parksStr = report.chosenParks.join(' and ');
  const numWindows = chosenCombination.windowsCount;

  let densitySentence: string;
  if (isDensityApplied && report.airDensity.isApplicable) {
    const ref = report.airDensity.referenceParkUsed || 'reference';
    const rho = (report.airDensity.meanRhoOutage ?? 1.225).toFixed(3);
    const standardVal = Math.round(
      baseResult?.report?.parkEnergyKWh ?? report.parkEnergyKWh
    ).toLocaleString('en-US');
    densitySentence = `Air density: the estimate takes the site air density into account (temperature and pressure of park ${ref}, mean ${rho} kg/m³). With the standard power curve (1.225 kg/m³) it would be ${standardVal} kWh.`;
  } else if (report.airDensity.isApplicable && report.airDensity.sensitivityPercent !== undefined) {
    const refPark = report.airDensity.referenceParkUsed || '';
    const pct = report.airDensity.sensitivityPercent.toFixed(2);
    const corrected = Math.round(report.airDensity.correctedParkEnergyKWh || 0).toLocaleString('en-US');
    densitySentence = `Sensitivity: taking air density into account (temperature and pressure of park ${refPark}) would change the estimate by ${pct} % (to ${corrected} kWh).`;
  } else {
    densitySentence =
      'Air density: not included, because no varying air-pressure measurements were available in the reference data.';
  }

  const tpSummary = formatTestPeriodSummary(result);
  const accuracyText = tpSummary
    ? `Accuracy: the method was tested on ${numWindows} periods of the same length where the true values are known; the range covers 80 % of those test errors. ${tpSummary}`
    : `Accuracy: the method was tested on ${numWindows} periods of the same length where the true values are known; the range covers 80 % of those test errors.`;

  return `Subject: Business-interruption claim - wind park ${report.targetPark} - outage ${outage.startDateStr} to ${outage.endDateStr} - estimated lost energy

Dear claims team,

From ${outage.startDateStr} to ${outage.endDateStr} (${outage.durationHours.toFixed(1)} hours) the turbines ${targetList} produced no electricity and recorded no wind. We estimate the energy that would have been produced at ${parkKWh} kWh (80 % range ${lowKWh} - ${highKWh} kWh): ${turbineEntries}.

Method: the wind at each turbine was reconstructed every 10 minutes from the neighbouring park(s) ${parksStr}, which kept running, using the relation learned from the measured data outside the outage (separately for 4 wind directions), and converted with each turbine's power curve.

${accuracyText}

${densitySentence}

Kind regards`;
}
