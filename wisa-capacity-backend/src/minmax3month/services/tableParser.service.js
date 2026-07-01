const normalizeCell = (value) => String(value ?? '').replace(/^\uFEFF/, '').trim();

const splitRows = (text) => text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');

const detectDelimiter = (line) => {
  const delimiters = [',', '\t', '|', ';'];
  return delimiters.reduce((best, delimiter) => {
    const count = line.split(delimiter).length;
    return count > best.count ? { delimiter, count } : best;
  }, { delimiter: ',', count: 0 }).delimiter;
};

const parseDelimitedLine = (line, delimiter) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(normalizeCell(current));
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(normalizeCell(current));
  return cells;
};

const buildUniqueColumns = (columns) => {
  const counts = new Map();
  return columns.map((column, index) => {
    const fallbackColumn = column || `Column ${index + 1}`;
    const count = (counts.get(fallbackColumn) ?? 0) + 1;
    counts.set(fallbackColumn, count);
    return count === 1 ? fallbackColumn : `${fallbackColumn}__${count}`;
  });
};

const rowsToObjects = (uniqueColumns, rows) => rows.map((row) => {
  return uniqueColumns.reduce((parsedRow, column, index) => {
    parsedRow[column] = row[index] ?? '';
    return parsedRow;
  }, {});
});

const rowsToPreview = (uniqueColumns, rows) => rowsToObjects(uniqueColumns, rows.slice(0, 5));

const findMissingColumns = (columns, requiredColumns) => {
  const availableColumns = new Set(columns.map((column) => column.trim()));
  return requiredColumns.filter((column) => !availableColumns.has(column));
};

export const getValueByHeader = (row, columns, uniqueColumns, headerName, occurrence = 1) => {
  let currentOccurrence = 0;
  const targetHeader = String(headerName).trim();
  const columnIndex = columns.findIndex((column) => {
    if (String(column).trim() !== targetHeader) return false;
    currentOccurrence += 1;
    return currentOccurrence === occurrence;
  });

  if (columnIndex === -1) return '';
  return row[uniqueColumns[columnIndex]] ?? '';
};

export const parseCsvBufferWithRows = (buffer, requiredColumns = []) => {
  const text = buffer.toString('utf8');
  const lines = splitRows(text);

  if (!lines.length) {
    return {
      rowCount: 0,
      columns: [],
      uniqueColumns: [],
      missingColumns: requiredColumns,
      rows: [],
      previewRows: [],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const parsedRows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const columns = parsedRows[0].map(normalizeCell);
  const uniqueColumns = buildUniqueColumns(columns);
  const dataRows = parsedRows.slice(1).filter((row) => row.some((cell) => normalizeCell(cell) !== ''));
  const rows = rowsToObjects(uniqueColumns, dataRows);

  return {
    rowCount: dataRows.length,
    columns,
    uniqueColumns,
    missingColumns: findMissingColumns(columns, requiredColumns),
    rows,
    previewRows: rows.slice(0, 5),
  };
};

export const parseCsvBuffer = (buffer, requiredColumns = []) => {
  const { rows: _rows, ...result } = parseCsvBufferWithRows(buffer, requiredColumns);
  return result;
};

export const sheetRowsToPreview = (rows) => {
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeCell(cell) !== ''));

  if (headerIndex === -1) {
    return {
      rowCount: 0,
      columns: [],
      uniqueColumns: [],
      previewRows: [],
    };
  }

  const columns = rows[headerIndex].map(normalizeCell);
  const uniqueColumns = buildUniqueColumns(columns);
  const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => normalizeCell(cell) !== ''));

  return {
    rowCount: dataRows.length,
    columns,
    uniqueColumns,
    previewRows: rowsToPreview(uniqueColumns, dataRows),
  };
};
