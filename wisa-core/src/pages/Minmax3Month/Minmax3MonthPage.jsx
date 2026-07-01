import { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  Server,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import Header from '../../components/Header';

const HEALTH_URL = 'http://localhost:3000/api/minmax3month/health';
const VALIDATE_UPLOAD_URL = 'http://localhost:3000/api/minmax3month/validate-upload';
const PREVIEW_UPLOAD_URL = 'http://localhost:3000/api/minmax3month/preview-upload';
const PROCESS_ADDRESS_MASTER_URL = 'http://localhost:3000/api/minmax3month/process-address-master';
const PROCESS_NQC_URL = 'http://localhost:3000/api/minmax3month/process-nqc';
const PROCESS_PART_MASTER_URL = 'http://localhost:3000/api/minmax3month/process-part-master';
const PROCESS_FREQ_LP_URL = 'http://localhost:3000/api/minmax3month/process-freq-lp';
const PROCESS_ORDER_SUMMARY_URL = 'http://localhost:3000/api/minmax3month/process-order-summary';
const PROCESS_SET_PART_URL = 'http://localhost:3000/api/minmax3month/process-set-part';
const PROCESS_CAL_BASE_URL = 'http://localhost:3000/api/minmax3month/process-cal-base';
const CALCULATE_MINMAX_URL = 'http://localhost:3000/api/minmax3month/calculate-minmax';
const TARGET_DOCKS = ['S1', 'S4', 'SH'];

const REQUIRED_FILES = [
  { key: 'addressMaster', label: 'AddressMaster.txt', accept: '.txt' },
  { key: 'partMaster', label: 'PartMaster.txt', accept: '.txt' },
  { key: 'nqc', label: 'NQC.xlsx', accept: '.xlsx,.xls' },
  { key: 'freqLp', label: 'Freq_LP.xlsx', accept: '.xlsx,.xls' },
  { key: 'orderSummary', label: 'Order Sumary.txt', accept: '.txt' },
  { key: 'setPart', label: 'SetPart.txt', accept: '.txt' },
];

const INITIAL_FILES = REQUIRED_FILES.reduce((files, item) => {
  files[item.key] = null;
  return files;
}, {});

export default function Minmax3MonthPage() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Checking backend connection...');
  const [moduleName, setModuleName] = useState('minmax3month');
  const [files, setFiles] = useState(INITIAL_FILES);
  const [config, setConfig] = useState({
    targetMonth: '',
    workingDayN1: '',
    workingDayN2: '',
    workingDayN3: '',
  });
  const [validationResult, setValidationResult] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [addressMasterResult, setAddressMasterResult] = useState(null);
  const [nqcResult, setNqcResult] = useState(null);
  const [partMasterResult, setPartMasterResult] = useState(null);
  const [freqLpResult, setFreqLpResult] = useState(null);
  const [orderSummaryResult, setOrderSummaryResult] = useState(null);
  const [setPartResult, setSetPartResult] = useState(null);
  const [calBaseResult, setCalBaseResult] = useState(null);
  const [minmaxResult, setMinmaxResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isProcessingAddressMaster, setIsProcessingAddressMaster] = useState(false);
  const [isProcessingNqc, setIsProcessingNqc] = useState(false);
  const [isProcessingPartMaster, setIsProcessingPartMaster] = useState(false);
  const [isProcessingFreqLp, setIsProcessingFreqLp] = useState(false);
  const [isProcessingOrderSummary, setIsProcessingOrderSummary] = useState(false);
  const [isProcessingSetPart, setIsProcessingSetPart] = useState(false);
  const [isProcessingCalBase, setIsProcessingCalBase] = useState(false);
  const [isCalculatingMinmax, setIsCalculatingMinmax] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const response = await fetch(HEALTH_URL);
        const result = await response.json();

        if (!isMounted) return;

        if (response.ok && result.success) {
          setStatus('connected');
          setModuleName(result.module || 'minmax3month');
          setMessage('Backend connection is healthy.');
        } else {
          setStatus('error');
          setMessage('Backend responded, but the health check was not successful.');
        }
      } catch {
        if (!isMounted) return;
        setStatus('error');
        setMessage('Unable to connect to backend at localhost:3000.');
      }
    };

    checkHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileChange = (key, selectedFile) => {
    setFiles((currentFiles) => ({
      ...currentFiles,
      [key]: selectedFile || null,
    }));
  };

  const handleConfigChange = (key, value) => {
    setConfig((currentConfig) => ({
      ...currentConfig,
      [key]: value,
    }));
  };

  const buildUploadFormData = () => {
    const formData = new FormData();
    REQUIRED_FILES.forEach(({ key }) => {
      if (files[key]) {
        formData.append(key, files[key]);
      }
    });
    formData.append('targetMonth', config.targetMonth);
    formData.append('workingDayN1', config.workingDayN1);
    formData.append('workingDayN2', config.workingDayN2);
    formData.append('workingDayN3', config.workingDayN3);
    formData.append('targetDocks', TARGET_DOCKS.join(','));
    return formData;
  };

  const handleValidateFiles = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch(VALIDATE_UPLOAD_URL, {
        method: 'POST',
        body: buildUploadFormData(),
      });
      const result = await response.json();
      setValidationResult(result);
    } catch {
      setValidationResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsValidating(false);
  };

  const handlePreviewFiles = async () => {
    setIsPreviewing(true);
    setPreviewResult(null);

    try {
      const response = await fetch(PREVIEW_UPLOAD_URL, {
        method: 'POST',
        body: buildUploadFormData(),
      });
      const result = await response.json();
      setPreviewResult(result);
    } catch {
      setPreviewResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsPreviewing(false);
  };


  const handleProcessAddressMaster = async () => {
    setIsProcessingAddressMaster(true);
    setAddressMasterResult(null);

    const formData = new FormData();
    if (files.addressMaster) {
      formData.append('addressMaster', files.addressMaster);
    }
    formData.append('targetMonth', config.targetMonth);
    formData.append('targetDocks', TARGET_DOCKS.join(','));

    try {
      const response = await fetch(PROCESS_ADDRESS_MASTER_URL, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      setAddressMasterResult(result);
    } catch {
      setAddressMasterResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsProcessingAddressMaster(false);
  };


  const handleProcessNqc = async () => {
    setIsProcessingNqc(true);
    setNqcResult(null);

    const formData = new FormData();
    if (files.nqc) {
      formData.append('nqc', files.nqc);
    }
    formData.append('targetMonth', config.targetMonth);
    formData.append('workingDayN1', config.workingDayN1);
    formData.append('workingDayN2', config.workingDayN2);
    formData.append('workingDayN3', config.workingDayN3);

    try {
      const response = await fetch(PROCESS_NQC_URL, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      setNqcResult(result);
    } catch {
      setNqcResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsProcessingNqc(false);
  };


  const handleProcessPartMaster = async () => {
    setIsProcessingPartMaster(true);
    setPartMasterResult(null);

    const formData = new FormData();
    if (files.partMaster) {
      formData.append('partMaster', files.partMaster);
    }
    formData.append('targetMonth', config.targetMonth);
    formData.append('targetDocks', TARGET_DOCKS.join(','));

    try {
      const response = await fetch(PROCESS_PART_MASTER_URL, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      setPartMasterResult(result);
    } catch {
      setPartMasterResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsProcessingPartMaster(false);
  };


  const handleProcessFreqLp = async () => {
    setIsProcessingFreqLp(true);
    setFreqLpResult(null);

    const formData = new FormData();
    if (files.freqLp) {
      formData.append('freqLp', files.freqLp);
    }
    formData.append('targetDocks', TARGET_DOCKS.join(','));

    try {
      const response = await fetch(PROCESS_FREQ_LP_URL, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      setFreqLpResult(result);
    } catch {
      setFreqLpResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsProcessingFreqLp(false);
  };


  const handleProcessOrderSummary = async () => {
    setIsProcessingOrderSummary(true);
    setOrderSummaryResult(null);

    const formData = new FormData();
    if (files.orderSummary) {
      formData.append('orderSummary', files.orderSummary);
    }

    try {
      const response = await fetch(PROCESS_ORDER_SUMMARY_URL, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      setOrderSummaryResult(result);
    } catch {
      setOrderSummaryResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsProcessingOrderSummary(false);
  };

  const handleProcessSetPart = async () => {
    setIsProcessingSetPart(true);
    setSetPartResult(null);

    const formData = new FormData();
    if (files.setPart) {
      formData.append('setPart', files.setPart);
    }

    try {
      const response = await fetch(PROCESS_SET_PART_URL, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      setSetPartResult(result);
    } catch {
      setSetPartResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsProcessingSetPart(false);
  };


  const handleProcessCalBase = async () => {
    setIsProcessingCalBase(true);
    setCalBaseResult(null);

    try {
      const response = await fetch(PROCESS_CAL_BASE_URL, {
        method: 'POST',
        body: buildUploadFormData(),
      });
      const result = await response.json();
      setCalBaseResult(result);
    } catch {
      setCalBaseResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsProcessingCalBase(false);
  };


  const handleCalculateMinmax = async () => {
    setIsCalculatingMinmax(true);
    setMinmaxResult(null);

    try {
      const response = await fetch(CALCULATE_MINMAX_URL, {
        method: 'POST',
        body: buildUploadFormData(),
      });
      const result = await response.json();
      setMinmaxResult(result);
    } catch {
      setMinmaxResult({
        success: false,
        message: 'Unable to connect to backend at localhost:3000.',
        errors: ['Please start the backend server and try again.'],
      });
    }

    setIsCalculatingMinmax(false);
  };

  const isConnected = status === 'connected';
  const isLoading = status === 'loading';

  return (
    <div className="flex flex-col h-full gap-6">
      <Header title="Min-Max 3 Month" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 shrink-0">
        <div className="xl:col-span-2 relative overflow-hidden bg-[#111111] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col justify-center group min-h-48">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-wisa-pink/10 rounded-full blur-3xl opacity-50 group-hover:bg-wisa-pink/20 transition-all duration-700"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 bg-white/5 border border-white/10 rounded-[24px]">
              <Activity className="text-wisa-pink" size={32} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col w-full text-center md:text-left">
              <span className="text-wisa-pink text-[10px] font-bold tracking-[0.2em] uppercase mb-1">
                Upload Validation
              </span>
              <span className="text-white font-medium text-lg md:text-xl">
                Min-Max 3 Month Calculation
              </span>
              <span className="text-white/40 text-xs mt-1">
                Upload and validate the required source files before calculation logic is enabled.
              </span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 bg-[#111111] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex flex-col mb-6">
            <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
              Backend Connection
            </span>
            <div className="bg-black/50 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              {isLoading && <LoaderCircle className="text-white/60 animate-spin" size={22} />}
              {isConnected && <CheckCircle2 className="text-emerald-400" size={22} />}
              {!isLoading && !isConnected && <XCircle className="text-red-400" size={22} />}
              <span className="text-white font-semibold text-sm">{message}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-wisa-pink/10 text-wisa-pink border border-wisa-pink/20 px-4 py-3 rounded-2xl text-xs font-bold tracking-widest uppercase">
            <Server size={16} /> {moduleName}
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -bottom-28 -left-28 w-72 h-72 bg-wisa-pink/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-wisa-pink text-[10px] font-bold tracking-[0.2em] uppercase">
                Required Files
              </span>
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide mt-1">
                Source File Upload
              </h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {REQUIRED_FILES.map((item) => (
              <label
                key={item.key}
                className="bg-black/40 border border-white/10 rounded-3xl p-5 cursor-pointer hover:border-wisa-pink/50 hover:bg-wisa-pink/5 transition-all group"
              >
                <input
                  type="file"
                  accept={item.accept}
                  className="hidden"
                  onChange={(event) => handleFileChange(item.key, event.target.files?.[0])}
                />
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 group-hover:text-wisa-pink text-white/70 transition-colors">
                    <UploadCloud size={22} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{item.label}</p>
                    <p className="text-white/40 text-xs truncate">
                      {files[item.key] ? files[item.key].name : 'Choose file'}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <ConfigInput
              label="Target Month"
              placeholder="May-26"
              value={config.targetMonth}
              onChange={(value) => handleConfigChange('targetMonth', value)}
            />
            <ConfigInput
              label="Working Day N+1"
              type="number"
              value={config.workingDayN1}
              onChange={(value) => handleConfigChange('workingDayN1', value)}
            />
            <ConfigInput
              label="Working Day N+2"
              type="number"
              value={config.workingDayN2}
              onChange={(value) => handleConfigChange('workingDayN2', value)}
            />
            <ConfigInput
              label="Working Day N+3"
              type="number"
              value={config.workingDayN3}
              onChange={(value) => handleConfigChange('workingDayN3', value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              type="button"
              onClick={handleValidateFiles}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-wisa-pink text-white px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:shadow-[0_0_24px_rgba(233,30,140,0.4)] hover:bg-pink-500 transition-all duration-300 disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Validate Files
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePreviewFiles}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-white/15 hover:border-wisa-pink/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPreviewing ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Previewing...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} /> Preview Files
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleProcessAddressMaster}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-emerald-500/15 text-emerald-200 border border-emerald-400/20 px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-emerald-500/20 hover:border-emerald-300/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingAddressMaster ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Processing...
                </>
              ) : (
                <>
                  <Activity size={16} /> Process AddressMaster
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleProcessNqc}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-sky-500/15 text-sky-200 border border-sky-400/20 px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-sky-500/20 hover:border-sky-300/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingNqc ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Processing NQC...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} /> Process NQC
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleProcessPartMaster}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-violet-500/15 text-violet-200 border border-violet-400/20 px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-violet-500/20 hover:border-violet-300/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingPartMaster ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Processing PartMaster...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} /> Process PartMaster
                </>
              )}
            </button>


            <button
              type="button"
              onClick={handleProcessFreqLp}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-amber-500/15 text-amber-200 border border-amber-400/20 px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-amber-500/20 hover:border-amber-300/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingFreqLp ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Processing Freq_LP...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} /> Process Freq_LP
                </>
              )}
            </button>


            <button
              type="button"
              onClick={handleProcessOrderSummary}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-orange-500/15 text-orange-200 border border-orange-400/20 px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-orange-500/20 hover:border-orange-300/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingOrderSummary ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Processing Order Summary...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} /> Process Order Summary
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleProcessSetPart}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-teal-500/15 text-teal-200 border border-teal-400/20 px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-teal-500/20 hover:border-teal-300/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingSetPart ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Processing SetPart...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} /> Process SetPart
                </>
              )}
            </button>


            <button
              type="button"
              onClick={handleProcessCalBase}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-wisa-pink/15 text-wisa-pink border border-wisa-pink/30 px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-wisa-pink/20 hover:border-wisa-pink/50 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingCalBase ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Processing Cal Base...
                </>
              ) : (
                <>
                  <Activity size={16} /> Process Cal Base
                </>
              )}
            </button>


            <button
              type="button"
              onClick={handleCalculateMinmax}
              disabled={isValidating || isPreviewing || isProcessingAddressMaster || isProcessingNqc || isProcessingPartMaster || isProcessingFreqLp || isProcessingOrderSummary || isProcessingSetPart || isProcessingCalBase || isCalculatingMinmax}
              className="w-full md:w-fit bg-emerald-500/15 text-emerald-200 border border-emerald-400/20 px-8 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-emerald-500/20 hover:border-emerald-300/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCalculatingMinmax ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Calculating Min-Max...
                </>
              ) : (
                <>
                  <Activity size={16} /> Calculate Min-Max
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Validation Result</h2>
          {validationResult && (
            <span
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${
                validationResult.success
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20'
                  : 'bg-red-500/10 text-red-300 border-red-400/20'
              }`}
            >
              {validationResult.success ? 'Passed' : 'Failed'}
            </span>
          )}
        </div>

        {!validationResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5">
              <FileSpreadsheet size={48} strokeWidth={1} />
            </div>
            <p className="text-sm font-medium tracking-wide">Awaiting upload validation</p>
          </div>
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{validationResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">
              {JSON.stringify(validationResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Preview Result</h2>
          {previewResult && (
            <span
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${
                previewResult.success
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20'
                  : 'bg-red-500/10 text-red-300 border-red-400/20'
              }`}
            >
              {previewResult.success ? 'Completed' : 'Failed'}
            </span>
          )}
        </div>

        {!previewResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5">
              <FileSpreadsheet size={48} strokeWidth={1} />
            </div>
            <p className="text-sm font-medium tracking-wide">Awaiting file preview</p>
          </div>
        ) : previewResult.success ? (
          <PreviewResult result={previewResult} />
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{previewResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">
              {JSON.stringify(previewResult, null, 2)}
            </pre>
          </div>
        )}
      </div>


      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">NQC Processing</h2>
          {nqcResult && (
            <span
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${
                nqcResult.success
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20'
                  : 'bg-red-500/10 text-red-300 border-red-400/20'
              }`}
            >
              {nqcResult.success ? 'Processed' : 'Failed'}
            </span>
          )}
        </div>

        {!nqcResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5">
              <FileSpreadsheet size={48} strokeWidth={1} />
            </div>
            <p className="text-sm font-medium tracking-wide">Awaiting NQC processing</p>
          </div>
        ) : nqcResult.success ? (
          <NqcProcessResult result={nqcResult} />
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{nqcResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">
              {JSON.stringify(nqcResult, null, 2)}
            </pre>
          </div>
        )}
      </div>


      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">PartMaster Processing</h2>
          {partMasterResult && (
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${partMasterResult.success ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-red-500/10 text-red-300 border-red-400/20'}`}>
              {partMasterResult.success ? 'Processed' : 'Failed'}
            </span>
          )}
        </div>

        {!partMasterResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5"><FileSpreadsheet size={48} strokeWidth={1} /></div>
            <p className="text-sm font-medium tracking-wide">Awaiting PartMaster processing</p>
          </div>
        ) : partMasterResult.success ? (
          <GenericProcessResult result={partMasterResult} title="First 20 Processed PartMaster Rows" />
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{partMasterResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">{JSON.stringify(partMasterResult, null, 2)}</pre>
          </div>
        )}
      </div>


      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Freq_LP Processing</h2>
          {freqLpResult && (
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${freqLpResult.success ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-red-500/10 text-red-300 border-red-400/20'}`}>
              {freqLpResult.success ? 'Processed' : 'Failed'}
            </span>
          )}
        </div>

        {!freqLpResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5"><FileSpreadsheet size={48} strokeWidth={1} /></div>
            <p className="text-sm font-medium tracking-wide">Awaiting Freq_LP processing</p>
          </div>
        ) : freqLpResult.success ? (
          <GenericProcessResult result={freqLpResult} title="First 20 Processed Freq_LP Rows" />
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{freqLpResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">{JSON.stringify(freqLpResult, null, 2)}</pre>
          </div>
        )}
      </div>


      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Order Summary / BoxLayer Processing</h2>
          {orderSummaryResult && (
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${orderSummaryResult.success ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-red-500/10 text-red-300 border-red-400/20'}`}>
              {orderSummaryResult.success ? 'Processed' : 'Failed'}
            </span>
          )}
        </div>

        {!orderSummaryResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5"><FileSpreadsheet size={48} strokeWidth={1} /></div>
            <p className="text-sm font-medium tracking-wide">Awaiting Order Summary processing</p>
          </div>
        ) : orderSummaryResult.success ? (
          <GenericProcessResult result={orderSummaryResult} title="First 20 Processed Order Summary / BoxLayer Rows" />
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{orderSummaryResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">{JSON.stringify(orderSummaryResult, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">SetPart Processing</h2>
          {setPartResult && (
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${setPartResult.success ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-red-500/10 text-red-300 border-red-400/20'}`}>
              {setPartResult.success ? 'Processed' : 'Failed'}
            </span>
          )}
        </div>

        {!setPartResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5"><FileSpreadsheet size={48} strokeWidth={1} /></div>
            <p className="text-sm font-medium tracking-wide">Awaiting SetPart processing</p>
          </div>
        ) : setPartResult.success ? (
          <GenericProcessResult result={setPartResult} title="First 20 Processed SetPart Rows" />
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{setPartResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">{JSON.stringify(setPartResult, null, 2)}</pre>
          </div>
        )}
      </div>


      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Cal Base Processing</h2>
          {calBaseResult && (
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${calBaseResult.success ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-red-500/10 text-red-300 border-red-400/20'}`}>
              {calBaseResult.success ? 'Processed' : 'Failed'}
            </span>
          )}
        </div>

        {!calBaseResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5"><Activity size={48} strokeWidth={1} /></div>
            <p className="text-sm font-medium tracking-wide">Awaiting Cal Base processing</p>
          </div>
        ) : calBaseResult.success ? (
          <GenericProcessResult result={calBaseResult} title="First 20 Cal Base Rows" />
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{calBaseResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">{JSON.stringify(calBaseResult, null, 2)}</pre>
          </div>
        )}
      </div>


      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Min-Max Calculation</h2>
          {minmaxResult && (
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${minmaxResult.success ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-red-500/10 text-red-300 border-red-400/20'}`}>
              {minmaxResult.success ? 'Calculated' : 'Failed'}
            </span>
          )}
        </div>

        {!minmaxResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5"><Activity size={48} strokeWidth={1} /></div>
            <p className="text-sm font-medium tracking-wide">Awaiting Min-Max calculation</p>
          </div>
        ) : minmaxResult.success ? (
          <GenericProcessResult result={minmaxResult} title="First 20 Min-Max Rows" />
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{minmaxResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">{JSON.stringify(minmaxResult, null, 2)}</pre>
          </div>
        )}
      </div>


      <div className="bg-[#111111] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-1 min-h-64">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">AddressMaster Processing</h2>
          {addressMasterResult && (
            <span
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border ${
                addressMasterResult.success
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20'
                  : 'bg-red-500/10 text-red-300 border-red-400/20'
              }`}
            >
              {addressMasterResult.success ? 'Processed' : 'Failed'}
            </span>
          )}
        </div>

        {!addressMasterResult ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/5">
              <Activity size={48} strokeWidth={1} />
            </div>
            <p className="text-sm font-medium tracking-wide">Awaiting AddressMaster processing</p>
          </div>
        ) : addressMasterResult.success ? (
          <AddressMasterProcessResult result={addressMasterResult} />
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-auto custom-scrollbar">
            <p className="text-white font-semibold mb-3">{addressMasterResult.message}</p>
            <pre className="text-white/60 text-xs leading-6 whitespace-pre-wrap">
              {JSON.stringify(addressMasterResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}

function ConfigInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label className="flex flex-col gap-3">
      <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">{label}</span>
      <input
        type={type}
        min={type === 'number' ? '1' : undefined}
        step={type === 'number' ? '1' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="bg-black/50 border border-white/5 rounded-2xl p-4 text-white font-semibold text-sm outline-none placeholder:text-white/20 focus:border-wisa-pink/50 transition-colors"
      />
    </label>
  );
}


function PreviewResult({ result }) {
  const fileEntries = Object.entries(result.files || {});

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-white font-semibold">{result.message}</p>
        {result.warnings?.length > 0 && (
          <div className="mt-3 bg-amber-500/10 border border-amber-400/20 text-amber-200 rounded-2xl p-4 text-sm">
            <p className="font-bold mb-2">Warnings</p>
            <ul className="list-disc pl-5 space-y-1">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {fileEntries.map(([key, value]) => (
        <FilePreview key={key} name={key} data={value} />
      ))}
    </div>
  );
}

function FilePreview({ name, data }) {
  if (data.sheets) {
    return (
      <div className="bg-black/40 border border-white/10 rounded-3xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <h3 className="text-white font-bold tracking-wide">{name}</h3>
          <span className="text-white/40 text-xs">Sheets: {data.sheetNames?.join(', ') || '-'}</span>
        </div>
        <div className="flex flex-col gap-4">
          {data.sheets.map((sheet) => (
            <PreviewTable key={sheet.sheetName} title={sheet.sheetName} data={sheet} />
          ))}
        </div>
      </div>
    );
  }

  return <PreviewTable title={data.sheetName ? `${name} / ${data.sheetName}` : name} data={data} />;
}

function PreviewTable({ title, data }) {
  const previewRows = data.previewRows || [];
  const columns = data.columns || [];

  return (
    <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-white font-bold tracking-wide">{title}</h3>
          <p className="text-white/40 text-xs mt-1">{data.rowCount ?? 0} rows</p>
        </div>
        {data.missingColumns?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.missingColumns.map((column) => (
              <span key={column} className="bg-red-500/10 text-red-300 border border-red-400/20 px-2 py-1 rounded-lg text-[10px] font-bold">
                Missing: {column}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-auto custom-scrollbar">
        {previewRows.length === 0 ? (
          <p className="text-white/30 text-sm py-6 text-center">No preview rows detected</p>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={`${column}-${index}`} className="px-3 py-3 text-white/30 uppercase tracking-widest border-b border-white/10 whitespace-nowrap">
                    {column || `Column ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-white/70">
              {previewRows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="hover:bg-white/[0.02]">
                  {columns.map((column, columnIndex) => (
                    <td key={`${column}-${columnIndex}`} className="px-3 py-3 border-b border-white/5 whitespace-nowrap">
                      {row[column || `Column ${columnIndex + 1}`] || <span className="text-white/20">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


function AddressMasterProcessResult({ result }) {
  const summaryEntries = Object.entries(result.summary || {}).filter(([key]) =>
    ['rawRows', 'effectiveRows', 'targetDockRows', 'outputRows'].includes(key),
  );
  const rows = (result.rows || []).slice(0, 20);
  const columns = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {summaryEntries.map(([key, value]) => (
          <div key={key} className="bg-black/40 border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">{key}</p>
            <p className="text-white text-2xl font-bold mt-2">{value}</p>
          </div>
        ))}
      </div>

      {result.warnings?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-400/20 text-amber-200 rounded-2xl p-4 text-sm">
          <p className="font-bold mb-2">Warnings</p>
          <ul className="list-disc pl-5 space-y-1">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <h3 className="text-white font-bold tracking-wide">First 20 Processed Rows</h3>
          <span className="text-white/40 text-xs">
            Target month end: {result.summary?.targetMonthEnd || '-'} / Docks: {result.summary?.targetDocks?.join(', ') || '-'}
          </span>
        </div>
        <div className="overflow-auto custom-scrollbar">
          {rows.length === 0 ? (
            <p className="text-white/30 text-sm py-6 text-center">No processed rows</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-3 py-3 text-white/30 uppercase tracking-widest border-b border-white/10 whitespace-nowrap">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-white/70">
                {rows.map((row, rowIndex) => (
                  <tr key={`address-master-${rowIndex}`} className="hover:bg-white/[0.02]">
                    {columns.map((column) => (
                      <td key={column} className="px-3 py-3 border-b border-white/5 whitespace-nowrap">
                        {row[column] ?? <span className="text-white/20">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}



function GenericProcessResult({ result, title }) {
  const summaryEntries = Object.entries(result.summary || {}).filter(([, value]) => typeof value !== 'object');
  const rows = (result.rows || []).slice(0, 20);
  const columns = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {summaryEntries.map(([key, value]) => (
          <div key={key} className="bg-black/40 border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">{key}</p>
            <p className="text-white text-2xl font-bold mt-2">{value}</p>
          </div>
        ))}
      </div>
      {result.warnings?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-400/20 text-amber-200 rounded-2xl p-4 text-sm">
          <p className="font-bold mb-2">Warnings</p>
          <ul className="list-disc pl-5 space-y-1">
            {result.warnings.map((warning, index) => (
              <li key={`warning-${index}`}>{typeof warning === 'string' ? warning : JSON.stringify(warning)}</li>
            ))}
          </ul>
        </div>
      )}
      {result.alarms?.length > 0 && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-200 rounded-2xl p-4 text-sm">
          <p className="font-bold mb-2">Alarms</p>
          <ul className="list-disc pl-5 space-y-1">
            {result.alarms.map((alarm, index) => (
              <li key={`alarm-${index}`}>{typeof alarm === 'string' ? alarm : JSON.stringify(alarm)}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-hidden">
        <h3 className="text-white font-bold tracking-wide mb-4">{title}</h3>
        <div className="overflow-auto custom-scrollbar">
          {rows.length === 0 ? <p className="text-white/30 text-sm py-6 text-center">No processed rows</p> : (
            <table className="w-full text-left border-collapse text-xs">
              <thead><tr>{columns.map((column) => <th key={column} className="px-3 py-3 text-white/30 uppercase tracking-widest border-b border-white/10 whitespace-nowrap">{column}</th>)}</tr></thead>
              <tbody className="text-white/70">{rows.map((row, rowIndex) => (
                <tr key={`generic-${rowIndex}`} className="hover:bg-white/[0.02]">{columns.map((column) => <td key={column} className="px-3 py-3 border-b border-white/5 whitespace-nowrap">{row[column] ?? <span className="text-white/20">-</span>}</td>)}</tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function NqcProcessResult({ result }) {
  const summaryEntries = Object.entries(result.summary || {}).filter(([key]) =>
    ['rawRows', 'processedRows', 'workingDayN1', 'workingDayN2', 'workingDayN3'].includes(key),
  );
  const rows = (result.rows || []).slice(0, 20);
  const columns = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {summaryEntries.map(([key, value]) => (
          <div key={key} className="bg-black/40 border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">{key}</p>
            <p className="text-white text-2xl font-bold mt-2">{value}</p>
          </div>
        ))}
      </div>

      {result.warnings?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-400/20 text-amber-200 rounded-2xl p-4 text-sm">
          <p className="font-bold mb-2">Warnings</p>
          <ul className="list-disc pl-5 space-y-1">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <h3 className="text-white font-bold tracking-wide">First 20 Processed NQC Rows</h3>
          <span className="text-white/40 text-xs">Sheet: {result.summary?.sheetName || '-'}</span>
        </div>
        <div className="overflow-auto custom-scrollbar">
          {rows.length === 0 ? (
            <p className="text-white/30 text-sm py-6 text-center">No processed NQC rows</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-3 py-3 text-white/30 uppercase tracking-widest border-b border-white/10 whitespace-nowrap">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-white/70">
                {rows.map((row, rowIndex) => (
                  <tr key={`nqc-${rowIndex}`} className="hover:bg-white/[0.02]">
                    {columns.map((column) => (
                      <td key={column} className="px-3 py-3 border-b border-white/5 whitespace-nowrap">
                        {row[column] ?? <span className="text-white/20">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
