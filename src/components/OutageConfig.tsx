import React, { useState } from 'react';
import { Calendar, Settings2, ShieldCheck, Check } from 'lucide-react';
import { OutageInfo, TrainingDataOption, ParkCombinationResult, Grid } from '../engine';

interface OutageConfigProps {
  grid: Grid;
  outage: OutageInfo;
  trainingOption: TrainingDataOption;
  allCombinations: ParkCombinationResult[];
  chosenCombination: ParkCombinationResult;
  onUpdateOptions: (
    manualOutage?: { targetPark: string; startIndex: number; endIndex: number },
    trainingOption?: TrainingDataOption,
    manualParks?: string[]
  ) => void;
  isCalculating: boolean;
}

export const OutageConfig: React.FC<OutageConfigProps> = ({
  grid,
  outage,
  trainingOption,
  allCombinations,
  chosenCombination,
  onUpdateOptions,
  isCalculating,
}) => {
  const [startStr, setStartStr] = useState(outage.startDateStr);
  const [endStr, setEndStr] = useState(outage.endDateStr);
  const [selectedPark, setSelectedPark] = useState(outage.targetPark);
  const [activeTraining, setActiveTraining] = useState<TrainingDataOption>(trainingOption);
  const [selectedCombKey, setSelectedCombKey] = useState(chosenCombination.combinationKey);

  const handleApplyOutageChange = () => {
    // Find closest timestamp indices in grid
    const targetPark = selectedPark;
    let sIdx = 0;
    let eIdx = grid.nRows - 1;

    for (let i = 0; i < grid.nRows; i++) {
      if (grid.dateStrings[i] <= startStr) sIdx = i;
      if (grid.dateStrings[i] <= endStr) eIdx = i;
    }

    if (eIdx <= sIdx) {
      alert('End timestamp must be strictly after start timestamp.');
      return;
    }

    const manualParks = allCombinations
      .find((c) => c.combinationKey === selectedCombKey)
      ?.parks;

    onUpdateOptions(
      { targetPark, startIndex: sIdx, endIndex: eIdx },
      activeTraining,
      manualParks
    );
  };

  const handleTrainingChange = (opt: TrainingDataOption) => {
    setActiveTraining(opt);
    const manualParks = allCombinations
      .find((c) => c.combinationKey === selectedCombKey)
      ?.parks;
    onUpdateOptions(undefined, opt, manualParks);
  };

  const handleCombinationChange = (combKey: string) => {
    setSelectedCombKey(combKey);
    const comb = allCombinations.find((c) => c.combinationKey === combKey);
    if (comb) {
      onUpdateOptions(undefined, activeTraining, comb.parks);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center space-x-2">
          <Settings2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
            Outage Period & Training Configuration
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-full">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {outage.durationHours.toFixed(1)} h ({outage.stampsCount} stamps)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Target Park Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            Target Park
          </label>
          <select
            value={selectedPark}
            onChange={(e) => setSelectedPark(e.target.value)}
            disabled={isCalculating}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {grid.parks.map((p) => (
              <option key={p} value={p}>
                Park {p} ({grid.parkTurbinesMap[p].join(', ')})
              </option>
            ))}
          </select>
        </div>

        {/* Start Date-Time */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            Outage Start (Local)
          </label>
          <input
            type="text"
            value={startStr}
            onChange={(e) => setStartStr(e.target.value)}
            disabled={isCalculating}
            placeholder="YYYY-MM-DD HH:MM"
            className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Date-Time */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            Outage End (Inclusive)
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              disabled={isCalculating}
              placeholder="YYYY-MM-DD HH:MM"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleApplyOutageChange}
              disabled={isCalculating}
              className="px-3 py-2 text-xs font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Training Data Radio Option */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
          Training-Data Option
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              activeTraining === 'all_measured'
                ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            <input
              type="radio"
              name="trainingOption"
              value="all_measured"
              checked={activeTraining === 'all_measured'}
              onChange={() => handleTrainingChange('all_measured')}
              disabled={isCalculating}
              className="mt-0.5 text-blue-600"
            />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                All measured data (Recommended)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Trains models on all known stamps before and after the outage.
              </p>
            </div>
          </label>

          <label
            className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              activeTraining === 'before_outage'
                ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            <input
              type="radio"
              name="trainingOption"
              value="before_outage"
              checked={activeTraining === 'before_outage'}
              onChange={() => handleTrainingChange('before_outage')}
              disabled={isCalculating}
              className="mt-0.5 text-blue-600"
            />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Only before the outage
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Trains strictly on historical data prior to outage start.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Reference Park Combinations Table */}
      {allCombinations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Reference Park Selection (Backtested Combinations)
            </label>
            <span className="text-xs text-slate-500">
              Lowest selection score is chosen automatically
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Active</th>
                  <th className="py-2.5 px-3 font-semibold">Combination</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Selection Score</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Mean Wind RMSE</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Windows</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {allCombinations.map((comb) => {
                  const isSelected = comb.combinationKey === selectedCombKey;
                  return (
                    <tr
                      key={comb.combinationKey}
                      onClick={() => handleCombinationChange(comb.combinationKey)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-750/50 cursor-pointer ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="radio"
                          name="parkCombinationRadio"
                          checked={isSelected}
                          onChange={() => handleCombinationChange(comb.combinationKey)}
                          className="text-blue-600"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {comb.combinationKey}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {comb.selectionScore.toFixed(2)} %
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {comb.meanWindRMSE.toFixed(2)} m/s
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {comb.windowsCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {comb.isChosen ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            <Check className="w-3 h-3 mr-1" />
                            Best Score
                          </span>
                        ) : isSelected ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                            User Override
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
