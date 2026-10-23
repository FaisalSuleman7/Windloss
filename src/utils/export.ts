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
 * Generates predictions CSV:
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
 * Generates summary CSV:
 * turbine,mean_wind_ms,lost_kwh,range_low_kwh,range_high_kwh
 */
export function generateSummaryCSV(result: EngineResult): string {
  const { report } = result;
  const rows: string[] = ['turbine,mean_wind_ms,lost_kwh,range_low_kwh,range_high_kwh'];

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
      )},${Math.round(est.range80UpperKWh)}`
    );
  }

  // Add park total row
  rows.push(
    `Park_${report.targetPark},,${Math.round(report.parkEnergyKWh)},${Math.round(
      report.parkRange80LowerKWh
    )},${Math.round(report.parkRange80UpperKWh)}`
  );

  return rows.join('\n');
}

/**
 * Generates the business-interruption insurance email content based on the exact template.
 */
export function generateClaimEmail(result: EngineResult): string {
  const { report, outage, chosenCombination } = result;

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

  const sensitivityStr =
    report.airDensity.isApplicable && report.airDensity.sensitivityPercent !== undefined
      ? report.airDensity.sensitivityPercent.toFixed(2)
      : '0.00';

  return `Subject: Business-interruption claim - wind park ${report.targetPark} - outage ${outage.startDateStr} to ${outage.endDateStr} - estimated lost energy

Dear claims team,

From ${outage.startDateStr} to ${outage.endDateStr} (${outage.durationHours.toFixed(1)} hours) the turbines ${targetList} produced no electricity and recorded no wind. We estimate the energy that would have been produced at ${parkKWh} kWh (80 % range ${lowKWh} - ${highKWh} kWh): ${turbineEntries}.

Method: the wind at each turbine was reconstructed every 10 minutes from the neighbouring park(s) ${parksStr}, which kept running, using the relation learned from the measured data outside the outage (separately for 4 wind directions), and converted with each turbine's power curve.

Accuracy: the method was tested on ${numWindows} periods of the same length where the true values are known; the range covers 80 % of those test errors.

Sensitivity: taking air density into account would change the estimate by ${sensitivityStr} %.

Kind regards`;
}
