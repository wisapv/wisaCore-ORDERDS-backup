import { Activity, ChevronDown, FileSpreadsheet, LoaderCircle, ShieldCheck } from 'lucide-react';
import { PRIMARY_ACTION_KEYS } from '../constants/minmaxConstants.js';

function ActionButton({ action, loading, disabled, primary = false }) {
  const isLoading = loading[action.key];
  return (
    <button type="button" onClick={action.onClick} disabled={disabled} className={`${primary ? 'border-wisa-pink bg-wisa-pink text-white shadow-lg shadow-pink-500/20 hover:bg-wisa-pink/90' : 'border-slate-200 bg-white text-slate-700 hover:border-wisa-pink/50 hover:text-wisa-pink'} flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 md:w-auto`}>
      {isLoading ? <><LoaderCircle className="animate-spin" size={16} /> {action.loadingLabel}</> : <>{action.key === 'routeAudit' ? <ShieldCheck size={16} /> : action.key === 'minmax' || action.key === 'calBase' ? <Activity size={16} /> : <FileSpreadsheet size={16} />} {action.label}</>}
    </button>
  );
}

export default function MinmaxActionPanel({ actions, loading, disabled }) {
  const primaryActions = PRIMARY_ACTION_KEYS.map((key) => actions.find((action) => action.key === key)).filter(Boolean);
  const advancedActions = actions.filter((action) => !PRIMARY_ACTION_KEYS.includes(action.key));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        {primaryActions.map((action, index) => <ActionButton key={action.key} action={action} loading={loading} disabled={disabled} primary={index === 0 || action.key === 'minmax'} />)}
      </div>
      <details className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-800 marker:hidden">
          Advanced stage tools <ChevronDown size={18} className="text-slate-400" />
        </summary>
        <div className="mt-4 flex flex-col flex-wrap gap-3 md:flex-row">
          {advancedActions.map((action) => <ActionButton key={action.key} action={action} loading={loading} disabled={disabled} />)}
        </div>
      </details>
    </div>
  );
}
