import { CheckCircle2, Database, LoaderCircle, Play, Server, Sparkles, XCircle } from 'lucide-react';
import Header from '../../components/Header.jsx';
import MinmaxActionPanel from './components/MinmaxActionPanel.jsx';
import MinmaxConfigPanel from './components/MinmaxConfigPanel.jsx';
import MinmaxResultCard from './components/MinmaxResultCard.jsx';
import MinmaxSectionCard from './components/MinmaxSectionCard.jsx';
import MinmaxStatusBadge from './components/MinmaxStatusBadge.jsx';
import MinmaxUploadGrid from './components/MinmaxUploadGrid.jsx';
import { REQUIRED_FILES, TARGET_DOCKS } from './constants/minmaxConstants.js';
import { useMinmaxActions } from './hooks/useMinmaxActions.js';
import { useMinmaxFiles } from './hooks/useMinmaxFiles.js';
import { useMinmaxHealth } from './hooks/useMinmaxHealth.js';

const RESULT_CARDS = [
  ['validation', 'Validation Result', 'Awaiting upload validation'],
  ['preview', 'Preview Result', 'Awaiting file preview'],
  ['calBase', 'Cal Base Processing', 'Awaiting Cal Base processing'],
  ['routeAudit', 'RouteCode Audit', 'Awaiting RouteCode audit', true],
  ['minmax', 'Min-Max Calculation', 'Awaiting Min-Max calculation'],
  ['nqc', 'NQC Processing', 'Awaiting NQC processing'],
  ['partMaster', 'PartMaster Processing', 'Awaiting PartMaster processing'],
  ['freqLp', 'Freq_LP Processing', 'Awaiting Freq_LP processing'],
  ['orderSummary', 'Order Summary / BoxLayer Processing', 'Awaiting Order Summary processing'],
  ['setPart', 'SetPart Processing', 'Awaiting SetPart processing'],
  ['addressMaster', 'AddressMaster Processing', 'Awaiting AddressMaster processing'],
];

function HealthStatus({ health }) {
  const iconByStatus = {
    connected: <CheckCircle2 className="text-emerald-400" size={20} />,
    loading: <LoaderCircle className="animate-spin text-white/60" size={20} />,
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/50 p-3">
      {iconByStatus[health.status] || <XCircle className="text-red-400" size={20} />}
      <span className="text-sm font-semibold text-white">{health.message}</span>
    </div>
  );
}

function ValidateButton({ action, isLoading, disabled }) {
  if (!action) return null;

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={disabled}
      className="w-full bg-wisa-pink text-white py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:shadow-[0_0_24px_rgba(233,30,140,0.4)] hover:bg-pink-500 transition-all duration-300 disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <LoaderCircle className="animate-spin" size={16} />
          {action.loadingLabel}
        </>
      ) : (
        <>
          <Play size={16} fill="currentColor" />
          Validate Files
        </>
      )}
    </button>
  );
}

export default function Minmax3MonthPage() {
  const health = useMinmaxHealth();
  const { files, config, handleFileChange, handleConfigChange } = useMinmaxFiles();
  const { actions, results, loading, anyLoading } = useMinmaxActions(files, config);
  const selectedCount = Object.values(files).filter(Boolean).length;
  const validateAction = actions.find((action) => action.key === 'validation');

  return (
    <div className="flex flex-col h-full gap-6">
      <Header title="Min-Max 3 Month" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 shrink-0">
        <div className="xl:col-span-2 relative overflow-hidden bg-[#111111] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col justify-center group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-wisa-pink/10 rounded-full blur-3xl opacity-50 group-hover:bg-wisa-pink/20 transition-all duration-700" />
          <div className="relative z-10 flex flex-col gap-5">
            <div>
              <span className="text-wisa-pink text-[10px] font-bold tracking-[0.2em] uppercase mb-2 flex items-center gap-1.5">
                <Sparkles size={12} />
                Min-Max Operation
              </span>
              <h1 className="text-white font-semibold text-xl md:text-2xl tracking-wide">Min-Max 3 Month</h1>
              <p className="text-white/45 text-xs md:text-sm mt-2 max-w-2xl">
                Upload source files, validate inputs, audit RouteCode, and calculate formulas.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 w-fit">
                <Database size={18} className="text-wisa-pink" />
                <span className="text-sm font-bold text-white">
                  {selectedCount}/{REQUIRED_FILES.length} selected
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Required files</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {TARGET_DOCKS.map((dock) => (
                  <span
                    key={dock}
                    className="bg-wisa-pink/10 text-wisa-pink border border-wisa-pink/30 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase"
                  >
                    {dock}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 bg-[#111111] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">Backend & Setup</span>
            <MinmaxStatusBadge tone="dark">
              <Server size={12} className="mr-1" />
              {health.moduleName}
            </MinmaxStatusBadge>
          </div>

          <HealthStatus health={health} />
          <MinmaxConfigPanel config={config} onConfigChange={handleConfigChange} variant="dark" showDocks={false} />
          <ValidateButton action={validateAction} isLoading={loading.validation} disabled={anyLoading} />
        </div>
      </div>

      <MinmaxSectionCard
        eyebrow="Required Files"
        title="Source Files"
        description="Upload the six required source files. Cards stay light for readability while preserving pink selected states."
      >
        <MinmaxUploadGrid files={files} onFileChange={handleFileChange} />
      </MinmaxSectionCard>

      <MinmaxSectionCard
        eyebrow="Workflow"
        title="Operational Actions"
        description="Run the recommended flow left to right. Advanced individual processors are available for stage-level checks."
      >
        <MinmaxActionPanel actions={actions} loading={loading} disabled={anyLoading} />
      </MinmaxSectionCard>

      <div className="grid grid-cols-1 gap-6 pb-6">
        {RESULT_CARDS.map(([key, title, emptyText, important]) => (
          <MinmaxResultCard
            key={key}
            title={title}
            result={results[key]}
            emptyText={emptyText}
            important={important}
          />
        ))}
      </div>
    </div>
  );
}
