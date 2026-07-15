import { CheckCircle2, LoaderCircle, Save, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import MinmaxSectionCard from './components/MinmaxSectionCard.jsx';
import { WORKING_DAYS_URL } from './constants/minmaxConstants.js';
import { MONTH_ABBR } from './utils/monthLabel.js';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => CURRENT_YEAR - 2 + index);

const monthsFromResponse = (months) => Array.from({ length: 12 }, (_, index) => {
  const value = months?.[index + 1];
  return value === null || value === undefined ? '' : String(value);
});

export default function MinmaxSettingsTab() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [months, setMonths] = useState(() => Array.from({ length: 12 }, () => ''));
  // loadState.year records which year the last load result belongs to - as long as it doesn't
  // match the current `year`, the fetch for `year` is still in flight, so the loading state is
  // derived from that comparison rather than an extra setState call at the top of the effect.
  const [loadState, setLoadState] = useState({ status: 'loading', message: '', year: null });
  const [saveState, setSaveState] = useState({ status: 'idle', message: '', year: null });

  useEffect(() => {
    let isMounted = true;

    fetch(`${WORKING_DAYS_URL}?year=${year}`)
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!isMounted) return;
        if (ok && result.success) {
          setMonths(monthsFromResponse(result.months));
          setLoadState({ status: 'ready', message: '', year });
        } else {
          setLoadState({ status: 'error', message: result.message || 'Failed to load working day settings.', year });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadState({ status: 'error', message: 'Unable to connect to backend at localhost:3000.', year });
      });

    return () => { isMounted = false; };
  }, [year]);

  const isLoading = loadState.year !== year;
  const loadError = !isLoading && loadState.status === 'error' ? loadState.message : null;
  const isReady = !isLoading && loadState.status === 'ready';
  const showSaveBanner = saveState.year === year && saveState.status !== 'idle';

  const handleMonthChange = (index, value) => {
    setMonths((current) => current.map((month, i) => (i === index ? value : month)));
  };

  const handleSave = async () => {
    setSaveState({ status: 'saving', message: '', year });

    const monthsPayload = months.reduce((payload, value, index) => {
      if (value !== '') payload[index + 1] = Number(value);
      return payload;
    }, {});

    try {
      const response = await fetch(WORKING_DAYS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, months: monthsPayload }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setMonths(monthsFromResponse(result.months));
        setSaveState({ status: 'success', message: 'Working day settings saved.', year });
      } else {
        setSaveState({ status: 'error', message: result.message || 'Failed to save working day settings.', year });
      }
    } catch {
      setSaveState({ status: 'error', message: 'Unable to connect to backend at localhost:3000.', year });
    }
  };

  return (
    <MinmaxSectionCard
      eyebrow="Settings"
      title="Working Days"
      description="Set the number of working days for each month. Min-Max calculations resolve N+1/N+2/N+3 from these values."
      variant="strong"
    >
      <div className="flex flex-col gap-6">
        <label className="flex w-40 flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Year</span>
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-wisa-pink focus:ring-4 focus:ring-wisa-pink/15"
          >
            {YEAR_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        {isLoading && (
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
            <LoaderCircle className="animate-spin" size={18} />
            Loading working day settings...
          </div>
        )}

        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{loadError}</div>
        )}

        {isReady && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {MONTH_ABBR.map((label, index) => (
                <label key={label} className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="-"
                    value={months[index]}
                    onChange={(event) => handleMonthChange(index, event.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-wisa-pink focus:ring-4 focus:ring-wisa-pink/15"
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState.status === 'saving'}
                className="btn-dark flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-50"
              >
                {saveState.status === 'saving' ? (
                  <>
                    <LoaderCircle className="animate-spin" size={16} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>

              {showSaveBanner && saveState.status === 'success' && (
                <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 size={18} /> {saveState.message}
                </span>
              )}

              {showSaveBanner && saveState.status === 'error' && (
                <span className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <XCircle size={18} /> {saveState.message}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </MinmaxSectionCard>
  );
}
