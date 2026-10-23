import React, { useMemo } from 'react';
import {
  Zap,
  Info,
  TrendingUp,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ErrorBar,
} from 'recharts';
import { EngineResult } from '../../engine';
import { COLORS } from '../../utils/colors';
import { formatKWh, formatPercent } from '../../utils/formatters';
import { DensityToggle } from '../DensityToggle';

interface Step7EnergyLossProps {
  result: EngineResult;
  useDensity?: boolean;
  onToggleDensity?: (useDensity: boolean) => void;
}

export const Step7EnergyLoss: React.FC<Step7EnergyLossProps> = ({
  result,
  useDensity,
  onToggleDensity,
}) => {
  const { report, outage } = result;
  const isDensityActive = (result as any).densityApplied === true || (useDensity ?? false);
  const baseResult = ((result as any).base as EngineResult) || result;
  const baseReport = baseResult.report;

  const turbinesList = Object.values(report.turbines);

  // Bar chart data per turbine with asymmetric range whiskers [lost - low, high - lost]
  const barData = useMemo(() => {
    return turbinesList.map((t) => {
      const lost = Math.round(t.energyKWh);
      const low = Math.round(t.range80LowerKWh);
      const high = Math.round(t.range80UpperKWh);
      return {
        name: t.turbineName,
        lostKWh: lost,
        lowKWh: low,
        highKWh: high,
        // Recharts asymmetric ErrorBar expects [minus, plus] offsets
        errorRange: [lost - low, high - lost],
        rangeText: `${low.toLocaleString('en-US')} – ${high.toLocaleString('en-US')} kWh`,
      };
    });
  }, [turbinesList]);

  // Cumulative energy loss data over outage
  const cumulativeData = useMemo(() => {
    const stampsCount = outage.stampsCount;
    const step = Math.max(1, Math.floor(stampsCount / 120));
    const data: { timestamp: string; hour: number; cumulativeKWh: number }[] = [];

    let runningSum = 0;
    for (let i = 0; i < stampsCount; i++) {
      let stampPower = 0;
      for (const t of turbinesList) {
        const p = t.expectedPowerOutage[i];
        if (!Number.isNaN(p)) stampPower += p;
      }
      runningSum += stampPower * (1 / 6); // exact 1/6 factor

      if (i % step === 0 || i === stampsCount - 1) {
        data.push({
          timestamp: report.outageDates[i],
          hour: Number(((i + 1) / 6).toFixed(1)),
          cumulativeKWh: Math.round(runningSum),
        });
      }
    }

    return data;
  }, [outage, report, turbinesList]);

  const yAxisKWhFormatter = (v: number) => {
    if (v >= 1000) {
      return `${Math.round(v / 1000)}k`;
    }
    return `${v}`;
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span>Step 7 &bull; Electricity Production Loss & Empirical Uncertainty</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Loss quantified through Gauss-Hermite power integration and 80% empirical backtest error ranges.
          </p>
        </div>
      </div>

      {/* KPI Cards: Park Total + One per Turbine */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Park Total Card */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-blue-200 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Park Total Loss</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 text-white">
              {formatKWh(report.parkEnergyKWh)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-800/80 text-xs">
            <span className="text-blue-300 block font-medium">80% Uncertainty Range:</span>
            <span className="font-bold text-white text-sm">
              {Math.round(report.parkRange80LowerKWh).toLocaleString('en-US')} –{' '}
              {Math.round(report.parkRange80UpperKWh).toLocaleString('en-US')} kWh
            </span>
          </div>
        </div>

        {/* Per-Turbine Cards */}
        {turbinesList.map((t) => (
          <div
            key={t.turbineName}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Turbine {t.turbineName}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatKWh(t.energyKWh)}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">
                80% Confidence Range:
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {Math.round(t.range80LowerKWh).toLocaleString('en-US')} –{' '}
                {Math.round(t.range80UpperKWh).toLocaleString('en-US')} kWh
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart 1: Bar Chart per Turbine with Uncertainty Whiskers */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Lost Energy per Turbine with 80% Range Whiskers</span>
          </h3>
          <span className="text-xs text-slate-500">
            Whiskers show the [d90, d10] empirical error bounds
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 45, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} opacity={0.6} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 13, fontWeight: 600, fill: '#1E293B' }}
                label={{
                  value: 'Target Turbine',
                  position: 'insideBottom',
                  offset: -15,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <YAxis
                width={75}
                tickFormatter={yAxisKWhFormatter}
                tick={{ fontSize: 12, fill: '#475569' }}
                label={{
                  value: 'Energy (kWh)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' },
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <Tooltip
                formatter={(val: any) => [
                  `${val.toLocaleString('en-US')} kWh`,
                  'Estimated Lost Energy',
                ]}
                labelFormatter={(name) => `Turbine ${name}`}
              />
              <Bar dataKey="lostKWh" name="Lost Electricity (kWh)" fill={COLORS.target} radius={[6, 6, 0, 0]}>
                <ErrorBar
                  dataKey="errorRange"
                  width={8}
                  strokeWidth={2}
                  stroke="#E11D48"
                  direction="y"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Cumulative Lost Energy over Outage */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Cumulative Lost Electricity Generation During Outage</span>
          </h3>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
            Final Total: {formatKWh(report.parkEnergyKWh)}
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulativeData} margin={{ top: 10, right: 20, left: 45, bottom: 25 }}>
              <defs>
                <linearGradient id="cumLossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.target} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS.target} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} opacity={0.6} />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 11, fill: '#475569' }}
                interval="preserveStartEnd"
                label={{
                  value: 'Timestamp (Local Time)',
                  position: 'insideBottom',
                  offset: -15,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <YAxis
                width={75}
                tickFormatter={yAxisKWhFormatter}
                tick={{ fontSize: 12, fill: '#475569' }}
                label={{
                  value: 'Cumulative lost energy (kWh)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <Tooltip
                formatter={(val: any) => [`${val.toLocaleString('en-US')} kWh`, 'Cumulative Loss']}
              />
              <Area
                type="monotone"
                dataKey="cumulativeKWh"
                name="Cumulative Lost kWh"
                stroke={COLORS.target}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#cumLossGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bonus: temperature and pressure (air density) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
              <Info className="w-4 h-4 text-teal-600" />
              <span>Bonus: temperature and pressure (air density)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparison between standard power curve density and site air density reconstructed from neighbouring parks.
            </p>
          </div>
          {isDensityActive && (
            <span className="self-start sm:self-auto px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              headline numbers use the corrected result
            </span>
          )}
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">Turbine</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 text-right">
                  Standard density (kWh)
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 text-right">
                  Site density (kWh)
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 text-right">
                  Difference (%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {baseReport.targetTurbines.map((tName) => {
                const est = baseReport.turbines[tName];
                const stdKWh = est ? Math.round(est.energyKWh) : 0;
                const siteKWh = est && est.densityEnergyKWh !== undefined ? Math.round(est.densityEnergyKWh) : stdKWh;
                const diffPct =
                  stdKWh > 0 ? ((siteKWh / stdKWh - 1) * 100) : 0;
                const diffStr = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)} %`;

                return (
                  <tr key={tName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                      Turbine {tName}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {stdKWh.toLocaleString('en-US')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-900 dark:text-slate-100 font-semibold">
                      {est?.densityEnergyKWh !== undefined ? siteKWh.toLocaleString('en-US') : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-teal-600 dark:text-teal-400">
                      {est?.densityEnergyKWh !== undefined ? diffStr : '—'}
                    </td>
                  </tr>
                );
              })}

              {/* Park Row */}
              <tr className="bg-slate-50 dark:bg-slate-800/70 font-bold border-t border-slate-200 dark:border-slate-700">
                <td className="py-2.5 px-3 text-slate-900 dark:text-white">
                  Park total (Park {baseReport.targetPark})
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                  {Math.round(baseReport.parkEnergyKWh).toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-teal-700 dark:text-teal-300">
                  {baseReport.airDensity.correctedParkEnergyKWh !== undefined
                    ? Math.round(baseReport.airDensity.correctedParkEnergyKWh).toLocaleString('en-US')
                    : '—'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-teal-700 dark:text-teal-300">
                  {baseReport.airDensity.sensitivityPercent !== undefined
                    ? `${baseReport.airDensity.sensitivityPercent >= 0 ? '+' : ''}${baseReport.airDensity.sensitivityPercent.toFixed(1)} %`
                    : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DensityToggle Component */}
        {onToggleDensity && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <DensityToggle
              result={baseResult}
              useDensity={isDensityActive}
              onToggle={onToggleDensity}
            />
          </div>
        )}
      </div>
    </div>
  );
};
