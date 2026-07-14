import assert from 'node:assert/strict';
import { pool } from '../../db/pool.js';
import { initSchema } from '../../db/initSchema.js';
import { getYear, resolveWorkingDaysForTarget, upsertYear } from './workingDaySettings.service.js';

// Integration test - requires a real PostgreSQL instance reachable via DATABASE_URL (see
// .env.example). This intentionally does NOT mock pg - see minmaxHistory.service.test.js for the
// same rationale. If PostgreSQL isn't reachable, skip with a clear message instead of failing the
// rest of the test suite.
try {
  await pool.query('SELECT 1');
} catch (error) {
  console.warn('Skipping workingDaySettings.service.test.js: could not connect to PostgreSQL.');
  console.warn(`Install PostgreSQL and set DATABASE_URL (see .env.example) to run this test. (${error.message})`);
  await pool.end();
  process.exit(0);
}

await initSchema();

const YEAR_A = 2098;
const YEAR_B = 2099;
const YEAR_C = 2097;

const cleanup = () => pool.query('DELETE FROM working_day_settings WHERE year = ANY($1)', [[YEAR_A, YEAR_B, YEAR_C]]);

// Purge leftovers from any earlier crashed run before asserting from scratch.
await cleanup();

try {
  // upsertYear then getYear round-trips the same values; months never set stay null.
  await upsertYear(YEAR_A, { 1: 22, 6: 20, 12: 23 });
  const yearAMonths = await getYear(YEAR_A);
  assert.equal(yearAMonths[1], 22);
  assert.equal(yearAMonths[6], 20);
  assert.equal(yearAMonths[12], 23);
  assert.equal(yearAMonths[2], null);
  assert.equal(yearAMonths[7], null);
  assert.equal(Object.keys(yearAMonths).length, 12);

  // upsertYear overwrites an existing month via ON CONFLICT DO UPDATE.
  await upsertYear(YEAR_A, { 1: 25 });
  assert.equal((await getYear(YEAR_A))[1], 25);

  // undefined/null entries in monthsMap must be skipped, not inserted as empty rows.
  await upsertYear(YEAR_A, { 3: null, 4: undefined });
  const afterSkip = await getYear(YEAR_A);
  assert.equal(afterSkip[3], null);
  assert.equal(afterSkip[4], null);

  console.log('workingDaySettings upsertYear/getYear round-trip test passed');

  // resolveWorkingDaysForTarget: targetMonth='2098-11' -> N+1=2098-12, N+2=2099-01, N+3=2099-02
  // (N+2/N+3 roll over into the next year).
  await upsertYear(YEAR_A, { 12: 23 });
  await upsertYear(YEAR_B, { 1: 20, 2: 21 });
  const rolloverNov = await resolveWorkingDaysForTarget(`${YEAR_A}-11`);
  assert.deepEqual(rolloverNov, { workingDayN1: 23, workingDayN2: 20, workingDayN3: 21 });

  // targetMonth='2098-12' -> N+1=2099-01, N+2=2099-02, N+3=2099-03 (all three roll over).
  await upsertYear(YEAR_B, { 3: 22 });
  const rolloverDec = await resolveWorkingDaysForTarget(`${YEAR_A}-12`);
  assert.deepEqual(rolloverDec, { workingDayN1: 20, workingDayN2: 21, workingDayN3: 22 });

  console.log('workingDaySettings resolveWorkingDaysForTarget year-rollover test passed');

  // Missing setting: a completely unseeded year must throw naming the specific missing month
  // (the N+1 month, since that's checked first), not a generic error.
  await assert.rejects(
    () => resolveWorkingDaysForTarget(`${YEAR_C}-01`),
    (error) => {
      assert.match(error.message, /Working day setting missing for 2097-02\. Please set it in the Settings tab first\./);
      return true;
    },
  );

  // Partial coverage: only the N+1 month is set, so the error must name the N+2 month
  // specifically, proving it identifies the correct missing month rather than the first gap found.
  await upsertYear(YEAR_C, { 2: 20 });
  await assert.rejects(
    () => resolveWorkingDaysForTarget(`${YEAR_C}-01`),
    (error) => {
      assert.match(error.message, /Working day setting missing for 2097-03\./);
      return true;
    },
  );

  console.log('workingDaySettings resolveWorkingDaysForTarget missing-setting error test passed');

  console.log('workingDaySettings service integration test passed');
} finally {
  await cleanup();
  await pool.end();
}
