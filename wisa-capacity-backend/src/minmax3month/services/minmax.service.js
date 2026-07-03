import { processAddressMaster } from './addressMaster.service.js';
import { processFreqLp } from './freqLp.service.js';
import { processNqc } from './nqcMinmax.service.js';
import { processOrderSummary } from './orderSummary.service.js';
import { processPartMaster } from './partMaster.service.js';
import { processSetPart } from './setPart.service.js';
import { DISPLAY_DASH, DISPLAY_ERROR, DISPLAY_NO_DATA, ROUTE1_LS_MAX_FIXED_FREQ, SAFETY_RATIO_BUFFER, SH_FIXED_ORDER_FREQ, WORKING_MINS_PER_DAY } from '../constants/minmax.constants.js';

const REQUIRED_FILES = ['addressMaster', 'partMaster', 'nqc', 'freqLp', 'orderSummary', 'setPart'];

const pickFile = (files, key) => Array.isArray(files?.[key]) ? files[key][0] : files?.[key];
const partNoClean = (partNo) => String(partNo ?? '').replace(/-/g, '').trim();
const removeSpaces = (value) => String(value ?? '').replace(/\s+/g, '');
const normalizeDocks = (targetDocks) => {
  if (Array.isArray(targetDocks)) return targetDocks.map((dock) => String(dock).trim()).filter(Boolean);
  const docks = String(targetDocks ?? '').split(',').map((dock) => dock.trim()).filter(Boolean);
  return docks.length ? docks : ['S1', 'S4', 'SH'];
};
const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const failStage = (stage, result) => ({
  message: result.message || `${stage} processing failed`,
  errors: result.errors,
  warnings: result.warnings || [],
});

const indexBy = (rows, key) => new Map(rows.map((row) => [row[key], row]));
const appendStageWarnings = (warnings, stage, stageWarnings = []) => {
  stageWarnings.forEach((warning) => warnings.push({ stage, warning }));
};

const buildBoxKey = ({ partMasterRow, addressRow, partForBoxKey }) => removeSpaces([
  partMasterRow?.SUPL ?? '',
  partMasterRow?.SupplierPlant ?? '',
  partMasterRow?.['S.DOCK'] ?? '',
  addressRow.DOCK ?? '',
  partForBoxKey ?? '',
  addressRow['Kanban Print Address'] ?? '',
].join(''));

const buildLookupStatus = (alarms) => {
  if (alarms.some((alarm) => alarm.severity === 'ERROR')) return 'ERROR';
  if (alarms.length) return 'WARNING';
  return 'OK';
};

export const processCalBase = ({ files, targetMonth, workingDayN1, workingDayN2, workingDayN3, targetDocks, asOfDate, unitPerDay, tackTime }) => {
  const missingFiles = REQUIRED_FILES.filter((key) => !pickFile(files, key));
  if (missingFiles.length) {
    return {
      message: 'Cal base processing failed',
      errors: missingFiles.map((key) => `${key} file is required`),
    };
  }

  const n1Days = toPositiveNumber(workingDayN1);
  const n2Days = toPositiveNumber(workingDayN2);
  const n3Days = toPositiveNumber(workingDayN3);
  const unitPerDayValue = toPositiveNumber(unitPerDay);
  const tackTimeValue = toPositiveNumber(tackTime);
  const validationErrors = [];
  if (!targetMonth) validationErrors.push('targetMonth is required');
  if (n1Days === null) validationErrors.push('workingDayN1 is required and must be a positive number');
  if (n2Days === null) validationErrors.push('workingDayN2 is required and must be a positive number');
  if (n3Days === null) validationErrors.push('workingDayN3 is required and must be a positive number');
  if (unitPerDayValue === null) validationErrors.push('unitPerDay is required and must be a positive number');
  if (tackTimeValue === null) validationErrors.push('tackTime is required and must be a positive number');
  if (validationErrors.length) return { message: 'Cal base processing failed', errors: validationErrors };

  const docks = normalizeDocks(targetDocks);
  const stageInputs = {
    addressMaster: { file: pickFile(files, 'addressMaster'), targetMonth, targetDocks: docks },
    nqc: { file: pickFile(files, 'nqc'), targetMonth, workingDayN1: n1Days, workingDayN2: n2Days, workingDayN3: n3Days },
    partMaster: { file: pickFile(files, 'partMaster'), targetMonth, targetDocks: docks },
    freqLp: { file: pickFile(files, 'freqLp'), targetDocks: docks },
    orderSummary: { file: pickFile(files, 'orderSummary') },
    setPart: { file: pickFile(files, 'setPart'), asOfDate },
  };

  const addressResult = processAddressMaster(stageInputs.addressMaster);
  if (addressResult.errors?.length) return failStage('AddressMaster', addressResult);

  const nqcResult = processNqc(stageInputs.nqc);
  if (nqcResult.errors?.length) return failStage('NQC', nqcResult);

  const partMasterResult = processPartMaster(stageInputs.partMaster);
  if (partMasterResult.errors?.length) return failStage('PartMaster', partMasterResult);

  const freqLpResult = processFreqLp(stageInputs.freqLp);
  if (freqLpResult.errors?.length) return failStage('Freq_LP', freqLpResult);

  const orderSummaryResult = processOrderSummary(stageInputs.orderSummary);
  if (orderSummaryResult.errors?.length) return failStage('Order Summary / BoxLayer', orderSummaryResult);

  const setPartResult = processSetPart(stageInputs.setPart);
  if (setPartResult.errors?.length) return failStage('SetPart', setPartResult);

  const warnings = [];
  appendStageWarnings(warnings, 'AddressMaster', addressResult.warnings);
  appendStageWarnings(warnings, 'NQC', nqcResult.warnings);
  appendStageWarnings(warnings, 'PartMaster', partMasterResult.warnings);
  appendStageWarnings(warnings, 'Freq_LP', freqLpResult.warnings);
  appendStageWarnings(warnings, 'Order Summary / BoxLayer', orderSummaryResult.warnings);
  appendStageWarnings(warnings, 'SetPart', setPartResult.warnings);

  const nqcByKey = indexBy(nqcResult.rows, 'NQCKey');
  const partMasterByKey = indexBy(partMasterResult.rows, 'PartMasterKey');
  const freqLpByKey = indexBy(freqLpResult.rows, 'FreqLpKey');
  const boxLayerByKey = indexBy(orderSummaryResult.rows, 'BoxKey');
  const setPartByKey = indexBy(setPartResult.rows, 'SetKey');
  const setKeyDependByKey = indexBy(setPartResult.rows.filter((row) => row.PType === '1-Key'), 'SetKey');
  const alarms = [];
  let nqcMissingRows = 0;
  let partMasterMissingRows = 0;
  let freqLpMissingRows = 0;
  let boxLayerMissingRows = 0;

  const rows = [];

  addressResult.rows.forEach((addressRow) => {
    const cleanPart = partNoClean(addressRow['PART #']);
    const nqcKey = `${addressRow.DOCK}${cleanPart}`;
    const nqcRow = nqcByKey.get(nqcKey);

    if (!nqcRow) {
      nqcMissingRows += 1;
      alarms.push({ type: 'NQC_NOT_FOUND', key: nqcKey, dock: addressRow.DOCK, partNo: addressRow['PART #'], severity: 'ERROR' });
      return;
    }

    const rowAlarms = [];
    const addAlarm = (alarm) => {
      rowAlarms.push(alarm);
      alarms.push(alarm);
    };

    const partMasterKey = `${addressRow.DOCK}${cleanPart}`;
    const partMasterRow = partMasterByKey.get(partMasterKey);

    if (!partMasterRow) {
      partMasterMissingRows += 1;
      addAlarm({ type: 'PART_MASTER_NOT_FOUND', key: partMasterKey, severity: 'ERROR' });
    }

    let freqLpKey = null;
    let freqLpRow = null;
    let orderFreqForCalculation = null;
    let orderFreqSource = null;

    if (String(addressRow.DOCK).trim() === 'SH') {
      orderFreqForCalculation = SH_FIXED_ORDER_FREQ;
      orderFreqSource = 'SH_FIXED_8';
    } else if (partMasterRow) {
      freqLpKey = `${partMasterRow.SUPL}${partMasterRow.SupplierPlant}${partMasterRow['S.DOCK']}${addressRow.DOCK}`;
      freqLpRow = freqLpByKey.get(freqLpKey);
      if (freqLpRow) {
        orderFreqForCalculation = freqLpRow.OrderFreqForCalculation;
        orderFreqSource = 'FREQ_LP';
      } else {
        freqLpMissingRows += 1;
        addAlarm({ type: 'FREQ_LP_NOT_FOUND', key: freqLpKey, severity: 'ERROR' });
      }
    }

    const setKey = `${addressRow.DOCK}${cleanPart}`;
    const setPartRow = setPartByKey.get(setKey);
    const dependRow = setKeyDependByKey.get(setKey);
    const dependPart = dependRow?.Depend ?? 'X';
    const partForBoxKey = dependPart === 'X' ? cleanPart : partNoClean(dependPart);
    const boxKey = buildBoxKey({ partMasterRow, addressRow, partForBoxKey });
    const boxLayerRow = boxLayerByKey.get(boxKey);

    if (!boxLayerRow) {
      boxLayerMissingRows += 1;
      const warning = { type: 'BOX_LAYER_NOT_FOUND', key: boxKey, severity: 'WARNING' };
      warnings.push(warning);
      rowAlarms.push(warning);
    }

    rows.push({
      CalBaseKey: `${addressRow.AddrKey}||${nqcKey}`,
      DOCK: addressRow.DOCK,
      'PART #': addressRow['PART #'],
      PartNoClean: cleanPart,
      NQCKey: nqcKey,
      AddrKey: addressRow.AddrKey,
      'Kanban Print Address': addressRow['Kanban Print Address'],
      'P/C Add': addressRow['Kanban Print Address'],
      P_C_Add_Source: 'AddressMaster.Kanban Print Address',
      'Lineside Address': addressRow['Lineside Address'],
      'Conveyance Route(External)': addressRow['Conveyance Route(External)'],
      'Conveyance Route(Internal)': addressRow['Conveyance Route(Internal)'],
      Depth: addressRow.Depth,
      DistributionRatio: addressRow['Distribution Ratio'],
      TotalRatio: addressRow.TotalRatio,
      UseThisDistributionRatio: addressRow.UseThisDistributionRatio,
      N: nqcRow.N,
      N1: nqcRow.N1,
      N2: nqcRow.N2,
      N3: nqcRow.N3,
      N1PerDay: nqcRow.N1PerDay,
      N2PerDay: nqcRow.N2PerDay,
      N3PerDay: nqcRow.N3PerDay,
      MaxNqcPerDay: nqcRow.MaxNqcPerDay,
      PartMasterKey: partMasterKey,
      'PART DESC': partMasterRow?.['PART DESC'] ?? null,
      KBN: partMasterRow?.KBN ?? addressRow.KBN ?? null,
      'QTY /CONT': partMasterRow?.['QTY /CONT'] ?? null,
      'PC DELIV': partMasterRow?.['PC DELIV'] ?? null,
      'PC SAFETY': partMasterRow?.['PC SAFETY'] ?? null,
      'LS DELIV': partMasterRow?.['LS DELIV'] ?? null,
      'LS SAFTY': partMasterRow?.['LS SAFTY'] ?? null,
      'Safety(PCS)': partMasterRow?.['Safety(PCS)'] ?? null,
      'Packaging Type': partMasterRow?.['Packaging Type'] ?? null,
      'Part PCS Weight(g)': partMasterRow?.['Part PCS Weight(g)'] ?? null,
      'PACK QTY/CONT': partMasterRow?.['PACK QTY/CONT'] ?? null,
      SUPL: partMasterRow?.SUPL ?? null,
      SupplierPlant: partMasterRow?.SupplierPlant ?? null,
      'S.DOCK': partMasterRow?.['S.DOCK'] ?? null,
      COMP: partMasterRow?.COMP ?? null,
      CompanyPlant: partMasterRow?.CompanyPlant ?? null,
      'Production Routing': partMasterRow?.['Production Routing'] ?? null,
      SupplierKey: partMasterRow?.SupplierKey ?? null,
      FreqLpKey: freqLpKey,
      CurrentFreq: freqLpRow?.CurrentFreq ?? null,
      NewFreq: freqLpRow?.NewFreq ?? null,
      OrderFreqForCalculation: orderFreqForCalculation,
      OrderFreqSource: orderFreqSource,
      SetKey: setPartRow ? setKey : null,
      SetPartPType: setPartRow?.PType ?? null,
      SetPartKeyPart: setPartRow?.['Key Part'] ?? null,
      SetPartDepend: setPartRow?.Depend ?? null,
      SetPartDependUsed: dependPart,
      BoxKey: boxKey,
      BoxLayer: boxLayerRow?.BoxLayer ?? null,
      LookupStatus: buildLookupStatus(rowAlarms),
      Alarms: rowAlarms,
    });
  });

  return {
    summary: {
      addressRows: addressResult.rows.length,
      nqcMatchedRows: rows.length,
      nqcMissingRows,
      outputRows: rows.length,
      partMasterMissingRows,
      freqLpMissingRows,
      boxLayerMissingRows,
      targetMonth,
      targetDocks: docks,
    },
    rows,
    warnings,
    alarms,
  };
};


export const excelRoundUp = (value, decimals = 0) => {
  if (!Number.isFinite(value) || value < 0) return null;
  const factor = 10 ** decimals;
  return Math.ceil((value * factor) - Number.EPSILON) / factor;
};

const toNumberOrNull = (value) => {
  if (isDisplayDash(value) || isNoData(value) || isDisplayError(value) || value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const excelTextEquals = (a, b) => String(a ?? '').trim().toUpperCase() === String(b ?? '').trim().toUpperCase();
export const isDisplayDash = (value) => excelTextEquals(value, DISPLAY_DASH);
export const isNoData = (value) => excelTextEquals(value, DISPLAY_NO_DATA);
export const isDisplayError = (value) => excelTextEquals(value, DISPLAY_ERROR) || excelTextEquals(value, 'Error');
const isDisplayValue = (value) => isDisplayDash(value) || isNoData(value) || isDisplayError(value);

export const deriveRouteFromPcAdd = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return { Route: null, RouteCode: null, alarm: { type: 'ROUTE_CODE_UNRESOLVED', severity: 'ERROR' } };
  if (excelTextEquals(raw, 'Error')) return { Route: DISPLAY_ERROR, RouteCode: DISPLAY_ERROR };
  if (raw[1] === DISPLAY_DASH) return { Route: 'PC', RouteCode: 1 };
  if (raw[0]?.toUpperCase() === 'S') return { Route: 'S', RouteCode: 2 };
  return { Route: 'D', RouteCode: 3 };
};

const deriveRouteCode = (row) => {
  const sourceValue = row['P/C Add'] ?? row['PC Add'] ?? row.PCAdd;
  const derived = deriveRouteFromPcAdd(sourceValue);
  return {
    ...derived,
    RouteSourceField: 'P/C Add',
    RouteSourceValue: sourceValue ?? null,
  };
};

const monthFields = [
  { label: 'N1', nqcField: 'N1PerDay' },
  { label: 'N2', nqcField: 'N2PerDay' },
  { label: 'N3', nqcField: 'N3PerDay' },
];

const nullMonthOutputs = (label) => ({
  [`${label}_PC_Min_Box`]: null,
  [`${label}_PC_Max_Box`]: null,
  [`${label}_LS_Min_Box`]: null,
  [`${label}_LS_Max_Box`]: null,
  [`${label}_PC_Min_Pcs`]: null,
  [`${label}_PC_Max_Pcs`]: null,
  [`${label}_LS_Min_Pcs`]: null,
  [`${label}_LS_Max_Pcs`]: null,
});

const pcsFromBox = (boxValue, qtyPerCont) => Number.isFinite(boxValue) ? boxValue * qtyPerCont : boxValue;
const pcMaxFromPcMin = ({ pcMinBox, nqcPerDay, ratio, orderFreq, qtyPerCont, boxLayer }) => {
  if (isDisplayDash(pcMinBox)) return DISPLAY_DASH;
  if (pcMinBox === 0) return 0;
  if (isNoData(pcMinBox)) return DISPLAY_NO_DATA;
  if (isDisplayError(pcMinBox)) return DISPLAY_ERROR;
  if (Number.isFinite(pcMinBox) && orderFreq > 0 && boxLayer !== null) return pcMinBox + excelRoundUp(nqcPerDay * ratio / orderFreq / qtyPerCont, 0) + boxLayer;
  return null;
};
const lsMaxFromLsMin = ({ lsMinBox, routeCode, nqcPerDay, ratio, orderFreq, qtyPerCont, boxLayer }) => {
  if (isDisplayDash(lsMinBox)) return DISPLAY_DASH;
  if (lsMinBox === 0) return 0;
  if (isNoData(lsMinBox)) return DISPLAY_NO_DATA;
  if (isDisplayError(lsMinBox)) return DISPLAY_ERROR;
  if (!Number.isFinite(lsMinBox)) return null;
  if (routeCode === 1) return lsMinBox + excelRoundUp(nqcPerDay * ratio / ROUTE1_LS_MAX_FIXED_FREQ / qtyPerCont, 0);
  if (routeCode === 2 && orderFreq > 0 && boxLayer !== null) return lsMinBox + excelRoundUp(nqcPerDay * ratio / orderFreq / qtyPerCont, 0) + boxLayer;
  if (routeCode === 3) return DISPLAY_DASH;
  return null;
};

const calculateMonth = ({ label, nqcPerDay, row, routeCode, ratio, qtyPerCont, orderFreq, boxLayer, pcSafetyTime, lsSafetyTime, totalSafetyTime }) => {
  if (!(ratio > 0) || !(qtyPerCont > 0) || routeCode === null || pcSafetyTime === null || lsSafetyTime === null) return nullMonthOutputs(label);
  if (nqcPerDay === 0) {
    return {
      [`${label}_PC_Min_Box`]: 0, [`${label}_PC_Max_Box`]: 0, [`${label}_LS_Min_Box`]: routeCode === 3 ? DISPLAY_DASH : 0, [`${label}_LS_Max_Box`]: routeCode === 3 ? DISPLAY_DASH : 0,
      [`${label}_PC_Min_Pcs`]: 0, [`${label}_PC_Max_Pcs`]: 0, [`${label}_LS_Min_Pcs`]: routeCode === 3 ? DISPLAY_DASH : 0, [`${label}_LS_Max_Pcs`]: routeCode === 3 ? DISPLAY_DASH : 0,
    };
  }

  let pcMinBox = null;
  if (routeCode === DISPLAY_ERROR) pcMinBox = DISPLAY_ERROR;
  else if (String(row.DOCK).trim() === 'SH' && routeCode === 1) pcMinBox = DISPLAY_NO_DATA;
  else if (routeCode === 2) pcMinBox = DISPLAY_DASH;
  else if (routeCode === 1 || routeCode === 3) pcMinBox = excelRoundUp(nqcPerDay * ratio * ((pcSafetyTime / WORKING_MINS_PER_DAY) + SAFETY_RATIO_BUFFER) / qtyPerCont, 0);

  const pcMaxBox = pcMaxFromPcMin({ pcMinBox, nqcPerDay, ratio, orderFreq, qtyPerCont, boxLayer });

  let lsMinBox = null;
  if (routeCode === 3) lsMinBox = DISPLAY_DASH;
  else if (routeCode === DISPLAY_ERROR) lsMinBox = DISPLAY_ERROR;
  else {
    let lsSafetyForFormula = totalSafetyTime;
    if (String(row.DOCK).trim() !== 'SH' && routeCode === 1) lsSafetyForFormula = lsSafetyTime;
    lsMinBox = excelRoundUp(nqcPerDay * ratio * ((lsSafetyForFormula / WORKING_MINS_PER_DAY) + SAFETY_RATIO_BUFFER) / qtyPerCont, 0);
  }
  const lsMaxBox = lsMaxFromLsMin({ lsMinBox, routeCode, nqcPerDay, ratio, orderFreq, qtyPerCont, boxLayer });

  return {
    [`${label}_PC_Min_Box`]: pcMinBox,
    [`${label}_PC_Max_Box`]: pcMaxBox,
    [`${label}_LS_Min_Box`]: lsMinBox,
    [`${label}_LS_Max_Box`]: lsMaxBox,
    [`${label}_PC_Min_Pcs`]: pcsFromBox(pcMinBox, qtyPerCont),
    [`${label}_PC_Max_Pcs`]: pcsFromBox(pcMaxBox, qtyPerCont),
    [`${label}_LS_Min_Pcs`]: pcsFromBox(lsMinBox, qtyPerCont),
    [`${label}_LS_Max_Pcs`]: pcsFromBox(lsMaxBox, qtyPerCont),
  };
};

const resolveReduceSupCap = (reduceSupCapByKey, calBaseKey) => {
  if (!reduceSupCapByKey) return 0;
  const raw = reduceSupCapByKey instanceof Map ? reduceSupCapByKey.get(calBaseKey) : reduceSupCapByKey[calBaseKey];
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const computeSafetyTimes = ({ row, routeCode, ratio, orderFreq, qtyPerCont, maxNqcPerDay, unitPerDay, tackTime, reduceSupCap }) => {
  const dock = String(row.DOCK).trim();
  const v3 = excelRoundUp((Number(unitPerDay) / 24) * (Number(tackTime) / 60), 0);
  const am3 = excelRoundUp((Number(unitPerDay) / 36) * (Number(tackTime) / 60), 0);
  const pcDelLsDelBase = dock === 'S4' ? am3 : v3;

  const boxOrderRatio = Number.isFinite(maxNqcPerDay) && Number.isFinite(ratio) && orderFreq > 0 && qtyPerCont > 0
    ? (maxNqcPerDay * ratio) / orderFreq / qtyPerCont
    : null;

  const supCap = reduceSupCap !== 0 ? 0 : 20;
  const prodAllowance = dock === 'S1' || dock === 'S4' ? 0 : 60;
  const seqFluctuation = boxOrderRatio !== null && boxOrderRatio > 1.5 ? 0 : 30;
  const pcSafetyTime = supCap + prodAllowance + seqFluctuation;

  const pcDel = pcDelLsDelBase;
  const lsDel = routeCode === 3 ? 17 : pcDelLsDelBase;
  const abnormal = routeCode === 3 ? 8 : 23;
  const lsSafetyTime = abnormal;

  const totalSafetyTime = pcSafetyTime + lsSafetyTime;

  return { pcDel, lsDel, supCap, prodAllowance, seqFluctuation, pcSafetyTime, lsSafetyTime, totalSafetyTime, boxOrderRatio };
};

export const calculateMinMaxFromCalBase = ({ calBaseResult, targetMonth, targetDocks, unitPerDay, tackTime, reduceSupCapByKey }) => {
  const warnings = [...(calBaseResult.warnings || [])];
  const alarms = [...(calBaseResult.alarms || [])];
  let okRows = 0;
  let warningRows = 0;
  let errorRows = 0;

  const rows = (calBaseResult.rows || []).map((row) => {
    const formulaAlarms = [];
    const ratio = toNumberOrNull(row.UseThisDistributionRatio);
    const qtyPerCont = toNumberOrNull(row['QTY /CONT']);
    const orderFreq = toNumberOrNull(row.OrderFreqForCalculation);
    const boxLayer = toNumberOrNull(row.BoxLayer);
    const maxNqcPerDay = toNumberOrNull(row.MaxNqcPerDay);
    const { Route, RouteCode, RouteSourceField, RouteSourceValue, alarm: routeAlarm } = deriveRouteCode(row);

    if (routeAlarm) formulaAlarms.push(routeAlarm);
    if (!(ratio > 0)) formulaAlarms.push({ type: 'INVALID_DISTRIBUTION_RATIO', severity: 'ERROR' });
    if (!(qtyPerCont > 0)) formulaAlarms.push({ type: 'INVALID_QTY_PER_CONT', severity: 'ERROR' });
    if (!(orderFreq > 0) && RouteCode !== DISPLAY_ERROR) formulaAlarms.push({ type: 'INVALID_ORDER_FREQ', severity: 'ERROR' });
    if (boxLayer === null && RouteCode !== DISPLAY_ERROR) formulaAlarms.push({ type: 'BOX_LAYER_REQUIRED_FOR_MAX', severity: 'ERROR' });

    const reduceSupCap = resolveReduceSupCap(reduceSupCapByKey, row.CalBaseKey);
    const { pcDel, lsDel, supCap, prodAllowance, seqFluctuation, pcSafetyTime, lsSafetyTime, totalSafetyTime, boxOrderRatio } = computeSafetyTimes({ row, routeCode: RouteCode, ratio, orderFreq, qtyPerCont, maxNqcPerDay, unitPerDay, tackTime, reduceSupCap });

    const output = {
      ...row, Route, RouteCode, RouteSourceField, RouteSourceValue,
      PCSafetyTime: pcSafetyTime, LSSafetyTime: lsSafetyTime, TotalSafetyTime: totalSafetyTime,
      PcDel: pcDel, LsDel: lsDel, SupCap: supCap, ProdAllowance: prodAllowance, SeqFluctuation: seqFluctuation,
      BoxOrderRatio: boxOrderRatio, ReduceSupCap: reduceSupCap,
    };

    monthFields.forEach(({ label, nqcField }) => {
      Object.assign(output, calculateMonth({ label, nqcPerDay: toNumberOrNull(row[nqcField]) ?? 0, row, routeCode: RouteCode, ratio, qtyPerCont, orderFreq, boxLayer, pcSafetyTime, lsSafetyTime, totalSafetyTime }));
    });

    const uniqueFormulaAlarms = [...new Map(formulaAlarms.map((alarm) => [alarm.type, alarm])).values()];
    const hasLookupAlarms = (row.Alarms || []).length > 0;
    let formulaStatus = 'OK';
    if (uniqueFormulaAlarms.length) formulaStatus = 'ERROR';
    else if (hasLookupAlarms) formulaStatus = 'WARNING';
    if (formulaStatus === 'OK') okRows += 1;
    if (formulaStatus === 'WARNING') warningRows += 1;
    if (formulaStatus === 'ERROR') errorRows += 1;
    uniqueFormulaAlarms.forEach((alarm) => alarms.push({ ...alarm, CalBaseKey: row.CalBaseKey }));
    return { ...output, FormulaStatus: formulaStatus, FormulaAlarms: uniqueFormulaAlarms };
  });

  return { summary: { calBaseRows: calBaseResult.rows?.length || 0, outputRows: rows.length, okRows, warningRows, errorRows, targetMonth, targetDocks }, rows, warnings, alarms };
};

export const calculateMinMax = ({ files, targetMonth, workingDayN1, workingDayN2, workingDayN3, targetDocks, asOfDate, unitPerDay, tackTime, reduceSupCapByKey }) => {
  const calBaseResult = processCalBase({ files, targetMonth, workingDayN1, workingDayN2, workingDayN3, targetDocks, asOfDate, unitPerDay, tackTime });
  if (calBaseResult.errors?.length) return calBaseResult;
  return calculateMinMaxFromCalBase({ calBaseResult, targetMonth, targetDocks: normalizeDocks(targetDocks), unitPerDay, tackTime, reduceSupCapByKey });
};

const ROUTE_AUDIT_FIELDS = ['P/C Add', 'PC Add', 'PCAdd', 'Kanban Print Address', 'Lineside Address', 'Conveyance Route(External)', 'Conveyance Route(Internal)', 'Production Routing', 'RouteSourceField'];
export const auditRouteCodeFromCalBase = (calBaseResult) => {
  const rows = calBaseResult.rows || [];
  const candidates = ROUTE_AUDIT_FIELDS.map((fieldName) => {
    const countByValue = {};
    let mappedCount = 0;
    let unmappedCount = 0;
    const sampleRows = [];
    rows.forEach((row, index) => {
      const value = row[fieldName];
      const key = String(value ?? '').trim();
      if (key) countByValue[key] = (countByValue[key] || 0) + 1;
      const mapped = deriveRouteFromPcAdd(value);
      if (mapped.RouteCode === null) unmappedCount += 1;
      else mappedCount += 1;
      if (sampleRows.length < 10) sampleRows.push({ rowIndex: index + 1, CalBaseKey: row.CalBaseKey, value, Route: mapped.Route, RouteCode: mapped.RouteCode });
    });
    return { fieldName, distinctValues: Object.keys(countByValue), distinctValueCount: Object.keys(countByValue).length, countByValue, mappedCount, unmappedCount, sampleRows };
  });
  const best = [...candidates].sort((a, b) => b.mappedCount - a.mappedCount || a.unmappedCount - b.unmappedCount)[0];
  const confirmed = best && rows.length > 0 && best.mappedCount === rows.length && best.distinctValueCount > 0;
  return {
    summary: { calBaseRows: rows.length, candidateFieldCount: candidates.length, bestCandidateField: best?.fieldName || null, routeResolvedRows: best?.mappedCount || 0, routeUnresolvedRows: best?.unmappedCount || rows.length },
    candidates,
    recommendation: { status: confirmed ? 'CONFIRMED' : 'NEEDS_REVIEW', fieldName: best?.fieldName || null, reason: confirmed ? `${best.fieldName} resolved all Cal Base rows with the VBA route pattern.` : 'No candidate field resolved all Cal Base rows clearly.' },
    warnings: calBaseResult.warnings || [],
  };
};
export const auditRouteCode = ({ files, targetMonth, workingDayN1, workingDayN2, workingDayN3, targetDocks, asOfDate, unitPerDay, tackTime }) => {
  const calBaseResult = processCalBase({ files, targetMonth, workingDayN1, workingDayN2, workingDayN3, targetDocks, asOfDate, unitPerDay, tackTime });
  if (calBaseResult.errors?.length) return calBaseResult;
  return auditRouteCodeFromCalBase(calBaseResult);
};

export default { processCalBase, calculateMinMax, calculateMinMaxFromCalBase, auditRouteCode };
