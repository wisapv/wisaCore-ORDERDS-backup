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

const makeFile = (headerRow, rows) => ({
  buffer: Buffer.from([headerRow.join(','), ...rows.map((r) => r.join(','))].join('\n')),
});

const file = makeFile(headers, [row(1), row(3), row('')]);

// Single-file case (backward compatible): { files } accepts a single file wrapped in an array.
const single = processOrderSummary({ files: [file] });

assert.equal(single.summary.rawRows, 3);
assert.equal(single.summary.outputRows, 1);
assert.equal(single.summary.filesProcessed, 1);
assert.equal(single.rows[0].BoxKey, 'ASIAAORPC1870K02T00BP1-R01');
assert.equal(single.rows[0].SupplierPlant, 'A');
assert.equal(single.rows[0].CompanyPlant, 'S');
assert.equal(single.rows[0].BoxLayer, 3);
assert.ok(single.warnings.some((warning) => warning.includes('blank or invalid A BoxLayer ADJ(Box)')));

// Also accepts a single (non-array) file object, matching the multer .fields()-style mocks used by
// calBase.vba-parity.test.js and the exporter test.
const singleUnwrapped = processOrderSummary({ files: file });
assert.equal(singleUnwrapped.summary.filesProcessed, 1);
assert.equal(singleUnwrapped.summary.outputRows, 1);

// Multiple files with matching headers: rows from every file are concatenated, and MAX(BoxLayer) is
// computed across files, not per file. Same BoxKey ('BP1-R02') appears in file 1 (BoxLayer 2) and
// file 3 (BoxLayer 5) - the cross-file MAX must be 5, not the per-file max of 2.
const fileA = makeFile(headers, [row(1, 'BP1  - R01'), row(2, 'BP1  - R02')]);
const fileB = makeFile(headers, [row(4, 'BP1  - R03')]);
const fileC = makeFile(headers, [row(5, 'BP1  - R02'), row(1, 'BP1  - R04')]);

const merged = processOrderSummary({ files: [fileA, fileB, fileC] });

assert.equal(merged.summary.filesProcessed, 3);
assert.equal(merged.summary.rawRows, 5);
assert.equal(merged.summary.outputRows, 4);

const r02 = merged.rows.find((r) => r.BoxKey === 'ASIAAORPC1870K02T00BP1-R02');
assert.ok(r02, 'expected merged output to contain the BP1-R02 BoxKey');
assert.equal(r02.BoxLayer, 5, 'MAX(BoxLayer) must be computed across all files, not per file');

const r01 = merged.rows.find((r) => r.BoxKey === 'ASIAAORPC1870K02T00BP1-R01');
assert.equal(r01.BoxLayer, 1);
const r03 = merged.rows.find((r) => r.BoxKey === 'ASIAAORPC1870K02T00BP1-R03');
assert.equal(r03.BoxLayer, 4);
const r04 = merged.rows.find((r) => r.BoxKey === 'ASIAAORPC1870K02T00BP1-R04');
assert.equal(r04.BoxLayer, 1);

// Header mismatch on the second file (a column dropped, shifting every position after it) must
// stop processing immediately and report which file/columns disagreed - no partial merge.
const mismatchedHeaders = headers.filter((column) => column !== 'FRQ');
const fileBadHeader = makeFile(mismatchedHeaders, [row(9, 'BP1  - R05')]);

const mismatch = processOrderSummary({ files: [fileA, fileBadHeader, fileC] });

assert.equal(mismatch.message, 'Order Summary file headers do not match across files');
assert.equal(mismatch.errors.length, 1);
assert.equal(mismatch.errors[0].type, 'ORDER_SUMMARY_HEADER_MISMATCH');
assert.equal(mismatch.errors[0].fileIndex, 1);
assert.deepEqual(mismatch.errors[0].expectedColumns, headers);
assert.deepEqual(mismatch.errors[0].actualColumns, mismatchedHeaders);
assert.equal(mismatch.rows, undefined, 'must not return partially-merged rows on header mismatch');

// A reordered (but same-length) header must also be treated as a mismatch - "match" means every
// character at every position, not just the same set of column names.
const reorderedHeaders = [...headers];
[reorderedHeaders[0], reorderedHeaders[1]] = [reorderedHeaders[1], reorderedHeaders[0]];
const fileReordered = makeFile(reorderedHeaders, [row(9, 'BP1  - R05')]);

const reorderedMismatch = processOrderSummary({ files: [fileA, fileReordered] });
assert.equal(reorderedMismatch.errors[0].type, 'ORDER_SUMMARY_HEADER_MISMATCH');
assert.equal(reorderedMismatch.errors[0].fileIndex, 1);

console.log('Order Summary / BoxLayer VBA parity test passed');
