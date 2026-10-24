import React, { useState, useMemo } from 'react';
import {
  LineChart as LineChartIcon,
  Calculator,
  BarChart2,
  ScatterChart as ScatterIcon,
  AlertTriangle,
  CalendarCheck,
  Activity,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { EngineResult } from '../../engine';
import { COLORS } from '../../utils/colors';
import { formatPercent, formatCoeff } from '../../utils/formatters';

interface Step5MethodProps {
  result: EngineResult;
  onUpdateMethodOptions?: (nSectors: number, smooth: number, turbulence: boolean) => void;
  isCalculating?: boolean;
}

export const Step5Method: React.FC<Step5MethodProps> = ({
  result,
  onUpdateMethodOptions,
  isCalculating = false,
}) => {
  const { report, chosenCombination } = result;
  const turbinesList = Object.values(report.turbines);
  const targetTurbines = report.targetTurbines;

  const currentNSectors = report.methodOptions?.nSectors ?? 8;
  const currentSmooth = report.methodOptions?.smooth ?? 5;
  const currentTurbulence = report.methodOptions?.turbulence ?? true;
  const isNotTest = report.trainingOption === 'notTest';

  // Test period mode switch: flagged vs all_after
  const [testPeriodMode, setTestPeriodMode] = useState<'flagged' | 'all_after'>(
    report.testPeriod?.hasFlagged ? 'flagged' : 'all_after'
  );

  // Turbine selector for test period charts
  const [selectedTestTurbine, setSelectedTestTurbine] = useState<string>(
    targetTurbines[0] || 'T1'
  );

  // Turbine selector for backtest scatter chart
  const [selectedScatterTurbine, setSelectedScatterTurbine] = useState<string>(
    targetTurbines[0] || 'T1'
  );

  // Active test period result
  const activeTP =
    !isNotTest && testPeriodMode === 'all_after' && report.testPeriodAll
      ? report.testPeriodAll
      : report.testPeriod;

  // Formats delay into descriptive text: e.g. "H park wind 20 min later"
  const formatDelay = (park: string, k: number) => {
    if (k === 0) return `Park ${park}: synchronous (0 min)`;
    if (k < 0) return `Park ${park} wind ${Math.abs(k) * 10} min later`;
    return `Park ${park} wind ${k * 10} min earlier`;
  };

  // Time series data for test period line chart (selected turbine)
  const testLineChartData = useMemo(() => {
    const tm = activeTP?.turbines[selectedTestTurbine];
    if (!tm || !tm.timestamps || tm.timestamps.length === 0) return [];
    
    // Sample every nth point if stamps > 1200 to keep SVG rendering snappy
    const step = tm.timestamps.length > 1500 ? Math.ceil(tm.timestamps.length / 1200) : 1;
    const data = [];
    for (let i = 0; i < tm.timestamps.length; i += step) {
      data.push({
        time: tm.timestamps[i].slice(5), // e.g. "09-04 00:00"
        measured: Number(tm.measuredWind[i].toFixed(2)),
        predicted: Number(tm.predictedWind[i].toFixed(2)),
      });
    }
    return data;
  }, [activeTP, selectedTestTurbine]);

  // Scatter points for test period (predicted vs measured, selected turbine)
  const testScatterChartData = useMemo(() => {
    const tm = activeTP?.turbines[selectedTestTurbine];
    if (!tm || !tm.measuredWind || tm.measuredWind.length === 0) return [];

    const step = tm.measuredWind.length > 1000 ? Math.ceil(tm.measuredWind.length / 800) : 1;
    const points = [];
    for (let i = 0; i < tm.measuredWind.length; i += step) {
      const m = tm.measuredWind[i];
      const p = tm.predictedWind[i];
      if (!Number.isNaN(m) && !Number.isNaN(p)) {
        points.push({
          real: Number(m.toFixed(2)),
          pred: Number(p.toFixed(2)),
        });
      }
    }
    return points;
  }, [activeTP, selectedTestTurbine]);

  // Backtest metrics per turbine averaged over all test windows
  const turbineAveragedMetrics = useMemo(() => {
    const map: Record<
      string,
      { windRMSE: number; windMAE: number; powerRMSE: number; powerMAE: number }
    > = {};

    for (const tName of targetTurbines) {
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
  }, [chosenCombination.windows, targetTurbines]);

  // Backtest energy error bar chart data
  const barChartData = useMemo(() => {
    return chosenCombination.windows.map((w, idx) => ({
      name: `W${idx + 1}`,
      windowLabel: `Window ${idx + 1}`,
      errorPercent: Number(w.parkDeltaEPercent.toFixed(2)),
    }));
  }, [chosenCombination]);

  // Out-of-sample scatter points for selected turbine
  const scatterPoints = useMemo(() => {
    const samples = chosenCombination.scatterSamples?.[selectedScatterTurbine] || [];
    return samples;
  }, [chosenCombination.scatterSamples, selectedScatterTurbine]);

  const isAllMeasured = report.trainingOption === 'all_measured';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <LineChartIcon className="w-5 h-5 text-blue-600" />
            <span>Step 5 &bull; Mathematical Method & Test Performance</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official protocol out-of-sample evaluation on unseen post-outage test period, plus backtest validation inside training data.
          </p>
        </div>
      </div>

      {/* Model Parameters Control Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Model Parameters
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Official defaults: 8 sectors, 5 steps (50 min) smoothing, turbulence enabled.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Number of wind sectors */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1.5">
                Sectors:
              </span>
              {[4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdateMethodOptions?.(s, currentSmooth, currentTurbulence)}
                  disabled={isCalculating}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    currentNSectors === s
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {s} {s === 8 ? '(default)' : ''}
                </button>
              ))}
            </div>

            {/* Park-mean smoothing */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1.5">
                Smoothing:
              </span>
              {[
                { val: 1, label: '1 (raw)' },
                { val: 3, label: '3 (30 min)' },
                { val: 5, label: '5 (50 min, default)' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => onUpdateMethodOptions?.(currentNSectors, opt.val, currentTurbulence)}
                  disabled={isCalculating}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    currentSmooth === opt.val
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Turbulence toggle */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1.5">
                Turbulence:
              </span>
              <button
                onClick={() => onUpdateMethodOptions?.(currentNSectors, currentSmooth, !currentTurbulence)}
                disabled={isCalculating}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  currentTurbulence
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {currentTurbulence ? '✓ On (default)' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. New First Card: Accuracy on the test period (after the outage) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <CalendarCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Accuracy on the test period (after the outage)
              </h3>
            </div>
            {activeTP && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Evaluation period: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{activeTP.startDateStr}</span> to <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{activeTP.endDateStr}</span> ({activeTP.stampsCount.toLocaleString('en-US')} stamps)
              </p>
            )}
          </div>

          {/* Switch: flagged test days | all data after outage */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1.5">
              Test period:
            </span>
            <button
              onClick={() => setTestPeriodMode('flagged')}
              disabled={!report.testPeriod?.hasFlagged}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                testPeriodMode === 'flagged' || isNotTest
                  ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              } ${!report.testPeriod?.hasFlagged ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              Flagged test days
            </button>
            <button
              onClick={() => setTestPeriodMode('all_after')}
              disabled={isNotTest}
              title={
                isNotTest
                  ? 'In the official protocol, test days are fixed across the entire dataset; evaluation is strictly on those flagged rows.'
                  : undefined
              }
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                !isNotTest && testPeriodMode === 'all_after'
                  ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              } ${isNotTest ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              All data after the outage
            </button>
          </div>
        </div>

        {/* Warning banner if trainingOption was all_measured */}
        {isAllMeasured && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center space-x-2.5 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-semibold">
              Not a fair test - the test data was used for training. Switch to 'Before the outage'.
            </span>
          </div>
        )}

        {/* Test Period Metrics Table */}
        {activeTP ? (
          <div
            className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 ${
              isAllMeasured ? 'opacity-60 grayscale-[40%]' : ''
            }`}
          >
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 font-sans">Turbine</th>
                  <th className="py-2.5 px-3 text-right">n</th>
                  <th className="py-2.5 px-3 text-right">Wind RMSE</th>
                  <th className="py-2.5 px-3 text-right">Wind MAE</th>
                  <th className="py-2.5 px-3 text-right">Wind Bias</th>
                  <th className="py-2.5 px-3 text-right">r (corr)</th>
                  <th className="py-2.5 px-3 text-right">Power RMSE</th>
                  <th className="py-2.5 px-3 text-right">Power MAE</th>
                  <th className="py-2.5 px-3 text-right">Measured Energy</th>
                  <th className="py-2.5 px-3 text-right">Predicted Energy</th>
                  <th className="py-2.5 px-3 text-right">Energy Dev %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {targetTurbines.map((tName) => {
                  const tm = activeTP.turbines[tName];
                  if (!tm) return null;
                  return (
                    <tr
                      key={tName}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                        Turbine {tName}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        {tm.n.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                        {tm.windRMSE.toFixed(2)} m/s
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {tm.windMAE.toFixed(2)} m/s
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        {tm.windBias >= 0 ? `+${tm.windBias.toFixed(2)}` : tm.windBias.toFixed(2)} m/s
                      </td>
                      <td className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-400 font-bold">
                        {tm.r.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {Math.round(tm.powerRMSE).toLocaleString('en-US')} kW
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {Math.round(tm.powerMAE).toLocaleString('en-US')} kW
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {Math.round(tm.measuredEnergyKWh).toLocaleString('en-US')} kWh
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                        {Math.round(tm.predictedEnergyKWh).toLocaleString('en-US')} kWh
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          Math.abs(tm.energyDevPct) <= 3
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {tm.energyDevPct >= 0 ? `+${tm.energyDevPct.toFixed(1)}` : tm.energyDevPct.toFixed(1)} %
                      </td>
                    </tr>
                  );
                })}

                {/* Park Row */}
                <tr className="bg-slate-100/70 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="py-2.5 px-3 font-sans text-slate-900 dark:text-white">
                    Park Total (T)
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400 font-mono">
                    {activeTP.stampsCount.toLocaleString('en-US')}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-800 dark:text-slate-200">
                    {activeTP.meanWindRMSE.toFixed(2)} m/s
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-800 dark:text-slate-200">
                    {activeTP.meanWindMAE.toFixed(2)} m/s
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">&mdash;</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">&mdash;</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">&mdash;</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">&mdash;</td>
                  <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white">
                    {Math.round(activeTP.parkMeasuredEnergyKWh).toLocaleString('en-US')} kWh
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white">
                    {Math.round(activeTP.parkPredictedEnergyKWh).toLocaleString('en-US')} kWh
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-black ${
                      Math.abs(activeTP.parkEnergyDevPct) <= 2
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {activeTP.parkEnergyDevPct >= 0
                      ? `+${activeTP.parkEnergyDevPct.toFixed(1)}`
                      : activeTP.parkEnergyDevPct.toFixed(1)}{' '}
                    %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No test period data available.</p>
        )}
      </div>

      {/* 2. Charts: Predicted vs Measured Wind on the Test Period */}
      {activeTP && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Predicted vs measured wind on the test period</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Solid line in target park blue (<span className="font-bold text-[#0072B2]">#0072B2</span>) = measured wind; dashed line in navy (<span className="font-bold text-[#1D3557]">#1D3557</span>) = predicted wind.
              </p>
            </div>

            {/* Turbine Selector: T1 / T2 / T3 */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-500 font-medium mr-1">Turbine:</span>
              {targetTurbines.map((tName) => (
                <button
                  key={tName}
                  onClick={() => setSelectedTestTurbine(tName)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    selectedTestTurbine === tName
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tName}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
            {/* Time Series Line Chart */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Time Series Tracking ({selectedTestTurbine})
                </span>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="inline-flex items-center space-x-1.5">
                    <span className="w-3.5 h-0.5 bg-[#0072B2] rounded-full inline-block" />
                    <span className="text-slate-600 dark:text-slate-400">Measured</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5">
                    <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#1D3557] inline-block" />
                    <span className="text-slate-600 dark:text-slate-400">Predicted (Navy)</span>
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={testLineChartData}
                    margin={{ top: 10, right: 15, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} opacity={0.5} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10, fill: '#475569' }}
                      minTickGap={40}
                      label={{
                        value: 'Date & Time',
                        position: 'insideBottom',
                        offset: -12,
                        fontSize: 11,
                        fill: '#1E293B',
                      }}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      width={45}
                      label={{
                        value: 'Wind Speed (m/s)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 12,
                        fontSize: 11,
                        fill: '#1E293B',
                      }}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        `${Number(value).toFixed(2)} m/s`,
                        name === 'measured' ? 'Measured Wind' : 'Predicted Wind',
                      ]}
                      labelFormatter={(lbl: any) => `Time: ${lbl}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="measured"
                      name="measured"
                      stroke={COLORS.target}
                      strokeWidth={1.8}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      name="predicted"
                      stroke="#1D3557"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scatter Plot with 1:1 Line */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                1:1 Correlation Scatter ({selectedTestTurbine})
              </span>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} opacity={0.5} />
                    <XAxis
                      dataKey="real"
                      name="Measured Wind"
                      unit=" m/s"
                      type="number"
                      domain={[0, 20]}
                      tick={{ fontSize: 10, fill: '#475569' }}
                      label={{
                        value: 'Measured (m/s)',
                        position: 'insideBottom',
                        offset: -12,
                        fontSize: 11,
                        fill: '#1E293B',
                      }}
                    />
                    <YAxis
                      dataKey="pred"
                      name="Predicted Wind"
                      unit=" m/s"
                      type="number"
                      domain={[0, 20]}
                      width={45}
                      tick={{ fontSize: 10, fill: '#475569' }}
                      label={{
                        value: 'Predicted (m/s)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 12,
                        fontSize: 11,
                        fill: '#1E293B',
                      }}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <ReferenceLine
                      segment={[
                        { x: 0, y: 0 },
                        { x: 20, y: 20 },
                      ]}
                      stroke="#E11D48"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      label={{
                        value: '1:1 line',
                        position: 'insideTopLeft',
                        fill: '#E11D48',
                        fontSize: 10,
                      }}
                    />
                    <Scatter
                      name="Test Points"
                      data={testScatterChartData}
                      fill={COLORS.target}
                      fillOpacity={0.35}
                      isAnimationActive={false}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. The Method in Words */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <span>The Estimation Methodology in Words</span>
        </h3>
        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2 font-normal">
          <p>
            <strong>1. Atmospheric Travel Delays:</strong> Because wind fronts take time to travel between parks, we identify the integer lag k in [-6, ..., +6] (10-minute steps) maximizing the Pearson correlation between raw reference park means and the target turbine.
          </p>
          <p>
            <strong>2. Reference Smoothing:</strong> Centred running mean over {report.methodOptions?.smooth ?? 5} steps ({((report.methodOptions?.smooth ?? 5) * 10)} min) on reference park means for regression and prediction, removing high-frequency micro-scale noise while preserving meso-scale wind fronts.
          </p>
          <p>
            <strong>3. {report.methodOptions?.nSectors ?? 8}-Sector Regression with Turbulence:</strong>
            <span className="block font-mono text-xs my-1 bg-slate-100 dark:bg-slate-800 p-2 rounded">
              v_T(t) = a_H &middot; v_H_smooth(t - k_H) + a_O &middot; v_O_smooth(t - k_O) + d &middot; S_smooth(t) + c
            </span>
            Partitioning the wind rose into {report.methodOptions?.nSectors ?? 8} directional sectors and including neighbour turbulence S(t) (standard deviation of wind speed).
          </p>
          <p>
            <strong>4. Empirical Bayes Shrinkage & Imputation:</strong> Blend weight w_s = n_s / (n_s + 300) shrinks sector fits toward the global isotropic regression to prevent overfitting in sparsely populated wind directions. Missing park readings during outage are imputed proportionally from active references.
          </p>
          <p>
            <strong>5. Power Curve Integration with Gauss-Hermite Quadrature:</strong> Converting predicted wind directly to power underestimates production due to power curve nonlinearity. We integrate expected power E[P] over residual spread &sigma; using a 21-node Gauss-Hermite quadrature, and compute empirical 80% confidence intervals [d10, d90] from backtest error percentiles.
          </p>
        </div>
      </div>

      {/* 4. Model Coefficients & Delays Table per Turbine */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Model Coefficients & Delays per Turbine and Sector
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formula: v_T(t) = &Sigma; a_P &middot; v_P(t - k_P) {currentTurbulence ? '+ d \u00B7 S(t) ' : ''}+ c
            </p>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {turbinesList.map((t) => (
            <div
              key={t.turbineName}
              className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Turbine {t.turbineName}
                </span>
                <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                  {Object.entries(t.model.lags).map(([p, k]) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    >
                      {formatDelay(p, k)}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    &sigma;_global = {t.model.sigmaGlobal.toFixed(4)} m/s
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                    <tr>
                      <th className="py-1.5">Sector</th>
                      <th className="py-1.5">Count (n_s)</th>
                      <th className="py-1.5">Blend Weight (w)</th>
                      {report.chosenParks.map((p) => (
                        <th key={p} className="py-1.5 text-right">
                          a_{p}
                        </th>
                      ))}
                      {currentTurbulence && (
                        <th className="py-1.5 text-right">
                          d (turbulence)
                        </th>
                      )}
                      <th className="py-1.5 text-right">c (intercept)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {t.model.sectorModels.map((sec) => (
                      <tr key={sec.sector} className="hover:bg-slate-100/50 dark:hover:bg-slate-700/30">
                        <td className="py-1.5 font-sans font-bold text-slate-800 dark:text-slate-200">
                          {sec.name} ({Math.round(sec.sector * (360 / t.model.sectorModels.length))}°)
                        </td>
                        <td className="py-1.5 text-slate-600 dark:text-slate-400">{sec.nRows}</td>
                        <td className="py-1.5 text-slate-600 dark:text-slate-400">
                          {(sec.weight * 100).toFixed(1)} %
                        </td>
                        {report.chosenParks.map((p) => (
                          <td key={p} className="py-1.5 text-right font-bold text-blue-700 dark:text-blue-400">
                            {formatCoeff(sec.aParks[p])}
                          </td>
                        ))}
                        {currentTurbulence && (
                          <td className="py-1.5 text-right font-bold text-amber-700 dark:text-amber-400">
                            {formatCoeff(sec.dTurbulence ?? 0)}
                          </td>
                        )}
                        <td className="py-1.5 text-right text-slate-700 dark:text-slate-300">
                          {formatCoeff(sec.c)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Turbulence Note at bottom of table */}
              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 italic">
                {report.turbulenceNote ||
                  "Turbulence feature: using H-park wind_speed_stddev smoothed over 50 min (O has no stddev). Turbines with stddev coverage >50% are averaged; missing values imputed with training median."}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Renamed Card: Validation inside the training data (backtest windows) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Validation inside the training data (backtest windows)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {chosenCombination.windowsCount} independent out-of-sample backtest windows inside the training period
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-3 font-sans">Turbine</th>
                <th className="py-2.5 px-3 text-right">Wind RMSE</th>
                <th className="py-2.5 px-3 text-right">Wind MAE</th>
                <th className="py-2.5 px-3 text-right">Power RMSE</th>
                <th className="py-2.5 px-3 text-right">Power MAE</th>
                <th className="py-2.5 px-3 text-right">Median |Energy Error|</th>
                <th className="py-2.5 px-3 text-right">d10</th>
                <th className="py-2.5 px-3 text-right">d90</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {turbinesList.map((t) => {
                const medScore = chosenCombination.turbineMedians[t.turbineName];
                const metrics = turbineAveragedMetrics[t.turbineName] || {
                  windRMSE: NaN,
                  windMAE: NaN,
                  powerRMSE: NaN,
                  powerMAE: NaN,
                };
                return (
                  <tr key={t.turbineName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                      {t.turbineName}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {!Number.isNaN(metrics.windRMSE) ? `${metrics.windRMSE.toFixed(2)} m/s` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {!Number.isNaN(metrics.windMAE) ? `${metrics.windMAE.toFixed(2)} m/s` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {!Number.isNaN(metrics.powerRMSE) ? `${Math.round(metrics.powerRMSE).toLocaleString('en-US')} kW` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {!Number.isNaN(metrics.powerMAE) ? `${Math.round(metrics.powerMAE).toLocaleString('en-US')} kW` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {medScore !== undefined ? `${medScore.toFixed(2)} %` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {formatPercent(t.d10, true)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {formatPercent(t.d90, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart 1: Bar Chart of Energy Error % Across Test Windows */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <span>Park energy error (ΔE %) in each test window</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Mean of Median |ΔE%| = {chosenCombination.selectionScore.toFixed(2)} %
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 20, left: 15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} opacity={0.6} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#475569' }}
                label={{
                  value: 'Backtest Test Window',
                  position: 'insideBottom',
                  offset: -15,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <YAxis
                width={70}
                tick={{ fontSize: 12, fill: '#475569' }}
                label={{
                  value: 'Park ΔE (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <Tooltip
                formatter={(val: any) => [`${val} %`, 'Park ΔE (%)']}
                labelFormatter={(label: any) => `Window ${label}`}
              />
              <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1.5} />
              <Bar dataKey="errorPercent" name="Park ΔE (%)">
                {barChartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.errorPercent >= 0 ? COLORS.target : COLORS.parkH}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Scatter Plot of Predicted vs Real Wind with 1:1 Line */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
              <ScatterIcon className="w-5 h-5 text-indigo-600" />
              <span>Backtest predicted vs. real wind speed (points on 1:1 line = perfect)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Out-of-sample: hourly points from the {chosenCombination.windowsCount} test windows ({scatterPoints.length.toLocaleString('en-US')} points)
            </p>
          </div>

          {/* Small Turbine Selection Buttons */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 font-medium mr-1">Turbine:</span>
            {targetTurbines.map((tName) => (
              <button
                key={tName}
                onClick={() => setSelectedScatterTurbine(tName)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  selectedScatterTurbine === tName
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tName}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: 15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} opacity={0.6} />
              <XAxis
                dataKey="real"
                name="Actual Wind"
                unit=" m/s"
                type="number"
                domain={[0, 20]}
                tick={{ fontSize: 12, fill: '#475569' }}
                label={{
                  value: 'Actual Wind Speed (m/s)',
                  position: 'insideBottom',
                  offset: -15,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <YAxis
                dataKey="pred"
                name="Predicted Wind"
                unit=" m/s"
                type="number"
                domain={[0, 20]}
                width={70}
                tick={{ fontSize: 12, fill: '#475569' }}
                label={{
                  value: 'Predicted Wind Speed (m/s)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: 20, y: 20 },
                ]}
                stroke="#E11D48"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: '1:1 Ideal Line (y = x)',
                  position: 'insideTopLeft',
                  fill: '#E11D48',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <Scatter
                name="Wind Predictions"
                data={scatterPoints}
                fill={COLORS.target}
                fillOpacity={0.35}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
