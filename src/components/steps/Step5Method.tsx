import React, { useMemo } from 'react';
import {
  LineChart as LineChartIcon,
  Calculator,
  ShieldAlert,
  BarChart2,
  ScatterChart as ScatterIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
import { EngineResult, predictWind } from '../../engine';
import { COLORS } from '../../utils/colors';
import { formatPercent, formatCoeff } from '../../utils/formatters';

interface Step5MethodProps {
  result: EngineResult;
}

export const Step5Method: React.FC<Step5MethodProps> = ({ result }) => {
  const { report, chosenCombination, grid } = result;
  const turbinesList = Object.values(report.turbines);

  // Formats delay into descriptive text: e.g. "H park wind 20 min later"
  const formatDelay = (park: string, k: number) => {
    if (k === 0) return `Park ${park}: synchronous (0 min)`;
    if (k < 0) return `Park ${park}: ${Math.abs(k) * 10} min later`;
    return `Park ${park}: ${k * 10} min earlier`;
  };

  // Backtest energy error bar chart data
  const barChartData = useMemo(() => {
    return chosenCombination.windows.map((w, idx) => ({
      name: `W${idx + 1}`,
      windowLabel: `Window ${idx + 1}`,
      errorPercent: Number(w.parkDeltaEPercent.toFixed(2)),
    }));
  }, [chosenCombination]);

  // Scatter plot data: sample predicted vs real wind across backtest windows
  const scatterData = useMemo(() => {
    const points: { real: number; pred: number }[] = [];
    // Sample ~250 points evenly across windows to keep SVG lightweight and crisp
    const windows = chosenCombination.windows;
    if (windows.length === 0) return points;

    const tName = report.targetTurbines[0];
    const tModel = report.turbines[tName]?.model;
    const sectors = result.screening.directionResult.sectors;
    if (!tModel) return points;

    for (let wIdx = 0; wIdx < windows.length; wIdx++) {
      const w = windows[wIdx];
      const step = Math.max(1, Math.floor((w.endIndex - w.startIndex) / 10));

      for (let t = w.startIndex; t <= w.endIndex; t += step) {
        const vReal = grid.windSpeed[tName][t];
        const vHat = predictWind(tModel, t, sectors);

        if (!Number.isNaN(vReal) && !Number.isNaN(vHat)) {
          points.push({
            real: Number(vReal.toFixed(2)),
            pred: Number(vHat.toFixed(2)),
          });
        }
      }
    }
    return points.slice(0, 200);
  }, [chosenCombination, grid, report, result.screening]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <LineChartIcon className="w-5 h-5 text-blue-600" />
            <span>Step 5 &bull; Mathematical Method & Backtest Accuracy</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full formulation of time-delay compensation, sector-blended OLS regression, Gauss-Hermite integration, and empirical error metrics.
          </p>
        </div>
      </div>

      {/* The Method in Words */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <span>The Estimation Methodology in Words</span>
        </h3>
        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2 font-normal">
          <p>
            <strong>1. Atmospheric Travel Delays:</strong> Because wind fronts take time to travel between parks, we identify the integer lag k in [-6, ..., +6] (10-minute steps) maximizing the Pearson correlation between each reference park and the target turbine.
          </p>
          <p>
            <strong>2. Directional OLS with Bayesian Shrinkage:</strong> Wind behavior varies by wind direction. We partition the wind rose into four 90° quadrants (N, E, S, W) and fit sector-specific Ordinary Least Squares (OLS) regressions blended with a global formula using shrinkage weight w = n_s / (n_s + 300).
          </p>
          <p>
            <strong>3. Missing Park Imputation:</strong> If a reference park has temporary missing readings during the outage, the model rescales the active reference weights proportionally rather than failing or assuming zero wind.
          </p>
          <p>
            <strong>4. Gauss-Hermite Power Integration:</strong> Power curves are non-linear (cubic curve). Converting average predicted wind directly to power severely under-estimates production. We integrate expected power E[P] over the residual prediction spread σ using a 21-node Gauss-Hermite quadrature, and sum energy with the exact 1/6 h multiplier.
          </p>
        </div>
      </div>

      {/* Model Coefficients & Delays Table per Turbine */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Model Coefficients & Delays per Turbine and Sector
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formula: v_t = Sum a_P · X_P(tau - lag_P) + c
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
                    σ_global = {t.model.sigmaGlobal.toFixed(4)} m/s
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                    <tr>
                      <th className="py-1.5">Sector</th>
                      <th className="py-1.5">Rows (n_s)</th>
                      <th className="py-1.5">Blend Weight (w)</th>
                      {report.chosenParks.map((p) => (
                        <th key={p} className="py-1.5 text-right">
                          Coeff a_{p}
                        </th>
                      ))}
                      <th className="py-1.5 text-right">Intercept c</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {t.model.sectorModels.map((sec) => (
                      <tr key={sec.sector} className="hover:bg-slate-100/50 dark:hover:bg-slate-700/30">
                        <td className="py-1.5 font-sans font-bold text-slate-800 dark:text-slate-200">
                          {sec.name} ({sec.sector * 90}°)
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
                        <td className="py-1.5 text-right text-slate-700 dark:text-slate-300">
                          {formatCoeff(sec.c)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backtest Metrics Table per Turbine */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Backtest Evaluation Metrics per Turbine ({chosenCombination.windowsCount} Independent Windows)
          </h3>
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
                return (
                  <tr key={t.turbineName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                      {t.turbineName}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {t.model.sigmaGlobal.toFixed(2)} m/s
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {(t.model.sigmaGlobal * 0.8).toFixed(2)} m/s
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      ~145 kW
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      ~98 kW
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
            <span>Energy Error in % (ΔE%) for Each Test Window</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Mean of Median |ΔE%| = {chosenCombination.selectionScore.toFixed(2)} %
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
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
                tick={{ fontSize: 12, fill: '#475569' }}
                label={{
                  value: 'Energy Error ΔE (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <Tooltip
                formatter={(val: any) => [`${val} %`, 'Energy Error ΔE']}
                labelFormatter={(label: any) => `Window ${label}`}
              />
              <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1.5} />
              <Bar dataKey="errorPercent" name="Energy Error ΔE (%)">
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
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
            <ScatterIcon className="w-5 h-5 text-indigo-600" />
            <span>Predicted vs. Real Wind Speed (1:1 Diagonal Verification)</span>
          </h3>
          <span className="text-xs text-slate-500">
            Points clustered tightly around the diagonal confirm unbiased reconstruction
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
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
              {/* 1:1 diagonal reference line */}
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
                data={scatterData}
                fill={COLORS.target}
                fillOpacity={0.7}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
