import { CheckCircle2, Download, XCircle } from 'lucide-react';
import { useState } from 'react';
import MinmaxEmptyState from './MinmaxEmptyState.jsx';
import MinmaxPreviewTable from './MinmaxPreviewTable.jsx';
import MinmaxWarnings from './MinmaxWarnings.jsx';

const DATA_TABLE_COLUMNS = ['DOCK', 'PART #', 'Route', 'N1_PC_Min_Box', 'N1_PC_Max_Box', 'N1_LS_Min_Box', 'N1_LS_Max_Box', 'FormulaStatus'];

const METRIC_TONES = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

function MetricCard({ label, value, tone = 'neutral' }) {
  return (
    <div className={`rounded-2xl border p-4 ${METRIC_TONES[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value ?? '-'}</p>
    </div>
  );
}

const TABS = [
  { key: 'data', label: 'Data table' },
  { key: 'warnings', label: 'Warnings & alarms' },
  { key: 'export', label: 'Export' },
];

export default function MinmaxResultsPanel({ result }) {
  const [activeTab, setActiveTab] = useState('data');

  if (!result) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <MinmaxEmptyState message="ยังไม่ได้คำนวณ" suggestion="อัพโหลดไฟล์และกด Calculate Min-Max เพื่อดูผลลัพธ์ที่นี่" />
      </section>
    );
  }

  if (!result.success) {
    return (
      <section className="rounded-[28px] border border-red-200 bg-red-50 p-5 shadow-sm md:p-6">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 shrink-0 text-red-600" size={24} />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-red-800">{result.message || 'Min-Max calculation failed'}</h2>
            {result.errors?.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700">
                {result.errors.map((error, index) => <li key={index}>{typeof error === 'string' ? error : JSON.stringify(error)}</li>)}
              </ul>
            )}
          </div>
        </div>
      </section>
    );
  }

  const rows = result.rows || [];
  const warnings = result.warnings || [];
  const alarms = result.alarms || [];
  const warningAlarmCount = warnings.length + alarms.length;

  return (
    <section className="rounded-[28px] border border-wisa-pink/30 bg-white p-5 shadow-sm ring-4 ring-wisa-pink/5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold tracking-tight text-slate-950">Min-Max Calculation Result</h2>
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={18} /> {result.message || 'Calculated'}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Rows" value={result.summary?.outputRows} tone="neutral" />
        <MetricCard label="OK" value={result.summary?.okRows} tone="success" />
        <MetricCard label="Warnings" value={result.summary?.warningRows} tone="warning" />
        <MetricCard label="Errors" value={result.summary?.errorRows} tone="danger" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((tab) => {
          const label = tab.key === 'warnings' ? `${tab.label} (${warningAlarmCount})` : tab.label;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-t-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition ${isActive ? 'border-b-2 border-wisa-pink text-wisa-pink' : 'border-b-2 border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === 'data' && <MinmaxPreviewTable title="First 20 Min-Max Rows" rows={rows} columns={DATA_TABLE_COLUMNS} />}

      {activeTab === 'warnings' && (
        warningAlarmCount === 0 ? (
          <div className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <CheckCircle2 size={22} />
            <p className="font-semibold">ไม่พบ warning หรือ alarm</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <MinmaxWarnings warnings={warnings} alarms={alarms} />
          </div>
        )
      )}

      {activeTab === 'export' && (
        <div className="flex flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold uppercase tracking-widest text-slate-400"
          >
            <Download size={16} /> Export to Excel
          </button>
          <p className="text-sm text-slate-500">การ export เป็น Excel ยังไม่พร้อมใช้งาน</p>
        </div>
      )}
    </section>
  );
}
