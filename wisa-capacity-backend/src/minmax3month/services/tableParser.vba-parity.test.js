import assert from 'node:assert/strict';
import { getValueByHeader, parseCsvBufferWithRows } from './tableParser.service.js';

const parsed = parseCsvBufferWithRows(Buffer.from([
  'SUPL,PLANT,COMP,PLANT,DOCK,PART #',
  'ASIA,A,722B,S,S1,PC1870K02T00',
].join('\n')));
const [row] = parsed.rows;

assert.deepEqual(parsed.columns, ['SUPL', 'PLANT', 'COMP', 'PLANT', 'DOCK', 'PART #']);
assert.deepEqual(parsed.uniqueColumns, ['SUPL', 'PLANT', 'COMP', 'PLANT__2', 'DOCK', 'PART #']);
assert.equal(getValueByHeader(row, parsed.columns, parsed.uniqueColumns, 'PLANT', 1), 'A');
assert.equal(getValueByHeader(row, parsed.columns, parsed.uniqueColumns, 'PLANT', 2), 'S');

console.log('Table parser VBA parity test passed');
