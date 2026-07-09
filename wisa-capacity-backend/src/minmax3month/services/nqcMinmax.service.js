import xlsx from 'xlsx';
import { sheetRowsToPreview } from './tableParser.service.js';

const PREFERRED_NQC_SHEET = 'NQC Result transfer';

const REQUIRED_FIELDS = ['Dock', 'PartNo', 'N', 'N1', 'N2', 'N3'];

// Real NQC.xlsx files break N+1 down into a daily forecast (N1Day01..N1Day31, zero-padded,
// exact header match only). These are optional - files without them fall back to the monthly
// average, so they must never be added to REQUIRED_FIELDS.
const N1_DAY_FIELDS = Array.from({ length: 31 }, (_, index) => `N1Day${String(index + 1).padStart(2, '0')}`);

const FIELD_CANDIDATES = {
  Dock: ['Dock', 'DOCK', 'DockCode', 'D Dock', 'D.DOCK'],
  PartNo: ['PartNo', 'Part No', 'PartNo.', 'PART NO', 'PART #', 'Part #', 'Part Number'],
  N: ['N', 'N Demand', 'N Qty', 'N QTY'],
  N1: ['N+1', 'N1', 'N+1 Demand', 'N+1 Qty', 'N+1 QTY'],
  N2: ['N+2', 'N2', 'N+2 Demand', 'N+2 Qty', 'N+2 QTY'],
  N3: ['N+3', 'N3', 'N+3 Demand', 'N+3 Qty', 'N+3 QTY'],
  ...Object.fromEntries(N1_DAY_FIELDS.map((field) => [field, [field]])),
};

const normalizeHeader = (value) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const excelRoundUp = (value, decimals = 0) => {
  if (!Number.isFinite(value) || value < 0) return null;
  const factor = 10 ** decimals;
  return Math.ceil((value * factor) - Number.EPSILON) / factor;
};


const MONTHS = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

const normalizeMonthCal = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const compact = raw.replace(/[-/\s]/g, '');
  if (/^\d{8}$/.test(compact)) return compact.slice(0, 6);
  if (/^\d{6}$/.test(compact)) return compact;

  const yearMonthMatch = raw.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonthMatch) {
    const [, year, month] = yearMonthMatch;
    return `${year}${month.padStart(2, '0')}`;
  }

  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month] = isoMatch;
    return `${year}${month.padStart(2, '0')}`;
  }

  const monthNameMatch = raw.match(/^([A-Za-z]{3,})[-/\s]?(\d{2}|\d{4})$/);
  if (monthNameMatch) {
    const [, monthName, rawYear] = monthNameMatch;
    const month = MONTHS[monthName.slice(0, 3).toLowerCase()];
    if (month) {
      const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
      return `${year}${month}`;
    }
  }

  const vbaDateMatch = raw.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2}|\d{4})$/);
  if (vbaDateMatch) {
    const [, , monthName, rawYear] = vbaDateMatch;
    const month = MONTHS[monthName.slice(0, 3).toLowerCase()];
    if (month) {
      const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
      return `${year}${month}`;
    }
  }

  return null;
};

const readSheetCell = (sheet, address) => sheet[address]?.v ?? sheet[address]?.w ?? null;

const findHeaderIndex = (rows) => rows.findIndex((row) => row.some((cell) => String(cell ?? '').trim() !== ''));

const resolveColumns = (columns) => {
  const normalizedColumns = columns.map(normalizeHeader);
  const resolved = {};
  const missing = [];

  Object.entries(FIELD_CANDIDATES).forEach(([field, candidates]) => {
    const candidateIndex = candidates.findIndex((candidate) => normalizedColumns.includes(normalizeHeader(candidate)));
    if (candidateIndex === -1) {
      if (REQUIRED_FIELDS.includes(field)) missing.push(field);
      return;
    }

    const columnIndex = normalizedColumns.indexOf(normalizeHeader(candidates[candidateIndex]));
    resolved[field] = {
      columnName: columns[columnIndex],
      columnIndex,
    };
  });

  return { resolved, missing };
};

const getCell = (row, resolvedColumn) => row[resolvedColumn.columnIndex] ?? '';

const buildNqcKey = (dock, partNo) => `${dock}${partNo}`.replace(/-/g, '');

const choosePreviewNqcSheet = (workbook) => {
  if (workbook.SheetNames.includes(PREFERRED_NQC_SHEET)) {
    return { sheetName: PREFERRED_NQC_SHEET, warnings: [] };
  }

  return {
    sheetName: workbook.SheetNames[0],
    warnings: ['NQC Result transfer sheet not found. First sheet was used.'],
  };
};

const requireProcessNqcSheet = (workbook) => {
  if (workbook.SheetNames.includes(PREFERRED_NQC_SHEET)) return workbook.Sheets[PREFERRED_NQC_SHEET];
  return null;
};

export const parseNqcMinmax = (file) => {
  const workbook = xlsx.read(file.buffer, { type: 'buffer' });
  const { sheetName } = choosePreviewNqcSheet(workbook);
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  return {
    sheetName,
    ...sheetRowsToPreview(rows),
  };
};

export const processNqc = ({ file, targetMonth, workingDayN1, workingDayN2, workingDayN3 }) => {
  const workbook = xlsx.read(file.buffer, { type: 'buffer' });
  const sheet = requireProcessNqcSheet(workbook);

  if (!sheet) {
    return {
      message: 'Required NQC sheet not found',
      errors: [{
        type: 'MISSING_SHEET',
        file: 'NQC',
        requiredSheet: PREFERRED_NQC_SHEET,
      }],
    };
  }

  const sheetName = PREFERRED_NQC_SHEET;
  const warnings = [];
  const targetCal = normalizeMonthCal(targetMonth);
  const dataCal = normalizeMonthCal(readSheetCell(sheet, 'K2'));

  if (!targetCal) {
    return { errors: ['targetMonth must be May-26, 2026-05, or 202605 format'] };
  }

  if (!dataCal) {
    return {
      message: 'NQC data month could not be parsed',
      errors: [{
        type: 'DATA_MONTH_PARSE_ERROR',
        file: 'NQC',
        targetCal,
        value: readSheetCell(sheet, 'K2'),
      }],
    };
  }

  if (dataCal !== targetCal) {
    return {
      message: 'NQC data month does not match target month',
      errors: [{
        type: 'DATA_MONTH_MISMATCH',
        file: 'NQC',
        targetCal,
        dataCal,
      }],
    };
  }

  const sheetRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headerIndex = findHeaderIndex(sheetRows);

  if (headerIndex === -1) {
    return { errors: ['NQC header row could not be detected'] };
  }

  const columns = sheetRows[headerIndex].map((cell) => String(cell ?? '').trim());
  const { resolved, missing } = resolveColumns(columns);

  if (missing.length) {
    return {
      errors: missing.map((field) => `NQC required logical field could not be resolved: ${field}`),
      warnings,
    };
  }

  const hasN1DayColumns = N1_DAY_FIELDS.some((field) => resolved[field]);
  if (!hasN1DayColumns) {
    warnings.push('N1 daily columns not found, falling back to monthly average');
  }

  const rawRows = sheetRows.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
  const groupedRows = new Map();

  rawRows.forEach((row, index) => {
    const dock = String(getCell(row, resolved.Dock)).trim();
    const partNo = String(getCell(row, resolved.PartNo)).trim();
    const nqcKey = buildNqcKey(dock, partNo);

    if (!dock || !partNo) {
      warnings.push(`NQC row ${index + 1} missing Dock or PartNo`);
      return;
    }

    const demand = {
      N: toNumber(getCell(row, resolved.N)),
      N1: toNumber(getCell(row, resolved.N1)),
      N2: toNumber(getCell(row, resolved.N2)),
      N3: toNumber(getCell(row, resolved.N3)),
    };

    Object.entries(demand).forEach(([field, value]) => {
      if (value === null) warnings.push(`NQC row ${index + 1} has invalid ${field} demand`);
    });

    let invalidN1DayCount = 0;
    const n1DaySums = hasN1DayColumns ? N1_DAY_FIELDS.map((field) => {
      const resolvedField = resolved[field];
      if (!resolvedField) return 0;
      const value = toNumber(getCell(row, resolvedField));
      if (value === null) {
        invalidN1DayCount += 1;
        return 0;
      }
      return value;
    }) : null;

    if (invalidN1DayCount > 0) {
      warnings.push(`NQC row ${index + 1} has ${invalidN1DayCount} invalid N1Day values`);
    }

    const groupKey = `${nqcKey}||${dock}||${partNo}`;
    const current = groupedRows.get(groupKey) ?? {
      NQCKey: nqcKey,
      Dock: dock,
      PartNo: partNo,
      N: 0,
      N1: 0,
      N2: 0,
      N3: 0,
      N1DaySums: hasN1DayColumns ? Array(31).fill(0) : null,
    };

    current.N += demand.N ?? 0;
    current.N1 += demand.N1 ?? 0;
    current.N2 += demand.N2 ?? 0;
    current.N3 += demand.N3 ?? 0;
    if (n1DaySums) n1DaySums.forEach((value, dayIndex) => { current.N1DaySums[dayIndex] += value; });
    groupedRows.set(groupKey, current);
  });

  const rows = [...groupedRows.values()].map(({ N1DaySums, ...row }) => {
    const n1PerDay = N1DaySums ? Math.max(...N1DaySums) : excelRoundUp(row.N1 / workingDayN1, 0);
    const n2PerDay = excelRoundUp(row.N2 / workingDayN2, 0);
    const n3PerDay = excelRoundUp(row.N3 / workingDayN3, 0);

    return {
      ...row,
      N1PerDay: n1PerDay,
      N2PerDay: n2PerDay,
      N3PerDay: n3PerDay,
      MaxNqcPerDay: Math.max(n1PerDay, n2PerDay, n3PerDay),
    };
  });

  return {
    summary: {
      sheetName,
      rawRows: rawRows.length,
      processedRows: rows.length,
      workingDayN1,
      workingDayN2,
      workingDayN3,
    },
    rows,
    warnings,
  };
};
