import { describe, it, expect } from 'vitest';
import { EngineResult } from '../index';
import { densityAvailable, applyDensityView } from '../../utils/view';
import {
  generatePredictionsWideCSV,
  generateFullPeriodCSV,
  generateSummaryCSV,
  generateClaimEmail,
} from '../../utils/export';

describe('Air Density View and Exports', () => {
  const mockResult: EngineResult = {
    grid: {
      nRows: 4,
      timestamps: new Float64Array([1, 2, 3, 4]),
      dateStrings: [
        '2026-09-01 00:00',
        '2026-09-01 00:10',
        '2026-09-01 00:20',
        '2026-09-01 00:30',
      ],
      turbines: ['T1', 'H1'],
      parks: ['T', 'H'],
      turbineParkMap: { T1: 'T', H1: 'H' },
      parkTurbinesMap: { T: ['T1'], H: ['H1'] },
      windSpeed: {
        T1: new Float64Array([NaN, NaN, 5.0, 5.5]),
        H1: new Float64Array([6.0, 6.2, 6.1, 6.3]),
      },
      windDirection: {
        T1: new Float64Array([NaN, NaN, 250, 255]),
        H1: new Float64Array([260, 262, 261, 263]),
      },
      ambientTemperature: {},
      airPressure: {},
      windSpeedStdDev: {},
    },
    outage: {
      targetPark: 'T',
      targetTurbines: ['T1'],
      startIndex: 0,
      endIndex: 1,
      startTimestamp: 1,
      endTimestamp: 2,
      startDateStr: '2026-09-01 00:00',
      endDateStr: '2026-09-01 00:10',
      durationHours: 0.33,
      stampsCount: 2,
    },
    screening: {
      screenings: [],
      usedTurbines: ['H1'],
      usedParks: ['H'],
      parkMeans: {},
      targetParkMean: new Float64Array(0),
      directionResult: {
        hasDirections: true,
        sectors: new Float64Array(0),
        referenceDirections: new Float64Array(0),
        oneSectorForAllDirections: false,
      },
      correlationAnalysis: {
        targetTurbines: ['T1'],
        rows: [],
        singleNeighbourMinR: 0,
        singleNeighbourMaxR: 0,
      },
    },
    allCombinations: [],
    chosenCombination: {
      combinationKey: 'H',
      parks: ['H'],
      selectionScore: 10.0,
      meanWindRMSE: 1.0,
      windowsCount: 5,
      isChosen: true,
      windows: [],
      turbineMedians: { T1: 10.0 },
      turbineDeltaEArrays: {},
      parkDeltaEArray: [],
    },
    report: {
      targetPark: 'T',
      targetTurbines: ['T1'],
      chosenParks: ['H'],
      trainingOption: 'all_measured',
      turbines: {
        T1: {
          turbineName: 'T1',
          model: {} as any,
          predictedWindOutage: new Float64Array([8.0, 8.5]),
          expectedPowerOutage: new Float64Array([1000, 1200]),
          energyKWh: 366.67,
          d10: -10,
          d50: 0,
          d90: 10,
          range80LowerKWh: 333.33,
          range80UpperKWh: 407.41,
          densityPowerOutage: new Float64Array([980, 1180]),
          densityEnergyKWh: 360.0,
          densityRange80LowerKWh: 327.27,
          densityRange80UpperKWh: 400.0,
        },
      },
      parkEnergyKWh: 366.67,
      park_d10: -10,
      park_d50: 0,
      park_d90: 10,
      parkRange80LowerKWh: 333.33,
      parkRange80UpperKWh: 407.41,
      airDensity: {
        isApplicable: true,
        referenceParkUsed: 'H',
        deltaP_hPa: 1.2,
        meanRhoOutage: 1.198,
        correctedParkEnergyKWh: 360.0,
        sensitivityPercent: -1.82,
        rhoOutage: new Float64Array([1.198, 1.198]),
        correctedParkRange80LowerKWh: 327.27,
        correctedParkRange80UpperKWh: 400.0,
      },
      outageDates: ['2026-09-01 00:00', '2026-09-01 00:10'],
      outageTimestamps: new Float64Array([1, 2]),
    },
    errors: [],
    warnings: [],
  };

  it('detects density availability correctly', () => {
    expect(densityAvailable(mockResult)).toBe(true);
    expect(densityAvailable(null)).toBe(false);
  });

  it('applies density view replacing turbine and park headline numbers', () => {
    const viewStandard = applyDensityView(mockResult, false);
    expect(viewStandard?.densityApplied).toBe(false);
    expect(viewStandard?.report.parkEnergyKWh).toBe(366.67);
    expect(viewStandard?.report.turbines['T1'].energyKWh).toBe(366.67);

    const viewDensity = applyDensityView(mockResult, true);
    expect(viewDensity?.densityApplied).toBe(true);
    expect(viewDensity?.report.parkEnergyKWh).toBe(360.0);
    expect(viewDensity?.report.turbines['T1'].energyKWh).toBe(360.0);
    expect(viewDensity?.report.parkRange80LowerKWh).toBe(327.27);
    expect(viewDensity?.report.turbines['T1'].expectedPowerOutage[0]).toBe(980);

    // Engine result remains unchanged
    expect(mockResult.report.parkEnergyKWh).toBe(366.67);
  });

  it('generates wide predictions CSV with all columns', () => {
    const csv = generatePredictionsWideCSV(mockResult);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('timestamp,T1_wind_speed_pred,T1_power_pred_kw,park_power_pred_kw');
    expect(lines.length).toBe(3); // header + 2 stamps
  });

  it('generates full period CSV with in_outage flag', () => {
    const csv = generateFullPeriodCSV(mockResult);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'timestamp,turbine,wind_speed_measured,wind_speed_pred,power_pred_kw,in_outage'
    );
    expect(lines.length).toBe(5); // 1 turbine * 4 grid rows + header
    // Row 1 (in outage): in_outage = 1, pred exists
    expect(lines[1]).toContain(',1');
    // Row 3 (outside outage): in_outage = 0, measured exists
    expect(lines[3]).toContain(',5.0000,,,0');
  });

  it('generates summary CSV with power_curve_basis column', () => {
    const viewDensity = applyDensityView(mockResult, true)!;
    const csv = generateSummaryCSV(viewDensity);
    expect(csv).toContain('power_curve_basis');
    expect(csv).toContain('site_air_density');

    const csvStd = generateSummaryCSV(mockResult);
    expect(csvStd).toContain('standard_air_density');
  });

  it('generates claim email with density applied sentence', () => {
    const viewDensity = applyDensityView(mockResult, true)!;
    const email = generateClaimEmail(viewDensity);
    expect(email).toContain('Air density: the estimate takes the site air density into account');
    expect(email).toContain('temperature and pressure of park H');
  });
});
