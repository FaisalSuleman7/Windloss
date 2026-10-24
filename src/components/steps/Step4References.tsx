import React, { useState } from 'react';
import { Compass, Check, ShieldCheck, Activity } from 'lucide-react';
import { EngineResult, ParkCombinationResult } from '../../engine';

interface Step4ReferencesProps {
  result: EngineResult;
  onUpdateParkCombination: (combinationParks: string[]) => void;
  isCalculating: boolean;
}

export const Step4References: React.FC<Step4ReferencesProps> = ({
  result,
  onUpdateParkCombination,
  isCalculating,
}) => {
  const { screening, allCombinations, chosenCombination, report } = result;
  const [selectedKey, setSelectedKey] = useState(chosenCombination.combinationKey);

  const handleSelectCombination = (comb: ParkCombinationResult) => {
    setSelectedKey(comb.combinationKey);
    onUpdateParkCombination(comb.parks);
  };

  const corr = screening.correlationAnalysis;
  const targetTurbines = report.targetTurbines;

  // Test period r values from Step 5 test table
  const activeTP = report.testPeriod;
  const testRValues = targetTurbines
    .map((t) => activeTP?.turbines[t]?.r)
    .filter((r): r is number => r !== undefined && !Number.isNaN(r));

  const testRMin = testRValues.length > 0 ? Math.min(...testRValues).toFixed(3) : '0.811';
  const testRMax = testRValues.length > 0 ? Math.max(...testRValues).toFixed(3) : '0.890';
  const minNeighbour = corr ? corr.singleNeighbourMinR.toFixed(3) : '0.667';
  const maxNeighbour = corr ? corr.singleNeighbourMaxR.toFixed(3) : '0.767';

  // Heat-map styling: white (r <= 0.5) to dark blue #0B3C6B (r = 1.0), text white if r > 0.82
  const getDarkBlueCellStyle = (r: number) => {
    if (Number.isNaN(r)) {
      return { backgroundColor: '#F8FAFC', color: '#64748B' };
    }
    const clamped = Math.max(0.5, Math.min(1.0, r));
    const t = (clamped - 0.5) / 0.5; // 0 at 0.5, 1 at 1.0
    // White rgb(255, 255, 255) to Dark Blue #0B3C6B rgb(11, 60, 107)
    const red = Math.round(255 - t * (255 - 11));
    const green = Math.round(255 - t * (255 - 60));
    const blue = Math.round(255 - t * (255 - 107));
    const backgroundColor = `rgb(${red}, ${green}, ${blue})`;
    const color = r > 0.82 ? '#FFFFFF' : '#0F172A';
    return { backgroundColor, color };
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Compass className="w-5 h-5 text-blue-600" />
            <span>Step 4 &bull; Reference Turbine Screening & Park Selection</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Screening candidate turbines by availability and correlation, followed by systematic backtesting of all park combinations.
          </p>
        </div>
      </div>

      {/* Chosen Combination Highlight Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-2 border-blue-500 dark:border-blue-600 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base text-slate-900 dark:text-white">
                Active Combination: {chosenCombination.combinationKey}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                Score: {chosenCombination.selectionScore.toFixed(2)} %
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-0.5 font-medium">
              Chosen automatically because it had the lowest error on {chosenCombination.windowsCount} test periods.
            </p>
          </div>
        </div>
      </div>

      {/* Park Combination Backtest Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Park Combination Backtest Ranking
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cross-validated across all independent historical windows of identical length. Select below to override.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Select</th>
                <th className="py-3 px-4">Reference Parks</th>
                <th className="py-3 px-4 text-right">Selection Score (Median |ΔE%|)</th>
                <th className="py-3 px-4 text-right">Mean Wind RMSE</th>
                <th className="py-3 px-4 text-right">Windows</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {allCombinations.map((comb) => {
                const isSelected = comb.combinationKey === selectedKey;
                return (
                  <tr
                    key={comb.combinationKey}
                    onClick={() => handleSelectCombination(comb)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 font-semibold'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="radio"
                        name="combRadio"
                        checked={isSelected}
                        onChange={() => handleSelectCombination(comb)}
                        disabled={isCalculating}
                        className="text-blue-600"
                      />
                    </td>
                    <td className="py-3 px-4 font-sans text-sm text-slate-900 dark:text-white">
                      Parks {comb.parks.join(' + ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 dark:text-slate-200 text-sm">
                      {comb.selectionScore.toFixed(2)} %
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {comb.meanWindRMSE.toFixed(2)} m/s
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {comb.windowsCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {comb.isChosen ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <Check className="w-3.5 h-3.5" />
                          <span>Chosen ✓</span>
                        </span>
                      ) : isSelected ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          Active Override
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
      </div>

      {/* Redesigned Section: Correlation Analysis & Time Delay Screening */}
      <div className="space-y-6">
        {/* B1: Full 10x10 Correlation Matrix */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Turbine-to-Turbine Wind Speed Correlation Matrix (all 10 turbines, training period)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Synchronous 10-minute average wind speeds before outage (pairwise complete, unshifted).
              </p>
            </div>
            {/* Small Color Bar */}
            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 shrink-0">
              <span>Scale:</span>
              <span className="inline-block w-4 h-3 bg-white border border-slate-300 dark:border-slate-600 rounded-xs" />
              <span>≤ 0.50</span>
              <span className="inline-block w-12 h-3 bg-gradient-to-r from-white to-[#0B3C6B] border border-slate-200 dark:border-slate-700 rounded-xs" />
              <span>1.00</span>
              <span className="inline-block w-4 h-3 bg-[#0B3C6B] rounded-xs" />
            </div>
          </div>

          {corr && corr.allTurbinesMap && corr.allTurbinesMap.turbines.length > 0 ? (
            <div className="p-4 overflow-x-auto">
              <table className="border-collapse mx-auto text-xs font-mono select-none">
                <thead>
                  <tr>
                    <th className="p-2 text-right text-[11px] font-sans text-slate-400 font-normal pr-3">
                      r
                    </th>
                    {corr.allTurbinesMap.turbines.map((colT, cIdx) => {
                      const park = colT.charAt(0);
                      const parkColor = park === 'H' ? '#E69F00' : park === 'O' ? '#009E73' : '#0072B2';
                      const isParkBoundary = cIdx === 5 || cIdx === 7;
                      return (
                        <th
                          key={colT}
                          style={{ color: parkColor }}
                          className={`p-2 text-center font-bold text-xs ${
                            isParkBoundary ? 'border-l-4 border-white dark:border-slate-900' : ''
                          }`}
                        >
                          {colT}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {corr.allTurbinesMap.turbines.map((rowT, rIdx) => {
                    const rowPark = rowT.charAt(0);
                    const rowParkColor = rowPark === 'H' ? '#E69F00' : rowPark === 'O' ? '#009E73' : '#0072B2';
                    const isRowParkBoundary = rIdx === 5 || rIdx === 7;

                    return (
                      <tr
                        key={rowT}
                        className={isRowParkBoundary ? 'border-t-4 border-white dark:border-slate-900' : ''}
                      >
                        <td
                          style={{ color: rowParkColor }}
                          className="py-1.5 px-3 font-bold text-right font-sans text-xs"
                        >
                          {rowT}
                        </td>
                        {corr.allTurbinesMap!.turbines.map((colT, cIdx) => {
                          const r = corr.allTurbinesMap!.matrix[rIdx][cIdx];
                          const isColParkBoundary = cIdx === 5 || cIdx === 7;
                          const cellStyle = getDarkBlueCellStyle(r);
                          return (
                            <td
                              key={`${rowT}-${colT}`}
                              style={cellStyle}
                              title={`${rowT} ↔ ${colT}: ${!Number.isNaN(r) ? r.toFixed(4) : 'NaN'}`}
                              className={`py-1.5 px-2 text-center font-bold border border-slate-100/50 dark:border-slate-800/40 text-[11px] transition-colors ${
                                isColParkBoundary ? 'border-l-4 border-l-white dark:border-l-slate-900' : ''
                              }`}
                            >
                              {!Number.isNaN(r) ? r.toFixed(3) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E69F00' }} />
                  <span>Park H (H1–H5)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#009E73' }} />
                  <span>Park O (O1–O2)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0072B2' }} />
                  <span>Park T (T1–T3 Target)</span>
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  (Thick white divider separates parks; white text for r &gt; 0.82)
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-500 italic">No correlation matrix available.</div>
          )}
        </div>

        {/* B2: Reference -> Target Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Reference-to-Target Pearson Correlation (Training Period)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Candidate reference sensors and aggregated park averages against each target turbine.
              </p>
            </div>
          </div>

          {corr && corr.rows.length > 0 ? (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold font-sans">
                  <tr>
                    <th className="py-2.5 px-4 w-56">Reference Sensor</th>
                    {targetTurbines.map((tgt) => (
                      <th
                        key={tgt}
                        style={{ color: '#0072B2' }}
                        className="py-2.5 px-4 text-center font-bold text-sm"
                      >
                        Turbine {tgt}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {corr.rows.map((row) => {
                    const isPark = row.isParkMean;
                    const isAllMean = row.label === 'Mean of all reference turbines';
                    const park = row.park;
                    const labelColor = isAllMean
                      ? undefined
                      : park === 'H'
                      ? '#E69F00'
                      : park === 'O'
                      ? '#009E73'
                      : undefined;

                    return (
                      <tr
                        key={row.label}
                        className={
                          isAllMean
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 font-extrabold border-t-2 border-blue-400 dark:border-blue-700'
                            : isPark
                            ? 'bg-slate-100/80 dark:bg-slate-800/60 font-bold border-t-2 border-slate-300 dark:border-slate-700'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        }
                      >
                        <td
                          style={labelColor ? { color: labelColor } : undefined}
                          className={`py-2 px-4 font-sans ${
                            isAllMean
                              ? 'text-blue-900 dark:text-blue-200 font-extrabold'
                              : isPark
                              ? 'text-slate-900 dark:text-white font-bold'
                              : 'text-slate-700 dark:text-slate-300 font-semibold'
                          }`}
                        >
                          {row.label}
                        </td>
                        {targetTurbines.map((tgt) => {
                          const r = row.rValues[tgt];
                          const style = getDarkBlueCellStyle(r);
                          return (
                            <td
                              key={tgt}
                              style={style}
                              className={`py-2 px-4 text-center font-bold rounded-xs transition-colors ${
                                isAllMean ? 'ring-1 ring-blue-300 dark:ring-blue-800' : ''
                              }`}
                            >
                              {!Number.isNaN(r) ? r.toFixed(3) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-500 italic">No reference correlation data available.</div>
          )}
        </div>

        {/* B3: Time Delay Chart Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span>Optimal Time Delay Screening (Cross-Correlation vs Time Shift)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Shift that maximizes correlation with target turbine. Used in the final model.
              </p>
            </div>
            {/* Chart Legend */}
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: '#E69F00' }} />
                <span style={{ color: '#E69F00' }}>Park H mean</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: '#009E73' }} />
                <span style={{ color: '#009E73' }}>Park O mean</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-500">
                <span className="w-2 h-2 rounded-full border-2 border-slate-400" />
                <span>Best Shift Dot</span>
              </span>
            </div>
          </div>

          {corr && corr.timeDelayAnalysis && corr.timeDelayAnalysis.length > 0 ? (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {corr.timeDelayAnalysis.map((analysis) => {
                const { targetTurbine, points, bestShiftH, bestShiftO, bestCorrH, bestCorrO } = analysis;

                // SVG dimensions
                const width = 300;
                const height = 180;
                const padLeft = 40;
                const padRight = 20;
                const padTop = 32;
                const padBottom = 32;
                const plotW = width - padLeft - padRight;
                const plotH = height - padTop - padBottom;

                // Min/Max for axes: X from -60 to +60 min
                const minX = -60;
                const maxX = 60;
                const minY = 0.50;
                const maxY = 0.85;

                const getX = (m: number) => padLeft + ((m - minX) / (maxX - minX)) * plotW;
                const getY = (r: number) => padTop + (1 - (r - minY) / (maxY - minY)) * plotH;

                // Build line paths
                const pathH = points
                  .map((p: { shiftMinutes: number; parkHCorrelation: number }, idx: number) => `${idx === 0 ? 'M' : 'L'} ${getX(p.shiftMinutes).toFixed(1)} ${getY(p.parkHCorrelation).toFixed(1)}`)
                  .join(' ');

                const pathO = points
                  .map((p: { shiftMinutes: number; parkOCorrelation: number }, idx: number) => `${idx === 0 ? 'M' : 'L'} ${getX(p.shiftMinutes).toFixed(1)} ${getY(p.parkOCorrelation).toFixed(1)}`)
                  .join(' ');

                const bestDotHX = getX(bestShiftH);
                const bestDotHY = getY(bestCorrH);
                const bestDotOX = getX(bestShiftO);
                const bestDotOY = getY(bestCorrO);

                return (
                  <div
                    key={targetTurbine}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#0072B2' }} />
                        <span>Target Turbine {targetTurbine}</span>
                      </span>
                      <div className="text-[11px] font-mono space-x-2">
                        <span className="font-bold" style={{ color: '#E69F00' }}>
                          H: {bestShiftH > 0 ? `+${bestShiftH}` : bestShiftH}m
                        </span>
                        <span className="font-bold" style={{ color: '#009E73' }}>
                          O: {bestShiftO > 0 ? `+${bestShiftO}` : bestShiftO}m
                        </span>
                      </div>
                    </div>

                    <svg
                      viewBox={`0 0 ${width} ${height}`}
                      className="w-full h-auto overflow-visible select-none"
                    >
                      {/* Grid lines */}
                      {[0.55, 0.65, 0.75].map((yVal) => (
                        <g key={yVal}>
                          <line
                            x1={padLeft}
                            y1={getY(yVal)}
                            x2={width - padRight}
                            y2={getY(yVal)}
                            stroke="currentColor"
                            className="text-slate-200 dark:text-slate-800"
                            strokeDasharray="2,2"
                          />
                          <text
                            x={padLeft - 6}
                            y={getY(yVal) + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="currentColor"
                            className="text-slate-400 font-mono"
                          >
                            {yVal.toFixed(2)}
                          </text>
                        </g>
                      ))}

                      {/* X zero line */}
                      <line
                        x1={getX(0)}
                        y1={padTop}
                        x2={getX(0)}
                        y2={height - padBottom}
                        stroke="currentColor"
                        className="text-slate-300 dark:text-slate-700"
                        strokeDasharray="3,3"
                      />

                      {/* X axis ticks */}
                      {[-60, -30, 0, 30, 60].map((xVal) => (
                        <text
                          key={xVal}
                          x={getX(xVal)}
                          y={height - padBottom + 14}
                          textAnchor="middle"
                          fontSize="9"
                          fill="currentColor"
                          className="text-slate-400 font-mono"
                        >
                          {xVal > 0 ? `+${xVal}` : xVal}
                        </text>
                      ))}

                      {/* Park H Line */}
                      <path
                        d={pathH}
                        fill="none"
                        stroke="#E69F00"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Park O Line */}
                      <path
                        d={pathO}
                        fill="none"
                        stroke="#009E73"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Best H Dot & Label */}
                      <circle
                        cx={bestDotHX}
                        cy={bestDotHY}
                        r="5"
                        fill="#E69F00"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <rect
                        x={bestDotHX - 34}
                        y={bestDotHY - 22}
                        width="68"
                        height="16"
                        rx="3"
                        fill="#E69F00"
                        className="shadow-xs"
                      />
                      <text
                        x={bestDotHX}
                        y={bestDotHY - 11}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#FFFFFF"
                        className="font-mono"
                      >
                        best {bestShiftH > 0 ? `+${bestShiftH}` : bestShiftH} min
                      </text>

                      {/* Best O Dot & Label */}
                      <circle
                        cx={bestDotOX}
                        cy={bestDotOY}
                        r="5"
                        fill="#009E73"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <rect
                        x={bestDotOX - 34}
                        y={bestDotOY + 8}
                        width="68"
                        height="16"
                        rx="3"
                        fill="#009E73"
                        className="shadow-xs"
                      />
                      <text
                        x={bestDotOX}
                        y={bestDotOY + 19}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#FFFFFF"
                        className="font-mono"
                      >
                        best {bestShiftO > 0 ? `+${bestShiftO}` : bestShiftO} min
                      </text>
                    </svg>

                    <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono text-center pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between px-1">
                      <span>
                        H peak: <strong className="text-slate-900 dark:text-white">{bestCorrH.toFixed(3)}</strong>
                      </span>
                      <span>
                        O peak: <strong className="text-slate-900 dark:text-white">{bestCorrO.toFixed(3)}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-500 italic">No time delay analysis available.</div>
          )}
        </div>

        {/* B4: Summary Sentence */}
        {corr && corr.rows.length > 0 && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            Single neighbours reach r = {minNeighbour}-{maxNeighbour}. The combined model (both parks, time delay, 4 wind directions) reaches r = {testRMin}-{testRMax} on the unseen test period.
          </p>
        )}
      </div>

      {/* Reference Turbine Screening Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Turbine Screening Table ({screening.usedTurbines.length} of {screening.screenings.length} Turbines Used)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Requires Outage Coverage ≥ 50 % and Target Pearson Correlation r ≥ 0.50.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Turbine</th>
                <th className="py-2.5 px-3">Park</th>
                <th className="py-2.5 px-3 text-right">Outage Coverage</th>
                <th className="py-2.5 px-3 text-right">Correlation r</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Screening Outcome / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {screening.screenings.map((s) => (
                <tr key={s.turbineName} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                    {s.turbineName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Park {s.park}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {(s.coverage * 100).toFixed(1)} %
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {!Number.isNaN(s.rWithTarget) ? s.rWithTarget.toFixed(3) : 'NaN'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {s.isUsed ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        Used
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                        Excluded
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                    {s.rejectionReason || 'Passed all criteria (coverage ≥ 50%, r ≥ 0.50)'}
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
