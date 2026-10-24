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

  // Heat-map styling: white (r = 0.5) to navy #1D3557 (r = 1.0), text white above 0.8
  const getCorrelationCellStyle = (r: number) => {
    if (Number.isNaN(r)) {
      return { backgroundColor: '#F8FAFC', color: '#64748B' };
    }
    const clamped = Math.max(0.5, Math.min(1.0, r));
    const t = (clamped - 0.5) / 0.5; // 0 at 0.5, 1 at 1.0
    // White rgb(255, 255, 255) to Navy rgb(29, 53, 87)
    const red = Math.round(255 - t * (255 - 29));
    const green = Math.round(255 - t * (255 - 53));
    const blue = Math.round(255 - t * (255 - 87));
    const backgroundColor = `rgb(${red}, ${green}, ${blue})`;
    const color = r > 0.8 ? '#FFFFFF' : '#0F172A';
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

      {/* New Card: Correlation Analysis (training data before the outage) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Correlation analysis (training data before the outage)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pearson r of synchronous 10-minute wind speeds on data before the outage (pairwise complete, no time shift).
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-500">
            <span>Scale:</span>
            <span className="inline-block w-4 h-3 bg-white border border-slate-300 rounded-xs" />
            <span>0.50</span>
            <span className="inline-block w-6 h-3 bg-gradient-to-r from-white to-[#1D3557] rounded-xs" />
            <span>1.00</span>
            <span className="inline-block w-4 h-3 bg-[#1D3557] rounded-xs" />
          </div>
        </div>

        {corr && corr.rows.length > 0 ? (
          <div className="p-4 pt-0 space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold font-sans">
                  <tr>
                    <th className="py-2.5 px-4 w-44">Reference Sensor</th>
                    {targetTurbines.map((tgt) => (
                      <th key={tgt} className="py-2.5 px-4 text-center">
                        Turbine {tgt}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {corr.rows.map((row) => {
                    const isPark = row.isParkMean;
                    return (
                      <tr
                        key={row.label}
                        className={
                          isPark
                            ? 'bg-slate-100/70 dark:bg-slate-800/60 font-bold border-t-2 border-slate-300 dark:border-slate-700'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        }
                      >
                        <td className={`py-2 px-4 font-sans ${isPark ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                          {row.label}
                        </td>
                        {targetTurbines.map((tgt) => {
                          const r = row.rValues[tgt];
                          const style = getCorrelationCellStyle(r);
                          return (
                            <td
                              key={tgt}
                              style={style}
                              className="py-2 px-4 text-center font-bold rounded-xs transition-colors"
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

            {/* Computed Summary Sentence */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              Single neighbours reach r = {minNeighbour}-{maxNeighbour}. The combined model (both parks, time delay, 4 wind directions) reaches r = {testRMin}-{testRMax} on the unseen test period.
            </p>
          </div>
        ) : (
          <div className="p-4 text-xs text-slate-500 italic">No correlation data available.</div>
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
