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
export const MINMAX_THEME = {
  background: '#F8FAFC',
  foreground: '#0F172A',
  card: '#FFFFFF',
  muted: '#F1F5F9',
  mutedText: '#64748B',
  border: '#E2E8F0',
  darkSurface: '#0F0F12',
};
export const REQUIRED_FILES = [
  { key: 'addressMaster', label: 'AddressMaster', fileName: 'AddressMaster.txt', accept: '.txt', typeLabel: 'TXT source file' },
  { key: 'partMaster', label: 'PartMaster', fileName: 'PartMaster.txt', accept: '.txt', typeLabel: 'TXT source file' },
  { key: 'nqc', label: 'NQC', fileName: 'NQC.xlsx', accept: '.xlsx,.xls', typeLabel: 'Excel workbook' },
  { key: 'freqLp', label: 'Freq_LP', fileName: 'Freq_LP.xlsx', accept: '.xlsx,.xls', typeLabel: 'Excel workbook' },
  { key: 'orderSummary', label: 'Order Summary', fileName: 'Order Summary.txt', accept: '.txt', typeLabel: 'TXT source file' },
  { key: 'setPart', label: 'SetPart', fileName: 'SetPart.txt', accept: '.txt', typeLabel: 'TXT source file' },
];
export const WORKFLOW_STEPS = [
  { key: 'validation', label: 'Upload Files', description: 'Select all required sources' },
  { key: 'preview', label: 'Validate & Preview', description: 'Check files before staging' },
  { key: 'calBase', label: 'Process Cal Base', description: 'Build the calculation base' },
  { key: 'routeAudit', label: 'Audit RouteCode', description: 'Confirm routing confidence' },
  { key: 'minmax', label: 'Calculate Min-Max', description: 'Run final formulas' },
];
export const PRIMARY_ACTION_KEYS = ['validation', 'preview', 'calBase', 'routeAudit', 'minmax'];
export const INITIAL_FILES = REQUIRED_FILES.reduce((files, item) => ({ ...files, [item.key]: null }), {});
