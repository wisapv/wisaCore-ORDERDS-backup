import { getValueByHeader, parseCsvBuffer, parseCsvBufferWithRows } from './tableParser.service.js';
import { normalizeTargetMonthCal, normalizeTargetMonthEnd } from './addressMaster.service.js';

export const PART_MASTER_REQUIRED_COLUMNS = [
  'SUPL',
  'PLANT',
  'S.DOCK',
  'COMP',
  'DOCK',
  'PART #',
  'T/C FROM(UNL)',
  'T/C TO (UNL)',
  'PART DESC',
  'KBN',
  'QTY /CONT',
  'PC SAFETY',
  'LS SAFTY',
  'Packaging Type',
];

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const normalizeTargetDocks = (targetDocks) => {
  if (!targetDocks) return ['S1', 'S4', 'SH'];
  if (Array.isArray(targetDocks)) return targetDocks.map((dock) => String(dock).trim()).filter(Boolean);
  const normalized = String(targetDocks).split(',').map((dock) => dock.trim()).filter(Boolean);
  return normalized.length ? normalized : ['S1', 'S4', 'SH'];
};

const parseDataCal = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const compact = raw.replace(/[-/\s]/g, '');
  if (/^\d{8}$/.test(compact)) return compact.slice(0, 6);
  if (/^\d{6}$/.test(compact)) return compact;

  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) return `${isoMatch[1]}${isoMatch[2].padStart(2, '0')}`;

  const vbaDateMatch = raw.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2}|\d{4})$/);
  if (vbaDateMatch) {
    const month = MONTHS[vbaDateMatch[2].slice(0, 3).toLowerCase()];
    if (month) return `${vbaDateMatch[3].length === 2 ? `20${vbaDateMatch[3]}` : vbaDateMatch[3]}${month}`;
  }

  return null;
};

const toNumber = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const getPartValue = (row, parsed, headerName, occurrence = 1) => {
  return getValueByHeader(row, parsed.columns, parsed.uniqueColumns, headerName, occurrence);
};

const getPartMasterDataCalValue = (parsed) => {
  const updateDateIndex = parsed.columns.findIndex((column) => String(column).trim().toUpperCase() === 'UPDATE DATE TIME');
  const columnIndex = updateDateIndex === -1 ? 32 : updateDateIndex;
  return parsed.rows[0]?.[parsed.uniqueColumns[columnIndex]] ?? null;
};

const parseNumericField = (row, parsed, warnings, rowNumber, fieldName) => {
  const rawValue = getPartValue(row, parsed, fieldName);
  const numericValue = toNumber(rawValue);
  if (numericValue === null) warnings.push(`PartMaster row ${rowNumber} has blank or invalid ${fieldName}`);
  return numericValue;
};

export const parsePartMaster = (file) => parseCsvBuffer(file.buffer, PART_MASTER_REQUIRED_COLUMNS);

export const processPartMaster = ({ file, targetMonth, targetDocks }) => {
  const targetMonthEnd = normalizeTargetMonthEnd(targetMonth);
  const targetCal = normalizeTargetMonthCal(targetMonth);
  if (!targetMonthEnd || !targetCal) return { errors: ['targetMonth must be May-26, 2026-05, or 202605 format'] };

  const parsed = parseCsvBufferWithRows(file.buffer, PART_MASTER_REQUIRED_COLUMNS);
  const dataCalValue = getPartMasterDataCalValue(parsed);
  const dataCal = parseDataCal(dataCalValue);

  if (!dataCal) {
    return {
      message: 'PartMaster data month could not be parsed',
      errors: [{ type: 'DATA_MONTH_PARSE_ERROR', file: 'PartMaster', value: dataCalValue ?? null }],
    };
  }

  if (dataCal !== targetCal) {
    return {
      message: 'PartMaster data month does not match target month',
      errors: [{ type: 'DATA_MONTH_MISMATCH', file: 'PartMaster', targetCal, dataCal }],
    };
  }

  const warnings = parsed.missingColumns.map((column) => `PartMaster missing required column: ${column}`);
  const docks = normalizeTargetDocks(targetDocks);
  const dockSet = new Set(docks);
  const rawRows = parsed.rowCount;
  const effectiveRows = parsed.rows.filter((row) => {
    const fromDate = toNumber(getPartValue(row, parsed, 'T/C FROM(UNL)'));
    const toDate = toNumber(getPartValue(row, parsed, 'T/C TO (UNL)'));
    return fromDate !== null && toDate !== null && fromDate <= targetMonthEnd && toDate >= targetMonthEnd;
  });
  const targetDockRows = effectiveRows.filter((row) => dockSet.has(String(getPartValue(row, parsed, 'DOCK') ?? '').trim()));

  const rows = targetDockRows.map((row, index) => {
    const partNo = getPartValue(row, parsed, 'PART #');
    const partNoClean = String(partNo ?? '').replace(/-/g, '');
    const dock = getPartValue(row, parsed, 'DOCK');
    const supplierPlant = getPartValue(row, parsed, 'PLANT', 1);
    const companyPlant = getPartValue(row, parsed, 'PLANT', 2);
    const rowNumber = index + 1;

    return {
      PartMasterKey: `${dock}${partNoClean}`,
      SupplierKey: `${getPartValue(row, parsed, 'SUPL')}${supplierPlant}${getPartValue(row, parsed, 'S.DOCK')}${dock}`,
      SUPL: getPartValue(row, parsed, 'SUPL'),
      SupplierPlant: supplierPlant,
      'S.DOCK': getPartValue(row, parsed, 'S.DOCK'),
      COMP: getPartValue(row, parsed, 'COMP'),
      CompanyPlant: companyPlant,
      DOCK: dock,
      'Production Routing': getPartValue(row, parsed, 'Production Routing'),
      'PART #': partNo,
      PartNoClean: partNoClean,
      'PART DESC': getPartValue(row, parsed, 'PART DESC'),
      KBN: getPartValue(row, parsed, 'KBN'),
      'QTY /CONT': parseNumericField(row, parsed, warnings, rowNumber, 'QTY /CONT'),
      'PC DELIV': parseNumericField(row, parsed, warnings, rowNumber, 'PC DELIV'),
      'PC SAFETY': parseNumericField(row, parsed, warnings, rowNumber, 'PC SAFETY'),
      'LS DELIV': parseNumericField(row, parsed, warnings, rowNumber, 'LS DELIV'),
      'LS SAFTY': parseNumericField(row, parsed, warnings, rowNumber, 'LS SAFTY'),
      'Safety(PCS)': getPartValue(row, parsed, 'Safety(PCS)'),
      'Packaging Type': getPartValue(row, parsed, 'Packaging Type'),
      'Part PCS Weight(g)': getPartValue(row, parsed, 'Part PCS Weight(g)'),
      'PACK QTY/CONT': getPartValue(row, parsed, 'PACK QTY/CONT'),
      'Update Date Time': dataCalValue,
    };
  });

  return {
    summary: {
      rawRows,
      effectiveRows: effectiveRows.length,
      targetDockRows: targetDockRows.length,
      outputRows: rows.length,
      targetMonthEnd,
      targetCal,
      dataCal,
      targetDocks: docks,
    },
    rows,
    warnings,
  };
};
