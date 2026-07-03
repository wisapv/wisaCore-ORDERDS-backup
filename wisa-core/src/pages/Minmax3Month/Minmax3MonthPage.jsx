import { CheckCircle2, ChevronDown, LoaderCircle, Play, Server, XCircle } from 'lucide-react';
import Header from '../../components/Header.jsx';
import MinmaxActionPanel from './components/MinmaxActionPanel.jsx';
import MinmaxConfigPanel from './components/MinmaxConfigPanel.jsx';
import MinmaxResultCard from './components/MinmaxResultCard.jsx';
import MinmaxSectionCard from './components/MinmaxSectionCard.jsx';
import MinmaxStatusBadge from './components/MinmaxStatusBadge.jsx';
import MinmaxUploadGrid from './components/MinmaxUploadGrid.jsx';
import { REQUIRED_FILES } from './constants/minmaxConstants.js';
import { useMinmaxActions } from './hooks/useMinmaxActions.js';
import { useMinmaxFiles } from './hooks/useMinmaxFiles.js';
import { useMinmaxHealth } from './hooks/useMinmaxHealth.js';

const DEBUG_RESULT_CARDS = [
  ['validation', 'Validation Result', 'Awaiting upload validation'],
  ['preview', 'Preview Result', 'Awaiting file preview'],
  ['calBase', 'Cal Base Processing', 'Awaiting Cal Base processing'],
  ['routeAudit', 'RouteCode Audit', 'Awaiting RouteCode audit', true],
  ['addressMaster', 'AddressMaster Processing', 'Awaiting AddressMaster processing'],
  ['nqc', 'NQC Processing', 'Awaiting NQC processing'],
  ['partMaster', 'PartMaster Processing', 'Awaiting PartMaster processing'],
  ['freqLp', 'Freq_LP Processing', 'Awaiting Freq_LP processing'],
  ['orderSummary', 'Order Summary / BoxLayer Processing', 'Awaiting Order Summary processing'],
  ['setPart', 'SetPart Processing', 'Awaiting SetPart processing'],
];

function HealthPill({ health }) {
  const tone = health.status === 'connected' ? 'success' : health.status === 'loading' ? 'idle' : 'error';
  const Icon = health.status === 'connected' ? CheckCircle2 : health.status === 'loading' ? LoaderCircle : XCircle;
  return (
    <MinmaxStatusBadge tone={tone} className="gap-1.5">
      <Icon size={12} className={health.status === 'loading' ? 'animate-spin' : ''} />
      <Server size={12} />
      {health.message}
    </MinmaxStatusBadge>
  );
}

function CalculateButton({ action, isLoading, disabled }) {
  if (!action) return null;

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={disabled}
      className="w-full bg-wisa-pink text-white py-5 rounded-[24px] text-base font-bold tracking-widest uppercase hover:shadow-[0_0_28px_rgba(233,30,140,0.4)] hover:bg-pink-500 transition-all duration-300 disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-3"
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <LoaderCircle className="animate-spin" size={20} />
          {action.loadingLabel}
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <Play size={20} fill="currentColor" />
          Calculate Min-Max
        </span>
      )}
    </button>
  );
}

export default function Minmax3MonthPage() {
  const health = useMinmaxHealth();
  const { files, config, handleFileChange, handleConfigChange } = useMinmaxFiles();
  const { actions, results, loading, anyLoading } = useMinmaxActions(files, config);
  const selectedCount = Object.values(files).filter(Boolean).length;
  const selectedFileLabel = `${selectedCount}/${REQUIRED_FILES.length} selected`;
  const minmaxAction = actions.find((action) => action.key === 'minmax');
  const debugActions = actions.filter((action) => action.key !== 'minmax');

  return (
    <div className="min-h-full bg-slate-50 text-slate-950 flex flex-col gap-6">
      <Header title="Min-Max 3 Month" />

      <div className="-mt-4 flex justify-end">
        <HealthPill health={health} />
      </div>

      <MinmaxSectionCard
        eyebrow="Setup"
        title="Upload & Configure"
        description="Upload the six required source files and set the calculation config, then run the full Min-Max calculation in one step."
      >
        <div className="flex flex-col gap-6">
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-bold text-slate-950">{selectedFileLabel}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Required files</span>
          </div>
          <MinmaxUploadGrid files={files} onFileChange={handleFileChange} />
          <MinmaxConfigPanel config={config} onConfigChange={handleConfigChange} />
        </div>
      </MinmaxSectionCard>

      <CalculateButton action={minmaxAction} isLoading={loading.minmax} disabled={anyLoading} />

      <div id="main-result-slot" />

      <details className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 marker:hidden">
          Advanced tools for debugging individual files
          <ChevronDown size={18} className="text-slate-400" />
        </summary>
        <div className="mt-5 flex flex-col gap-6">
          <MinmaxActionPanel actions={debugActions} loading={loading} disabled={anyLoading} wrapInDetails={false} />
          <div className="flex flex-col gap-6">
            {DEBUG_RESULT_CARDS.filter(([key]) => results[key]).map(([key, title, emptyText, important]) => (
              <MinmaxResultCard key={key} title={title} result={results[key]} emptyText={emptyText} important={important} />
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
