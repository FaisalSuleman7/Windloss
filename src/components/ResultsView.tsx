import React, { useState } from 'react';
import {
  Zap,
  Activity,
  Wind,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { EngineResult } from '../engine';
import { formatKWh, formatWind, formatPercent, formatCoeff, formatNumber } from '../utils/formatters';

interface ResultsViewProps {
  result: EngineResult;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ result }) => {
  const { report, screening, outage, allCombinations, warnings } = result;
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [showScreeningDetails, setShowScreeningDetails] = useState(false);

  const turbinesList = Object.values(report.turbines);

  return (
    <div className="space-y-6">
      {/* Validation Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-medium text-sm mb-1">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Validation Notices</span>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Park Lost Energy */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Park Loss
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatKWh(report.parkEnergyKWh)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Target Park {report.targetPark} ({report.targetTurbines.length} turbines, {outage.durationHours.toFixed(1)} h)
          </p>
        </div>

        {/* 80% Uncertainty Range */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              80% Uncertainty Range
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {Math.round(report.parkRange80LowerKWh).toLocaleString('en-US')} –{' '}
            {Math.round(report.parkRange80UpperKWh).toLocaleString('en-US')}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            d10: {formatPercent(report.park_d10, true)}, d90: {formatPercent(report.park_d90, true)}
          </p>
        </div>

        {/* Air Density Sensitivity */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Air Density Sensitivity
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
              <Wind className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {report.airDensity.isApplicable && report.airDensity.sensitivityPercent !== undefined
              ? formatPercent(report.airDensity.sensitivityPercent, true)
              : 'N/A'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {report.airDensity.isApplicable
              ? `Ref Park ${report.airDensity.referenceParkUsed} (Δp = ${report.airDensity.deltaP_hPa?.toFixed(1)} hPa)`
              : report.airDensity.reason || 'Constant/missing pressure series'}
          </p>
        </div>
      </div>

      {/* Main Table: Target Turbines Lost Energy Breakdown */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
            Target Turbines Production Loss & Uncertainty
          </h3>
          <span className="text-xs text-slate-500">
            Model trained on {report.trainingOption === 'all_measured' ? 'all measured data' : 'data before outage'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold">Turbine</th>
                <th className="py-3 px-4 font-semibold text-right">Mean Pred Wind</th>
                <th className="py-3 px-4 font-semibold text-right">Lost Energy</th>
                <th className="py-3 px-4 font-semibold text-right">d10</th>
                <th className="py-3 px-4 font-semibold text-right">d50 (Median)</th>
                <th className="py-3 px-4 font-semibold text-right">d90</th>
                <th className="py-3 px-4 font-semibold text-right">80% Uncertainty Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-mono">
              {turbinesList.map((t) => {
                // Mean predicted wind over outage
                let sumW = 0, countW = 0;
                for (let i = 0; i < t.predictedWindOutage.length; i++) {
                  const w = t.predictedWindOutage[i];
                  if (!Number.isNaN(w)) {
                    sumW += w;
                    countW++;
                  }
                }
                const meanWind = countW > 0 ? sumW / countW : NaN;

                return (
                  <tr key={t.turbineName} className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50">
                    <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                      {t.turbineName}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      {formatWind(meanWind)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatKWh(t.energyKWh)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {formatPercent(t.d10, true)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {formatPercent(t.d50, true)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {formatPercent(t.d90, true)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      {Math.round(t.range80LowerKWh).toLocaleString('en-US')} –{' '}
                      {Math.round(t.range80UpperKWh).toLocaleString('en-US')} kWh
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-900/60 border-t-2 border-slate-200 dark:border-slate-700 font-bold font-mono">
              <tr>
                <td className="py-3 px-4 font-sans text-slate-900 dark:text-slate-100">
                  Park Total ({report.targetPark})
                </td>
                <td className="py-3 px-4 text-right text-slate-500">—</td>
                <td className="py-3 px-4 text-right text-blue-700 dark:text-blue-300 text-base">
                  {formatKWh(report.parkEnergyKWh)}
                </td>
                <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                  {formatPercent(report.park_d10, true)}
                </td>
                <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                  {formatPercent(report.park_d50, true)}
                </td>
                <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                  {formatPercent(report.park_d90, true)}
                </td>
                <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100">
                  {Math.round(report.parkRange80LowerKWh).toLocaleString('en-US')} –{' '}
                  {Math.round(report.parkRange80UpperKWh).toLocaleString('en-US')} kWh
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Collapsible Model Details Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowModelDetails(!showModelDetails)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-750/40 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              Model Details: Delays (Lags), Sector Blended Coefficients & Residual Error Spread (σ)
            </h4>
          </div>
          {showModelDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showModelDetails && (
          <div className="p-4 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-700/60">
            {turbinesList.map((t) => (
              <div
                key={t.turbineName}
                className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Turbine {t.turbineName}
                  </span>
                  <div className="space-x-3 text-slate-600 dark:text-slate-400">
                    <span>
                      <strong>Lags (10-min):</strong>{' '}
                      {Object.entries(t.model.lags)
                        .map(([p, k]) => `${p}: ${k >= 0 ? `+${k}` : k}`)
                        .join(', ')}
                    </span>
                    <span>
                      <strong>σ_global:</strong> {t.model.sigmaGlobal.toFixed(4)} m/s
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-1">Sector</th>
                        <th className="py-1">Rows</th>
                        <th className="py-1">Weight</th>
                        {report.chosenParks.map((p) => (
                          <th key={p} className="py-1 text-right">
                            a_{p}
                          </th>
                        ))}
                        <th className="py-1 text-right">c (Intercept)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                      {t.model.sectorModels.map((sec) => (
                        <tr key={sec.sector}>
                          <td className="py-1 font-sans font-medium text-slate-700 dark:text-slate-300">
                            {sec.name} ({sec.sector * 90}°)
                          </td>
                          <td className="py-1 text-slate-500">{sec.nRows}</td>
                          <td className="py-1 text-slate-500">{(sec.weight * 100).toFixed(1)}%</td>
                          {report.chosenParks.map((p) => (
                            <td key={p} className="py-1 text-right">
                              {formatCoeff(sec.aParks[p])}
                            </td>
                          ))}
                          <td className="py-1 text-right">{formatCoeff(sec.c)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible Reference Turbine Screening Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowScreeningDetails(!showScreeningDetails)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-750/40 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-slate-500" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              Reference Turbines Screening Results ({screening.usedTurbines.length} used of {screening.screenings.length})
            </h4>
          </div>
          {showScreeningDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showScreeningDetails && (
          <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-700/60 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Turbine</th>
                  <th className="py-2.5 px-3 font-semibold">Park</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Outage Coverage</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Correlation r</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Screening Status</th>
                  <th className="py-2.5 px-3 font-semibold">Details / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {screening.screenings.map((s) => (
                  <tr key={s.turbineName} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {s.turbineName}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{s.park}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {(s.coverage * 100).toFixed(1)} %
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {!Number.isNaN(s.rWithTarget) ? s.rWithTarget.toFixed(3) : 'NaN'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {s.isUsed ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Used
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                          Excluded
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      {s.rejectionReason || 'Meets criteria (coverage ≥ 50%, r ≥ 0.50)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
