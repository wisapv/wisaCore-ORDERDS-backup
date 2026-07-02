import { Activity, CheckCircle2, LoaderCircle, Server, XCircle } from 'lucide-react';
import Header from '../../components/Header.jsx';
import MinmaxActionPanel from './components/MinmaxActionPanel.jsx';
import MinmaxConfigPanel from './components/MinmaxConfigPanel.jsx';
import MinmaxResultCard from './components/MinmaxResultCard.jsx';
import MinmaxUploadGrid from './components/MinmaxUploadGrid.jsx';
import { TARGET_DOCKS } from './constants/minmaxConstants.js';
import { useMinmaxActions } from './hooks/useMinmaxActions.js';
import { useMinmaxFiles } from './hooks/useMinmaxFiles.js';
import { useMinmaxHealth } from './hooks/useMinmaxHealth.js';

const RESULT_CARDS = [
  ['validation', 'Validation Result', 'Awaiting upload validation'],
  ['preview', 'Preview Result', 'Awaiting file preview'],
  ['nqc', 'NQC Processing', 'Awaiting NQC processing'],
  ['partMaster', 'PartMaster Processing', 'Awaiting PartMaster processing'],
  ['freqLp', 'Freq_LP Processing', 'Awaiting Freq_LP processing'],
  ['orderSummary', 'Order Summary / BoxLayer Processing', 'Awaiting Order Summary processing'],
  ['setPart', 'SetPart Processing', 'Awaiting SetPart processing'],
  ['calBase', 'Cal Base Processing', 'Awaiting Cal Base processing'],
  ['minmax', 'Min-Max Calculation', 'Awaiting Min-Max calculation'],
  ['routeAudit', 'RouteCode Audit', 'Awaiting RouteCode audit'],
  ['addressMaster', 'AddressMaster Processing', 'Awaiting AddressMaster processing'],
];

export default function Minmax3MonthPage() {
  const health = useMinmaxHealth();
  const { files, config, handleFileChange, handleConfigChange } = useMinmaxFiles();
  const { actions, results, loading, anyLoading } = useMinmaxActions(files, config);
  const isConnected = health.status === 'connected';
  const isLoading = health.status === 'loading';

  return (
    <div className="flex flex-col h-full gap-6">
      <Header title="Min-Max 3 Month" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 shrink-0">
        <div className="xl:col-span-2 relative overflow-hidden bg-[#111111] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col justify-center group min-h-48">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-wisa-pink/10 rounded-full blur-3xl opacity-50 group-hover:bg-wisa-pink/20 transition-all duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 bg-white/5 border border-white/10 rounded-[24px]"><Activity className="text-wisa-pink" size={32} strokeWidth={1.5} /></div>
            <div className="flex flex-col w-full text-center md:text-left"><span className="text-wisa-pink text-[10px] font-bold tracking-[0.2em] uppercase mb-1">VBA-Parity Workflow</span><span className="text-white font-medium text-lg md:text-xl">Min-Max 3 Month Calculation</span><span className="text-white/40 text-xs mt-1">Upload, validate, audit RouteCode, stage Cal Base, and calculate Min-Max formulas.</span></div>
          </div>
        </div>
        <div className="xl:col-span-1 bg-[#111111] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex flex-col mb-6"><span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-3">Backend Connection</span><div className="bg-black/50 border border-white/5 rounded-2xl p-4 flex items-center gap-3">{isLoading && <LoaderCircle className="text-white/60 animate-spin" size={22} />}{isConnected && <CheckCircle2 className="text-emerald-400" size={22} />}{!isLoading && !isConnected && <XCircle className="text-red-400" size={22} />}<span className="text-white font-semibold text-sm">{health.message}</span></div></div>
          <div className="flex items-center gap-2 bg-wisa-pink/10 text-wisa-pink border border-wisa-pink/20 px-4 py-3 rounded-2xl text-xs font-bold tracking-widest uppercase"><Server size={16} /> {health.moduleName}</div>
        </div>
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -bottom-28 -left-28 w-72 h-72 bg-wisa-pink/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><span className="text-wisa-pink text-[10px] font-bold tracking-[0.2em] uppercase">Required Files</span><h2 className="text-lg md:text-xl font-bold text-white tracking-wide mt-1">Source File Upload</h2></div><div className="flex flex-wrap gap-2">{TARGET_DOCKS.map((dock) => <span key={dock} className="bg-wisa-pink/10 text-wisa-pink border border-wisa-pink/30 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase">{dock}</span>)}</div></div>
          <MinmaxUploadGrid files={files} onFileChange={handleFileChange} />
          <MinmaxConfigPanel config={config} onConfigChange={handleConfigChange} />
          <MinmaxActionPanel actions={actions} loading={loading} disabled={anyLoading} />
        </div>
      </div>

      {RESULT_CARDS.map(([key, title, emptyText]) => <MinmaxResultCard key={key} title={title} result={results[key]} emptyText={emptyText} />)}
    </div>
  );
}
