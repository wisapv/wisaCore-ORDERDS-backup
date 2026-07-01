import xlsx from 'xlsx';
import { sheetRowsToPreview } from './tableParser.service.js';

const FIELD_CANDIDATES = {
  SuppCd: ['SuppCd', 'SUPL', 'Supplier'],
  SuppPlantCd: ['SuppPlantCd', 'SupplierPlant', 'PLANT'],
  SuppDockCd: ['SuppDockCd', 'S.DOCK', 'SupplierDock'],
  RcvCompDockCd: ['RcvCompDockCd', 'DOCK', 'RcvDock'],
  CurrentFreq: ['Curr', 'Current', 'CurrentFreq', 'OrderFreq', 'FRQ'],
  NewFreq: ['New', 'Request', 'RequestFreq', 'NewFreq'],
};

const REQUIRED_FIELDS = ['SuppCd', 'SuppPlantCd', 'SuppDockCd', 'RcvCompDockCd', 'CurrentFreq'];

const normalizeHeader = (value) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
const normalizeDock = (value) => String(value ?? '').trim().toUpperCase();
const normalizeTargetDocks = (targetDocks) => {
  if (Array.isArray(targetDocks)) return targetDocks.map(normalizeDock).filter(Boolean);
  if (typeof targetDocks === 'string') return targetDocks.split(',').map(normalizeDock).filter(Boolean);
  return ['S1', 'S4', 'SH'];
};
const toNumber = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveField = (columns, field, warnings, sheetName) => {
  const normalizedColumns = columns.map(normalizeHeader);
  const matches = FIELD_CANDIDATES[field]
    .map((candidate) => ({ candidate, index: normalizedColumns.indexOf(normalizeHeader(candidate)) }))
    .filter((match) => match.index !== -1);

  if (!matches.length) return null;
  if (matches.length > 1) {
    warnings.push(`Freq_LP sheet ${sheetName} has multiple candidate columns for ${field}; using ${matches[0].candidate}`);
  }
  return { columnName: columns[matches[0].index], columnIndex: matches[0].index };
};

const findHeaderIndex = (rows) => rows.findIndex((row) => {
  const normalized = row.map(normalizeHeader);
  return REQUIRED_FIELDS.every((field) => FIELD_CANDIDATES[field].some((candidate) => normalized.includes(normalizeHeader(candidate))));
});

const getCell = (row, resolvedColumn) => resolvedColumn ? row[resolvedColumn.columnIndex] ?? '' : '';
const isTargetSheet = (sheetName) => /\bS[14]\b|\(S[14]\)/i.test(sheetName);
const getSheetDock = (sheetName) => sheetName.toUpperCase().includes('S1') ? 'S1' : sheetName.toUpperCase().includes('S4') ? 'S4' : null;

export const parseFreqLp = (file) => {
  const workbook = xlsx.read(file.buffer, { type: 'buffer' });
  const sheets = workbook.SheetNames.map((sheetName) => {
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    return {
      sheetName,
      ...sheetRowsToPreview(rows),
    };
  });

  return {
    sheetNames: workbook.SheetNames,
    sheets,
  };
};

export const processFreqLp = ({ file, targetDocks }) => {
  const workbook = xlsx.read(file.buffer, { type: 'buffer' });
  const targetDockSet = new Set(normalizeTargetDocks(targetDocks));
  const targetSheets = workbook.SheetNames.filter((sheetName) => {
    const dock = getSheetDock(sheetName);
    return isTargetSheet(sheetName) && dock && targetDockSet.has(dock);
  });

  if (!targetSheets.length) {
    return {
      message: 'Required Freq_LP S1/S4 sheets not found',
      errors: [{
        type: 'MISSING_REQUIRED_FREQ_LP_SHEETS',
        file: 'Freq_LP',
        requiredSheets: ['S1', 'S4'],
      }],
    };
  }

  const warnings = [];
  const rows = [];
  let rawRows = 0;

  targetSheets.forEach((sheetName) => {
    const sheetRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const headerIndex = findHeaderIndex(sheetRows);

    if (headerIndex === -1) {
      warnings.push(`Freq_LP sheet ${sheetName} required header row could not be resolved`);
      return;
    }

    const columns = sheetRows[headerIndex].map((cell) => String(cell ?? '').trim());
    const resolved = Object.fromEntries(Object.keys(FIELD_CANDIDATES).map((field) => [field, resolveField(columns, field, warnings, sheetName)]));
    const missingFields = REQUIRED_FIELDS.filter((field) => !resolved[field]);

    if (missingFields.length) {
      warnings.push(`Freq_LP sheet ${sheetName} missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    const dataRows = sheetRows.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
    rawRows += dataRows.length;

    dataRows.forEach((row, index) => {
      const currentRaw = getCell(row, resolved.CurrentFreq);
      const newRaw = getCell(row, resolved.NewFreq);
      const currentFreq = toNumber(currentRaw);
      const newFreq = toNumber(newRaw);
      let orderFreqForCalculation = null;

      if (newFreq !== null && newFreq > 0) orderFreqForCalculation = newFreq;
      else if (currentFreq !== null && currentFreq > 0) orderFreqForCalculation = currentFreq;
      else warnings.push(`Freq_LP sheet ${sheetName} row ${index + 1} has no valid current or new frequency`);

      if (currentRaw !== '' && currentFreq === null) warnings.push(`Freq_LP sheet ${sheetName} row ${index + 1} has invalid CurrentFreq`);
      if (newRaw !== '' && newFreq === null) warnings.push(`Freq_LP sheet ${sheetName} row ${index + 1} has invalid NewFreq`);

      const output = {
        SheetName: sheetName,
        SuppCd: String(getCell(row, resolved.SuppCd)).trim(),
        SuppPlantCd: String(getCell(row, resolved.SuppPlantCd)).trim(),
        SuppDockCd: String(getCell(row, resolved.SuppDockCd)).trim(),
        RcvCompDockCd: String(getCell(row, resolved.RcvCompDockCd)).trim(),
        CurrentFreq: currentFreq,
        NewFreq: newFreq,
        OrderFreqForCalculation: orderFreqForCalculation,
      };
      output.FreqLpKey = `${output.SuppCd}${output.SuppPlantCd}${output.SuppDockCd}${output.RcvCompDockCd}`;
      rows.push({
        SheetName: output.SheetName,
        FreqLpKey: output.FreqLpKey,
        SuppCd: output.SuppCd,
        SuppPlantCd: output.SuppPlantCd,
        SuppDockCd: output.SuppDockCd,
        RcvCompDockCd: output.RcvCompDockCd,
        CurrentFreq: output.CurrentFreq,
        NewFreq: output.NewFreq,
        OrderFreqForCalculation: output.OrderFreqForCalculation,
      });
    });
  });

  return {
    summary: {
      sheetNames: workbook.SheetNames,
      processedSheets: targetSheets,
      rawRows,
      outputRows: rows.length,
      targetDocks: [...targetDockSet],
    },
    rows,
    warnings,
  };
};
