import React from 'react';
import { EngineResult } from '../engine';
import { densityAvailable } from '../utils/view';
import { Wind, Gauge, CheckCircle2 } from 'lucide-react';

interface DensityToggleProps {
  result: EngineResult;
  useDensity: boolean;
  onToggle: (useDensity: boolean) => void;
  className?: string;
}

export function DensityToggle({
  result,
  useDensity,
  onToggle,
  className = '',
}: DensityToggleProps) {
  const isAvailable = densityAvailable(result);
  const { report } = result;
  const { airDensity, parkEnergyKWh } = report;

  const standardKWh = Math.round(parkEnergyKWh);
  const correctedKWh = Math.round(airDensity.correctedParkEnergyKWh ?? parkEnergyKWh);
  const sensPct = airDensity.sensitivityPercent ?? 0;
  const sensStr = `${sensPct >= 0 ? '+' : ''}${sensPct.toFixed(1)} %`;
  const deltaPStr = `${(airDensity.deltaP_hPa ?? 0) >= 0 ? '+' : ''}${(airDensity.deltaP_hPa ?? 0).toFixed(1)}`;
  const rhoStr = (airDensity.meanRhoOutage ?? 1.225).toFixed(3);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Standard card */}
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
            !useDensity
              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  !useDensity
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Wind className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Standard air density (default)
              </span>
            </div>
            {!useDensity && (
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
          </div>

          <div className="mt-3">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {standardKWh.toLocaleString('en-US')} kWh
            </span>
          </div>

          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Power curve as supplied by the manufacturer (1.225 kg/m³). This is how the "real" power is defined in the evaluation.
          </p>
        </button>

        {/* Site density corrected card */}
        <button
          type="button"
          disabled={!isAvailable}
          onClick={() => isAvailable && onToggle(true)}
          className={`p-4 rounded-xl border text-left transition-all relative ${
            !isAvailable
              ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 opacity-60 cursor-not-allowed'
              : useDensity
              ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/30 ring-2 ring-teal-500/20 cursor-pointer'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  useDensity
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Gauge className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  Corrected to site air density
                </span>
                {isAvailable && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                    ({sensStr})
                  </span>
                )}
              </div>
            </div>
            {useDensity && isAvailable && (
              <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
            )}
          </div>

          <div className="mt-3">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {isAvailable ? `${correctedKWh.toLocaleString('en-US')} kWh` : 'Not available'}
            </span>
          </div>

          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAvailable ? (
              <>
                Wind scaled by (ρ/1.225)<sup>1/3</sup> before the power curve. ρ from temperature and pressure of park {airDensity.referenceParkUsed || 'ref'} ({deltaPStr} hPa height offset to the target park); mean ρ {rhoStr} kg/m³.
              </>
            ) : (
              airDensity.reason || 'Air pressure and temperature measurements not available for site density correction.'
            )}
          </p>
        </button>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
        The choice changes the headline numbers on the Energy loss, E-mail and Downloads pages. The uncertainty range keeps the same measured error distribution. The Self-test always checks the standard result.
      </p>
    </div>
  );
}
