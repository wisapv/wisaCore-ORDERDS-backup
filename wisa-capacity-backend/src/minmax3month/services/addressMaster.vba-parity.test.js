import assert from 'node:assert/strict';
import { normalizeTargetMonthEnd, processAddressMaster } from './addressMaster.service.js';

const makeAddressMasterFile = (rows) => ({
  buffer: Buffer.from([
    [
      'SUPL', 'PLANT', 'COMP', 'PLANT', 'DOCK', 'PART #', 'KBN', 'T/C FROM(UNL)', 'T/C TO (UNL)',
      'Kanban Print Address', 'Unused 11', 'Lineside Address', 'Unused 13', 'Unused 14', 'Unused 15',
      'Conveyance Route(External)', 'Depth', 'Distribution Ratio', 'Conveyance Route(Internal)', 'Unused 20',
      'Unused 21', 'Unused 22', 'Update Date Time',
    ].join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')),
});

// VBA parity: accepted target month inputs must normalize to yyyymm31 month-end numbers.
assert.equal(normalizeTargetMonthEnd('May-26'), 20260531);
assert.equal(normalizeTargetMonthEnd('2026-05'), 20260531);
assert.equal(normalizeTargetMonthEnd('202605'), 20260531);

const parityResult = processAddressMaster({
  file: makeAddressMasterFile([
    ['ASIA', 'A', '722B', 'S', 'S1', 'PC1870K02T00', 'K', '20260101', '20261231', 'KPA1', '', 'LS1', '', '', '', 'EXT', '1', '1', 'INT', '', '', '', '17-May-26'],
    ['ASIA', 'A', '722B', 'S', 'S1', 'PC1870K02T00', 'K', '20260101', '20261231', 'KPA2', '', 'LS2', '', '', '', 'EXT', '2', '2', 'INT', '', '', '', '17-May-26'],
    ['ASIA', 'A', '722B', 'S', 'S1', 'PART2', 'K', '20240101', '20241231', 'KPA3', '', 'LS3', '', '', '', 'EXT', '3', '1', 'INT', '', '', '', '17-May-26'],
    ['ASIA', 'A', '722B', 'S', 'X1', 'PART3', 'K', '20260101', '20261231', 'KPA4', '', 'LS4', '', '', '', 'EXT', '4', '1', 'INT', '', '', '', '17-May-26'],
  ]),
  targetMonth: 'May-26',
});

assert.equal(parityResult.rows[0].AddrKey, 'ASIAAS1PC1870K02T00');
assert.notEqual(parityResult.rows[0].AddrKey, 'ASIASS1PC1870K02T00');
assert.equal(parityResult.rows[0].AddrNo, 2);
assert.equal(parityResult.rows[1].AddrNo, 2);
assert.equal(parityResult.rows[0].TotalRatio, 3);
assert.equal(parityResult.rows[1].TotalRatio, 3);
assert.equal(parityResult.rows[0].UseThisDistributionRatio, 0.34);
assert.equal(parityResult.rows[1].UseThisDistributionRatio, 0.67);
assert.equal(parityResult.rows.some((row) => row['PART #'] === 'PART2'), false);
assert.equal(parityResult.rows.some((row) => row.DOCK === 'X1'), false);
assert.deepEqual(parityResult.warnings, []);

const mismatchResult = processAddressMaster({
  file: makeAddressMasterFile([
    ['ASIA', 'A', '722B', 'S', 'S1', 'PART1', 'K', '20260101', '20261231', 'KPA1', '', 'LS1', '', '', '', 'EXT', '1', '1', 'INT', '', '', '', '17-OCT-25'],
  ]),
  targetMonth: 'May-26',
});
assert.equal(mismatchResult.message, 'AddressMaster data month does not match target month');
assert.deepEqual(mismatchResult.errors, [{ type: 'DATA_MONTH_MISMATCH', file: 'AddressMaster', targetCal: '202605', dataCal: '202510' }]);

const blankRatioResult = processAddressMaster({
  file: makeAddressMasterFile([
    ['B', 'P', 'C', 'S', 'SH', 'PART4', 'K', '20260101', '20261231', 'KPA5', '', 'LS5', '', '', '', 'EXT', '5', '', 'INT', '', '', '', '2026-05-17'],
  ]),
  targetMonth: '2026-05',
});

assert.equal(blankRatioResult.summary.outputRows, 1);
assert.equal(blankRatioResult.rows[0].TotalRatio, 0);
assert.equal(blankRatioResult.rows[0].UseThisDistributionRatio, null);
assert.match(blankRatioResult.warnings.join('\n'), /blank Distribution Ratio or zero TotalRatio/);

console.log('AddressMaster VBA parity test passed');
