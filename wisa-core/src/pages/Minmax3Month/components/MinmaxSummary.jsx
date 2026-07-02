function toneForKey(key) {
  const normalized = key.toLowerCase();
  if (normalized.includes('error') || normalized.includes('alarm') || normalized.includes('unresolved')) return 'border-red-200 bg-red-50 text-red-700';
  if (normalized.includes('warning') || normalized.includes('review')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized.includes('success') || normalized.includes('resolved')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized.includes('row') || normalized.includes('count')) return 'border-pink-200 bg-pink-50 text-wisa-pink';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function MinmaxSummary({ summary }) {
  const entries = Object.entries(summary || {}).filter(([, value]) => typeof value !== 'object');
  if (!entries.length) return null;
  return <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{entries.map(([key, value]) => <div key={key} className={`rounded-2xl border p-4 ${toneForKey(key)}`}><p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{key}</p><p className="mt-2 text-2xl font-black text-slate-950">{String(value)}</p></div>)}</div>;
}
