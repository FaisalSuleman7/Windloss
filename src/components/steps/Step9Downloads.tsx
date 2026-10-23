import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  FileSpreadsheet,
  Printer,
  FileText,
  Table,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { EngineResult } from '../../engine';
import {
  generatePredictionsCSV,
  generatePredictionsWideCSV,
  generateFullPeriodCSV,
  generateSummaryCSV,
  generateClaimEmail,
  downloadFile,
} from '../../utils/export';
import { formatKWh, formatPercent } from '../../utils/formatters';
import { COLORS, getTurbineColor } from '../../utils/colors';

interface Step9DownloadsProps {
  result: EngineResult;
}

export const Step9Downloads: React.FC<Step9DownloadsProps> = ({ result }) => {
  const { report, outage, chosenCombination, allCombinations, screening, grid } = result;
  const isDensityApplied = (result as any).densityApplied === true;
  const densitySuffix = isDensityApplied ? '_site-density' : '';

  const basisLabel = isDensityApplied
    ? 'Site air density (temperature & pressure corrected)'
    : 'Standard air density (1.225 kg/m³)';

  // Calculate backtest accuracy metrics per turbine (same as Step 5)
  const turbineAveragedMetrics = useMemo(() => {
    const map: Record<
      string,
      { windRMSE: number; windMAE: number; powerRMSE: number; powerMAE: number }
    > = {};

    for (const tName of report.targetTurbines) {
      let sumWindRMSE = 0, countWindRMSE = 0;
      let sumWindMAE = 0, countWindMAE = 0;
      let sumPowerRMSE = 0, countPowerRMSE = 0;
      let sumPowerMAE = 0, countPowerMAE = 0;

      for (const w of chosenCombination.windows) {
        const wt = w.turbines[tName];
        if (wt) {
          if (!Number.isNaN(wt.windRMSE)) { sumWindRMSE += wt.windRMSE; countWindRMSE++; }
          if (!Number.isNaN(wt.windMAE)) { sumWindMAE += wt.windMAE; countWindMAE++; }
          if (!Number.isNaN(wt.powerRMSE)) { sumPowerRMSE += wt.powerRMSE; countPowerRMSE++; }
          if (!Number.isNaN(wt.powerMAE)) { sumPowerMAE += wt.powerMAE; countPowerMAE++; }
        }
      }

      map[tName] = {
        windRMSE: countWindRMSE > 0 ? sumWindRMSE / countWindRMSE : NaN,
        windMAE: countWindMAE > 0 ? sumWindMAE / countWindMAE : NaN,
        powerRMSE: countPowerRMSE > 0 ? sumPowerRMSE / countPowerRMSE : NaN,
        powerMAE: countPowerMAE > 0 ? sumPowerMAE / countPowerMAE : NaN,
      };
    }
    return map;
  }, [chosenCombination.windows, report.targetTurbines]);

  // Reconstructed wind chart data for the print audit report (720x230)
  const windChartData = useMemo(() => {
    const data: Record<string, any>[] = [];
    const step = 1;
    for (let i = 0; i < report.outageDates.length; i += step) {
      const entry: Record<string, any> = {
        timestamp: report.outageDates[i],
      };
      for (const t of report.targetTurbines) {
        const est = report.turbines[t];
        const val = est ? est.predictedWindOutage[i] : NaN;
        entry[t] = !Number.isNaN(val) ? Number(val.toFixed(2)) : null;
      }
      data.push(entry);
    }
    return data;
  }, [report]);

  // Handlers for the 4 downloads
  const handleDownloadPredictionsPerTurbine = () => {
    const csv = generatePredictionsCSV(result);
    downloadFile(
      csv,
      `predictions_Park_${report.targetPark}_per_turbine${densitySuffix}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handleDownloadPredictionsWide = () => {
    const csv = generatePredictionsWideCSV(result);
    downloadFile(
      csv,
      `predictions_Park_${report.targetPark}_wide${densitySuffix}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handleDownloadFullPeriod = () => {
    const csv = generateFullPeriodCSV(result);
    downloadFile(
      csv,
      `full_period_measured_reconstructed_Park_${report.targetPark}${densitySuffix}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handleDownloadSummary = () => {
    const csv = generateSummaryCSV(result);
    downloadFile(
      csv,
      `summary_Park_${report.targetPark}_loss${densitySuffix}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const claimEmailText = generateClaimEmail(result);

  // Formal Audit Report Body (rendered on-screen and into print portal)
  const renderAuditReport = () => (
    <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-8 shadow-sm space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <section className="break-inside-avoid border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-800">
            Audit Report &bull; Business-Interruption Loss
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-0.5">
            Wind Outage Loss Estimator — audit report
          </h1>
          <h2 className="text-base font-bold text-slate-700">
            Business-interruption loss: wind park {report.targetPark}
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Outage: {outage.startDateStr} &rarr; {outage.endDateStr} ({outage.durationHours.toFixed(1)} hours) &bull; Affected turbines: {report.targetTurbines.join(', ')}
          </p>
        </div>
        <div className="text-right text-xs text-slate-500 font-mono shrink-0">
          <div>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          <div>Deterministic Evaluation Core</div>
        </div>
      </section>

      {/* 4 KPI Boxes */}
      <section className="break-inside-avoid grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">Lost Energy</span>
          <span className="text-lg font-extrabold text-blue-700 font-mono mt-0.5 block">
            {formatKWh(report.parkEnergyKWh)}
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">80 % Range</span>
          <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
            {Math.round(report.parkRange80LowerKWh).toLocaleString('en-US')} – {Math.round(report.parkRange80UpperKWh).toLocaleString('en-US')} kWh
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">Reference Parks</span>
          <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
            {report.chosenParks.join(' + ')}
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">Power-Curve Basis</span>
          <span className="text-xs font-bold text-slate-800 mt-0.5 block leading-snug">
            {isDensityApplied ? 'Site air density (corrected)' : 'Standard air density (1.225)'}
          </span>
        </div>
      </section>

      {/* 1. Result per turbine */}
      <section className="break-inside-avoid space-y-2">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
          <span>1. Result per turbine</span>
        </h3>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2 px-3 font-sans">Turbine</th>
                <th className="py-2 px-3 text-right">Mean Wind</th>
                <th className="py-2 px-3 text-right">Lost Energy</th>
                <th className="py-2 px-3 text-right">d10</th>
                <th className="py-2 px-3 text-right">d90</th>
                <th className="py-2 px-3 text-right">80% Empirical Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {report.targetTurbines.map((tName) => {
                const est = report.turbines[tName];
                if (!est) return null;
                let sumW = 0, countW = 0;
                for (let i = 0; i < est.predictedWindOutage.length; i++) {
                  const w = est.predictedWindOutage[i];
                  if (!Number.isNaN(w)) { sumW += w; countW++; }
                }
                const meanWind = countW > 0 ? (sumW / countW).toFixed(2) : '—';

                return (
                  <tr key={tName}>
                    <td className="py-2 px-3 font-sans font-bold text-slate-900">Turbine {tName}</td>
                    <td className="py-2 px-3 text-right text-slate-700">{meanWind} m/s</td>
                    <td className="py-2 px-3 text-right font-bold text-blue-700">
                      {Math.round(est.energyKWh).toLocaleString('en-US')} kWh
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatPercent(est.d10, true)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatPercent(est.d90, true)}</td>
                    <td className="py-2 px-3 text-right text-slate-800">
                      {Math.round(est.range80LowerKWh).toLocaleString('en-US')} – {Math.round(est.range80UpperKWh).toLocaleString('en-US')} kWh
                    </td>
                  </tr>
                );
              })}
              {/* Park Row */}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td className="py-2.5 px-3 font-sans text-slate-900">Park total ({report.targetPark})</td>
                <td className="py-2.5 px-3 text-right text-slate-700">—</td>
                <td className="py-2.5 px-3 text-right text-blue-800">
                  {Math.round(report.parkEnergyKWh).toLocaleString('en-US')} kWh
                </td>
                <td className="py-2.5 px-3 text-right text-slate-700">{formatPercent(report.park_d10, true)}</td>
                <td className="py-2.5 px-3 text-right text-slate-700">{formatPercent(report.park_d90, true)}</td>
                <td className="py-2.5 px-3 text-right text-slate-900">
                  {Math.round(report.parkRange80LowerKWh).toLocaleString('en-US')} – {Math.round(report.parkRange80UpperKWh).toLocaleString('en-US')} kWh
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Reconstructed wind during the outage (fixed-size 720x230 LineChart, no animation) */}
      <section className="break-inside-avoid space-y-2">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
          2. Reconstructed wind during the outage
        </h3>
        <p className="text-xs text-slate-500">
          Estimated 10-minute hub-height wind speed time series throughout the {outage.durationHours.toFixed(1)} h outage.
        </p>
        <div style={{ width: 720, height: 230 }} className="mx-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50">
          <LineChart
            width={700}
            height={210}
            data={windChartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.6} />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 10, fill: '#475569' }}
              interval={Math.floor(windChartData.length / 6)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#475569' }}
              label={{
                value: 'Wind (m/s)',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: '#1E293B',
              }}
            />
            <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
            {report.targetTurbines.map((t, idx) => (
              <Line
                key={t}
                type="monotone"
                dataKey={t}
                name={`Turbine ${t}`}
                stroke={getTurbineColor(idx, true)}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </div>
      </section>

      {/* 3. Method in words + used reference turbines + all park combinations */}
      <section className="break-inside-avoid space-y-2">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
          3. Method & Reference Park Selection
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed">
          The wind speed at each affected turbine during the outage is reconstructed from neighbouring wind parks using multi-variable linear regression models fitted independently for four 90° wind direction sectors. Wind direction is derived from the circular average of screened neighbouring reference turbines. Reconstructed wind is translated into electrical energy using the turbine's certified power curve via Gauss-Hermite integration against model prediction uncertainty.
        </p>
        <div className="text-xs text-slate-600">
          <strong>Used reference turbines ({screening.usedTurbines.length}):</strong> {screening.usedTurbines.join(', ')}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl mt-2">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-1.5 px-3 font-sans">Park Combination</th>
                <th className="py-1.5 px-3 text-right">Score (Median % Error)</th>
                <th className="py-1.5 px-3 text-right">Mean Wind RMSE</th>
                <th className="py-1.5 px-3 text-right">Test Windows</th>
                <th className="py-1.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {allCombinations.map((c) => {
                const isSelected = c.combinationKey === chosenCombination.combinationKey;
                return (
                  <tr key={c.combinationKey} className={isSelected ? 'bg-blue-50/70 font-bold' : ''}>
                    <td className="py-1.5 px-3 font-sans">Parks {c.combinationKey}</td>
                    <td className="py-1.5 px-3 text-right">{c.selectionScore.toFixed(2)} %</td>
                    <td className="py-1.5 px-3 text-right">{c.meanWindRMSE.toFixed(2)} m/s</td>
                    <td className="py-1.5 px-3 text-right">{c.windowsCount}</td>
                    <td className="py-1.5 px-3 text-center">
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white font-sans uppercase">
                          Chosen
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Measured accuracy */}
      <section className="break-inside-avoid space-y-2">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
          4. Measured Accuracy on Backtest Windows
        </h3>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2 px-3 font-sans">Turbine</th>
                <th className="py-2 px-3 text-right">Wind RMSE</th>
                <th className="py-2 px-3 text-right">Wind MAE</th>
                <th className="py-2 px-3 text-right">Power RMSE</th>
                <th className="py-2 px-3 text-right">Power MAE</th>
                <th className="py-2 px-3 text-right">Median |Energy Error|</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {report.targetTurbines.map((tName) => {
                const metrics = turbineAveragedMetrics[tName] || {
                  windRMSE: NaN,
                  windMAE: NaN,
                  powerRMSE: NaN,
                  powerMAE: NaN,
                };
                const medScore = chosenCombination.turbineMedians[tName];
                return (
                  <tr key={tName}>
                    <td className="py-2 px-3 font-sans font-bold text-slate-900">Turbine {tName}</td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      {!Number.isNaN(metrics.windRMSE) ? `${metrics.windRMSE.toFixed(2)} m/s` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      {!Number.isNaN(metrics.windMAE) ? `${metrics.windMAE.toFixed(2)} m/s` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      {!Number.isNaN(metrics.powerRMSE) ? `${Math.round(metrics.powerRMSE).toLocaleString('en-US')} kW` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      {!Number.isNaN(metrics.powerMAE) ? `${Math.round(metrics.powerMAE).toLocaleString('en-US')} kW` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">
                      {medScore !== undefined ? `${medScore.toFixed(2)} %` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Claim Email Text */}
      <section className="break-inside-avoid space-y-2">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
          5. Insurance Claim E-mail Formulation
        </h3>
        <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
          {claimEmailText}
        </pre>
      </section>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Step 9 &bull; Data Exports & Audit Report
            </h2>
            {isDensityApplied ? (
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold text-xs">
                corrected to site air density
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold text-xs">
                standard air density
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Every export uses the numbers currently shown ({basisLabel.toLowerCase()}).
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Report (PDF)</span>
        </button>
      </div>

      {/* 4 CSV Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Predictions (outage, per turbine) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 uppercase">
                Submit this file
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Predictions (outage, per turbine)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {outage.stampsCount.toLocaleString('en-US')} stamps &times; {report.targetTurbines.length} turbines = {(outage.stampsCount * report.targetTurbines.length).toLocaleString('en-US')} rows. This is the file to submit.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-600 dark:text-slate-300 overflow-x-auto">
              timestamp, turbine, wind_speed_pred, power_pred_kw
            </div>
          </div>
          <button
            onClick={handleDownloadPredictionsPerTurbine}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Predictions (Per Turbine)</span>
          </button>
        </div>

        {/* Card 2: Predictions (outage, wide + park total) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-2.5 w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Table className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Predictions (outage, wide + park total)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {outage.stampsCount.toLocaleString('en-US')} rows (one row per 10-minute stamp) aligning all turbines side-by-side with total park power.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-600 dark:text-slate-300 overflow-x-auto">
              timestamp, {'{T}'}_wind_speed_pred, {'{T}'}_power_pred_kw, park_power_pred_kw
            </div>
          </div>
          <button
            onClick={handleDownloadPredictionsWide}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Wide Outage CSV</span>
          </button>
        </div>

        {/* Card 3: Full period (measured + reconstructed) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-2.5 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Full period (measured + reconstructed)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              All {grid.nRows.toLocaleString('en-US')} grid timestamps for each target turbine: measured wind, reconstructed wind, power, and outage indicator.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-600 dark:text-slate-300 overflow-x-auto">
              timestamp, turbine, wind_speed_measured, wind_speed_pred, power_pred_kw, in_outage
            </div>
          </div>
          <button
            onClick={handleDownloadFullPeriod}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Full Period CSV</span>
          </button>
        </div>

        {/* Card 4: Summary (per turbine + park) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-2.5 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Summary (per turbine + park)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Summary table with mean wind speed, lost kWh, lower and upper 80% empirical uncertainty bounds, and power curve basis.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-600 dark:text-slate-300 overflow-x-auto">
              turbine, mean_wind_ms, lost_kwh, range_low_kwh, range_high_kwh, power_curve_basis
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
      </div>

      {/* On-screen Preview of Audit Report */}
      <div className="no-print pt-4 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Printable A4 Audit Report Preview:
          </span>
          <button
            onClick={handlePrint}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print to PDF</span>
          </button>
        </div>
        {renderAuditReport()}
      </div>

      {/* Print Portal into body #print-root (print only) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="print-root" className="print-only">
            {renderAuditReport()}
          </div>,
          document.body
        )}
    </div>
  );
};
