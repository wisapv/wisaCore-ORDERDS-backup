import { Download, LoaderCircle, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import MinmaxConfigPanel from './components/MinmaxConfigPanel.jsx';
import MinmaxResultsPanel from './components/MinmaxResultsPanel.jsx';
import MinmaxSectionCard from './components/MinmaxSectionCard.jsx';
import MinmaxUploadGrid from './components/MinmaxUploadGrid.jsx';
import { REQUIRED_FILES, historyDownloadUrl } from './constants/minmaxConstants.js';
import { useMinmaxActions } from './hooks/useMinmaxActions.js';
import { useMinmaxFiles } from './hooks/useMinmaxFiles.js';

const CALCULATING_PROGRESS_LABELS = ['กำลังอ่านไฟล์...', 'กำลังจับคู่ข้อมูล...', 'กำลังคำนวณสูตร Min-Max...'];

function CalculateButton({ action, isLoading, disabled }) {
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return undefined;

    const interval = setInterval(() => {
      setProgressIndex((current) => (current + 1) % CALCULATING_PROGRESS_LABELS.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!action) return null;

  const handleClick = () => {
    setProgressIndex(0);
    action.onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="btn-dark w-full py-5 text-base font-bold tracking-widest uppercase disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-3"
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <LoaderCircle className="animate-spin" size={20} />
          {CALCULATING_PROGRESS_LABELS[progressIndex]}
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

function ExportButton({ result }) {
  const canExport = Boolean(result?.success && result?.historyId);

  if (canExport) {
    return (
      <a
        href={historyDownloadUrl(result.historyId)}
        className="btn-dark w-full py-5 text-base font-bold tracking-widest uppercase flex items-center justify-center gap-3"
      >
        <Download size={20} />
        Export to Excel
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      title="คำนวณ Min-Max ให้เสร็จก่อน ถึงจะ export เป็น Excel ได้"
      className="w-full bg-slate-100 text-slate-400 py-5 rounded-[24px] text-base font-bold tracking-widest uppercase cursor-not-allowed flex items-center justify-center gap-3"
    >
      <Download size={20} />
      Export to Excel
    </button>
  );
}

const REQUIRED_FILE_ERROR_MESSAGE = (key) => `${key} file is required`;

function buildFileErrors(results) {
  const relevantErrors = [...(results.validation?.errors || []), ...(results.minmax?.errors || [])];
  return REQUIRED_FILES.reduce((fileErrors, item) => {
    const match = relevantErrors.find((message) => message === REQUIRED_FILE_ERROR_MESSAGE(item.key));
    if (match) fileErrors[item.key] = match;
    return fileErrors;
  }, {});
}

export default function MinmaxCurrentTab({ onCalculateSuccess }) {
  const { files, config, handleFileChange, handleConfigChange } = useMinmaxFiles();
  const { actions, results, loading, anyLoading } = useMinmaxActions(files, config);
  const selectedCount = Object.values(files).filter(Boolean).length;
  const selectedFileLabel = `${selectedCount}/${REQUIRED_FILES.length} selected`;
  const minmaxAction = actions.find((action) => action.key === 'minmax');
  const fileErrors = buildFileErrors(results);

  useEffect(() => {
    if (results.minmax?.success) onCalculateSuccess?.();
  }, [results.minmax?.success, onCalculateSuccess]);

  return (
    <>
      <MinmaxSectionCard
        eyebrow="Setup"
        title="Upload & Configure"
        description="Upload the six required source files and set the calculation config, then run the full Min-Max calculation in one step."
        variant="soft"
      >
        <div className="flex flex-col gap-6">
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-bold text-slate-950">{selectedFileLabel}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Required files</span>
          </div>
          <MinmaxUploadGrid files={files} onFileChange={handleFileChange} fileErrors={fileErrors} />
          <MinmaxConfigPanel config={config} onConfigChange={handleConfigChange} />
        </div>
      </MinmaxSectionCard>

      <CalculateButton action={minmaxAction} isLoading={loading.minmax} disabled={anyLoading} />

      <MinmaxResultsPanel result={results.minmax} targetMonth={config.targetMonth} />

      <ExportButton result={results.minmax} />
    </>
  );
}
