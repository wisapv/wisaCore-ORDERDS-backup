import { LoaderCircle } from 'lucide-react';
import { TARGET_DOCKS } from '../constants/minmaxConstants.js';

function ConfigInput({ label, value, onChange, placeholder = '', type = 'text', helper, variant = 'light' }) {
  const dark = variant === 'dark';
  return (
    <label className="flex flex-col gap-2">
      <span className={`${dark ? 'text-white/40' : 'text-slate-500'} text-[10px] font-bold uppercase tracking-[0.2em]`}>{label}</span>
      <input type={type} min={type === 'number' ? '1' : undefined} step={type === 'number' ? '1' : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${dark ? 'bg-black/50 border-white/5 text-white placeholder:text-white/20 focus:border-wisa-pink/50' : 'bg-white border-slate-200 text-slate-950 placeholder:text-slate-300 focus:border-wisa-pink focus:ring-wisa-pink/15'} h-12 rounded-2xl border px-4 text-sm font-semibold outline-none transition focus:ring-4`} />
      {helper && <span className={`${dark ? 'text-white/35' : 'text-slate-500'} text-xs`}>{helper}</span>}
    </label>
  );
}

function WorkingDayPreview({ preview, onGoToSettings, variant = 'light' }) {
  const dark = variant === 'dark';
  const boxClass = `${dark ? 'border-white/5 bg-black/30' : 'border-slate-200 bg-slate-50'} rounded-2xl border p-4`;

  if (!preview || !preview.isValidMonth) {
    return (
      <div className={`${boxClass} ${dark ? 'text-white/40' : 'text-slate-500'} text-xs`}>
        Enter a valid Target Month (e.g. May-26 or 2026-05) to preview N+1/N+2/N+3 working days.
      </div>
    );
  }

  if (preview.isLoading) {
    return (
      <div className={`${boxClass} ${dark ? 'text-white/50' : 'text-slate-500'} flex items-center gap-3 text-xs font-semibold`}>
        <LoaderCircle className="animate-spin" size={16} />
        Loading working day settings...
      </div>
    );
  }

  if (preview.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{preview.message}</div>
    );
  }

  if (!preview.isReady) return null;

  return (
    <div className={boxClass}>
      <span className={`${dark ? 'text-white/40' : 'text-slate-500'} text-[10px] font-bold uppercase tracking-[0.2em]`}>Working days (from Settings)</span>
      <div className="mt-3 flex flex-col gap-2">
        {preview.entries.map((entry) => {
          const missing = entry.value === null || entry.value === undefined;
          return (
            <div key={entry.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className={`${dark ? 'text-white/70' : 'text-slate-700'} font-semibold`}>
                Working Day {entry.label} ({entry.monthLabel})
              </span>
              {missing ? (
                <span className="flex items-center gap-2">
                  <span className="font-bold text-red-600">- ยังไม่ได้ตั้งค่า</span>
                  {onGoToSettings && (
                    <button
                      type="button"
                      onClick={onGoToSettings}
                      className="text-xs font-bold uppercase tracking-wide text-wisa-pink underline decoration-wisa-pink/50 underline-offset-2 hover:text-wisa-pink/80"
                    >
                      Go to Settings
                    </button>
                  )}
                </span>
              ) : (
                <span className={`${dark ? 'text-white' : 'text-slate-950'} font-bold`}>{entry.value}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MinmaxConfigPanel({ config, onConfigChange, variant = 'light', showDocks = true, workingDayPreview, onGoToSettings }) {
  const dark = variant === 'dark';
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ConfigInput variant={variant} label="Target Month" placeholder="May-26 or 2026-05" helper="Example: May-26 or 2026-05" value={config.targetMonth} onChange={(value) => onConfigChange('targetMonth', value)} />
        <ConfigInput variant={variant} label="Unit/Day" type="number" placeholder="579" value={config.unitPerDay} onChange={(value) => onConfigChange('unitPerDay', value)} />
        <ConfigInput variant={variant} label="Tack time (sec)" type="number" placeholder="95" value={config.tackTime} onChange={(value) => onConfigChange('tackTime', value)} />
      </div>

      <WorkingDayPreview preview={workingDayPreview} onGoToSettings={onGoToSettings} variant={variant} />

      {showDocks && <div className={`${dark ? 'border-white/5 bg-black/30 text-white/50' : 'border-slate-200 bg-slate-50 text-slate-600'} flex flex-wrap items-center gap-2 rounded-2xl border p-3 text-xs`}>
        <span className="font-bold uppercase tracking-[0.16em]">Target docks</span>
        {TARGET_DOCKS.map((dock) => <span key={dock} className={`${dark ? 'border-wisa-pink/30 bg-wisa-pink/10' : 'border-wisa-pink/20 bg-white'} rounded-full border px-3 py-1 font-bold text-wisa-pink`}>{dock}</span>)}
      </div>}
    </div>
  );
}
