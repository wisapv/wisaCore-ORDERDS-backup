function ConfigInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  return <label className="flex flex-col gap-3"><span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">{label}</span><input type={type} min={type === 'number' ? '1' : undefined} step={type === 'number' ? '1' : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="bg-black/50 border border-white/5 rounded-2xl p-4 text-white font-semibold text-sm outline-none placeholder:text-white/20 focus:border-wisa-pink/50 transition-colors" /></label>;
}

export default function MinmaxConfigPanel({ config, onConfigChange }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"><ConfigInput label="Target Month" placeholder="May-26" value={config.targetMonth} onChange={(value) => onConfigChange('targetMonth', value)} /><ConfigInput label="Working Day N+1" type="number" value={config.workingDayN1} onChange={(value) => onConfigChange('workingDayN1', value)} /><ConfigInput label="Working Day N+2" type="number" value={config.workingDayN2} onChange={(value) => onConfigChange('workingDayN2', value)} /><ConfigInput label="Working Day N+3" type="number" value={config.workingDayN3} onChange={(value) => onConfigChange('workingDayN3', value)} /></div>;
}
