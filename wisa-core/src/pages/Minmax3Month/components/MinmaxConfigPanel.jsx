import { TARGET_DOCKS } from '../constants/minmaxConstants.js';

function ConfigInput({ label, value, onChange, placeholder = '', type = 'text', helper }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input type={type} min={type === 'number' ? '1' : undefined} step={type === 'number' ? '1' : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-wisa-pink focus:ring-4 focus:ring-wisa-pink/15" />
      {helper && <span className="text-xs text-slate-500">{helper}</span>}
    </label>
  );
}

export default function MinmaxConfigPanel({ config, onConfigChange }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
      <ConfigInput label="Target Month" placeholder="May-26 or 2026-05" helper="Example target month: May-26 or 2026-05" value={config.targetMonth} onChange={(value) => onConfigChange('targetMonth', value)} />
      <ConfigInput label="Working Day N+1" type="number" value={config.workingDayN1} onChange={(value) => onConfigChange('workingDayN1', value)} />
      <ConfigInput label="Working Day N+2" type="number" value={config.workingDayN2} onChange={(value) => onConfigChange('workingDayN2', value)} />
      <ConfigInput label="Working Day N+3" type="number" value={config.workingDayN3} onChange={(value) => onConfigChange('workingDayN3', value)} />
      <div className="lg:col-span-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <span className="font-bold uppercase tracking-[0.16em] text-slate-500">Target docks</span>
        {TARGET_DOCKS.map((dock) => <span key={dock} className="rounded-full border border-wisa-pink/20 bg-white px-3 py-1 font-bold text-wisa-pink">{dock}</span>)}
      </div>
    </div>
  );
}
