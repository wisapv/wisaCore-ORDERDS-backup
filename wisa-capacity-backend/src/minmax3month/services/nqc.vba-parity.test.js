import assert from 'node:assert/strict';
import xlsx from 'xlsx';
import { processNqc } from './nqcMinmax.service.js';

const makeNqcWorkbookFile = (sheetName, rows) => {
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), sheetName);
  return { buffer: xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) };
};

// VBA parity: NQC key removes hyphens, duplicate Dock+PartNo rows are summed, and daily demand uses Excel ROUNDUP.
const nqcFile = makeNqcWorkbookFile('NQC Result transfer', [
  ['Dock', 'PartNo', 'N', 'N+1', 'N+2', 'N+3'],
  ['S1', '52110-F0F50-B1', 5, 21, 40, 44, '', '', '', '', '202605'],
  ['S1', '52110-F0F50-B1', 7, 20, 2, 1],
]);

const result = processNqc({
  file: nqcFile,
  targetMonth: 'May-26',
  workingDayN1: 20,
  workingDayN2: 21,
  workingDayN3: 22,
});

assert.deepEqual(result.summary, {
  sheetName: 'NQC Result transfer',
  rawRows: 2,
  processedRows: 1,
  workingDayN1: 20,
  workingDayN2: 21,
  workingDayN3: 22,
});
// This fixture has no N1Day01-31 columns, so N1PerDay must fall back to
// ROUNDUP(N1 total / workingDayN1, 0) and warn about it.
assert.deepEqual(result.warnings, ['N1 daily columns not found, falling back to monthly average']);
assert.equal(result.rows.length, 1);
assert.equal(result.rows[0].NQCKey, 'S152110F0F50B1');
assert.equal(result.rows[0].Dock, 'S1');
assert.equal(result.rows[0].PartNo, '52110-F0F50-B1');
assert.equal(result.rows[0].N, 12);
assert.equal(result.rows[0].N1, 41);
assert.equal(result.rows[0].N2, 42);
assert.equal(result.rows[0].N3, 45);
assert.equal(result.rows[0].N1PerDay, 3);
assert.equal(result.rows[0].N2PerDay, 2);
assert.equal(result.rows[0].N3PerDay, 3);
assert.equal(result.rows[0].MaxNqcPerDay, 3);

const mismatchFile = makeNqcWorkbookFile('NQC Result transfer', [
  ['Dock', 'PartNo', 'N', 'N+1', 'N+2', 'N+3'],
  ['S1', '52110-F0F50-B1', 1, 1, 1, 1, '', '', '', '', '202510'],
]);
const mismatchResult = processNqc({
  file: mismatchFile,
  targetMonth: 'May-26',
  workingDayN1: 20,
  workingDayN2: 21,
  workingDayN3: 22,
});
assert.equal(mismatchResult.message, 'NQC data month does not match target month');
assert.deepEqual(mismatchResult.errors, [{
  type: 'DATA_MONTH_MISMATCH',
  file: 'NQC',
  targetCal: '202605',
  dataCal: '202510',
}]);

// Regression guard: the real NQC.xlsx file uses "DockCode" (not "Dock") as the header text,
// and has 26 real columns (A-Z) instead of the simplified 6-column header used above. If the
// Dock field candidates ever stop including 'DockCode', this must fail with "required logical
// field could not be resolved: Dock" instead of silently passing.
const realHeader = [
  'DataID', 'Version', 'Revision', 'Importer', 'RecevingPlantCode', 'DockCode', 'Exporter', 'SupPlantCode',
  'ShippingDock', 'MSPOrderType', 'FirmPackingMonth', 'CFC', 'ReexportCode', 'Source', 'PartNo', 'OrderType',
  'OrderLotSize', 'KanbanNo', 'N', 'NAICOCEPT', 'N+1', 'N1AICOCEPT', 'N+2', 'N2AICOCEPT', 'N+3', 'N3AICOCEPT',
];
// Column positions (0-based): DockCode=5, FirmPackingMonth=10 (=column K), PartNo=14, N=18, N+1=20, N+2=22, N+3=24.
const realDataRow = [
  'DATA1', 'V1', 'R1', 'IMP1', 'RPC1', 'S1', 'EXP1', 'SPC1',
  'SD1', 'MSP1', '202605', 'CFC1', 'REEXP1', 'SRC1', '52110-F0F50-B1', 'OT1',
  'LOT1', 'KAN1', 100, 'AICO1', 40, 'AICO2', 42, 'AICO3', 44, 'AICO4',
];
assert.equal(realHeader.length, 26);
assert.equal(realDataRow.length, 26);
assert.equal(realHeader[10], 'FirmPackingMonth');
assert.equal(realDataRow[10], '202605');

const realFile = makeNqcWorkbookFile('NQC Result transfer', [realHeader, realDataRow]);
// Independently confirm (without touching the service's private helpers) that column K of the
// data row - what readSheetCell(sheet, 'K2') reads - really is the FirmPackingMonth value.
const realWorkbookForCellCheck = xlsx.read(realFile.buffer, { type: 'buffer' });
const realSheetForCellCheck = realWorkbookForCellCheck.Sheets['NQC Result transfer'];
assert.equal(realSheetForCellCheck['K2'].v, '202605');

const realResult = processNqc({
  file: realFile,
  targetMonth: 'May-26',
  workingDayN1: 20,
  workingDayN2: 21,
  workingDayN3: 22,
});
assert.equal(realResult.errors, undefined);
assert.equal(realResult.rows.length, 1);
assert.equal(realResult.rows[0].Dock, 'S1');
assert.equal(realResult.rows[0].PartNo, '52110-F0F50-B1');
assert.equal(realResult.rows[0].NQCKey, 'S152110F0F50B1');
assert.equal(realResult.rows[0].N, 100);
assert.equal(realResult.rows[0].N1, 40);
assert.equal(realResult.rows[0].N2, 42);
assert.equal(realResult.rows[0].N3, 44);
assert.equal(realResult.rows[0].N1PerDay, 2);
assert.equal(realResult.rows[0].N2PerDay, 2);
assert.equal(realResult.rows[0].N3PerDay, 2);
assert.equal(realResult.rows[0].MaxNqcPerDay, 2);
// Fallback case: this header has no N1Day01-31 columns, so N1PerDay must still be derived
// from ROUNDUP(monthly total / workingDayN1, 0), same as before this feature existed, with a warning.
assert.deepEqual(realResult.warnings, ['N1 daily columns not found, falling back to monthly average']);

// Daily-max case: real files break N+1 into a daily forecast (N1Day01..N1Day31). When those
// columns are present, N1PerDay must be MAX(summed daily values), not ROUNDUP(monthly total /
// workingDayN1) - chosen deliberately so the two methods give very different answers, proving
// the daily-max path is actually used and not silently falling back.
const dayHeaders = Array.from({ length: 31 }, (_, i) => `N1Day${String(i + 1).padStart(2, '0')}`);
const dailyHeader = [...realHeader, ...dayHeaders];
const makeDayValues = (day1, day2) => Array.from({ length: 31 }, (_, i) => (i === 0 ? day1 : i === 1 ? day2 : 0));

// Two rows sharing the same Dock+PartNo, so grouping must sum each day across both rows:
// day1 = 5+4=9, day2 = 3+6=9, all other days = 0 -> MAX = 9.
// Monthly N+1 total (grouped) = 8+10 = 18; workingDayN1 = 20 -> ROUNDUP(18/20,0) = 1 (the wrong,
// unused fallback value) - 9 vs 1 makes the two methods unambiguously distinct.
const dailyRowA = [
  'D1', 'V1', 'R1', 'IMP1', 'RPC1', 'S1', 'EXP1', 'SPC1',
  'SD1', 'MSP1', '202605', 'CFC1', 'REEXP1', 'SRC1', 'DAILY-PART', 'OT1',
  'LOT1', 'KAN1', 50, 'AICO1', 8, 'AICO2', 21, 'AICO3', 22, 'AICO4',
  ...makeDayValues(5, 3),
];
const dailyRowB = [
  'D2', 'V1', 'R1', 'IMP1', 'RPC1', 'S1', 'EXP1', 'SPC1',
  'SD1', 'MSP1', '202605', 'CFC1', 'REEXP1', 'SRC1', 'DAILY-PART', 'OT1',
  'LOT1', 'KAN1', 30, 'AICO1', 10, 'AICO2', 2, 'AICO3', 1, 'AICO4',
  ...makeDayValues(4, 6),
];
assert.equal(dailyHeader.length, 57);
assert.equal(dailyRowA.length, 57);

const dailyFile = makeNqcWorkbookFile('NQC Result transfer', [dailyHeader, dailyRowA, dailyRowB]);
const dailyResult = processNqc({
  file: dailyFile,
  targetMonth: 'May-26',
  workingDayN1: 20,
  workingDayN2: 21,
  workingDayN3: 22,
});
assert.equal(dailyResult.errors, undefined);
assert.equal(dailyResult.rows.length, 1);
assert.equal(dailyResult.rows[0].NQCKey, 'S1DAILYPART');
assert.equal(dailyResult.rows[0].N1, 18);
assert.equal(dailyResult.rows[0].N1PerDay, 9);
assert.equal(dailyResult.rows[0].N2PerDay, 2);
assert.equal(dailyResult.rows[0].N3PerDay, 2);
assert.equal(dailyResult.rows[0].MaxNqcPerDay, 9);
assert.deepEqual(dailyResult.warnings, []);

// A row with a genuinely invalid (non-numeric) N1Day value must produce exactly one aggregated
// warning per row, not one warning per bad day.
const dailyRowWithInvalid = [
  'D3', 'V1', 'R1', 'IMP1', 'RPC1', 'S4', 'EXP1', 'SPC1',
  'SD1', 'MSP1', '202605', 'CFC1', 'REEXP1', 'SRC1', 'BAD-DAY-PART', 'OT1',
  'LOT1', 'KAN1', 10, 'AICO1', 8, 'AICO2', 21, 'AICO3', 22, 'AICO4',
  ...(() => { const days = makeDayValues(5, 3); days[2] = 'oops'; days[3] = 'nope'; return days; })(),
];
const invalidDayFile = makeNqcWorkbookFile('NQC Result transfer', [dailyHeader, dailyRowWithInvalid]);
const invalidDayResult = processNqc({
  file: invalidDayFile,
  targetMonth: 'May-26',
  workingDayN1: 20,
  workingDayN2: 21,
  workingDayN3: 22,
});
assert.equal(invalidDayResult.rows[0].N1PerDay, 5);
assert.deepEqual(invalidDayResult.warnings, ['NQC row 1 has 2 invalid N1Day values']);

const missingSheetFile = makeNqcWorkbookFile('Other Sheet', [
  ['Dock', 'PartNo', 'N', 'N+1', 'N+2', 'N+3'],
  ['S4', '123-ABC', 1, 1, 1, 1, '', '', '', '', '202605'],
]);
const missingSheetResult = processNqc({
  file: missingSheetFile,
  targetMonth: 'May-26',
  workingDayN1: 20,
  workingDayN2: 21,
  workingDayN3: 22,
});
assert.equal(missingSheetResult.message, 'Required NQC sheet not found');
assert.deepEqual(missingSheetResult.errors, [{
  type: 'MISSING_SHEET',
  file: 'NQC',
  requiredSheet: 'NQC Result transfer',
}]);

console.log('NQC VBA parity test passed');
