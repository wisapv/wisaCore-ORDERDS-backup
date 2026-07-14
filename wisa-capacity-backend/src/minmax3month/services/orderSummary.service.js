import { getValueByHeader, parseCsvBuffer, parseCsvBufferWithRows, parseHeaderColumns } from './tableParser.service.js';

export const ORDER_SUMMARY_REQUIRED_COLUMNS = [
  'SUPL',
  'PLANT',
  'S.DOCK',
  'COMP',
  'DOCK',
  'FRQ',
  'PART #',
  'KBN Print Address',
  'KBN',
  'QTY /CONT',
  'A BoxLayer ADJ(Box)',
  'BC BoxLayer ADJ(Box)',
  'BoxLayer FLG',
];

const getOrderValue = (row, parsed, headerName, occurrence = 1, fallbackIndex = null) => {
  const value = getValueByHeader(row, parsed.columns, parsed.uniqueColumns, headerName, occurrence);
  if (value !== '' || fallbackIndex === null) return value;
  return row[parsed.uniqueColumns[fallbackIndex]] ?? '';
};

const toNumber = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const removeSpaces = (value) => String(value ?? '').replace(/\s+/g, '');

const buildBoxKey = (row, parsed) => removeSpaces([
  getOrderValue(row, parsed, 'SUPL', 1, 0),
  getOrderValue(row, parsed, 'PLANT', 1, 1),
  getOrderValue(row, parsed, 'S.DOCK', 1, 2),
  getOrderValue(row, parsed, 'DOCK', 1, 5),
  getOrderValue(row, parsed, 'PART #', 1, 11),
  getOrderValue(row, parsed, 'KBN Print Address', 1, 12),
].join(''));

const toFileList = (files) => {
  if (Array.isArray(files)) return files.filter(Boolean);
  return files ? [files] : [];
};

const columnsMatch = (a, b) => a.length === b.length && a.every((column, index) => column === b[index]);

export const parseOrderSummary = (files) => {
  const [file] = toFileList(files);
  return parseCsvBuffer(file.buffer, ORDER_SUMMARY_REQUIRED_COLUMNS);
};

// Order Summary is sometimes exported as multiple files that need to be concatenated (header kept
// from the first file only, data rows from every file). All files must share the exact same header
// row - a mismatch means the files don't belong together, so processing stops immediately rather
// than silently merging incompatible columns.
export const processOrderSummary = ({ files }) => {
  const fileList = toFileList(files);

  if (!fileList.length) {
    return {
      message: 'Order Summary / BoxLayer processing failed',
      errors: ['orderSummary file is required'],
    };
  }

  const first = parseCsvBufferWithRows(fileList[0].buffer, ORDER_SUMMARY_REQUIRED_COLUMNS);
  const expectedColumns = first.columns;
  const parsedFiles = [first];

  for (let fileIndex = 1; fileIndex < fileList.length; fileIndex += 1) {
    const actualColumns = parseHeaderColumns(fileList[fileIndex].buffer);
    if (!columnsMatch(actualColumns, expectedColumns)) {
      return {
        message: 'Order Summary file headers do not match across files',
        errors: [{
          type: 'ORDER_SUMMARY_HEADER_MISMATCH',
          fileIndex,
          expectedColumns,
          actualColumns,
        }],
      };
    }
    parsedFiles.push(parseCsvBufferWithRows(fileList[fileIndex].buffer, ORDER_SUMMARY_REQUIRED_COLUMNS));
  }

  const warnings = first.missingColumns.map((column) => `Order Summary missing required column: ${column}`);
  const groupedRows = new Map();

  parsedFiles.forEach((parsed, fileIndex) => {
    parsed.rows.forEach((row, rowIndex) => {
      const boxKey = buildBoxKey(row, parsed);
      const rawBoxLayer = getOrderValue(row, parsed, 'A BoxLayer ADJ(Box)', 1, 25);
      const numericBoxLayer = toNumber(rawBoxLayer);
      const boxLayerForPivot = numericBoxLayer ?? 0;
      const rowLabel = fileList.length > 1 ? `file ${fileIndex + 1} row ${rowIndex + 1}` : `row ${rowIndex + 1}`;

      if (!boxKey) warnings.push(`Order Summary ${rowLabel} has blank BoxKey source fields`);
      if (numericBoxLayer === null) warnings.push(`Order Summary ${rowLabel} has blank or invalid A BoxLayer ADJ(Box); using 0 for VBA pivot max staging`);

      const existing = groupedRows.get(boxKey);
      if (!existing || boxLayerForPivot > existing.BoxLayer) {
        groupedRows.set(boxKey, {
          BoxKey: boxKey,
          BoxLayer: boxLayerForPivot,
          SUPL: getOrderValue(row, parsed, 'SUPL', 1, 0),
          SupplierPlant: getOrderValue(row, parsed, 'PLANT', 1, 1),
          'S.DOCK': getOrderValue(row, parsed, 'S.DOCK', 1, 2),
          COMP: getOrderValue(row, parsed, 'COMP', 1, 3),
          CompanyPlant: getOrderValue(row, parsed, 'PLANT', 2, 4),
          DOCK: getOrderValue(row, parsed, 'DOCK', 1, 5),
          'PART #': getOrderValue(row, parsed, 'PART #', 1, 11),
          'KBN Print Address': getOrderValue(row, parsed, 'KBN Print Address', 1, 12),
          KBN: getOrderValue(row, parsed, 'KBN', 1, 14),
          'QTY /CONT': getOrderValue(row, parsed, 'QTY /CONT', 1, 15),
          'A BoxLayer ADJ(Box)': rawBoxLayer,
          'BC BoxLayer ADJ(Box)': getOrderValue(row, parsed, 'BC BoxLayer ADJ(Box)', 1, 26),
          'BoxLayer FLG': getOrderValue(row, parsed, 'BoxLayer FLG', 1, 43),
        });
      }
    });
  });

  const rows = [...groupedRows.values()];
  const rawRows = parsedFiles.reduce((sum, parsed) => sum + parsed.rowCount, 0);

  return {
    summary: {
      rawRows,
      outputRows: rows.length,
      filesProcessed: parsedFiles.length,
    },
    rows,
    warnings,
  };
};
