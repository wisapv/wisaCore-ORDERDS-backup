import assert from 'node:assert/strict';
import xlsx from 'xlsx';
import { processFreqLp } from './freqLp.service.js';

const makeWorkbookFile = (sheets) => {
  const workbook = xlsx.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), name);
  });

  return {
    buffer: xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' }),
  };
};

const header = ['SuppCd', 'SuppPlantCd', 'SuppDockCd', 'RcvCompDockCd', 'Curr', 'New'];
const freqLpFile = makeWorkbookFile([
  {
    name: '1-3(S1)',
    rows: [
      ['Freq_LP export title'],
      [],
      header,
      ['1PIT', 'A', 'I1', 'S1', 24, 32],
      ['2PIT', 'B', 'I2', 'S1', 24, ''],
      ['3PIT', 'C', 'I3', 'S1', '', ''],
    ],
  },
  {
    name: '1-3(S4)',
    rows: [
      ['Freq_LP export title'],
      [],
      header,
      ['4PIT', 'D', 'I4', 'S4', 12, 16],
    ],
  },
]);

const result = processFreqLp({ file: freqLpFile, targetDocks: ['S1', 'S4', 'SH'] });

assert.equal(result.summary.rawRows, 4);
assert.equal(result.summary.outputRows, 4);
assert.deepEqual(result.summary.processedSheets, ['1-3(S1)', '1-3(S4)']);

const newFreqRow = result.rows.find((row) => row.SuppCd === '1PIT');
assert.equal(newFreqRow.FreqLpKey, '1PITAI1S1');
assert.equal(newFreqRow.CurrentFreq, 24);
assert.equal(newFreqRow.NewFreq, 32);
assert.equal(newFreqRow.OrderFreqForCalculation, 32);

const fallbackRow = result.rows.find((row) => row.SuppCd === '2PIT');
assert.equal(fallbackRow.FreqLpKey, '2PITBI2S1');
assert.equal(fallbackRow.CurrentFreq, 24);
assert.equal(fallbackRow.NewFreq, null);
assert.equal(fallbackRow.OrderFreqForCalculation, 24);

const invalidRow = result.rows.find((row) => row.SuppCd === '3PIT');
assert.equal(invalidRow.FreqLpKey, '3PITCI3S1');
assert.equal(invalidRow.OrderFreqForCalculation, null);
assert.ok(result.warnings.some((warning) => warning.includes('no valid current or new frequency')));

const missingSheetsResult = processFreqLp({
  file: makeWorkbookFile([{ name: 'Unrelated', rows: [header, ['1PIT', 'A', 'I1', 'S1', 24, 32]] }]),
  targetDocks: ['S1', 'S4', 'SH'],
});

assert.equal(missingSheetsResult.message, 'Required Freq_LP S1/S4 sheets not found');
assert.equal(missingSheetsResult.errors[0].type, 'MISSING_REQUIRED_FREQ_LP_SHEETS');

console.log('Freq_LP VBA parity processing tests passed');
