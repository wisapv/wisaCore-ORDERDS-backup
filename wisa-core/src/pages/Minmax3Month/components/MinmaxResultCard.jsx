import { CheckCircle2, Route, XCircle } from 'lucide-react';
import MinmaxEmptyState from './MinmaxEmptyState.jsx';
import MinmaxPreviewTable from './MinmaxPreviewTable.jsx';
import MinmaxStatusBadge from './MinmaxStatusBadge.jsx';
import MinmaxSummary from './MinmaxSummary.jsx';
import MinmaxWarnings from './MinmaxWarnings.jsx';

function getCount(result, names) {
  for (const name of names) {
    if (result?.[name] !== undefined) return result[name];
    if (result?.summary?.[name] !== undefined) return result.summary[name];
    if (result?.recommendation?.[name] !== undefined) return result.recommendation[name];
  }
  return '-';
}

function RouteAuditPanel({ result }) {
  const recommendation = result?.recommendation || {};
  if (!result?.recommendation && !result?.candidates) return null;
  const needsReview = recommendation.status === 'NEEDS_REVIEW';
  const confirmed = recommendation.status === 'CONFIRMED';
  return (
    <div className={`rounded-3xl border p-5 ${needsReview ? 'border-amber-200 bg-amber-50' : confirmed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><div className="rounded-2xl bg-white p-3 text-wisa-pink shadow-sm"><Route size={22} /></div><div><p className="text-sm font-black text-slate-950">RouteCode Audit Recommendation</p><p className="text-xs text-slate-600">Review before export or final confidence.</p></div></div>
        <MinmaxStatusBadge tone={needsReview ? 'warning' : confirmed ? 'success' : 'idle'}>{recommendation.status || 'Not reported'}</MinmaxStatusBadge>
      </div>
      {needsReview && <p className="mb-4 rounded-2xl border border-amber-200 bg-white p-3 text-sm font-semibold text-amber-800">RouteCode status needs review. Confirm the candidate field and unresolved route rows before trusting final output.</p>}
      {confirmed && <p className="mb-4 rounded-2xl border border-emerald-200 bg-white p-3 text-sm font-semibold text-emerald-800">RouteCode status is confirmed. Routing confidence is ready for downstream review.</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[['Status', recommendation.status || '-'], ['Best field', recommendation.bestCandidateField || result.bestCandidateField || '-'], ['Resolved rows', getCount(result, ['routeResolvedRows', 'resolvedRows'])], ['Unresolved rows', getCount(result, ['routeUnresolvedRows', 'unresolvedRows'])]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white bg-white/80 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 text-lg font-black text-slate-950">{String(value)}</p></div>)}
      </div>
      {(result.candidates || recommendation.distribution || result.distribution) && <pre className="mt-4 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-700">{JSON.stringify({ distribution: recommendation.distribution || result.distribution, candidates: result.candidates }, null, 2)}</pre>}
    </div>
  );
}

export default function MinmaxResultCard({ title, result, emptyText, important = false }) {
  const rows = result?.rows || [];
  const warningCount = (result?.warnings?.length || 0) + (result?.alarms?.length || 0);
  return (
    <section className={`rounded-[28px] border bg-white p-5 shadow-sm md:p-6 ${important ? 'border-wisa-pink/30 ring-4 ring-wisa-pink/5' : 'border-slate-200'}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        {result && <MinmaxStatusBadge tone={result.success ? (warningCount ? 'warning' : 'success') : 'error'}>{result.success ? (warningCount ? 'Done with warnings' : 'Done') : 'Failed'}</MinmaxStatusBadge>}
      </div>
      {!result ? <MinmaxEmptyState message={emptyText} /> : result.success ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">{warningCount ? <XCircle className="mt-0.5 text-amber-600" size={20} /> : <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />}<p className="font-semibold text-slate-800">{result.message}</p></div>
          <MinmaxSummary summary={result.summary} />
          <MinmaxWarnings warnings={result.warnings} alarms={result.alarms} />
          <RouteAuditPanel result={result} />
          {result.files && <pre className="overflow-auto rounded-3xl border border-slate-200 bg-slate-950 p-5 text-xs leading-6 text-slate-100">{JSON.stringify({ files: result.files }, null, 2)}</pre>}
          <MinmaxPreviewTable title={`First 20 ${title} Rows`} rows={rows} />
        </div>
      ) : <div className="overflow-auto rounded-3xl border border-red-200 bg-red-50 p-5 custom-scrollbar"><p className="mb-3 font-semibold text-red-800">{result.message}</p><pre className="whitespace-pre-wrap text-xs leading-6 text-red-700">{JSON.stringify(result, null, 2)}</pre></div>}
    </section>
  );
}
