import assert from 'node:assert/strict';
import xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import { processCalBase, calculateMinMaxFromCalBase } from '../services/minmax.service.js';
import { buildMinMaxExcelWorkbook, exportMinMaxToBuffer } from './minmaxExcel.exporter.js';

// Fixture helpers copied from calBase.vba-parity.test.js (same "happy" case) so this test
// exercises the exporter against a real calculateMinMaxFromCalBase row shape, not a hand-rolled one.
const makeTextFile = (headers, rows) => ({ buffer: Buffer.from([headers.join(','), ...rows.map((row) => row.join(','))].join('\n')) });
const makeWorkbookFile = (sheets) => {
  const workbook = xlsx.utils.book_new();
  sheets.forEach(({ name, rows }) => xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), name));
  return { buffer: xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' }) };
};

const addressHeaders = ['SUPL', 'PLANT', 'COMP', 'PLANT', 'DOCK', 'PART #', 'KBN', 'T/C FROM(UNL)', 'T/C TO (UNL)', 'Kanban Print Address', 'C11', 'Lineside Address', 'C13', 'C14', 'C15', 'Conveyance Route(External)', 'Depth', 'Distribution Ratio', 'Conveyance Route(Internal)', 'C20', 'C21', 'C22', 'Update Date Time'];
const partHeaders = ['SUPL', 'PLANT', 'S.DOCK', 'COMP', 'PLANT', 'DOCK', 'Production Routing', 'PART #', 'T/C FROM(UNL)', 'T/C TO (UNL)', 'PART DESC', 'Life Cycle Code', 'Team Member', 'Model Name', 'ORD Method', 'BvsC REF', 'KBN', 'QTY /CONT', 'V.SHARE FLG[SYS L/O DATE BASIS]', 'V.SHARE VALUE', 'PC DELIV', 'PC SAFETY', 'LS DELIV', 'LS SAFTY', 'Safety(PCS)', 'Packaging Type', 'Part PCS Weight(g)', 'PACK QTY/CONT', 'Latest Physical Inventory DTE & Time', 'Create User', 'Create Date Time', 'Update User', 'Update Date Time', 'V.SHARE GROUP'];
const orderHeaders = ['SUPL', 'PLANT', 'S.DOCK', 'COMP', 'PLANT', 'DOCK', 'UNLD DTE', 'FRQ', 'SFX', 'CFC', 'Re-Export FLG', 'PART #', 'KBN Print Address', 'AICO/CEPT', 'KBN', 'QTY /CONT', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C23', 'C24', 'C25', 'A BoxLayer ADJ(Box)', 'BC BoxLayer ADJ(Box)', 'C28', 'C29', 'C30', 'C31', 'C32', 'C33', 'C34', 'C35', 'C36', 'C37', 'C38', 'C39', 'C40', 'C41', 'C42', 'C43', 'BoxLayer FLG'];
const setHeaders = ['SUPL', 'PLANT', 'S.DOCK', 'COMP', 'PLANT', 'DOCK', 'Key Part', 'Depend', 'T/C FROM(UNL)', 'T/C TO (UNL)', 'Create User', 'Create Date Time', 'Update User', 'Update Date Time'];
const freqHeader = ['SuppCd(*)', 'SuppPlantCd', 'SuppDockCd', 'RcvCompCd(*)', 'RcvCompPlantCd', 'RcvCompDockCd', 'OrderFreq(*)', 'OrderFreq(24)'];
const nqcHeader = ['Dock', 'PartNo', 'N', 'N+1', 'N+2', 'N+3'];

const makeAddressRow = ({ dock = 'S1', part = '52110F0F50B1', kbnAddress = 'ADDR 1' } = {}) => ['ASIA', 'A', '722B', 'S', dock, part, 'K1', '20251001', '99991231', kbnAddress, '', 'LS1', '', '', '', 'EXT1', '2', '1', 'INT1', '', '', '', '17-OCT-25'];
const makePartRow = ({ dock = 'S1', part = '52110F0F50B1', supl = 'AAS1', plant = 'U', sdock = 'I1' } = {}) => [supl, plant, sdock, '722B', 'S', dock, 'R1', part, '20251001', '99991231', 'Part Desc', '', '', '', '', '', 'K1', '10', '', '', '2', '3', '4', '5', '8', 'BOX', '100', '20', '', '', '', '', '17-OCT-25', ''];
const makeOrderRow = ({ dock = 'S1', part = '52110F0F50B1', kbnAddress = 'ADDR 1', supl = 'AAS1', plant = 'U', sdock = 'I1', boxLayer = 4 } = {}) => [supl, plant, sdock, '722B', 'S', dock, '20251017', '1', '', '', '', part, kbnAddress, '', 'K1', '10', '', '', '', '', '', '', '', '', '', boxLayer, '7', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Y'];
const makeSetRow = ({ dock = 'S1', keyPart = '52110F0F50B1', depend = 'DEPEND1' } = {}) => ['AAS1', 'U', 'I1', '722B', 'S', dock, keyPart, depend, '20240111', '99991231', 'U1', '20240111', 'U2', '17-OCT-25'];

const nqcFile = ({ dock = 'S1', part = '52110F0F50B1' } = {}) => makeWorkbookFile([{ name: 'NQC Result transfer', rows: [nqcHeader, [dock, part, 100, 40, 42, 44, '', '', '', '', '202510']] }]);
const freqFile = ({ keyDock = 'S1', supp = 'AAS1', plant = 'U', sdock = 'I1' } = {}) => makeWorkbookFile([{ name: '1-3(S1)', rows: [['title'], [], freqHeader, [supp, plant, sdock, 'RC1', 'RP1', keyDock, 24, 32]] }]);

const makeFiles = () => ({
  addressMaster: makeTextFile(addressHeaders, [makeAddressRow()]),
  partMaster: makeTextFile(partHeaders, [makePartRow()]),
  nqc: nqcFile(),
  freqLp: freqFile(),
  // Order row uses 'DEPEND1' (not the address's own part) - same Depend substitution as the
  // calBase happy fixture, otherwise BoxLayer/UseThisDistributionRatio lookups miss.
  orderSummary: makeTextFile(orderHeaders, [makeOrderRow({ part: 'DEPEND1' })]),
  setPart: makeTextFile(setHeaders, [makeSetRow()]),
});

const runMinMax = ({ targetMonth = '2025-10', unitPerDay = 579, tackTime = 95 } = {}) => {
  const calBaseResult = processCalBase({
    files: makeFiles(),
    targetMonth,
    workingDayN1: 20,
    workingDayN2: 21,
    workingDayN3: 22,
    targetDocks: ['S1', 'S4', 'SH'],
    asOfDate: '20251017',
    unitPerDay,
    tackTime,
  });
  assert.equal(calBaseResult.errors, undefined);
  return calculateMinMaxFromCalBase({ calBaseResult, targetMonth, targetDocks: ['S1', 'S4', 'SH'], unitPerDay, tackTime });
};

const readBack = async (params) => {
  const buffer = await exportMinMaxToBuffer(params);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.getWorksheet('Min-Max 3 Month');
};

// --- Section 6.1/6.2: happy-case fixture, merges, style spot-checks, formula strings ---

const happyResult = runMinMax();
assert.equal(happyResult.rows.length, 1);
assert.equal(happyResult.rows[0].FormulaStatus, 'OK');

const happyBuffer = await exportMinMaxToBuffer({
  rows: happyResult.rows,
  targetMonth: '2025-10',
  unitPerDay: 579,
  tackTime: 95,
  issuedAt: new Date(2026, 6, 10),
});
const happyWorkbook = new ExcelJS.Workbook();
await happyWorkbook.xlsx.load(happyBuffer);
const sheet = happyWorkbook.getWorksheet('Min-Max 3 Month');

const EXPECTED_MERGES = [
  'A1:BO1',
  'Y3:Z3', 'AA3:AB3', 'AD3:AE3', 'AF3:AG3',
  'AJ5:AY5', 'AZ5:BO5',
  'T6:V6', 'W6:X6', 'Y6:AA6', 'AB6:AD6', 'AE6:AI6',
  'AJ6:AM6', 'AN6:AQ6', 'AR6:AU6', 'AV6:AY6',
  'AZ6:BC6', 'BD6:BG6', 'BH6:BK6', 'BL6:BO6',
];
assert.equal(sheet.model.merges.length, EXPECTED_MERGES.length);
EXPECTED_MERGES.forEach((range) => assert.ok(sheet.model.merges.includes(range), `missing merge ${range}`));

// Style spot-checks (5-6 points) - fill/font matched against Section 1 + real template inspection.
assert.equal(sheet.getCell('A1').fill.fgColor.argb, 'FF000000');
assert.equal(sheet.getCell('A1').font.color.argb, 'FFFFFFFF');
assert.equal(sheet.getCell('A1').font.size, 28);

assert.equal(sheet.getCell('AJ5').fill.fgColor.argb, 'FFA375FF'); // BOX group header
assert.equal(sheet.getCell('AZ5').fill.fgColor.argb, 'FFF973C9'); // PCS group header

assert.equal(sheet.getCell('A7').fill.fgColor.argb, 'FFFF0000'); // Error column
assert.equal(sheet.getCell('J7').fill.fgColor.argb, 'FFFFFF00'); // Q'ty column

assert.equal(sheet.getCell('AE7').fill.fgColor.argb, 'FFA7CDFF'); // PC Del group
assert.equal(sheet.getCell('AJ7').fill.fgColor.argb, 'FFD1D1FF'); // Box N+1 group header

// Formula strings (not evaluated values) for BOX N+1 group + BOX/PCS MAX group.
const n = 8;
assert.equal(sheet.getCell('AJ8').value.formula, `IF($AB${n}=0,0,IF($A${n}="Err","Err",IF(AND($F${n}="SH",$P${n}=1),"NO Data",IF($P${n}=2,"-",ROUNDUP($AB${n}*$N${n}*(($AF${n}/920)+0.05%)/$J${n},0)))))`);
assert.equal(sheet.getCell('AK8').value.formula, `IF($AJ${n}=0,0,IF(OR($AJ${n}="-",$AJ${n}="NO Data",$AJ${n}="Err"),$AJ${n},$AJ${n}+ROUNDUP($AB${n}*$N${n}/$W${n}/$J${n},0)+$S${n}))`);
assert.equal(sheet.getCell('AL8').value.formula, `IF($P${n}=3,"-",IF($A${n}="Err","Err",IF($AB${n}=0,0,ROUNDUP($AB${n}*$N${n}*((IF(AND($F${n}<>"SH",$P${n}=1),$AH${n},$AI${n})/920)+0.05%)/$J${n},0))))`);
assert.equal(sheet.getCell('AM8').value.formula, `IF($AL${n}=0,0,IF(OR($AL${n}="-",$AL${n}="NO Data",$AL${n}="Err"),$AL${n},IF($P${n}=1,$AL${n}+ROUNDUP($AB${n}*$N${n}/24/$J${n},0),IF($P${n}=2,$AL${n}+ROUNDUP($AB${n}*$N${n}/$W${n}/$J${n},0)+$S${n},"-"))))`);
assert.equal(sheet.getCell('AV8').value.formula, `IF(OR($AJ${n}="Err",$AN${n}="Err",$AR${n}="Err"),"Err",IF(COUNT($AJ${n},$AN${n},$AR${n})=0,$AJ${n},MAX($AJ${n},$AN${n},$AR${n})))`);
assert.equal(sheet.getCell('BL8').value.formula, `IF(OR($AZ${n}="Err",$BD${n}="Err",$BH${n}="Err"),"Err",IF(COUNT($AZ${n},$BD${n},$BH${n})=0,$AZ${n},MAX($AZ${n},$BD${n},$BH${n})))`);
assert.equal(sheet.getCell('BA8').value.formula, `IF($AZ${n}=0,0,IF(OR($AZ${n}="-",$AZ${n}="NO Data",$AZ${n}="Err"),$AZ${n},$AZ${n}+(ROUNDUP($AB${n}*$N${n}/$W${n}/$J${n},0)*$J${n})+($S${n}*$J${n})))`);

// Data row static values (column mapping, Section 3/5).
assert.equal(sheet.getCell('A8').value, ''); // FormulaStatus OK -> blank, not "Err"
assert.equal(sheet.getCell('F8').value, 'S1'); // DOCK
assert.equal(sheet.getCell('J8').value, 10); // QTY /CONT
assert.equal(sheet.getCell('R8').value, 'DEPEND1'); // SetPartDependUsed
assert.equal(sheet.getCell('S8').value, 4); // BoxLayer

console.log('minmaxExcel exporter happy-case, merge, style, and formula test passed');

// --- Section 6.3 note: we deliberately do NOT evaluate formulas, only compare formula text. ---

// --- Section 3C: dynamic-value rules must respond to real input, not template sample values ---
// Reuses the same happy-case rows for both exports - only the export-time params (targetMonth,
// unitPerDay, tackTime, issuedAt) vary, which is exactly what these rules are about.

const octSheet = await readBack({ rows: happyResult.rows, targetMonth: '2025-10', unitPerDay: 100, tackTime: 20, issuedAt: new Date(2026, 2, 5) });
const janSheet = await readBack({ rows: happyResult.rows, targetMonth: '2026-01', unitPerDay: 300, tackTime: 40, issuedAt: new Date(2026, 8, 15) });

// Rule 1/2/3: T7/U7/W7 header text must reflect targetMonth, never the literal "N+1"/"N+2"/"N+3".
assert.equal(octSheet.getCell('T7').value, 'LP Design Freq = [ Oct-25 ]');
assert.equal(octSheet.getCell('U7').value, 'LP Design Freq = [ Nov-25 ]');
assert.equal(octSheet.getCell('W7').value, 'AL Req LP Design Freq = [ Nov-25 ]');
assert.equal(janSheet.getCell('T7').value, 'LP Design Freq = [ Jan-26 ]');
assert.equal(janSheet.getCell('U7').value, 'LP Design Freq = [ Feb-26 ]');
assert.equal(janSheet.getCell('W7').value, 'AL Req LP Design Freq = [ Feb-26 ]');
[octSheet, janSheet].forEach((s) => {
  ['T7', 'U7', 'W7'].forEach((address) => {
    assert.ok(!String(s.getCell(address).value).includes('N+'), `${address} must not contain literal N+ text`);
  });
});

// Rule 4: Y/Z/AA (25-27) header dates must shift with targetMonth, formatted mmm-yy.
assert.equal(octSheet.getCell('Y7').value.toISOString().slice(0, 7), '2025-11');
assert.equal(octSheet.getCell('Z7').value.toISOString().slice(0, 7), '2025-12');
assert.equal(octSheet.getCell('AA7').value.toISOString().slice(0, 7), '2026-01');
assert.equal(janSheet.getCell('Y7').value.toISOString().slice(0, 7), '2026-02');
assert.equal(janSheet.getCell('Z7').value.toISOString().slice(0, 7), '2026-03');
assert.equal(janSheet.getCell('AA7').value.toISOString().slice(0, 7), '2026-04');

// Rule 5/6: Unit/Day and Takt Time cells must be the real config values, not the template's
// sample 750/73, and must render blank (not 0) when omitted.
assert.equal(octSheet.getCell('AA3').value, 100);
assert.equal(octSheet.getCell('AF3').value, 20);
assert.equal(janSheet.getCell('AA3').value, 300);
assert.equal(janSheet.getCell('AF3').value, 40);
const noConfigSheet = await readBack({ rows: happyResult.rows, targetMonth: '2025-10', issuedAt: new Date() });
assert.equal(noConfigSheet.getCell('AA3').value, '');
assert.equal(noConfigSheet.getCell('AF3').value, '');

// Rule 7: Issued date reflects the export moment (issuedAt), independent of targetMonth.
assert.equal(octSheet.getCell('BL3').value, "Issued date: 5 Mar'26");
assert.equal(janSheet.getCell('BL3').value, "Issued date: 15 Sep'26");

console.log('minmaxExcel exporter dynamic-value test passed');

// --- buildMinMaxExcelWorkbook returns a usable ExcelJS.Workbook synchronously ---
const workbook = buildMinMaxExcelWorkbook({ rows: happyResult.rows, targetMonth: '2025-10', unitPerDay: 579, tackTime: 95 });
assert.ok(workbook instanceof ExcelJS.Workbook);
assert.ok(workbook.getWorksheet('Min-Max 3 Month'));

console.log('minmaxExcel exporter VBA parity test passed');
