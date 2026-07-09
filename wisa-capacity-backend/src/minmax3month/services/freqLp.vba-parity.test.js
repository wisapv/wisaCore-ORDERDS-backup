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

// Mirrors the real Freq_LP.xlsx layout: header text uses "(*)" suffixes (not the exact
// candidate strings a fuzzy matcher would guess), and the header row is preceded by a
// title row and a blank row, so the header must be located by scanning for OrderFreq.
// Columns, 0-based: 0 SuppCd(*), 1 SuppPlantCd, 2 SuppDockCd, 3 RcvCompCd(*),
// 4 RcvCompPlantCd, 5 RcvCompDockCd, 6 OrderFreq(*) [anchor, current], 7 OrderFreq(24) [used for calc].
const header = ['SuppCd(*)', 'SuppPlantCd', 'SuppDockCd', 'RcvCompCd(*)', 'RcvCompPlantCd', 'RcvCompDockCd', 'OrderFreq(*)', 'OrderFreq(24)'];
const freqLpFile = makeWorkbookFile([
  {
    name: '1-3(S1)',
    rows: [
      ['Freq_LP export title'],
      [],
      header,
      ['1PIT', 'A', 'I1', 'RC1', 'RP1', 'S1', 24, 32],
      ['2PIT', 'B', 'I2', 'RC2', 'RP2', 'S1', 24, ''],
    ],
  },
  {
    name: '1-3(S4)',
    rows: [
      ['Freq_LP export title'],
      [],
      header,
      ['4PIT', 'D', 'I4', 'RC4', 'RP4', 'S4', 12, 16],
    ],
  },
]);

const result = processFreqLp({ file: freqLpFile, targetDocks: ['S1', 'S4', 'SH'] });

assert.equal(result.summary.rawRows, 3);
assert.equal(result.summary.outputRows, 3);
assert.deepEqual(result.summary.processedSheets, ['1-3(S1)', '1-3(S4)']);

// Row 1: SuppCd(*)='1PIT', SuppPlantCd='A', SuppDockCd='I1', RcvCompDockCd='S1' (column 5),
// OrderFreq(*)=24 (CurrentFreq, column 6), OrderFreq(24)=32 (OrderFreqForCalculation, column 7).
// FreqLpKey = SuppCd + SuppPlantCd + SuppDockCd + RcvCompDockCd = '1PIT' + 'A' + 'I1' + 'S1'.
const validRow = result.rows.find((row) => row.SuppCd === '1PIT');
assert.equal(validRow.FreqLpKey, '1PITAI1S1');
assert.equal(validRow.SuppPlantCd, 'A');
assert.equal(validRow.SuppDockCd, 'I1');
assert.equal(validRow.RcvCompCd, 'RC1');
assert.equal(validRow.RcvCompPlantCd, 'RP1');
assert.equal(validRow.RcvCompDockCd, 'S1');
assert.equal(validRow.CurrentFreq, 24);
assert.equal(validRow.OrderFreqForCalculation, 32);

// Row 2: OrderFreq(24) (column 7) is blank. VBA formula never falls back to OrderFreq(*)/current
// (24) here - it must stay null and raise a warning, unlike the old "prefer New else Current" logic.
const blankOrderFreqRow = result.rows.find((row) => row.SuppCd === '2PIT');
assert.equal(blankOrderFreqRow.FreqLpKey, '2PITBI2S1');
assert.equal(blankOrderFreqRow.CurrentFreq, 24);
assert.equal(blankOrderFreqRow.OrderFreqForCalculation, null);
assert.ok(result.warnings.some((warning) => warning.includes('OrderFreq(24) ว่างเปล่า')));

// S4 sheet: SuppCd='4PIT', SuppPlantCd='D', SuppDockCd='I4', RcvCompDockCd='S4',
// CurrentFreq=12, OrderFreqForCalculation=16. FreqLpKey = '4PIT'+'D'+'I4'+'S4'.
const s4Row = result.rows.find((row) => row.SuppCd === '4PIT');
assert.equal(s4Row.FreqLpKey, '4PITDI4S4');
assert.equal(s4Row.CurrentFreq, 12);
assert.equal(s4Row.OrderFreqForCalculation, 16);

const missingSheetsResult = processFreqLp({
  file: makeWorkbookFile([{ name: 'Unrelated', rows: [header, ['1PIT', 'A', 'I1', 'RC1', 'RP1', 'S1', 24, 32]] }]),
  targetDocks: ['S1', 'S4', 'SH'],
});

assert.equal(missingSheetsResult.message, 'Required Freq_LP S1/S4 sheets not found');
assert.equal(missingSheetsResult.errors[0].type, 'MISSING_REQUIRED_FREQ_LP_SHEETS');

const noHeaderResult = processFreqLp({
  file: makeWorkbookFile([{ name: '1-3(S1)', rows: [['no order freq column here'], ['1PIT', 'A', 'I1', 'RC1', 'RP1', 'S1', 24, 32]] }]),
  targetDocks: ['S1', 'S4', 'SH'],
});
assert.equal(noHeaderResult.summary.outputRows, 0);
assert.ok(noHeaderResult.warnings.some((warning) => warning.includes('ไม่พบแถว header')));

console.log('Freq_LP VBA parity processing tests passed');
