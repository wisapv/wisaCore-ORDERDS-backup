import { getValueByHeader, parseCsvBuffer, parseCsvBufferWithRows } from './tableParser.service.js';

export const SET_PART_REQUIRED_COLUMNS = [
  'SUPL',
  'PLANT',
  'S.DOCK',
  'COMP',
  'DOCK',
  'Key Part',
  'Depend',
  'T/C FROM(UNL)',
  'T/C TO (UNL)',
];

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const toNumber = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const getSetValue = (row, parsed, headerName, occurrence = 1, fallbackIndex = null) => {
  const value = getValueByHeader(row, parsed.columns, parsed.uniqueColumns, headerName, occurrence);
  if (value !== '' || fallbackIndex === null) return value;
  return row[parsed.uniqueColumns[fallbackIndex]] ?? '';
};

export const normalizeAsOfDate = (asOfDate) => {
  if (!asOfDate) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return Number(`${year}${month}${day}`);
  }

  const raw = String(asOfDate).trim();
  const compact = raw.replace(/[-/\s]/g, '');
  if (/^\d{8}$/.test(compact)) return Number(compact);

  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) return Number(`${isoMatch[1]}${isoMatch[2].padStart(2, '0')}${isoMatch[3].padStart(2, '0')}`);

  const vbaDateMatch = raw.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2}|\d{4})$/);
  if (vbaDateMatch) {
    const month = MONTHS[vbaDateMatch[2].slice(0, 3).toLowerCase()];
    if (month) {
      const year = vbaDateMatch[3].length === 2 ? `20${vbaDateMatch[3]}` : vbaDateMatch[3];
      return Number(`${year}${month}${vbaDateMatch[1].padStart(2, '0')}`);
    }
  }

  return null;
};

export const parseSetPart = (file) => parseCsvBuffer(file.buffer, SET_PART_REQUIRED_COLUMNS);

export const processSetPart = ({ file, asOfDate }) => {
  const normalizedAsOfDate = normalizeAsOfDate(asOfDate);
  if (!normalizedAsOfDate) return { errors: ['asOfDate must be 20251017, 2025-10-17, or 17-OCT-25 format'] };

  const parsed = parseCsvBufferWithRows(file.buffer, SET_PART_REQUIRED_COLUMNS);
  const warnings = parsed.missingColumns.map((column) => `SetPart missing required column: ${column}`);
  const activeRows = parsed.rows.filter((row, index) => {
    const fromDate = toNumber(getSetValue(row, parsed, 'T/C FROM(UNL)', 1, 8));
    const toDate = toNumber(getSetValue(row, parsed, 'T/C TO (UNL)', 1, 9));
    const isActive = fromDate !== null && toDate !== null && fromDate <= normalizedAsOfDate && toDate >= normalizedAsOfDate;
    if (fromDate === null || toDate === null) warnings.push(`SetPart row ${index + 1} has blank or invalid effective date`);
    return isActive;
  });

  const rows = activeRows.flatMap((row) => {
    const common = {
      SUPL: getSetValue(row, parsed, 'SUPL', 1, 0),
      SupplierPlant: getSetValue(row, parsed, 'PLANT', 1, 1),
      'S.DOCK': getSetValue(row, parsed, 'S.DOCK', 1, 2),
      COMP: getSetValue(row, parsed, 'COMP', 1, 3),
      CompanyPlant: getSetValue(row, parsed, 'PLANT', 2, 4),
      DOCK: getSetValue(row, parsed, 'DOCK', 1, 5),
      'Key Part': getSetValue(row, parsed, 'Key Part', 1, 6),
      Depend: getSetValue(row, parsed, 'Depend', 1, 7),
      'T/C FROM(UNL)': getSetValue(row, parsed, 'T/C FROM(UNL)', 1, 8),
      'T/C TO (UNL)': getSetValue(row, parsed, 'T/C TO (UNL)', 1, 9),
      'Update Date Time': getSetValue(row, parsed, 'Update Date Time', 1, 13),
    };

    return [
      { SetKey: `${common.DOCK}${common['Key Part']}`, PType: '1-Key', ...common },
      { SetKey: `${common.DOCK}${common.Depend}`, PType: '2-Set', ...common },
    ];
  });

  return {
    summary: {
      rawRows: parsed.rowCount,
      activeRows: activeRows.length,
      outputRows: rows.length,
      asOfDate: normalizedAsOfDate,
    },
    rows,
    warnings,
  };
};
