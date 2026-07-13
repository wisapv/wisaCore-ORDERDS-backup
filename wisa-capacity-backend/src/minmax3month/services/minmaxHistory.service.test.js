import assert from 'node:assert/strict';
import { pool } from '../../db/pool.js';
import { initSchema } from '../../db/initSchema.js';
import { getNextRevision, getRunDetail, listRuns, saveRun } from './minmaxHistory.service.js';

// Integration test - requires a real PostgreSQL instance reachable via DATABASE_URL (see
// .env.example). This intentionally does NOT mock pg: the point of this test is to prove the
// actual SQL (revision numbering, grouping/ordering, JSON round-trip) works against a real
// database, not a stand-in. If PostgreSQL isn't reachable, skip with a clear message instead of
// failing the rest of the test suite.
try {
  await pool.query('SELECT 1');
} catch (error) {
  console.warn('Skipping minmaxHistory.service.test.js: could not connect to PostgreSQL.');
  console.warn(`Install PostgreSQL and set DATABASE_URL (see .env.example) to run this test. (${error.message})`);
  await pool.end();
  process.exit(0);
}

await initSchema();

const TEST_MONTH_A = '2099-01';
const TEST_MONTH_B = '2099-02';

const makeResult = (marker) => ({
  rows: [{ DOCK: 'S1', 'PART #': `TEST-${marker}`, FormulaStatus: 'OK' }],
  summary: { outputRows: 1, marker },
  warnings: [],
  alarms: [],
});

const cleanup = () => pool.query('DELETE FROM calculation_runs WHERE target_month = ANY($1)', [[TEST_MONTH_A, TEST_MONTH_B]]);

// Purge leftovers from any earlier crashed run before asserting revision numbers from scratch.
await cleanup();

try {
  // saveRun twice with the same targetMonth -> revision 1, then 2.
  const first = await saveRun({ targetMonth: TEST_MONTH_A, config: { unitPerDay: 100, tackTime: 20 }, result: makeResult('a1') });
  assert.equal(first.revision, 1);
  const second = await saveRun({ targetMonth: TEST_MONTH_A, config: { unitPerDay: 100, tackTime: 20 }, result: makeResult('a2') });
  assert.equal(second.revision, 2);

  // saveRun for a different month starts back at revision 1, independent of month A's count.
  const other = await saveRun({ targetMonth: TEST_MONTH_B, config: { unitPerDay: 200, tackTime: 30 }, result: makeResult('b1') });
  assert.equal(other.revision, 1);

  // getNextRevision reflects the next available number directly too, not just via saveRun.
  assert.equal(await getNextRevision(TEST_MONTH_A), 3);
  assert.equal(await getNextRevision(TEST_MONTH_B), 2);

  // listRuns() groups by month (most recent month first) and orders revisions descending
  // within each group.
  const history = await listRuns();
  const monthAGroup = history.find((group) => group.targetMonth === TEST_MONTH_A);
  const monthBGroup = history.find((group) => group.targetMonth === TEST_MONTH_B);
  assert.ok(monthAGroup, 'expected a history group for month A');
  assert.ok(monthBGroup, 'expected a history group for month B');
  assert.deepEqual(monthAGroup.runs.map((run) => run.revision), [2, 1]);
  assert.deepEqual(monthBGroup.runs.map((run) => run.revision), [1]);
  assert.ok(history.indexOf(monthBGroup) < history.indexOf(monthAGroup), 'month 2099-02 should sort before 2099-01, most recent month first');

  // getRunDetail returns the exact rows/summary that were saved.
  const detail = await getRunDetail(second.id);
  assert.equal(detail.targetMonth, TEST_MONTH_A);
  assert.equal(detail.revision, 2);
  assert.deepEqual(detail.rows, makeResult('a2').rows);
  assert.equal(detail.summary.marker, 'a2');

  console.log('minmaxHistory service integration test passed');
} finally {
  await cleanup();
  await pool.end();
}
