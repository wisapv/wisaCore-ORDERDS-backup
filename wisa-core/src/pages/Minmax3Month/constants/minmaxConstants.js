export const HEALTH_URL = 'http://localhost:3000/api/minmax3month/health';
export const VALIDATE_UPLOAD_URL = 'http://localhost:3000/api/minmax3month/validate-upload';
export const PREVIEW_UPLOAD_URL = 'http://localhost:3000/api/minmax3month/preview-upload';
export const PROCESS_ADDRESS_MASTER_URL = 'http://localhost:3000/api/minmax3month/process-address-master';
export const PROCESS_NQC_URL = 'http://localhost:3000/api/minmax3month/process-nqc';
export const PROCESS_PART_MASTER_URL = 'http://localhost:3000/api/minmax3month/process-part-master';
export const PROCESS_FREQ_LP_URL = 'http://localhost:3000/api/minmax3month/process-freq-lp';
export const PROCESS_ORDER_SUMMARY_URL = 'http://localhost:3000/api/minmax3month/process-order-summary';
export const PROCESS_SET_PART_URL = 'http://localhost:3000/api/minmax3month/process-set-part';
export const PROCESS_CAL_BASE_URL = 'http://localhost:3000/api/minmax3month/process-cal-base';
export const CALCULATE_MINMAX_URL = 'http://localhost:3000/api/minmax3month/calculate-minmax';
export const AUDIT_ROUTE_CODE_URL = 'http://localhost:3000/api/minmax3month/audit-route-code';
export const TARGET_DOCKS = ['S1', 'S4', 'SH'];
export const REQUIRED_FILES = [
  { key: 'addressMaster', label: 'AddressMaster.txt', accept: '.txt' },
  { key: 'partMaster', label: 'PartMaster.txt', accept: '.txt' },
  { key: 'nqc', label: 'NQC.xlsx', accept: '.xlsx,.xls' },
  { key: 'freqLp', label: 'Freq_LP.xlsx', accept: '.xlsx,.xls' },
  { key: 'orderSummary', label: 'Order Sumary.txt', accept: '.txt' },
  { key: 'setPart', label: 'SetPart.txt', accept: '.txt' },
];
export const INITIAL_FILES = REQUIRED_FILES.reduce((files, item) => ({ ...files, [item.key]: null }), {});
