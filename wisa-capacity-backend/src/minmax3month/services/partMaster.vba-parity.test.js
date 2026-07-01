import assert from 'node:assert/strict';
import { processPartMaster } from './partMaster.service.js';

const headers = [
  'SUPL', 'PLANT', 'S.DOCK', 'COMP', 'PLANT', 'DOCK', 'Production Routing', 'PART #', 'T/C FROM(UNL)', 'T/C TO (UNL)',
  'PART DESC', 'Life Cycle Code', 'Team Member', 'Model Name', 'ORD Method', 'BvsC REF', 'KBN', 'QTY /CONT',
  'V.SHARE FLG[SYS L/O DATE BASIS]', 'V.SHARE VALUE', 'PC DELIV', 'PC SAFETY', 'LS DELIV', 'LS SAFTY',
  'Safety(PCS)', 'Packaging Type', 'Part PCS Weight(g)', 'PACK QTY/CONT', 'Latest Physical Inventory DTE & Time',
  'Create User', 'Create Date Time', 'Update User', 'Update Date Time', 'V.SHARE GROUP',
];

const makePartMasterFile = (rows) => ({ buffer: Buffer.from([headers.join(','), ...rows.map((row) => row.join(','))].join('\n')) });

const validRow = [
  'AAS1', 'U', 'I1', '722B', 'S', 'S1', 'R1', '52110F0F50B1', '20251001', '99991231',
  'PART NAME', 'LC', 'TM', 'MODEL', 'ORD', 'BC', 'K', '12', 'N', '0', '2', '3', '4', '5',
  '6', 'BOX', '123', '10', '2025-10-01', 'USER', '2025-10-01', 'USER2', '17-OCT-25', 'G1',
];

const result = processPartMaster({ file: makePartMasterFile([validRow]), targetMonth: '2025-10' });
assert.equal(result.summary.dataCal, '202510');
assert.equal(result.summary.effectiveRows, 1);
assert.equal(result.summary.targetDockRows, 1);
assert.equal(result.summary.outputRows, 1);
assert.equal(result.rows[0].SupplierPlant, 'U');
assert.equal(result.rows[0].CompanyPlant, 'S');
assert.equal(result.rows[0].PartMasterKey, 'S152110F0F50B1');
assert.equal(result.rows[0]['QTY /CONT'], 12);
assert.equal(result.rows[0]['PC SAFETY'], 3);
assert.equal(result.rows[0]['LS SAFTY'], 5);

const mismatchResult = processPartMaster({ file: makePartMasterFile([validRow]), targetMonth: '2025-11' });
assert.equal(mismatchResult.message, 'PartMaster data month does not match target month');
assert.deepEqual(mismatchResult.errors, [{ type: 'DATA_MONTH_MISMATCH', file: 'PartMaster', targetCal: '202511', dataCal: '202510' }]);

const expiredRow = [...validRow];
expiredRow[9] = '20250930';
const expiredResult = processPartMaster({ file: makePartMasterFile([expiredRow]), targetMonth: '2025-10' });
assert.equal(expiredResult.summary.effectiveRows, 0);
assert.equal(expiredResult.rows.length, 0);

console.log('PartMaster VBA parity test passed');
