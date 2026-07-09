import assert from 'node:assert/strict';
import { DISPLAY_DASH, DISPLAY_NO_DATA, ROUTE1_LS_MAX_FIXED_FREQ, SH_FIXED_ORDER_FREQ } from '../constants/minmax.constants.js';
import { calculateMinMaxFromCalBase, deriveRouteFromPcAdd, excelRoundUp } from './minmax.service.js';

// PcSafetyTime/LsSafetyTime/PcDel/LsDel now come straight from PartMaster.txt's 'PC SAFETY',
// 'LS SAFTY', 'PC DELIV', 'LS DELIV' e-kanban data (previous month's actuals), not the old VBA
// SupCap/ProdAllowance/SeqFluctuation/Abnormal/V3/AM3 estimate formulas. PC/LS Min/Max Box/Pcs
// formulas themselves are unchanged - they just take pcSafetyTime/lsSafetyTime/totalSafetyTime
// from a different source now.
const makeRow = (overrides = {}) => ({
  CalBaseKey: 'ROW1', DOCK: 'S1', 'PART #': 'PART1', PartNoClean: 'PART1',
  N1PerDay: 100, N2PerDay: 100, N3PerDay: 100, MaxNqcPerDay: 100,
  UseThisDistributionRatio: 1, 'QTY /CONT': 10, 'PC DELIV': 2, 'PC SAFETY': 60,
  'LS DELIV': 4, 'LS SAFTY': 12, OrderFreqForCalculation: 24, OrderFreqSource: 'FREQ_LP',
  BoxLayer: 1, 'P/C Add': 'A-100', Alarms: [], ...overrides,
});

const calculateOne = (row) => calculateMinMaxFromCalBase({
  calBaseResult: { rows: [row], warnings: [], alarms: [] }, targetMonth: '2025-10', targetDocks: ['S1', 'S4', 'SH'],
}).rows[0];

assert.equal(excelRoundUp(1.01, 0), 2);
assert.equal(excelRoundUp(0.001, 0), 1);
assert.equal(excelRoundUp(1 / 3, 2), 0.34);
assert.equal(deriveRouteFromPcAdd('A-100').RouteCode, 1);
assert.equal(deriveRouteFromPcAdd('S123').RouteCode, 2);
assert.equal(deriveRouteFromPcAdd('D123').RouteCode, 3);

// route1: DOCK='S1', RouteCode=1, PC SAFETY=60, LS SAFTY=12, PC DELIV=2, LS DELIV=4.
// TotalSafetyTime = 60+12 = 72. DOCK!='SH' && RouteCode===1 -> lsSafetyForFormula = LsSafetyTime(12).
// PC Min core = 100*1*((60/920)+0.0005) = 6.571739... -> Box=ROUNDUP(core/10,0)=1, Pcs=ROUNDUP(core,0)=7
// PC added term = ROUNDUP(100*1/24/10,0) + BoxLayer(1) = 1+1 = 2 -> Max Box=1+2=3, Max Pcs=7+2*10=27
// LS Min core = 100*1*((12/920)+0.0005) = 1.354347... -> Box=ROUNDUP(core/10,0)=1, Pcs=ROUNDUP(core,0)=2
// LS added term (RouteCode=1, fixed freq 24) = ROUNDUP(100*1/24/10,0) = 1 -> Max Box=1+1=2, Max Pcs=2+1*10=12
const route1 = calculateOne(makeRow());
assert.equal(route1.Route, 'PC');
assert.equal(route1.RouteCode, 1);
assert.equal(route1.PcDel, 2);
assert.equal(route1.LsDel, 4);
assert.equal(route1.PCSafetyTime, 60);
assert.equal(route1.LSSafetyTime, 12);
assert.equal(route1.TotalSafetyTime, 72);
assert.equal(route1.N1_PC_Min_Box, 1);
assert.equal(route1.N1_PC_Max_Box, 3);
assert.equal(route1.N1_PC_Min_Pcs, 7);
assert.equal(route1.N1_PC_Max_Pcs, 27);
assert.equal(route1.N1_LS_Min_Box, 1);
assert.equal(route1.N1_LS_Max_Box, 2);
assert.equal(route1.N1_LS_Min_Pcs, 2);
assert.equal(route1.N1_LS_Max_Pcs, 12);
assert.equal(route1.FormulaStatus, 'OK');
assert.equal(ROUTE1_LS_MAX_FIXED_FREQ, 24);

// route2: RouteCode=2 -> PC Min/Max are always dash; LS uses totalSafetyTime(72), not lsSafetyTime.
// LS Min core = 100*1*((72/920)+0.0005) = 7.876087... -> Box=ROUNDUP(core/10,0)=1, Pcs=ROUNDUP(core,0)=8
// LS added term (RouteCode=2) = ROUNDUP(100*1/24/10,0) + BoxLayer(1) = 1+1=2 -> Max Box=1+2=3, Max Pcs=8+2*10=28
const route2 = calculateOne(makeRow({ 'P/C Add': 'S123' }));
assert.equal(route2.Route, 'S');
assert.equal(route2.RouteCode, 2);
assert.equal(route2.N1_PC_Min_Box, DISPLAY_DASH);
assert.equal(route2.N1_PC_Max_Box, DISPLAY_DASH);
assert.equal(route2.N1_LS_Min_Box, 1);
assert.equal(route2.N1_LS_Max_Box, 3);
assert.equal(route2.N1_LS_Min_Pcs, 8);
assert.equal(route2.N1_LS_Max_Pcs, 28);

// route3: RouteCode=3 -> PC Min/Max same formula as RouteCode=1; LS Min/Max are always dash.
// PcDel/LsDel are no longer routeCode-dependent overrides (that was old-formula-only behavior) -
// they are always the literal PartMaster.txt values now, regardless of RouteCode.
const route3 = calculateOne(makeRow({ 'P/C Add': 'D123' }));
assert.equal(route3.Route, 'D');
assert.equal(route3.RouteCode, 3);
assert.equal(route3.PcDel, 2);
assert.equal(route3.LsDel, 4);
assert.equal(route3.N1_PC_Min_Box, 1);
assert.equal(route3.N1_PC_Max_Box, 3);
assert.equal(route3.N1_PC_Min_Pcs, 7);
assert.equal(route3.N1_PC_Max_Pcs, 27);
assert.equal(route3.N1_LS_Min_Box, DISPLAY_DASH);
assert.equal(route3.N1_LS_Max_Box, DISPLAY_DASH);

// shRoute1: DOCK='SH', RouteCode=1, OrderFreqForCalculation=SH_FIXED_ORDER_FREQ(8).
// PC Min/Max: DOCK='SH' && RouteCode===1 -> always "NO Data", regardless of PcSafetyTime source.
// LS: DOCK==='SH' so the "DOCK!='SH' && RouteCode===1" special case does NOT apply -> uses
// totalSafetyTime(72), same core as route2's LS Min = 7.876087...-> Box=1, Pcs=8.
// LS added term (RouteCode=1, fixed freq 24 - orderFreq(8) is irrelevant here) = ROUNDUP(100*1/24/10,0) = 1
// -> Max Box=1+1=2, Max Pcs=8+1*10=18
const shRoute1 = calculateOne(makeRow({ DOCK: 'SH', OrderFreqForCalculation: SH_FIXED_ORDER_FREQ, OrderFreqSource: 'SH_FIXED_8' }));
assert.equal(shRoute1.OrderFreqForCalculation, SH_FIXED_ORDER_FREQ);
assert.equal(shRoute1.PCSafetyTime, 60);
assert.equal(shRoute1.N1_PC_Min_Box, DISPLAY_NO_DATA);
assert.equal(shRoute1.N1_PC_Max_Box, DISPLAY_NO_DATA);
assert.equal(shRoute1.N1_LS_Min_Box, 1);
assert.equal(shRoute1.N1_LS_Max_Box, 2);
assert.equal(shRoute1.N1_LS_Min_Pcs, 8);
assert.equal(shRoute1.N1_LS_Max_Pcs, 18);

const missingQty = calculateOne(makeRow({ 'QTY /CONT': null }));
assert.equal(missingQty.FormulaStatus, 'ERROR');
assert.ok(missingQty.FormulaAlarms.some((alarm) => alarm.type === 'INVALID_QTY_PER_CONT'));
assert.equal(missingQty.N1_PC_Min_Box, null);

// missingBoxLayer: PC Max needs BoxLayer, so it's null; LS Max (RouteCode=1) doesn't need
// BoxLayer at all (fixed-freq path), so it's unaffected - same 2 as route1.
const missingBoxLayer = calculateOne(makeRow({ BoxLayer: null }));
assert.equal(missingBoxLayer.FormulaStatus, 'ERROR');
assert.ok(missingBoxLayer.FormulaAlarms.some((alarm) => alarm.type === 'BOX_LAYER_REQUIRED_FOR_MAX'));
assert.equal(missingBoxLayer.N1_PC_Max_Box, null);
assert.equal(missingBoxLayer.N1_LS_Max_Box, 2);

// VBA: IF(P/C_Add="Error","Err",IF(MID(P/C_Add,2,1)="-","PC",IF(LEFT(P/C_Add,1)="S","S","D")))
// A blank P/C Add falls through every condition (MID("",2,1)="" and LEFT("",1)="" both fail
// to match) straight to the "D" default - it is never an unresolved/error case.
const blankPcAdd = calculateOne(makeRow({ 'P/C Add': '' }));
assert.equal(blankPcAdd.Route, 'D');
assert.equal(blankPcAdd.RouteCode, 3);
assert.equal(blankPcAdd.N1_LS_Min_Box, DISPLAY_DASH);
assert.equal(blankPcAdd.N1_LS_Max_Box, DISPLAY_DASH);
assert.equal(blankPcAdd.FormulaStatus, 'OK');

// Regression guard: QtyPerCont=3 doesn't divide evenly, so N1_*_Pcs must diverge sharply from
// Box * QtyPerCont if the independent Pcs formulas are wired up correctly.
// PC Min core = 7*1*((60/920)+0.0005) = 0.460021... -> Box=ROUNDUP(core/3,0)=1, Pcs=ROUNDUP(core,0)=1
// PC added term = ROUNDUP(7*1/24/3,0) + BoxLayer(1) = 1+1=2 -> Max Box=1+2=3, Max Pcs=1+2*3=7 (Box*Qty would wrongly give 9)
// LS Min core = 7*1*((12/920)+0.0005) = 0.094804... -> Box=ROUNDUP(core/3,0)=1, Pcs=ROUNDUP(core,0)=1
// LS added term (RouteCode=1, fixed freq 24) = ROUNDUP(7*1/24/3,0) = 1 -> Max Box=1+1=2, Max Pcs=1+1*3=4 (Box*Qty would wrongly give 6)
const indivisibleQty = calculateOne(makeRow({ N1PerDay: 7, 'QTY /CONT': 3 }));
assert.equal(indivisibleQty.FormulaStatus, 'OK');
assert.equal(indivisibleQty.N1_PC_Min_Box, 1);
assert.equal(indivisibleQty.N1_PC_Min_Pcs, 1);
assert.equal(indivisibleQty.N1_PC_Max_Box, 3);
assert.equal(indivisibleQty.N1_PC_Max_Pcs, 7);
assert.notEqual(indivisibleQty.N1_PC_Max_Pcs, indivisibleQty.N1_PC_Max_Box * 3);
assert.equal(indivisibleQty.N1_LS_Min_Box, 1);
assert.equal(indivisibleQty.N1_LS_Min_Pcs, 1);
assert.equal(indivisibleQty.N1_LS_Max_Box, 2);
assert.equal(indivisibleQty.N1_LS_Max_Pcs, 4);
assert.notEqual(indivisibleQty.N1_LS_Max_Pcs, indivisibleQty.N1_LS_Max_Box * 3);

// New validation: PC SAFETY / LS SAFTY / PC DELIV / LS DELIV blank or invalid must each produce
// FormulaStatus='ERROR' with their own alarm type. PC SAFETY/LS SAFTY blank also nulls out every
// month's Min/Max outputs (same guard as ratio/qtyPerCont/routeCode in calculateMonth); PC DELIV/
// LS DELIV are pure display fields, so they don't affect the Min/Max Box/Pcs formulas at all.
const missingPcSafety = calculateOne(makeRow({ 'PC SAFETY': null }));
assert.equal(missingPcSafety.FormulaStatus, 'ERROR');
assert.ok(missingPcSafety.FormulaAlarms.some((alarm) => alarm.type === 'INVALID_PC_SAFETY'));
assert.equal(missingPcSafety.PCSafetyTime, null);
assert.equal(missingPcSafety.TotalSafetyTime, null);
assert.equal(missingPcSafety.N1_PC_Min_Box, null);
assert.equal(missingPcSafety.N1_LS_Min_Box, null);

const missingLsSafety = calculateOne(makeRow({ 'LS SAFTY': null }));
assert.equal(missingLsSafety.FormulaStatus, 'ERROR');
assert.ok(missingLsSafety.FormulaAlarms.some((alarm) => alarm.type === 'INVALID_LS_SAFETY'));
assert.equal(missingLsSafety.LSSafetyTime, null);
assert.equal(missingLsSafety.TotalSafetyTime, null);
assert.equal(missingLsSafety.N1_PC_Min_Box, null);
assert.equal(missingLsSafety.N1_LS_Min_Box, null);

const missingPcDeliv = calculateOne(makeRow({ 'PC DELIV': null }));
assert.equal(missingPcDeliv.FormulaStatus, 'ERROR');
assert.ok(missingPcDeliv.FormulaAlarms.some((alarm) => alarm.type === 'INVALID_PC_DELIV'));
assert.equal(missingPcDeliv.PcDel, null);
// PC DELIV is display-only - it does not feed the Min/Max formulas, so they still compute normally.
assert.equal(missingPcDeliv.N1_PC_Min_Box, 1);

const missingLsDeliv = calculateOne(makeRow({ 'LS DELIV': null }));
assert.equal(missingLsDeliv.FormulaStatus, 'ERROR');
assert.ok(missingLsDeliv.FormulaAlarms.some((alarm) => alarm.type === 'INVALID_LS_DELIV'));
assert.equal(missingLsDeliv.LsDel, null);
assert.equal(missingLsDeliv.N1_LS_Min_Box, 1);

console.log('Min-Max formula VBA parity test passed');
