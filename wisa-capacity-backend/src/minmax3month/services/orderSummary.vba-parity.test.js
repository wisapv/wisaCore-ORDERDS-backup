import assert from 'node:assert/strict';
import { processOrderSummary } from './orderSummary.service.js';

const headers = [
  'SUPL', 'PLANT', 'S.DOCK', 'COMP', 'PLANT', 'DOCK', 'UNLD DTE', 'FRQ', 'SFX', 'CFC', 'Re-Export FLG', 'PART #', 'KBN Print Address', 'AICO/CEPT', 'KBN', 'QTY /CONT',
  'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C23', 'C24', 'C25', 'A BoxLayer ADJ(Box)', 'BC BoxLayer ADJ(Box)',
  'C28', 'C29', 'C30', 'C31', 'C32', 'C33', 'C34', 'C35', 'C36', 'C37', 'C38', 'C39', 'C40', 'C41', 'C42', 'C43', 'BoxLayer FLG',
];

const row = (aBoxLayer, kbnAddress = 'BP1  - R01') => [
  'ASIA', 'A', '', '722B', 'S', 'OR', '20251017', '1', '', '', '', 'PC1870K02T00', kbnAddress, '', 'K1', '10',
  '', '', '', '', '', '', '', '', '', aBoxLayer, '7',
  '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Y',
];

const file = {
  buffer: Buffer.from([
    headers.join(','),
    row(1).join(','),
    row(3).join(','),
    row('').join(','),
  ].join('\n')),
};

const result = processOrderSummary({ file });

assert.equal(result.summary.rawRows, 3);
assert.equal(result.summary.outputRows, 1);
assert.equal(result.rows[0].BoxKey, 'ASIAAORPC1870K02T00BP1-R01');
assert.equal(result.rows[0].SupplierPlant, 'A');
assert.equal(result.rows[0].CompanyPlant, 'S');
assert.equal(result.rows[0].BoxLayer, 3);
assert.ok(result.warnings.some((warning) => warning.includes('blank or invalid A BoxLayer ADJ(Box)')));

console.log('Order Summary / BoxLayer VBA parity test passed');
