import { pool } from '../../db/pool.js';
import { normalizeTargetMonthCal } from './addressMaster.service.js';

export const getYear = async (year) => {
  const { rows } = await pool.query(
    'SELECT month, working_days FROM working_day_settings WHERE year = $1',
    [year],
  );

  const months = {};
  for (let month = 1; month <= 12; month += 1) months[month] = null;
  rows.forEach((row) => { months[row.month] = row.working_days; });

  return months;
};

export const upsertYear = async (year, monthsMap = {}) => {
  const entries = Object.entries(monthsMap)
    .map(([month, workingDays]) => [Number(month), workingDays])
    .filter(([month, workingDays]) => Number.isInteger(month) && month >= 1 && month <= 12 && workingDays !== undefined && workingDays !== null);

  for (const [month, workingDays] of entries) {
    await pool.query(
      `INSERT INTO working_day_settings (year, month, working_days, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (year, month) DO UPDATE SET working_days = EXCLUDED.working_days, updated_at = now()`,
      [year, month, workingDays],
    );
  }
};

const addMonths = (year, month, offset) => {
  const zeroBasedMonth = (month - 1) + offset;
  const newYear = year + Math.floor(zeroBasedMonth / 12);
  const newMonth = ((zeroBasedMonth % 12) + 12) % 12 + 1;
  return { year: newYear, month: newMonth };
};

const formatYearMonth = ({ year, month }) => `${year}-${String(month).padStart(2, '0')}`;

const TARGET_OFFSETS = [
  { key: 'workingDayN1', offset: 1 },
  { key: 'workingDayN2', offset: 2 },
  { key: 'workingDayN3', offset: 3 },
];

// targetMonth accepts the same flexible formats as the rest of the Min-Max pipeline (e.g. May-26,
// 2026-05, 202605) so this stage doesn't reject inputs the other file processors already accept.
export const resolveWorkingDaysForTarget = async (targetMonth) => {
  const cal = normalizeTargetMonthCal(targetMonth);
  if (!cal) throw new Error('targetMonth must be May-26, 2026-05, or 202605 format');

  const year = Number(cal.slice(0, 4));
  const month = Number(cal.slice(4, 6));
  const targets = TARGET_OFFSETS.map(({ key, offset }) => ({ key, ...addMonths(year, month, offset) }));

  const yearsNeeded = [...new Set(targets.map((target) => target.year))];
  const monthsByYear = {};
  for (const y of yearsNeeded) monthsByYear[y] = await getYear(y);

  const result = {};
  targets.forEach(({ key, year: targetYear, month: targetMonthNum }) => {
    const workingDays = monthsByYear[targetYear][targetMonthNum];
    if (workingDays === null || workingDays === undefined) {
      throw new Error(`Working day setting missing for ${formatYearMonth({ year: targetYear, month: targetMonthNum })}. Please set it in the Settings tab first.`);
    }
    result[key] = workingDays;
  });

  return result;
};

export default { getYear, upsertYear, resolveWorkingDaysForTarget };
