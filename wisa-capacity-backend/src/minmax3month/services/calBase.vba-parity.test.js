import assert from 'node:assert/strict';
import xlsx from 'xlsx';
import { processCalBase } from './minmax.service.js';

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
const freqHeader = ['SuppCd', 'SuppPlantCd', 'SuppDockCd', 'RcvCompDockCd', 'Curr', 'New'];
const nqcHeader = ['Dock', 'PartNo', 'N', 'N+1', 'N+2', 'N+3'];

const makeAddressRow = ({ dock = 'S1', part = '52110F0F50B1', kbnAddress = 'ADDR 1' } = {}) => ['ASIA', 'A', '722B', 'S', dock, part, 'K1', '20251001', '99991231', kbnAddress, '', 'LS1', '', '', '', 'EXT1', '2', '1', 'INT1', '', '', '', '17-OCT-25'];
const makePartRow = ({ dock = 'S1', part = '52110F0F50B1', supl = 'AAS1', plant = 'U', sdock = 'I1' } = {}) => [supl, plant, sdock, '722B', 'S', dock, 'R1', part, '20251001', '99991231', 'Part Desc', '', '', '', '', '', 'K1', '10', '', '', '2', '3', '4', '5', '8', 'BOX', '100', '20', '', '', '', '', '17-OCT-25', ''];
const makeOrderRow = ({ dock = 'S1', part = '52110F0F50B1', kbnAddress = 'ADDR 1', supl = 'AAS1', plant = 'U', sdock = 'I1', boxLayer = 4 } = {}) => [supl, plant, sdock, '722B', 'S', dock, '20251017', '1', '', '', '', part, kbnAddress, '', 'K1', '10', '', '', '', '', '', '', '', '', '', boxLayer, '7', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Y'];
const makeSetRow = ({ dock = 'S1', keyPart = '52110F0F50B1', depend = 'DEPEND1' } = {}) => ['AAS1', 'U', 'I1', '722B', 'S', dock, keyPart, depend, '20240111', '99991231', 'U1', '20240111', 'U2', '17-OCT-25'];

const nqcFile = ({ dock = 'S1', part = '52110F0F50B1' } = {}) => makeWorkbookFile([{ name: 'NQC Result transfer', rows: [nqcHeader, [dock, part, 100, 40, 42, 44, '', '', '', '', '202510']] }]);
const freqFile = ({ keyDock = 'S1', supp = 'AAS1', plant = 'U', sdock = 'I1' } = {}) => makeWorkbookFile([{ name: '1-3(S1)', rows: [['title'], [], freqHeader, [supp, plant, sdock, keyDock, 24, 32]] }]);

const makeFiles = ({ address = makeAddressRow(), nqc = nqcFile(), partRows = [makePartRow()], freq = freqFile(), orderRows = [makeOrderRow()], setRows = [makeSetRow()] } = {}) => ({
  addressMaster: makeTextFile(addressHeaders, [address]),
  partMaster: makeTextFile(partHeaders, partRows),
  nqc,
  freqLp: freq,
  orderSummary: makeTextFile(orderHeaders, orderRows),
  setPart: makeTextFile(setHeaders, setRows),
});

const runCalBase = (overrides = {}) => processCalBase({
  files: makeFiles(overrides),
  targetMonth: '2025-10',
  workingDayN1: 20,
  workingDayN2: 21,
  workingDayN3: 22,
  targetDocks: ['S1', 'S4', 'SH'],
  asOfDate: '20251017',
});

const happy = runCalBase();
assert.equal(happy.summary.outputRows, 1);
assert.equal(happy.rows[0].LookupStatus, 'OK');
assert.equal(happy.rows[0].OrderFreqForCalculation, 32);
assert.equal(happy.rows[0].OrderFreqSource, 'FREQ_LP');
assert.equal(happy.rows[0].BoxLayer, 4);
assert.equal(happy.rows[0].UseThisDistributionRatio, 1);
assert.equal(happy.rows[0].MaxNqcPerDay, 2);
assert.equal(happy.rows[0].SetPartPType, '1-Key');

const nqcMissing = runCalBase({ nqc: nqcFile({ part: 'NO_MATCH' }) });
assert.equal(nqcMissing.summary.outputRows, 0);
assert.equal(nqcMissing.summary.nqcMissingRows, 1);
assert.equal(nqcMissing.alarms[0].type, 'NQC_NOT_FOUND');

const partMissing = runCalBase({ partRows: [makePartRow({ part: 'NO_MATCH' })] });
assert.equal(partMissing.summary.outputRows, 1);
assert.equal(partMissing.rows[0].LookupStatus, 'ERROR');
assert.ok(partMissing.alarms.some((alarm) => alarm.type === 'PART_MASTER_NOT_FOUND'));

const freqMissing = runCalBase({ freq: freqFile({ supp: 'OTHER' }) });
assert.equal(freqMissing.summary.outputRows, 1);
assert.ok(freqMissing.alarms.some((alarm) => alarm.type === 'FREQ_LP_NOT_FOUND'));

const shFixed = runCalBase({
  address: makeAddressRow({ dock: 'SH' }),
  nqc: nqcFile({ dock: 'SH' }),
  partRows: [makePartRow({ dock: 'SH' })],
  orderRows: [makeOrderRow({ dock: 'SH' })],
  setRows: [makeSetRow({ dock: 'SH' })],
});
assert.equal(shFixed.rows[0].OrderFreqForCalculation, 8);
assert.equal(shFixed.rows[0].OrderFreqSource, 'SH_FIXED_8');
assert.ok(!shFixed.alarms.some((alarm) => alarm.type === 'FREQ_LP_NOT_FOUND'));

const boxMissing = runCalBase({ orderRows: [makeOrderRow({ kbnAddress: 'NO_MATCH' })] });
assert.equal(boxMissing.summary.outputRows, 1);
assert.equal(boxMissing.rows[0].BoxLayer, null);
assert.ok(boxMissing.warnings.some((warning) => warning.type === 'BOX_LAYER_NOT_FOUND'));

console.log('Cal base VBA parity test passed');
