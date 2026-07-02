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

export default function MinmaxConfigPanel({ config, onConfigChange, variant = 'light', showDocks = true }) {
  const dark = variant === 'dark';
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ConfigInput variant={variant} label="Target Month" placeholder="May-26 or 2026-05" helper="Example: May-26 or 2026-05" value={config.targetMonth} onChange={(value) => onConfigChange('targetMonth', value)} />
      <ConfigInput variant={variant} label="Working Day N+1" type="number" value={config.workingDayN1} onChange={(value) => onConfigChange('workingDayN1', value)} />
      <ConfigInput variant={variant} label="Working Day N+2" type="number" value={config.workingDayN2} onChange={(value) => onConfigChange('workingDayN2', value)} />
      <ConfigInput variant={variant} label="Working Day N+3" type="number" value={config.workingDayN3} onChange={(value) => onConfigChange('workingDayN3', value)} />
      {showDocks && <div className={`${dark ? 'border-white/5 bg-black/30 text-white/50' : 'border-slate-200 bg-slate-50 text-slate-600'} sm:col-span-2 flex flex-wrap items-center gap-2 rounded-2xl border p-3 text-xs`}>
        <span className="font-bold uppercase tracking-[0.16em]">Target docks</span>
        {TARGET_DOCKS.map((dock) => <span key={dock} className={`${dark ? 'border-wisa-pink/30 bg-wisa-pink/10' : 'border-wisa-pink/20 bg-white'} rounded-full border px-3 py-1 font-bold text-wisa-pink`}>{dock}</span>)}
      </div>}
    </div>
  );
}
