import { Activity, FileSpreadsheet, LoaderCircle } from 'lucide-react';

export default function MinmaxActionPanel({ actions, loading, disabled }) {
  return <div className="flex flex-col md:flex-row flex-wrap gap-3">{actions.map((action, index) => <button key={action.key} type="button" onClick={action.onClick} disabled={disabled} className={`${index === 0 ? 'bg-wisa-pink text-white border-wisa-pink' : 'bg-white/10 text-white border-white/10'} w-full md:w-fit border px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-white/15 hover:border-wisa-pink/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2`}>{loading[action.key] ? <><LoaderCircle className="animate-spin" size={16} /> {action.loadingLabel}</> : <>{action.key === 'minmax' || action.key === 'calBase' ? <Activity size={16} /> : <FileSpreadsheet size={16} />} {action.label}</>}</button>)}</div>;
}
