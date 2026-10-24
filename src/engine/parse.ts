/**
 * Parsing and validation of turbine time-series and power-curve files.
 * Supports CSV and XLSX.
 */
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface RawTurbineRow {
  epochMs: number; // local wall-clock epoch, floored to 10 min
  windSpeed: number;
  windDirection: number;
  ambientTemperature: number;
  airPressure: number;
  windSpeedStdDev: number;
  testSet?: boolean; // optional test_set flag
}

export interface ParsedTurbine {
  turbineName: string;
  park: string;
  fileName: string;
  rows: RawTurbineRow[];
}

export interface PowerCurvePoint {
  windSpeed: number;
  power: number; // in kW
}

export interface PowerCurve {
  turbineName: string;
  points: PowerCurvePoint[];
}

export interface ParseResult {
  turbines: ParsedTurbine[];
  powerCurves: PowerCurve[];
  errors: string[];
  warnings: string[];
}

/**
 * Extracts turbine name from file name or provided name.
 * e.g. T1_data.csv -> T1, A2.csv -> A2, T1_power_curve.csv -> T1
 * Letters followed by digits (T1, H3, WP12).
 */
export function extractTurbineName(fileName: string, colTurbineName?: string): { turbineName: string; park: string } {
  let name = '';
  if (colTurbineName && colTurbineName.trim().length > 0) {
    name = colTurbineName.trim();
  } else {
    // File name up to first _, -, . or space
    const base = fileName.split(/[/\\]/).pop() || fileName;
    const matchPrefix = base.match(/^([A-Za-z0-9]+?)(?:[_\-\.\s]|$)/);
    name = matchPrefix ? matchPrefix[1] : base;
  }

  const match = name.match(/^([A-Za-z]+)(\d+)$/);
  if (match) {
    const park = match[1].toUpperCase();
    const cleanName = park + match[2];
    return { turbineName: cleanName, park };
  }

  // Fallback if not strictly letters + digits
  const letters = name.match(/^[A-Za-z]+/)?.[0].toUpperCase() || 'UNKNOWN';
  return { turbineName: name.toUpperCase(), park: letters };
}

/**
 * Decides CSV delimiter by header line (; , TAB).
 */
export function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;

  if (semicolons >= commas && semicolons >= tabs && semicolons > 0) return ';';
  if (tabs >= commas && tabs >= semicolons && tabs > 0) return '\t';
  return ',';
}

/**
 * Parses a floating point number, handling decimal comma (e.g. 5,3 -> 5.3).
 * Anything unreadable becomes NaN, never 0.
 */
export function parseNumber(val: unknown): number {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return Number.isNaN(val) ? NaN : val;

  const str = String(val).trim();
  if (str === '' || str.toLowerCase() === 'nan' || str.toLowerCase() === 'null') {
    return NaN;
  }

  // Replace comma with dot
  const normalized = str.replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? NaN : num;
}

/**
 * Parses timestamp into local wall-clock milliseconds.
 * Day-first is used when dayFirst is true.
 */
export function parseTimestamp(val: unknown, dayFirst: boolean): number {
  if (val === null || val === undefined) return NaN;

  if (typeof val === 'number') {
    // Excel serial date (days since 1899-12-30)
    if (val > 1000 && val < 100000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      return Math.round(excelEpoch + val * 86400 * 1000);
    }
  }

  const str = String(val).trim();
  if (!str) return NaN;

  // Check if string is a numeric Excel serial
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 1000 && num < 100000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      return Math.round(excelEpoch + num * 86400 * 1000);
    }
  }

  // Regex for Day-first: DD.MM.YYYY or DD/MM/YYYY
  const dayFirstMatch = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  // Regex for ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);

  let year = NaN, month = NaN, day = NaN, hour = 0, minute = 0, second = 0;

  if (dayFirst && dayFirstMatch) {
    day = parseInt(dayFirstMatch[1], 10);
    month = parseInt(dayFirstMatch[2], 10);
    let y = parseInt(dayFirstMatch[3], 10);
    if (y < 100) y += 2000;
    year = y;
    hour = dayFirstMatch[4] ? parseInt(dayFirstMatch[4], 10) : 0;
    minute = dayFirstMatch[5] ? parseInt(dayFirstMatch[5], 10) : 0;
    second = dayFirstMatch[6] ? parseInt(dayFirstMatch[6], 10) : 0;
  } else if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
    hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    minute = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    second = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
  } else if (dayFirstMatch) {
    day = parseInt(dayFirstMatch[1], 10);
    month = parseInt(dayFirstMatch[2], 10);
    let y = parseInt(dayFirstMatch[3], 10);
    if (y < 100) y += 2000;
    year = y;
    hour = dayFirstMatch[4] ? parseInt(dayFirstMatch[4], 10) : 0;
    minute = dayFirstMatch[5] ? parseInt(dayFirstMatch[5], 10) : 0;
    second = dayFirstMatch[6] ? parseInt(dayFirstMatch[6], 10) : 0;
  } else {
    // Fallback standard parse
    const parsed = Date.parse(str);
    if (!Number.isNaN(parsed)) return parsed;
    return NaN;
  }

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return NaN;
  if (month < 1 || month > 12 || day < 1 || day > 31) return NaN;

  return Date.UTC(year, month - 1, day, hour, minute, second);
}

/**
 * Normalizes header string for robust matching.
 */
function cleanHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_]+/g, '');
}

/**
 * Parses turbine time-series content.
 */
export function parseTurbineContent(
  content: string | ArrayBuffer,
  fileName: string
): { turbine?: ParsedTurbine; error?: string } {
  let table: string[][] = [];

  if (typeof content === 'string') {
    // Detect delimiter from first non-empty line
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return { error: `File ${fileName} is empty.` };
    }
    const delimiter = detectDelimiter(lines[0]);
    const parsed = Papa.parse<string[]>(content, {
      delimiter,
      skipEmptyLines: true,
    });
    table = parsed.data;
  } else {
    // Excel file
    const workbook = XLSX.read(content, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    table = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });
  }

  if (table.length < 2) {
    return { error: `File ${fileName} has no data rows.` };
  }

  const rawHeaders = table[0].map((h) => String(h || '').trim());
  const cleanedHeaders = rawHeaders.map(cleanHeader);

  // Column index identification
  let timestampCol = -1;
  let windSpeedCol = -1;
  let windDirCol = -1;
  let tempCol = -1;
  let pressureCol = -1;
  let stdDevCol = -1;
  let turbineNameCol = -1;
  let testSetCol = -1;

  for (let c = 0; c < cleanedHeaders.length; c++) {
    const h = cleanedHeaders[c];
    const raw = rawHeaders[c].toLowerCase();

    // Timestamp
    if (timestampCol === -1) {
      if (h === 'timestamp' || h === 'time' || h === 'datetime' || h === 'date') {
        timestampCol = c;
      }
    }

    // Wind Speed
    if (windSpeedCol === -1) {
      if (
        h === 'windspeed' ||
        h === 'ws' ||
        h === 'speed' ||
        raw.includes('wind speed') ||
        raw.includes('windspeed') ||
        raw.includes('wind_speed')
      ) {
        windSpeedCol = c;
      }
    }

    // Wind Direction
    if (windDirCol === -1) {
      if (
        h === 'winddirection' ||
        h === 'direction' ||
        h === 'wd' ||
        h === 'dir' ||
        raw.includes('direction') ||
        raw.includes('wind_direction')
      ) {
        windDirCol = c;
      }
    }

    // Temperature
    if (tempCol === -1) {
      if (
        h === 'ambienttemperature' ||
        h === 'temperature' ||
        h === 'temp' ||
        h === 'tamb' ||
        h === 'ambienttemp' ||
        raw.includes('temp')
      ) {
        tempCol = c;
      }
    }

    // Pressure
    if (pressureCol === -1) {
      if (
        h === 'airpressure' ||
        h === 'pressure' ||
        h === 'press' ||
        h === 'pamb' ||
        h === 'baro' ||
        raw.includes('press')
      ) {
        pressureCol = c;
      }
    }

    // StdDev
    if (stdDevCol === -1) {
      if (
        h === 'windspeedstddev' ||
        h === 'stddev' ||
        h === 'wsstd' ||
        h === 'windspeedsd' ||
        raw.includes('std') ||
        raw.includes('sd')
      ) {
        stdDevCol = c;
      }
    }

    // Turbine Name
    if (turbineNameCol === -1) {
      if (h === 'turbinename' || h === 'turbine' || h === 'turb') {
        turbineNameCol = c;
      }
    }

    // Optional test_set flag column (values true/false, True/False, 1/0, yes/no)
    if (testSetCol === -1) {
      if (
        h === 'testset' ||
        h === 'test_set' ||
        h === 'test' ||
        raw.includes('test_set') ||
        raw.includes('test set')
      ) {
        testSetCol = c;
      }
    }
  }

  if (timestampCol === -1) {
    return { error: `File ${fileName}: missing required 'timestamp' column.` };
  }
  if (windSpeedCol === -1) {
    return { error: `File ${fileName}: missing required 'wind_speed' column.` };
  }

  // Detect day-first timestamps
  let dayFirstCount = 0;
  let sampledTimestamps = 0;
  const sampleLimit = Math.min(table.length, 100);
  for (let r = 1; r < sampleLimit; r++) {
    const val = String(table[r][timestampCol] || '').trim();
    if (val) {
      sampledTimestamps++;
      if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(val)) {
        dayFirstCount++;
      }
    }
  }
  const isDayFirst = sampledTimestamps > 0 && dayFirstCount / sampledTimestamps > 0.5;

  let firstTurbineName = '';
  if (turbineNameCol !== -1 && table.length > 1) {
    firstTurbineName = String(table[1][turbineNameCol] || '').trim();
  }
  const { turbineName, park } = extractTurbineName(fileName, firstTurbineName);

  let unreadableTimestamps = 0;
  let readableWindSpeeds = 0;
  const dataRowCount = table.length - 1;

  const parseTestSetVal = (val: unknown): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    const s = String(val).trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  };

  // Group by floored 10-minute epoch to handle duplicates / DST averaging
  const groupedRows = new Map<
    number,
    {
      wsList: number[];
      wdList: number[];
      tempList: number[];
      pressList: number[];
      stdList: number[];
      testSet: boolean;
    }
  >();

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawTs = row[timestampCol];
    const epochMs = parseTimestamp(rawTs, isDayFirst);

    if (Number.isNaN(epochMs)) {
      unreadableTimestamps++;
      continue;
    }

    // Floor to 10 minutes (600,000 ms)
    const floored10m = Math.floor(epochMs / 600000) * 600000;

    const ws = windSpeedCol !== -1 ? parseNumber(row[windSpeedCol]) : NaN;
    if (!Number.isNaN(ws)) readableWindSpeeds++;

    const wd = windDirCol !== -1 ? parseNumber(row[windDirCol]) : NaN;
    const temp = tempCol !== -1 ? parseNumber(row[tempCol]) : NaN;
    const press = pressureCol !== -1 ? parseNumber(row[pressureCol]) : NaN;
    const std = stdDevCol !== -1 ? parseNumber(row[stdDevCol]) : NaN;
    const isTest = testSetCol !== -1 ? parseTestSetVal(row[testSetCol]) : false;

    let group = groupedRows.get(floored10m);
    if (!group) {
      group = { wsList: [], wdList: [], tempList: [], pressList: [], stdList: [], testSet: false };
      groupedRows.set(floored10m, group);
    }

    if (!Number.isNaN(ws)) group.wsList.push(ws);
    if (!Number.isNaN(wd)) group.wdList.push(wd);
    if (!Number.isNaN(temp)) group.tempList.push(temp);
    if (!Number.isNaN(press)) group.pressList.push(press);
    if (!Number.isNaN(std)) group.stdList.push(std);
    if (isTest) group.testSet = true;
  }

  if (dataRowCount > 0 && unreadableTimestamps / dataRowCount > 0.2) {
    return {
      error: `File ${fileName}: more than 20% (${Math.round((unreadableTimestamps / dataRowCount) * 100)}%) of timestamps could not be read.`,
    };
  }

  if (dataRowCount > 0 && readableWindSpeeds / dataRowCount < 0.05) {
    return {
      error: `File ${fileName}: wind speed column has less than 5% (${Math.round((readableWindSpeeds / dataRowCount) * 100)}%) readable numbers.`,
    };
  }

  // Create averaged rows sorted by time
  const sortedEpochs = Array.from(groupedRows.keys()).sort((a, b) => a - b);
  const rows: RawTurbineRow[] = [];

  const avgList = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN);

  // Circular mean for wind direction in degrees
  const circularMeanDeg = (arr: number[]) => {
    if (arr.length === 0) return NaN;
    let sumSin = 0;
    let sumCos = 0;
    for (const deg of arr) {
      const rad = (deg * Math.PI) / 180;
      sumSin += Math.sin(rad);
      sumCos += Math.cos(rad);
    }
    const thetaRad = Math.atan2(sumSin / arr.length, sumCos / arr.length);
    let deg = (thetaRad * 180) / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    return deg;
  };

  for (const epoch of sortedEpochs) {
    const g = groupedRows.get(epoch)!;
    rows.push({
      epochMs: epoch,
      windSpeed: avgList(g.wsList),
      windDirection: circularMeanDeg(g.wdList),
      ambientTemperature: avgList(g.tempList),
      airPressure: avgList(g.pressList),
      windSpeedStdDev: avgList(g.stdList),
      testSet: g.testSet,
    });
  }

  return {
    turbine: {
      turbineName,
      park,
      fileName,
      rows,
    },
  };
}

/**
 * Parses a power curve file.
 * File name decides the target turbine (e.g. T1_power_curve.csv -> T1).
 * Columns: wind speed and power (in kW).
 * Sorted by wind speed.
 */
export function parsePowerCurveContent(
  content: string | ArrayBuffer,
  fileName: string
): { powerCurve?: PowerCurve; error?: string } {
  let table: string[][] = [];

  if (typeof content === 'string') {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { error: `Power curve file ${fileName} is empty.` };
    const delimiter = detectDelimiter(lines[0]);
    const parsed = Papa.parse<string[]>(content, { delimiter, skipEmptyLines: true });
    table = parsed.data;
  } else {
    const workbook = XLSX.read(content, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    table = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });
  }

  if (table.length < 2) {
    return { error: `Power curve file ${fileName} has no data rows.` };
  }

  const rawHeaders = table[0].map((h) => String(h || '').trim());
  const cleanedHeaders = rawHeaders.map(cleanHeader);

  let wsCol = -1;
  let powerCol = -1;

  for (let c = 0; c < cleanedHeaders.length; c++) {
    const h = cleanedHeaders[c];
    const raw = rawHeaders[c].toLowerCase();

    if (wsCol === -1 && (h.includes('wind') || h.includes('speed') || raw.includes('wind') || raw.includes('speed'))) {
      wsCol = c;
    }

    if (
      powerCol === -1 &&
      (raw.startsWith('power') ||
        raw.endsWith('kw') ||
        h.startsWith('power') ||
        h.endsWith('kw') ||
        h === 'power' ||
        h === 'p')
    ) {
      powerCol = c;
    }
  }

  if (wsCol === -1) {
    return { error: `Power curve ${fileName}: could not identify wind speed column.` };
  }
  if (powerCol === -1) {
    return { error: `Power curve ${fileName}: could not identify power column.` };
  }

  const { turbineName } = extractTurbineName(fileName);
  const points: PowerCurvePoint[] = [];

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const ws = parseNumber(row[wsCol]);
    const power = parseNumber(row[powerCol]);

    if (!Number.isNaN(ws) && !Number.isNaN(power)) {
      points.push({ windSpeed: ws, power });
    }
  }

  if (points.length === 0) {
    return { error: `Power curve ${fileName} contains no valid (wind_speed, power) rows.` };
  }

  // Sort ascending by wind speed
  points.sort((a, b) => a.windSpeed - b.windSpeed);

  return {
    powerCurve: {
      turbineName,
      points,
    },
  };
}
