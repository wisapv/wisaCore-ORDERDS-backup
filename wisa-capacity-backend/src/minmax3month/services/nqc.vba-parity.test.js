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
assert.deepEqual(result.warnings, []);
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
