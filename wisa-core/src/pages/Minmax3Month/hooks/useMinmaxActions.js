import { useState } from 'react';
import { AUDIT_ROUTE_CODE_URL, CALCULATE_MINMAX_URL, PREVIEW_UPLOAD_URL, PROCESS_ADDRESS_MASTER_URL, PROCESS_CAL_BASE_URL, PROCESS_FREQ_LP_URL, PROCESS_NQC_URL, PROCESS_ORDER_SUMMARY_URL, PROCESS_PART_MASTER_URL, PROCESS_SET_PART_URL, REQUIRED_FILES, TARGET_DOCKS, VALIDATE_UPLOAD_URL } from '../constants/minmaxConstants.js';
import { buildMinmaxFormData } from '../utils/buildMinmaxFormData.js';

const connectionError = { success: false, message: 'Unable to connect to backend at localhost:3000.', errors: ['Please start the backend server and try again.'] };

export function useMinmaxActions(files, config) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const anyLoading = Object.values(loading).some(Boolean);
  const request = async (key, url, formDataBuilder) => {
    setLoading((current) => ({ ...current, [key]: true }));
    setResults((current) => ({ ...current, [key]: null }));
    try {
      const response = await fetch(url, { method: 'POST', body: formDataBuilder() });
      const result = await response.json();
      setResults((current) => ({ ...current, [key]: result }));
    } catch {
      setResults((current) => ({ ...current, [key]: connectionError }));
    }
    setLoading((current) => ({ ...current, [key]: false }));
  };
  const fullForm = () => buildMinmaxFormData(files, config);
  const singleFile = (fileKey) => {
    const formData = new FormData();
    const fieldDef = REQUIRED_FILES.find((item) => item.key === fileKey);
    if (fieldDef?.multiple) {
      (files[fileKey] || []).forEach((file) => formData.append(fileKey, file));
    } else if (files[fileKey]) {
      formData.append(fileKey, files[fileKey]);
    }
    formData.append('targetMonth', config.targetMonth);
    formData.append('workingDayN1', config.workingDayN1);
    formData.append('workingDayN2', config.workingDayN2);
    formData.append('workingDayN3', config.workingDayN3);
    formData.append('targetDocks', TARGET_DOCKS.join(','));
    return formData;
  };
  const actions = [
    { key: 'validation', label: 'Validate Files', loadingLabel: 'Validating...', onClick: () => request('validation', VALIDATE_UPLOAD_URL, fullForm) },
    { key: 'preview', label: 'Preview Files', loadingLabel: 'Previewing...', onClick: () => request('preview', PREVIEW_UPLOAD_URL, fullForm) },
    { key: 'addressMaster', label: 'Process AddressMaster', loadingLabel: 'Processing...', onClick: () => request('addressMaster', PROCESS_ADDRESS_MASTER_URL, () => singleFile('addressMaster')) },
    { key: 'nqc', label: 'Process NQC', loadingLabel: 'Processing NQC...', onClick: () => request('nqc', PROCESS_NQC_URL, () => singleFile('nqc')) },
    { key: 'partMaster', label: 'Process PartMaster', loadingLabel: 'Processing PartMaster...', onClick: () => request('partMaster', PROCESS_PART_MASTER_URL, () => singleFile('partMaster')) },
    { key: 'freqLp', label: 'Process Freq_LP', loadingLabel: 'Processing Freq_LP...', onClick: () => request('freqLp', PROCESS_FREQ_LP_URL, () => singleFile('freqLp')) },
    { key: 'orderSummary', label: 'Process Order Summary', loadingLabel: 'Processing Order Summary...', onClick: () => request('orderSummary', PROCESS_ORDER_SUMMARY_URL, () => singleFile('orderSummary')) },
    { key: 'setPart', label: 'Process SetPart', loadingLabel: 'Processing SetPart...', onClick: () => request('setPart', PROCESS_SET_PART_URL, () => singleFile('setPart')) },
    { key: 'calBase', label: 'Process Cal Base', loadingLabel: 'Processing Cal Base...', onClick: () => request('calBase', PROCESS_CAL_BASE_URL, fullForm) },
    { key: 'minmax', label: 'Calculate Min-Max', loadingLabel: 'Calculating Min-Max...', onClick: () => request('minmax', CALCULATE_MINMAX_URL, fullForm) },
    { key: 'routeAudit', label: 'Audit RouteCode', loadingLabel: 'Auditing RouteCode...', onClick: () => request('routeAudit', AUDIT_ROUTE_CODE_URL, fullForm) },
  ];
  return { actions, results, loading, anyLoading };
}
