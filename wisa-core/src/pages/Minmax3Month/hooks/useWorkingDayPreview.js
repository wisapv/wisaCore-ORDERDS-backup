import { useEffect, useState } from 'react';
import { WORKING_DAYS_URL } from '../constants/minmaxConstants.js';
import { addMonths, formatMonthShort, parseMonthValue } from '../utils/monthLabel.js';

const OFFSETS = [
  { key: 'workingDayN1', label: 'N+1' },
  { key: 'workingDayN2', label: 'N+2' },
  { key: 'workingDayN3', label: 'N+3' },
];

const DEBOUNCE_MS = 500;

// Resolves N+1/N+2/N+3 working days for a (debounced) targetMonth by reading working_day_settings
// via GET /working-days, the same source calculate-minmax reads from server-side - this lets the
// frontend catch a missing setting before the user even hits Calculate.
export function useWorkingDayPreview(targetMonth) {
  const [debouncedTargetMonth, setDebouncedTargetMonth] = useState(targetMonth);
  // fetchState.targetMonth records which targetMonth the current fetchState belongs to - comparing
  // it against debouncedTargetMonth lets "is this stale/in-flight" be derived at render time instead
  // of resetting state synchronously inside the effect (avoids react-hooks/set-state-in-effect).
  const [fetchState, setFetchState] = useState({ status: 'idle', entries: [], message: '', targetMonth: null });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTargetMonth(targetMonth), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [targetMonth]);

  useEffect(() => {
    const parsed = parseMonthValue(debouncedTargetMonth);
    if (!parsed) return undefined;

    let isMounted = true;
    const targets = OFFSETS.map(({ key, label }, index) => {
      const target = addMonths(parsed, index + 1);
      return { key, label, ...target, monthLabel: formatMonthShort(target) };
    });
    const years = [...new Set(targets.map((target) => target.year))];

    Promise.all(years.map((year) => fetch(`${WORKING_DAYS_URL}?year=${year}`)
      .then((response) => response.json().then((result) => ({ ok: response.ok, result, year })))))
      .then((responses) => {
        if (!isMounted) return;
        const failed = responses.find(({ ok, result }) => !ok || !result.success);
        if (failed) {
          setFetchState({ status: 'error', entries: [], message: failed.result?.message || 'Failed to load working day settings.', targetMonth: debouncedTargetMonth });
          return;
        }
        const monthsByYear = Object.fromEntries(responses.map(({ result, year }) => [year, result.months]));
        const entries = targets.map((target) => ({
          key: target.key,
          label: target.label,
          monthLabel: target.monthLabel,
          value: monthsByYear[target.year]?.[target.month] ?? null,
        }));
        setFetchState({ status: 'ready', entries, message: '', targetMonth: debouncedTargetMonth });
      })
      .catch(() => {
        if (!isMounted) return;
        setFetchState({ status: 'error', entries: [], message: 'Unable to connect to backend at localhost:3000.', targetMonth: debouncedTargetMonth });
      });

    return () => { isMounted = false; };
  }, [debouncedTargetMonth]);

  const isValidMonth = Boolean(parseMonthValue(debouncedTargetMonth));
  const isLoading = isValidMonth && fetchState.targetMonth !== debouncedTargetMonth;
  const isReady = isValidMonth && !isLoading && fetchState.status === 'ready';
  const isError = isValidMonth && !isLoading && fetchState.status === 'error';
  const entries = isReady ? fetchState.entries : [];
  const allSet = isReady && entries.every((entry) => entry.value !== null && entry.value !== undefined);

  return { isValidMonth, isLoading, isReady, isError, message: fetchState.message, entries, allSet };
}
