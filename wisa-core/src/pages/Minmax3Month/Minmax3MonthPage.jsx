import { CheckCircle2, Database, LoaderCircle, Server, XCircle } from 'lucide-react';
import Header from '../../components/Header.jsx';
import MinmaxActionPanel from './components/MinmaxActionPanel.jsx';
import MinmaxConfigPanel from './components/MinmaxConfigPanel.jsx';
import MinmaxResultCard from './components/MinmaxResultCard.jsx';
import MinmaxSectionCard from './components/MinmaxSectionCard.jsx';
import MinmaxStatusBadge from './components/MinmaxStatusBadge.jsx';
import MinmaxUploadGrid from './components/MinmaxUploadGrid.jsx';
import MinmaxWorkflowStepper from './components/MinmaxWorkflowStepper.jsx';
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

function HealthIcon({ status }) {
  if (status === 'loading') return <LoaderCircle className="animate-spin text-slate-400" size={20} />;
  if (status === 'connected') return <CheckCircle2 className="text-emerald-500" size={20} />;
  return <XCircle className="text-red-500" size={20} />;
}

export default function Minmax3MonthPage() {
  const health = useMinmaxHealth();
  const { files, config, handleFileChange, handleConfigChange } = useMinmaxFiles();
  const { actions, results, loading, anyLoading } = useMinmaxActions(files, config);
  const selectedCount = Object.values(files).filter(Boolean).length;

  return (
    <div className="min-h-full bg-slate-50 text-slate-950">
      <Header title="Min-Max 3 Month" />
      <main className="flex flex-col gap-6 p-4 md:p-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr]">
            <div className="relative overflow-hidden bg-slate-950 p-6 text-white md:p-8">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-wisa-pink/20 blur-3xl" />
              <div className="relative z-10 max-w-3xl">
                <MinmaxStatusBadge tone="dark">VBA-Parity Module</MinmaxStatusBadge>
                <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">Min-Max 3 Month</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">Upload source files, validate inputs, audit RouteCode, and calculate Min-Max formulas.</p>
                <div className="mt-6 flex flex-wrap gap-2">{TARGET_DOCKS.map((dock) => <span key={dock} className="rounded-full border border-wisa-pink/30 bg-wisa-pink/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-pink-100">Dock {dock}</span>)}</div>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-3 xl:grid-cols-1 xl:p-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Backend status</p><div className="mt-3 flex items-center gap-3"><HealthIcon status={health.status} /><span className="text-sm font-bold text-slate-900">{health.message}</span></div></div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Module</p><div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-950"><Server size={17} className="text-wisa-pink" />{health.moduleName}</div></div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Required files</p><div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-950"><Database size={17} className="text-wisa-pink" />{selectedCount}/{REQUIRED_FILES.length} selected</div></div>
            </div>
          </div>
        </section>

        <MinmaxSectionCard eyebrow="Operational workflow" title="Run sequence" description="Follow the recommended path from upload through validation, Cal Base staging, RouteCode audit, and final Min-Max calculation.">
          <MinmaxWorkflowStepper results={results} loading={loading} files={files} />
        </MinmaxSectionCard>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
          <MinmaxSectionCard eyebrow="Required files" title="Source file upload" description="Each card maps to one backend form-data key. Choose a file from the card or drop it on the browser picker target."><MinmaxUploadGrid files={files} onFileChange={handleFileChange} /></MinmaxSectionCard>
          <MinmaxSectionCard eyebrow="Setup" title="Calculation configuration" description="Set the target month and working-day assumptions used by the existing Min-Max workflow."><MinmaxConfigPanel config={config} onConfigChange={handleConfigChange} /></MinmaxSectionCard>
        </div>

        <MinmaxSectionCard eyebrow="Actions" title="Workflow controls" description="Primary actions are ordered for operators. Detailed individual file processors remain available under advanced stage tools."><MinmaxActionPanel actions={actions} loading={loading} disabled={anyLoading} /></MinmaxSectionCard>

        <div className="grid grid-cols-1 gap-6">
          {RESULT_CARDS.map(([key, title, emptyText, important]) => <MinmaxResultCard key={key} title={title} result={results[key]} emptyText={emptyText} important={important} />)}
        </div>
      </main>
    </div>
  );
}
