import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts';
import { Eye, EyeOff, Activity } from 'lucide-react';
import { Grid, OutageInfo } from '../engine';
import { COLORS, getTurbineParkShade } from '../utils/colors';

interface DataExplorationChartProps {
  grid: Grid;
  outage: OutageInfo;
}

type VariableKey = 'windSpeed' | 'windDirection' | 'temperature' | 'airPressure';

const VARIABLES: { key: VariableKey; label: string; unit: string }[] = [
  { key: 'windSpeed', label: 'Wind speed', unit: 'm/s' },
  { key: 'windDirection', label: 'Wind direction', unit: '°' },
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'airPressure', label: 'Air pressure', unit: 'hPa' },
];

export const DataExplorationChart: React.FC<DataExplorationChartProps> = ({
  grid,
  outage,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [activeVar, setActiveVar] = useState<VariableKey>('windSpeed');

  // Group turbines by park
  const parkGroups = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of grid.turbines) {
      const p = grid.turbineParkMap[t] || 'Unknown';
      if (!map[p]) map[p] = [];
      map[p].push(t);
    }
    // Sort parks: ref parks first alphabetically, target park last or with indicator
    return Object.entries(map).sort(([pA], [pB]) => {
      if (pA === outage.targetPark) return 1;
      if (pB === outage.targetPark) return -1;
      return pA.localeCompare(pB);
    });
  }, [grid.turbines, grid.turbineParkMap, outage.targetPark]);

  // Track which turbines have valid data for each variable
  const turbineHasData = useMemo(() => {
    const hasDataMap: Record<VariableKey, Record<string, boolean>> = {
      windSpeed: {},
      windDirection: {},
      temperature: {},
      airPressure: {},
    };

    for (const t of grid.turbines) {
      let ws = false, wd = false, temp = false, press = false;
      const wsArr = grid.windSpeed[t];
      const wdArr = grid.windDirection[t];
      const tempArr = grid.ambientTemperature[t];
      const pressArr = grid.airPressure[t];

      for (let i = 0; i < grid.nRows; i++) {
        if (!ws && wsArr && !Number.isNaN(wsArr[i])) ws = true;
        if (!wd && wdArr && !Number.isNaN(wdArr[i])) wd = true;
        if (!temp && tempArr && !Number.isNaN(tempArr[i])) temp = true;
        if (!press && pressArr && !Number.isNaN(pressArr[i])) press = true;
        if (ws && wd && temp && press) break;
      }

      hasDataMap.windSpeed[t] = ws;
      hasDataMap.windDirection[t] = wd;
      hasDataMap.temperature[t] = temp;
      hasDataMap.airPressure[t] = press;
    }

    return hasDataMap;
  }, [grid]);

  // Selected turbines state (default: all active)
  const [visibleTurbines, setVisibleTurbines] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const t of grid.turbines) init[t] = true;
    return init;
  });

  const toggleTurbine = (t: string) => {
    setVisibleTurbines((prev) => ({ ...prev, [t]: !prev[t] }));
  };

  const togglePark = (parkTurbines: string[]) => {
    setVisibleTurbines((prev) => {
      const allActive = parkTurbines.every((t) => prev[t]);
      const next = { ...prev };
      for (const t of parkTurbines) {
        next[t] = !allActive;
      }
      return next;
    });
  };

  // Compute hourly means data
  const chartData = useMemo(() => {
    if (!isOpen) return [];

    const nHours = Math.ceil(grid.nRows / 6);
    const data: Record<string, any>[] = new Array(nHours);

    for (let h = 0; h < nHours; h++) {
      const startIdx = h * 6;
      const endIdx = Math.min(grid.nRows, (h + 1) * 6);
      const entry: Record<string, any> = {
        idx: h,
        timestamp: grid.dateStrings[startIdx],
      };

      for (const t of grid.turbines) {
        if (!visibleTurbines[t] || !turbineHasData[activeVar][t]) {
          continue;
        }

        if (activeVar === 'windDirection') {
          const series = grid.windDirection[t];
          if (!series) continue;
          let sumSin = 0;
          let sumCos = 0;
          let count = 0;

          for (let i = startIdx; i < endIdx; i++) {
            const v = series[i];
            if (!Number.isNaN(v)) {
              const rad = (v * Math.PI) / 180;
              sumSin += Math.sin(rad);
              sumCos += Math.cos(rad);
              count++;
            }
          }

          if (count > 0) {
            let deg = (Math.atan2(sumSin / count, sumCos / count) * 180) / Math.PI;
            deg = (deg + 360) % 360;
            entry[t] = Number(deg.toFixed(1));
          } else {
            entry[t] = null;
          }
        } else {
          let series: Float64Array | undefined;
          if (activeVar === 'windSpeed') series = grid.windSpeed[t];
          else if (activeVar === 'temperature') series = grid.ambientTemperature[t];
          else if (activeVar === 'airPressure') series = grid.airPressure[t];

          if (!series) continue;

          let sum = 0;
          let count = 0;
          for (let i = startIdx; i < endIdx; i++) {
            const v = series[i];
            if (!Number.isNaN(v)) {
              sum += v;
              count++;
            }
          }

          if (count > 0) {
            entry[t] = Number((sum / count).toFixed(2));
          } else {
            entry[t] = null;
          }
        }
      }

      data[h] = entry;
    }

    return data;
  }, [isOpen, grid, activeVar, visibleTurbines, turbineHasData]);

  // Color mapping per turbine
  const turbineColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [park, turbines] of parkGroups) {
      turbines.forEach((t, idx) => {
        map[t] = getTurbineParkShade(park, idx, turbines.length);
      });
    }
    return map;
  }, [parkGroups]);

  const activeUnit = VARIABLES.find((v) => v.key === activeVar)?.unit || '';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header with show/hide button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Look at the data (hourly means, before any model)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hourly aggregated time series across all SCADA channels before any mathematical modeling.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer self-start sm:self-auto"
        >
          {isOpen ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Hide plots</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Show plots</span>
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4">
          {/* Variable Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Variable:
            </span>
            {VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setActiveVar(v.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeVar === v.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {v.label} ({v.unit})
              </button>
            ))}
          </div>

          {/* Turbine Chips Grouped by Park */}
          <div className="flex items-center gap-4 flex-wrap text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/70">
            {parkGroups.map(([park, turbines]) => {
              const isTargetPark = park === outage.targetPark;
              const parkAllActive = turbines.every((t) => visibleTurbines[t]);
              return (
                <div key={park} className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => togglePark(turbines)}
                    className="font-bold text-slate-800 dark:text-slate-200 hover:underline cursor-pointer mr-1 flex items-center gap-1"
                    title={`Toggle all turbines in Park ${park}`}
                  >
                    <span>
                      Park {park}
                      {isTargetPark ? ' (target)' : ''}:
                    </span>
                  </button>
                  {turbines.map((t) => {
                    const hasVarData = turbineHasData[activeVar][t];
                    const isActive = visibleTurbines[t] && hasVarData;
                    const color = turbineColors[t] || COLORS.navy;

                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={!hasVarData}
                        onClick={() => hasVarData && toggleTurbine(t)}
                        title={
                          !hasVarData
                            ? `${t} has no recorded ${VARIABLES.find((v) => v.key === activeVar)?.label} data`
                            : `Toggle ${t}`
                        }
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          !hasVarData
                            ? 'opacity-35 cursor-not-allowed bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                            : isActive
                            ? 'bg-white dark:bg-slate-900 border shadow-xs cursor-pointer text-slate-900 dark:text-white'
                            : 'opacity-50 line-through bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer'
                        }`}
                        style={{
                          borderColor: isActive ? color : 'transparent',
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: hasVarData ? color : '#94A3B8' }}
                        />
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Line Chart */}
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} opacity={0.6} />
                <XAxis
                  dataKey="idx"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(idxVal: number) => {
                    const gridIdx = Math.round(idxVal) * 6;
                    if (gridIdx >= 0 && gridIdx < grid.nRows) {
                      return grid.dateStrings[gridIdx];
                    }
                    return '';
                  }}
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
                  domain={activeVar === 'windDirection' ? [0, 360] : ['auto', 'auto']}
                  ticks={
                    activeVar === 'windDirection'
                      ? [0, 90, 180, 270, 360]
                      : undefined
                  }
                  tick={{ fontSize: 12, fill: '#475569' }}
                  label={{
                    value: `${VARIABLES.find((v) => v.key === activeVar)?.label} (${activeUnit})`,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    fill: '#1E293B',
                  }}
                />
                <Tooltip
                  labelFormatter={(labelVal: any) => {
                    const gridIdx = Math.round(Number(labelVal)) * 6;
                    if (gridIdx >= 0 && gridIdx < grid.nRows) {
                      return grid.dateStrings[gridIdx];
                    }
                    return String(labelVal);
                  }}
                  formatter={(val: any) =>
                    val !== null && val !== undefined
                      ? [`${val} ${activeUnit}`, 'Mean']
                      : ['No data', 'Mean']
                  }
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />

                {/* Pink ReferenceArea over outage */}
                <ReferenceArea
                  x1={Math.floor(outage.startIndex / 6)}
                  x2={Math.floor(outage.endIndex / 6)}
                  ifOverflow="extendDomain"
                  fill="#CC79A7"
                  fillOpacity={0.18}
                  stroke="#CC79A7"
                  strokeOpacity={0.8}
                  label={{
                    value: 'Outage (' + outage.durationHours.toFixed(1) + ' h)',
                    position: 'insideTop',
                    fill: '#831843',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />

                {/* Turbine Lines */}
                {grid.turbines.map((t) => {
                  if (!visibleTurbines[t] || !turbineHasData[activeVar][t]) {
                    return null;
                  }
                  const color = turbineColors[t] || COLORS.navy;
                  return (
                    <Line
                      key={t}
                      type="monotone"
                      dataKey={t}
                      name={t}
                      stroke={color}
                      strokeWidth={1.75}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Notes under chart */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            <p>
              Pink band = outage ({outage.startDateStr} to {outage.endDateStr}). Gaps in a line are missing data (never treated as 0).
            </p>
            {activeVar === 'airPressure' && (
              <p className="text-amber-600 dark:text-amber-400">
                A perfectly flat pressure line is a placeholder value, not a measurement; it is not used for the density option.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
