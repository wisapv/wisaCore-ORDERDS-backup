import { FileSpreadsheet } from 'lucide-react';

export default function MinmaxEmptyState({ message, suggestion = 'Run the next workflow action to populate this section.' }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-400 shadow-sm"><FileSpreadsheet size={34} strokeWidth={1.5} /></div>
      <p className="text-sm font-semibold text-slate-700">{message}</p>
      <p className="max-w-md text-xs leading-5 text-slate-500">{suggestion}</p>
    </div>
  );
}
