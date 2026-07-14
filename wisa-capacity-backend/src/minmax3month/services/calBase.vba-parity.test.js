import assert from 'node:assert/strict';
import xlsx from 'xlsx';
import { pool } from '../../db/pool.js';
import { initSchema } from '../../db/initSchema.js';
import { processCalBase } from './minmax.service.js';
import { upsertYear } from './workingDaySettings.service.js';

// processCalBase now resolves N+1/N+2/N+3 working days from working_day_settings (PostgreSQL)
// instead of taking them as parameters, so this is now an integration test - see
// minmaxHistory.service.test.js for the skip-if-unreachable rationale.
try {
  await pool.query('SELECT 1');
} catch (error) {
  console.warn('Skipping calBase.vba-parity.test.js: could not connect to PostgreSQL.');
  console.warn(`Install PostgreSQL and set DATABASE_URL (see .env.example) to run this test. (${error.message})`);
  await pool.end();
  process.exit(0);
}

await initSchema();

// Every fixture below uses targetMonth='2025-10' -> N+1=2025-11, N+2=2025-12, N+3=2026-01,
// matching the workingDayN1=20/N2=21/N3=22 values this test used to pass directly.
const cleanup = () => pool.query('DELETE FROM working_day_settings WHERE (year = 2025 AND month IN (11, 12)) OR (year = 2026 AND month = 1)');
await cleanup();
await upsertYear(2025, { 11: 20, 12: 21 });
await upsertYear(2026, { 1: 22 });

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
  targetDocks: ['S1', 'S4', 'SH'],
  asOfDate: '20251017',
  unitPerDay: 579,
  tackTime: 95,
});

try {
  // Default setRows makes part '52110F0F50B1' its own SetPart '1-Key' entry with Depend='DEPEND1',
  // so the BoxLayer data must be keyed by 'DEPEND1' (not the address's own part) for the lookup to
  // succeed - this exercises the same Depend substitution as the dedicated test further below.
  const happy = await runCalBase({ orderRows: [makeOrderRow({ part: 'DEPEND1' })] });
  assert.equal(happy.summary.outputRows, 1);
  assert.equal(happy.rows[0].LookupStatus, 'OK');
  assert.equal(happy.rows[0].OrderFreqForCalculation, 32);
  assert.equal(happy.rows[0].OrderFreqSource, 'FREQ_LP');
  assert.equal(happy.rows[0].SetPartDependUsed, 'DEPEND1');
  assert.equal(happy.rows[0].BoxLayer, 4);
  assert.equal(happy.rows[0].UseThisDistributionRatio, 1);
  assert.equal(happy.rows[0].MaxNqcPerDay, 2);
  assert.equal(happy.rows[0].SetPartPType, '1-Key');

  const nqcMissing = await runCalBase({ nqc: nqcFile({ part: 'NO_MATCH' }) });
  assert.equal(nqcMissing.summary.outputRows, 0);
  assert.equal(nqcMissing.summary.nqcMissingRows, 1);
  assert.equal(nqcMissing.alarms[0].type, 'NQC_NOT_FOUND');

  const partMissing = await runCalBase({ partRows: [makePartRow({ part: 'NO_MATCH' })] });
  assert.equal(partMissing.summary.outputRows, 1);
  assert.equal(partMissing.rows[0].LookupStatus, 'ERROR');
  assert.ok(partMissing.alarms.some((alarm) => alarm.type === 'PART_MASTER_NOT_FOUND'));

  const freqMissing = await runCalBase({ freq: freqFile({ supp: 'OTHER' }) });
  assert.equal(freqMissing.summary.outputRows, 1);
  assert.ok(freqMissing.alarms.some((alarm) => alarm.type === 'FREQ_LP_NOT_FOUND'));

  const shFixed = await runCalBase({
    address: makeAddressRow({ dock: 'SH' }),
    nqc: nqcFile({ dock: 'SH' }),
    partRows: [makePartRow({ dock: 'SH' })],
    orderRows: [makeOrderRow({ dock: 'SH' })],
    setRows: [makeSetRow({ dock: 'SH' })],
  });
  assert.equal(shFixed.rows[0].OrderFreqForCalculation, 8);
  assert.equal(shFixed.rows[0].OrderFreqSource, 'SH_FIXED_8');
  assert.ok(!shFixed.alarms.some((alarm) => alarm.type === 'FREQ_LP_NOT_FOUND'));

  const boxMissing = await runCalBase({ orderRows: [makeOrderRow({ kbnAddress: 'NO_MATCH' })] });
  assert.equal(boxMissing.summary.outputRows, 1);
  assert.equal(boxMissing.rows[0].BoxLayer, null);
  assert.ok(boxMissing.warnings.some((warning) => warning.type === 'BOX_LAYER_NOT_FOUND'));

  // Part '99900000001' is its own SetPart '1-Key' entry, Depend='88800000002'. The BoxLayer
  // data is only stored under a BoxKey built from the Depend part, not the address's own part,
  // so a correct implementation must substitute Depend when building the BoxKey.
  // Expected BoxKey = SUPL(AAS1) + SupplierPlant(U) + S.DOCK(I1) + DOCK(S1) + Depend(88800000002)
  //                   + KanbanPrintAddress(ADDR 2), concatenated then whitespace stripped:
  //   'AAS1' + 'U' + 'I1' + 'S1' + '88800000002' + 'ADDR 2' -> 'AAS1UI1S188800000002ADDR2'
  const dependKeyPart = '99900000001';
  const dependTargetPart = '88800000002';
  const expectedDependBoxKey = 'AAS1UI1S188800000002ADDR2';
  const dependSubstitution = await runCalBase({
    address: makeAddressRow({ part: dependKeyPart, kbnAddress: 'ADDR 2' }),
    nqc: nqcFile({ part: dependKeyPart }),
    partRows: [makePartRow({ part: dependKeyPart })],
    orderRows: [makeOrderRow({ part: dependTargetPart, kbnAddress: 'ADDR 2', boxLayer: 7 })],
    setRows: [makeSetRow({ keyPart: dependKeyPart, depend: dependTargetPart })],
  });
  assert.equal(dependSubstitution.summary.outputRows, 1);
  assert.equal(dependSubstitution.rows[0].SetPartDependUsed, dependTargetPart);
  assert.equal(dependSubstitution.rows[0].BoxKey, expectedDependBoxKey);
  assert.equal(dependSubstitution.rows[0].BoxLayer, 7);
  assert.equal(dependSubstitution.rows[0].LookupStatus, 'OK');

  // Missing working-day setting: a targetMonth whose N+1/N+2/N+3 aren't in working_day_settings
  // must fail clearly through the same {message, errors} shape as any other stage failure.
  const missingWorkingDays = await processCalBase({
    files: makeFiles(),
    targetMonth: '2094-01',
    targetDocks: ['S1', 'S4', 'SH'],
    asOfDate: '20251017',
  });
  assert.ok(missingWorkingDays.errors?.length, 'expected an error when working_day_settings has no entry for the target month');
  assert.match(missingWorkingDays.message, /Working day setting missing for 2094-02/);

  console.log('Cal base VBA parity test passed');
} finally {
  await cleanup();
  await pool.end();
}
