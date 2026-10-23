import React from 'react';
import { TableProperties, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { EngineResult } from '../../engine';
import { AvailabilityStrip } from '../AvailabilityStrip';
import { DataExplorationChart } from '../DataExplorationChart';
import { WindRoseView } from '../WindRoseView';
import { formatPercent } from '../../utils/formatters';

interface Step2DataProps {
  result: EngineResult;
}

export const Step2Data: React.FC<Step2DataProps> = ({ result }) => {
  const { grid, outage, warnings } = result;
  const { turbines, nRows, windSpeed, windDirection, ambientTemperature, airPressure, windSpeedStdDev, dateStrings, turbineParkMap } = grid;

  // Build per-turbine summary data
  const turbineStats = turbines.map((tName) => {
    const ws = windSpeed[tName];
    const wd = windDirection[tName];
    const temp = ambientTemperature[tName];
    const press = airPressure[tName];
    const std = windSpeedStdDev[tName];

    let validWsCount = 0;
    let firstTime = '';
    let lastTime = '';

    for (let i = 0; i < nRows; i++) {
      if (!Number.isNaN(ws[i])) {
        validWsCount++;
        if (!firstTime) firstTime = dateStrings[i];
        lastTime = dateStrings[i];
      }
    }

    const pctComplete = nRows > 0 ? (validWsCount / nRows) * 100 : 0;

    // Check optional columns
    let hasWd = false;
    let hasTemp = false;
    let hasPress = false;
    let hasStd = false;

    for (let i = 0; i < nRows; i++) {
      if (!Number.isNaN(wd[i])) hasWd = true;
      if (!Number.isNaN(temp[i])) hasTemp = true;
      if (!Number.isNaN(press[i])) hasPress = true;
      if (!Number.isNaN(std[i])) hasStd = true;
      if (hasWd && hasTemp && hasPress && hasStd) break;
    }

    const isTarget = turbineParkMap[tName] === outage.targetPark;

    return {
      tName,
      park: turbineParkMap[tName],
      isTarget,
      validRows: validWsCount,
      firstTime: firstTime || dateStrings[0],
      lastTime: lastTime || dateStrings[nRows - 1],
      pctComplete,
      hasWd,
      hasTemp,
      hasPress,
      hasStd,
    };
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <TableProperties className="w-5 h-5 text-blue-600" />
            <span>Step 2 &bull; Turbine Data Ingestion & Availability</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Overview of the {turbines.length} turbines aligned onto the {nRows.toLocaleString('en-US')} row 10-minute grid.
          </p>
        </div>
      </div>

      {/* Warnings List if any */}
      {warnings && warnings.length > 0 ? (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-semibold text-sm mb-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Dataset Validation Notices</span>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400 space-y-1">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>All turbine files and timestamps parsed cleanly with zero fatal integrity warnings.</span>
        </div>
      )}

      {/* Availability Strip Chart (Pink for missing) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
          Turbine Time-Series Availability Strip
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Visual representation of SCADA availability over time. Missing values and outages are rendered in pink (#CC79A7), while operational readings are colored by park.
        </p>
        <AvailabilityStrip grid={grid} outage={outage} />
      </div>

      {/* 1. Look at the data before any model */}
      <DataExplorationChart grid={grid} outage={outage} />

      {/* 2. Wind roses */}
      <WindRoseView grid={grid} outage={outage} />

      {/* Per-Turbine Summary Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Turbine Dataset Matrix ({turbines.length} Turbines)
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {nRows.toLocaleString('en-US')} total 10-min grid intervals
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Turbine</th>
                <th className="py-2.5 px-3">Park</th>
                <th className="py-2.5 px-3 text-right">Valid Rows</th>
                <th className="py-2.5 px-3 text-right">% Complete</th>
                <th className="py-2.5 px-3">First Time (Local)</th>
                <th className="py-2.5 px-3">Last Time (Local)</th>
                <th className="py-2.5 px-3 text-center">Direction</th>
                <th className="py-2.5 px-3 text-center">Temp (°C)</th>
                <th className="py-2.5 px-3 text-center">Pressure (hPa)</th>
                <th className="py-2.5 px-3 text-center">StdDev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {turbineStats.map((stat) => (
                <tr
                  key={stat.tName}
                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                    stat.isTarget ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <span>{stat.tName}</span>
                    {stat.isTarget && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-semibold">
                        Target
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                    Park {stat.park}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                    {stat.validRows.toLocaleString('en-US')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                    {stat.pctComplete.toFixed(1)} %
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {stat.firstTime}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {stat.lastTime}
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    {stat.hasWd ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    {stat.hasTemp ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    {stat.hasPress ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    {stat.hasStd ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
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
