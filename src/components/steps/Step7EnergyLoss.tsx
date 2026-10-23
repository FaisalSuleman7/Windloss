import React, { useMemo } from 'react';
import {
  Zap,
  Activity,
  Wind,
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
  Legend,
  Cell,
  ErrorBar,
} from 'recharts';
import { EngineResult } from '../../engine';
import { COLORS } from '../../utils/colors';
import { formatKWh, formatPercent } from '../../utils/formatters';

interface Step7EnergyLossProps {
  result: EngineResult;
}

export const Step7EnergyLoss: React.FC<Step7EnergyLossProps> = ({ result }) => {
  const { report, outage } = result;
  const turbinesList = Object.values(report.turbines);

  // Bar chart data per turbine with range whiskers
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
        // Error bar distances [minus, plus]
        errorMinus: Math.max(0, lost - low),
        errorPlus: Math.max(0, high - lost),
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
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
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
                tick={{ fontSize: 12, fill: '#475569' }}
                label={{
                  value: 'Estimated Lost Energy (kWh)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -5,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />
              <Tooltip
                formatter={(val: any, name: any, item: any) => [
                  `${val.toLocaleString('en-US')} kWh`,
                  'Estimated Lost Energy',
                ]}
                labelFormatter={(name) => `Turbine ${name}`}
              />
              <Bar dataKey="lostKWh" name="Lost Electricity (kWh)" fill={COLORS.target} radius={[6, 6, 0, 0]}>
                <ErrorBar
                  dataKey="errorPlus"
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
            <AreaChart data={cumulativeData} margin={{ top: 10, right: 20, left: 15, bottom: 25 }}>
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
                tick={{ fontSize: 12, fill: '#475569' }}
                label={{
                  value: 'Cumulative Lost Energy (kWh)',
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

      {/* Air Density Sensitivity Note */}
      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 flex items-start space-x-3 text-xs text-purple-900 dark:text-purple-300">
        <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Air-Density Sensitivity Analysis</p>
          <p className="leading-relaxed">
            {report.airDensity.isApplicable && report.airDensity.sensitivityPercent !== undefined
              ? `Taking ambient barometric pressure and temperature into account would adjust the estimated lost energy by ${formatPercent(
                  report.airDensity.sensitivityPercent,
                  true
                )} (estimated corrected energy: ${Math.round(
                  report.airDensity.correctedParkEnergyKWh || 0
                ).toLocaleString('en-US')} kWh using pressure baseline from neighbouring Park ${
                  report.airDensity.referenceParkUsed
                }). Standard claim filings utilize standard air density (1.225 kg/m³); this sensitivity is provided as an informative reference for insurance adjusters.`
              : `Air density sensitivity could not be calculated: ${
                  report.airDensity.reason || 'Insufficient pressure variation in candidate parks.'
                }`}
          </p>
        </div>
      </div>
    </div>
  );
};
