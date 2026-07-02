import { AlertTriangle, CheckCircle2, Circle, LoaderCircle } from 'lucide-react';
import { WORKFLOW_STEPS } from '../constants/minmaxConstants.js';

function statusFor(step, results, loading, files) {
  if (loading[step.key]) return 'loading';
  if (step.key === 'validation' && Object.values(files).every(Boolean) && !results.validation) return 'ready';
  const result = results[step.key];
  if (!result) return 'idle';
  if (!result.success) return 'error';
  if ((result.warnings?.length || 0) > 0 || (result.alarms?.length || 0) > 0 || result.recommendation?.status === 'NEEDS_REVIEW') return 'warning';
  return 'success';
}

const styles = {
  idle: 'border-slate-200 bg-white text-slate-400',
  ready: 'border-pink-200 bg-pink-50 text-wisa-pink',
  loading: 'border-pink-200 bg-pink-50 text-wisa-pink',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  error: 'border-red-200 bg-red-50 text-red-700',
};

function Icon({ status }) {
  if (status === 'loading') return <LoaderCircle className="animate-spin" size={18} />;
  if (status === 'success') return <CheckCircle2 size={18} />;
  if (status === 'warning' || status === 'error') return <AlertTriangle size={18} />;
  return <Circle size={18} />;
}

export default function MinmaxWorkflowStepper({ results, loading, files }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
      {WORKFLOW_STEPS.map((step, index) => {
        const status = statusFor(step, results, loading, files);
        return (
          <div key={step.key} className={`relative rounded-3xl border p-4 shadow-sm ${styles[status]}`}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"><Icon status={status} /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">Step {index + 1}</p>
                <p className="mt-1 font-bold text-slate-950">{step.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em]">{status === 'ready' ? 'Ready' : status}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
