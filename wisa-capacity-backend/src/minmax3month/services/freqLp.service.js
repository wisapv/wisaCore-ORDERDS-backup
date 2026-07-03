import xlsx from 'xlsx';
import { sheetRowsToPreview } from './tableParser.service.js';

const ORDER_FREQ_PATTERN = /orderfreq/i;

// Offsets are relative to the first column whose header text matches ORDER_FREQ_PATTERN
// (the "anchor"). This mirrors the VBA sheet's fixed column layout around OrderFreq,
// independent of the exact header text (e.g. "OrderFreq(*)", "OrderFreq(24)").
const FIELD_OFFSETS = {
  SuppCd: -6,
  SuppPlantCd: -5,
  SuppDockCd: -4,
  RcvCompCd: -3,
  RcvCompPlantCd: -2,
  RcvCompDockCd: -1,
  CurrentFreq: 0,
  OrderFreqForCalculation: 1,
};

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

const locateHeaderRow = (sheetRows) => {
  for (let rowIndex = 0; rowIndex < sheetRows.length; rowIndex += 1) {
    const anchorIndex = sheetRows[rowIndex].findIndex((cell) => ORDER_FREQ_PATTERN.test(String(cell ?? '')));
    if (anchorIndex !== -1) return { rowIndex, anchorIndex };
  }
  return null;
};

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
    const header = locateHeaderRow(sheetRows);

    if (!header) {
      warnings.push(`Freq_LP sheet ${sheetName}: ไม่พบแถว header (คอลัมน์ OrderFreq)`);
      return;
    }

    const { rowIndex: headerIndex, anchorIndex } = header;
    const columnIndexFor = (field) => anchorIndex + FIELD_OFFSETS[field];
    const dataRows = sheetRows.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
    rawRows += dataRows.length;

    dataRows.forEach((row, index) => {
      const orderFreqForCalculation = toNumber(row[columnIndexFor('OrderFreqForCalculation')]);
      if (orderFreqForCalculation === null) {
        warnings.push(`Freq_LP sheet ${sheetName} row ${index + 1} มี OrderFreq(24) ว่างเปล่า`);
      }

      const suppCd = String(row[columnIndexFor('SuppCd')] ?? '').trim();
      const suppPlantCd = String(row[columnIndexFor('SuppPlantCd')] ?? '').trim();
      const suppDockCd = String(row[columnIndexFor('SuppDockCd')] ?? '').trim();
      const rcvCompCd = String(row[columnIndexFor('RcvCompCd')] ?? '').trim();
      const rcvCompPlantCd = String(row[columnIndexFor('RcvCompPlantCd')] ?? '').trim();
      const rcvCompDockCd = String(row[columnIndexFor('RcvCompDockCd')] ?? '').trim();
      const currentFreq = toNumber(row[columnIndexFor('CurrentFreq')]);

      rows.push({
        SheetName: sheetName,
        FreqLpKey: `${suppCd}${suppPlantCd}${suppDockCd}${rcvCompDockCd}`,
        SuppCd: suppCd,
        SuppPlantCd: suppPlantCd,
        SuppDockCd: suppDockCd,
        RcvCompCd: rcvCompCd,
        RcvCompPlantCd: rcvCompPlantCd,
        RcvCompDockCd: rcvCompDockCd,
        CurrentFreq: currentFreq,
        NewFreq: orderFreqForCalculation,
        OrderFreqForCalculation: orderFreqForCalculation,
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
