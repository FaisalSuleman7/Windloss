import React from 'react';
import { Download, FileSpreadsheet, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { EngineResult } from '../../engine';
import {
  generatePredictionsCSV,
  generateSummaryCSV,
  downloadFile,
} from '../../utils/export';
import { formatKWh, formatPercent, formatWind } from '../../utils/formatters';

interface Step9DownloadsProps {
  result: EngineResult;
}

export const Step9Downloads: React.FC<Step9DownloadsProps> = ({ result }) => {
  const { report, outage } = result;

  const handleDownloadPredictions = () => {
    const csv = generatePredictionsCSV(result);
    downloadFile(
      csv,
      `predictions_Park_${report.targetPark}_outage.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handleDownloadSummary = () => {
    const csv = generateSummaryCSV(result);
    downloadFile(
      csv,
      `summary_Park_${report.targetPark}_loss.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Download className="w-5 h-5 text-blue-600" />
            <span>Step 9 &bull; Data Exports & Audit Report</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download full 10-minute prediction time series, summary statistics, or print a formal audit report for loss adjusters.
          </p>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Predictions CSV Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Predictions CSV
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Full 10-minute time series of predicted wind speeds and expected power for every target turbine throughout the outage.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-600 dark:text-slate-300">
              timestamp, turbine, wind_speed_pred, power_pred_kw
            </div>
          </div>
          <button
            onClick={handleDownloadPredictions}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Predictions CSV</span>
          </button>
        </div>

        {/* Summary CSV Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Summary CSV
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              High-level totals and per-turbine lost production figures with lower and upper 80% empirical uncertainty bounds.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-600 dark:text-slate-300">
              turbine, mean_wind_ms, lost_kwh, range_low_kwh, range_high_kwh
            </div>
          </div>
          <button
            onClick={handleDownloadSummary}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Summary CSV</span>
          </button>
        </div>

        {/* Print-Friendly Report Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Print / Save as PDF
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Generates a printer-optimized audit report with executive tables, mathematical parameters, and insurance details.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-600 dark:text-slate-300">
              Formatted for standard A4 / Letter PDF export
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report to PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Preview Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 printable-report">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Business-Interruption Loss Audit Report
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Target Park {report.targetPark} &bull; Outage: {outage.startDateStr} &rarr; {outage.endDateStr} ({outage.durationHours.toFixed(1)} h)
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Certified Deterministic Output
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <span className="text-slate-400 block font-sans">Total Loss</span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400">
              {formatKWh(report.parkEnergyKWh)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <span className="text-slate-400 block font-sans">80% Uncertainty</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {Math.round(report.parkRange80LowerKWh).toLocaleString('en-US')} – {Math.round(report.parkRange80UpperKWh).toLocaleString('en-US')} kWh
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <span className="text-slate-400 block font-sans">Reference Parks</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {report.chosenParks.join(' + ')}
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <span className="text-slate-400 block font-sans">Density Sensitivity</span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {report.airDensity.sensitivityPercent !== undefined
                ? formatPercent(report.airDensity.sensitivityPercent, true)
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Turbine Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-semibold">
              <tr>
                <th className="py-2.5 px-3 font-sans">Turbine</th>
                <th className="py-2.5 px-3 text-right">Lost Production</th>
                <th className="py-2.5 px-3 text-right">d10</th>
                <th className="py-2.5 px-3 text-right">d90</th>
                <th className="py-2.5 px-3 text-right">80% Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {Object.values(report.turbines).map((t) => (
                <tr key={t.turbineName}>
                  <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                    {t.turbineName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                    {formatKWh(t.energyKWh)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {formatPercent(t.d10, true)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {formatPercent(t.d90, true)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                    {Math.round(t.range80LowerKWh).toLocaleString('en-US')} –{' '}
                    {Math.round(t.range80UpperKWh).toLocaleString('en-US')} kWh
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
