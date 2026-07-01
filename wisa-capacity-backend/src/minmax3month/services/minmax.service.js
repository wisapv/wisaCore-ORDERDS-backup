import { processAddressMaster } from './addressMaster.service.js';
import { processFreqLp } from './freqLp.service.js';
import { processNqc } from './nqcMinmax.service.js';
import { processOrderSummary } from './orderSummary.service.js';
import { processPartMaster } from './partMaster.service.js';
import { processSetPart } from './setPart.service.js';

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

const buildBoxKey = ({ partMasterRow, addressRow }) => removeSpaces([
  partMasterRow?.SUPL ?? '',
  partMasterRow?.SupplierPlant ?? '',
  partMasterRow?.['S.DOCK'] ?? '',
  addressRow.DOCK ?? '',
  addressRow['PART #'] ?? '',
  addressRow['Kanban Print Address'] ?? '',
].join(''));

const buildLookupStatus = (alarms) => {
  if (alarms.some((alarm) => alarm.severity === 'ERROR')) return 'ERROR';
  if (alarms.length) return 'WARNING';
  return 'OK';
};

export const processCalBase = ({ files, targetMonth, workingDayN1, workingDayN2, workingDayN3, targetDocks, asOfDate }) => {
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
  const validationErrors = [];
  if (!targetMonth) validationErrors.push('targetMonth is required');
  if (n1Days === null) validationErrors.push('workingDayN1 is required and must be a positive number');
  if (n2Days === null) validationErrors.push('workingDayN2 is required and must be a positive number');
  if (n3Days === null) validationErrors.push('workingDayN3 is required and must be a positive number');
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
      orderFreqForCalculation = 8;
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
    const boxKey = buildBoxKey({ partMasterRow, addressRow });
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
  if (value === '-' || value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const ROUTE_CODE_BY_VALUE = new Map([
  ['PC', 1],
  ['S/DIRECT', 2],
  ['D/SEQUENCE', 3],
]);

const deriveRouteCode = (row) => {
  const candidates = [
    { field: 'P/C Add', value: row['P/C Add'] },
    { field: 'PCAdd', value: row.PCAdd },
  ];
  const match = candidates.find((candidate) => String(candidate.value ?? '').trim() !== '');

  if (!match) {
    return { RouteCode: null, RouteSourceField: null, RouteSourceValue: null };
  }

  const normalized = String(match.value).trim().toUpperCase();
  return {
    RouteCode: ROUTE_CODE_BY_VALUE.get(normalized) ?? null,
    RouteSourceField: match.field,
    RouteSourceValue: match.value,
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

const calculateMonth = ({ label, nqcPerDay, row, routeCode, ratio, qtyPerCont, orderFreq, boxLayer, pcSafetyTime, lsSafetyTime, totalSafetyTime, formulaAlarms }) => {
  const hasCoreValues = ratio > 0 && qtyPerCont > 0 && routeCode !== null && pcSafetyTime !== null && lsSafetyTime !== null;
  if (!hasCoreValues) return nullMonthOutputs(label);

  const pcMinBox = excelRoundUp(nqcPerDay * ratio * ((pcSafetyTime / 920) + 0.0005) / qtyPerCont, 0);
  let pcMaxBox = null;
  if (orderFreq > 0 && boxLayer !== null) {
    pcMaxBox = pcMinBox + excelRoundUp(nqcPerDay * ratio / orderFreq / qtyPerCont, 0) + boxLayer;
  }

  if (routeCode === 3) {
    return {
      [`${label}_PC_Min_Box`]: pcMinBox,
      [`${label}_PC_Max_Box`]: pcMaxBox,
      [`${label}_LS_Min_Box`]: '-',
      [`${label}_LS_Max_Box`]: '-',
      [`${label}_PC_Min_Pcs`]: pcMinBox * qtyPerCont,
      [`${label}_PC_Max_Pcs`]: pcMaxBox === null ? null : pcMaxBox * qtyPerCont,
      [`${label}_LS_Min_Pcs`]: '-',
      [`${label}_LS_Max_Pcs`]: '-',
    };
  }

  let lsSafetyForFormula = totalSafetyTime;
  if (String(row.DOCK).trim() !== 'SH' && routeCode === 1) lsSafetyForFormula = lsSafetyTime;
  const lsMinBox = excelRoundUp(nqcPerDay * ratio * ((lsSafetyForFormula / 920) + 0.0005) / qtyPerCont, 0);
  let lsMaxBox = null;

  if (routeCode === 1) {
    lsMaxBox = lsMinBox + excelRoundUp(nqcPerDay * ratio / 24 / qtyPerCont, 0);
  } else if (orderFreq > 0 && boxLayer !== null) {
    lsMaxBox = lsMinBox + excelRoundUp(nqcPerDay * ratio / orderFreq / qtyPerCont, 0) + boxLayer;
  }

  if (pcMaxBox === null && !formulaAlarms.some((alarm) => alarm.type === 'BOX_LAYER_REQUIRED_FOR_MAX') && boxLayer === null) {
    formulaAlarms.push({ type: 'BOX_LAYER_REQUIRED_FOR_MAX', severity: 'ERROR' });
  }

  return {
    [`${label}_PC_Min_Box`]: pcMinBox,
    [`${label}_PC_Max_Box`]: pcMaxBox,
    [`${label}_LS_Min_Box`]: lsMinBox,
    [`${label}_LS_Max_Box`]: lsMaxBox,
    [`${label}_PC_Min_Pcs`]: pcMinBox * qtyPerCont,
    [`${label}_PC_Max_Pcs`]: pcMaxBox === null ? null : pcMaxBox * qtyPerCont,
    [`${label}_LS_Min_Pcs`]: lsMinBox * qtyPerCont,
    [`${label}_LS_Max_Pcs`]: lsMaxBox === null ? null : lsMaxBox * qtyPerCont,
  };
};

export const calculateMinMaxFromCalBase = ({ calBaseResult, targetMonth, targetDocks }) => {
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
    const pcSafetyTime = toNumberOrNull(row['PC SAFETY']);
    const lsSafetyTime = toNumberOrNull(row['LS SAFTY']);
    const { RouteCode, RouteSourceField, RouteSourceValue } = deriveRouteCode(row);

    if (RouteCode === null) formulaAlarms.push({ type: 'ROUTE_CODE_UNRESOLVED', severity: 'ERROR' });
    if (pcSafetyTime === null) formulaAlarms.push({ type: 'INVALID_PC_SAFETY', severity: 'ERROR' });
    if (lsSafetyTime === null) formulaAlarms.push({ type: 'INVALID_LS_SAFETY', severity: 'ERROR' });
    if (!(ratio > 0)) formulaAlarms.push({ type: 'INVALID_DISTRIBUTION_RATIO', severity: 'ERROR' });
    if (!(qtyPerCont > 0)) formulaAlarms.push({ type: 'INVALID_QTY_PER_CONT', severity: 'ERROR' });
    if (!(orderFreq > 0)) formulaAlarms.push({ type: 'INVALID_ORDER_FREQ', severity: 'ERROR' });
    if (boxLayer === null) formulaAlarms.push({ type: 'BOX_LAYER_REQUIRED_FOR_MAX', severity: 'ERROR' });

    const totalSafetyTime = pcSafetyTime !== null && lsSafetyTime !== null ? pcSafetyTime + lsSafetyTime : null;
    const output = {
      ...row,
      RouteCode,
      RouteSourceField,
      RouteSourceValue,
      PCSafetyTime: pcSafetyTime,
      LSSafetyTime: lsSafetyTime,
      TotalSafetyTime: totalSafetyTime,
    };

    monthFields.forEach(({ label, nqcField }) => {
      Object.assign(output, calculateMonth({
        label,
        nqcPerDay: toNumberOrNull(row[nqcField]) ?? 0,
        row,
        routeCode: RouteCode,
        ratio,
        qtyPerCont,
        orderFreq,
        boxLayer,
        pcSafetyTime,
        lsSafetyTime,
        totalSafetyTime,
        formulaAlarms,
      }));
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

    return {
      ...output,
      FormulaStatus: formulaStatus,
      FormulaAlarms: uniqueFormulaAlarms,
    };
  });

  return {
    summary: {
      calBaseRows: calBaseResult.rows?.length || 0,
      outputRows: rows.length,
      okRows,
      warningRows,
      errorRows,
      targetMonth,
      targetDocks,
    },
    rows,
    warnings,
    alarms,
  };
};

export const calculateMinMax = ({ files, targetMonth, workingDayN1, workingDayN2, workingDayN3, targetDocks, asOfDate }) => {
  const calBaseResult = processCalBase({ files, targetMonth, workingDayN1, workingDayN2, workingDayN3, targetDocks, asOfDate });
  if (calBaseResult.errors?.length) return calBaseResult;
  return calculateMinMaxFromCalBase({ calBaseResult, targetMonth, targetDocks: normalizeDocks(targetDocks) });
};

export default { processCalBase, calculateMinMax, calculateMinMaxFromCalBase };
