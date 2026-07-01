import assert from 'node:assert/strict';
import { processSetPart } from './setPart.service.js';

const headers = [
  'SUPL', 'PLANT', 'S.DOCK', 'COMP', 'PLANT', 'DOCK', 'Key Part', 'Depend', 'T/C FROM(UNL)', 'T/C TO (UNL)', 'Create User', 'Create Date Time', 'Update User', 'Update Date Time',
];

const activeRow = ['AAS1', 'U', 'I1', '722B', 'S', 'S1', '625130K200C0', '625140K210C0', '20240111', '99991231', 'U1', '20240111', 'U2', '17-OCT-25'];
const expiredRow = ['AAS2', 'A', 'I2', '722B', 'T', 'S4', 'KEYEXPIRED', 'DEPENDX', '20240111', '20250930', 'U1', '20240111', 'U2', '17-OCT-25'];

const file = {
  buffer: Buffer.from([
    headers.join(','),
    activeRow.join(','),
    expiredRow.join(','),
  ].join('\n')),
};

const result = processSetPart({ file, asOfDate: '20251017' });

assert.equal(result.summary.rawRows, 2);
assert.equal(result.summary.activeRows, 1);
assert.equal(result.summary.outputRows, 2);
assert.equal(result.summary.asOfDate, 20251017);
assert.deepEqual(result.rows.map((row) => row.SetKey), ['S1625130K200C0', 'S1625140K210C0']);
assert.deepEqual(result.rows.map((row) => row.PType), ['1-Key', '2-Set']);
assert.equal(result.rows[0].SupplierPlant, 'U');
assert.equal(result.rows[0].CompanyPlant, 'S');
assert.ok(!result.rows.some((row) => row.SetKey.includes('EXPIRED') || row.SetKey.includes('DEPENDX')));

console.log('SetPart VBA parity test passed');
