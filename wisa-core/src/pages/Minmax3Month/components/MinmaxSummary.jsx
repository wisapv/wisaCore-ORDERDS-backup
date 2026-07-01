export default function MinmaxSummary({ summary }) {
  const entries = Object.entries(summary || {}).filter(([, value]) => typeof value !== 'object');
  if (!entries.length) return null;
  return <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{entries.map(([key, value]) => <div key={key} className="bg-black/40 border border-white/10 rounded-2xl p-4"><p className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">{key}</p><p className="text-white text-2xl font-bold mt-2">{String(value)}</p></div>)}</div>;
}
