import { getValueByHeader, parseCsvBuffer, parseCsvBufferWithRows } from './tableParser.service.js';

export const ADDRESS_MASTER_REQUIRED_COLUMNS = [
  'SUPL',
  'PLANT',
  'COMP',
  'DOCK',
  'PART #',
  'KBN',
  'T/C FROM(UNL)',
  'T/C TO (UNL)',
  'Kanban Print Address',
  'Lineside Address',
  'Conveyance Route(External)',
  'Depth',
  'Distribution Ratio',
  'Conveyance Route(Internal)',
];

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

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTargetDocks = (targetDocks) => {
  if (!targetDocks) return ['S1', 'S4', 'SH'];
  if (Array.isArray(targetDocks)) return targetDocks.map((dock) => String(dock).trim()).filter(Boolean);
  const normalized = String(targetDocks).split(',').map((dock) => dock.trim()).filter(Boolean);
  return normalized.length ? normalized : ['S1', 'S4', 'SH'];
};

export const normalizeTargetMonthEnd = (targetMonth) => {
  const value = String(targetMonth ?? '').trim();
  const compact = value.replace(/[-/\s]/g, '');

  if (/^\d{6}$/.test(compact)) return Number(`${compact}31`);

  const yearMonthMatch = value.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonthMatch) {
    const [, year, month] = yearMonthMatch;
    return Number(`${year}${month.padStart(2, '0')}31`);
  }

  const monthNameMatch = value.match(/^([A-Za-z]{3,})[-/\s]?(\d{2}|\d{4})$/);
  if (monthNameMatch) {
    const [, monthName, rawYear] = monthNameMatch;
    const month = MONTHS[monthName.slice(0, 3).toLowerCase()];
    if (month) {
      const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
      return Number(`${year}${month}31`);
    }
  }

  return null;
};


const parseDataCal = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const compact = raw.replace(/[-/\s]/g, '');
  if (/^\d{8}$/.test(compact)) return compact.slice(0, 6);
  if (/^\d{6}$/.test(compact)) return compact;

  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month] = isoMatch;
    return `${year}${month.padStart(2, '0')}`;
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

export const normalizeTargetMonthCal = (targetMonth) => {
  const targetMonthEnd = normalizeTargetMonthEnd(targetMonth);
  return targetMonthEnd ? String(targetMonthEnd).slice(0, 6) : null;
};

const getAddressMasterDataCalValue = (parsed) => {
  const updateDateIndex = parsed.columns.findIndex((column) => String(column).trim().toUpperCase() === 'UPDATE DATE TIME');
  const columnIndex = updateDateIndex === -1 ? 22 : updateDateIndex;
  return parsed.rows[0]?.[parsed.uniqueColumns[columnIndex]] ?? null;
};

const getAddressValue = (row, parsed, headerName, occurrence = 1) => {
  return getValueByHeader(row, parsed.columns, parsed.uniqueColumns, headerName, occurrence);
};

const buildAddrKey = (row, parsed) => `${getAddressValue(row, parsed, 'SUPL')}${getAddressValue(row, parsed, 'PLANT', 1)}${getAddressValue(row, parsed, 'DOCK')}${getAddressValue(row, parsed, 'PART #')}`;

const excelRoundUp = (value, decimals = 2) => {
  if (!Number.isFinite(value) || value < 0) return null;
  const factor = 10 ** decimals;
  return Math.ceil((value * factor) - Number.EPSILON) / factor;
};

export const parseAddressMaster = (file) => parseCsvBuffer(file.buffer, ADDRESS_MASTER_REQUIRED_COLUMNS);

export const processAddressMaster = ({ file, targetMonth, targetDocks }) => {
  const targetMonthEnd = normalizeTargetMonthEnd(targetMonth);
  const targetCal = normalizeTargetMonthCal(targetMonth);
  if (!targetMonthEnd || !targetCal) {
    return {
      errors: ['targetMonth must be May-26, 2026-05, or 202605 format'],
    };
  }

  const parsed = parseCsvBufferWithRows(file.buffer, ADDRESS_MASTER_REQUIRED_COLUMNS);
  const dataCalValue = getAddressMasterDataCalValue(parsed);
  const dataCal = parseDataCal(dataCalValue);

  if (!dataCal) {
    return {
      message: 'AddressMaster data month could not be parsed',
      errors: [{
        type: 'DATA_MONTH_PARSE_ERROR',
        file: 'AddressMaster',
        targetCal,
        value: dataCalValue ?? null,
      }],
    };
  }

  if (dataCal !== targetCal) {
    return {
      message: 'AddressMaster data month does not match target month',
      errors: [{
        type: 'DATA_MONTH_MISMATCH',
        file: 'AddressMaster',
        targetCal,
        dataCal,
      }],
    };
  }
  const warnings = parsed.missingColumns.map((column) => `AddressMaster missing required column: ${column}`);
  const docks = normalizeTargetDocks(targetDocks);
  const dockSet = new Set(docks);
  const rawRows = parsed.rowCount;
  const effectiveRows = parsed.rows.filter((row) => {
    const fromDate = toNumber(getAddressValue(row, parsed, 'T/C FROM(UNL)'));
    const toDate = toNumber(getAddressValue(row, parsed, 'T/C TO (UNL)'));
    return fromDate !== null && toDate !== null && fromDate <= targetMonthEnd && toDate >= targetMonthEnd;
  });
  const targetDockRows = effectiveRows.filter((row) => dockSet.has(String(getAddressValue(row, parsed, 'DOCK') ?? '').trim()));
  const addrNoByKey = new Map();
  const totalRatioByGroup = new Map();

  targetDockRows.forEach((row) => {
    const addrKey = buildAddrKey(row, parsed);
    addrNoByKey.set(addrKey, (addrNoByKey.get(addrKey) ?? 0) + 1);

    const groupKey = `${addrKey}||${getAddressValue(row, parsed, 'PART #') ?? ''}||${getAddressValue(row, parsed, 'DOCK') ?? ''}`;
    const ratio = toNumber(getAddressValue(row, parsed, 'Distribution Ratio'));
    totalRatioByGroup.set(groupKey, (totalRatioByGroup.get(groupKey) ?? 0) + (ratio ?? 0));
  });

  const rows = targetDockRows.map((row, index) => {
    const addrKey = buildAddrKey(row, parsed);
    const groupKey = `${addrKey}||${getAddressValue(row, parsed, 'PART #') ?? ''}||${getAddressValue(row, parsed, 'DOCK') ?? ''}`;
    const distributionRatio = toNumber(getAddressValue(row, parsed, 'Distribution Ratio'));
    const totalRatio = totalRatioByGroup.get(groupKey) ?? 0;
    let useThisDistributionRatio = null;

    if (distributionRatio === null || totalRatio === 0) {
      warnings.push(`AddressMaster row ${index + 1} has blank Distribution Ratio or zero TotalRatio`);
    } else {
      useThisDistributionRatio = excelRoundUp(distributionRatio / totalRatio, 2);
    }

    return {
      AddrKey: addrKey,
      AddrNo: addrNoByKey.get(addrKey) ?? 0,
      SUPL: getAddressValue(row, parsed, 'SUPL'),
      PLANT: getAddressValue(row, parsed, 'PLANT', 1),
      COMP: getAddressValue(row, parsed, 'COMP'),
      DOCK: getAddressValue(row, parsed, 'DOCK'),
      'PART #': getAddressValue(row, parsed, 'PART #'),
      KBN: getAddressValue(row, parsed, 'KBN'),
      'Kanban Print Address': getAddressValue(row, parsed, 'Kanban Print Address'),
      'Lineside Address': getAddressValue(row, parsed, 'Lineside Address'),
      'Conveyance Route(External)': getAddressValue(row, parsed, 'Conveyance Route(External)'),
      Depth: getAddressValue(row, parsed, 'Depth'),
      'Distribution Ratio': distributionRatio,
      TotalRatio: totalRatio,
      UseThisDistributionRatio: useThisDistributionRatio,
      'Conveyance Route(Internal)': getAddressValue(row, parsed, 'Conveyance Route(Internal)'),
    };
  });

  return {
    summary: {
      rawRows,
      effectiveRows: effectiveRows.length,
      targetDockRows: targetDockRows.length,
      outputRows: rows.length,
      targetMonthEnd,
      targetDocks: docks,
    },
    rows,
    warnings,
  };
};
