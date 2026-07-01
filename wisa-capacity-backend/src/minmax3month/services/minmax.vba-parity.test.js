import assert from 'node:assert/strict';
import { DISPLAY_DASH, DISPLAY_NO_DATA, ROUTE1_LS_MAX_FIXED_FREQ, SH_FIXED_ORDER_FREQ } from '../constants/minmax.constants.js';
import { calculateMinMaxFromCalBase, deriveRouteFromPcAdd, excelRoundUp } from './minmax.service.js';

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

const route1 = calculateOne(makeRow());
assert.equal(route1.Route, 'PC');
assert.equal(route1.RouteCode, 1);
assert.equal(route1.N1_PC_Min_Box, 1);
assert.equal(route1.N1_PC_Max_Box, 3);
assert.equal(route1.N1_LS_Min_Box, 1);
assert.equal(route1.N1_LS_Max_Box, 2);
assert.equal(route1.FormulaStatus, 'OK');
assert.equal(ROUTE1_LS_MAX_FIXED_FREQ, 24);

const route2 = calculateOne(makeRow({ 'P/C Add': 'S123' }));
assert.equal(route2.Route, 'S');
assert.equal(route2.RouteCode, 2);
assert.equal(route2.N1_PC_Min_Box, DISPLAY_DASH);
assert.equal(route2.N1_PC_Max_Box, DISPLAY_DASH);
assert.equal(route2.N1_LS_Min_Box, 1);
assert.equal(route2.N1_LS_Max_Box, 3);

const route3 = calculateOne(makeRow({ 'P/C Add': 'D123' }));
assert.equal(route3.Route, 'D');
assert.equal(route3.RouteCode, 3);
assert.equal(route3.N1_PC_Min_Box, 1);
assert.equal(route3.N1_PC_Max_Box, 3);
assert.equal(route3.N1_LS_Min_Box, DISPLAY_DASH);
assert.equal(route3.N1_LS_Max_Box, DISPLAY_DASH);

const shRoute1 = calculateOne(makeRow({ DOCK: 'SH', OrderFreqForCalculation: SH_FIXED_ORDER_FREQ, OrderFreqSource: 'SH_FIXED_8' }));
assert.equal(shRoute1.OrderFreqForCalculation, SH_FIXED_ORDER_FREQ);
assert.equal(shRoute1.N1_PC_Min_Box, DISPLAY_NO_DATA);
assert.equal(shRoute1.N1_PC_Max_Box, DISPLAY_NO_DATA);
assert.equal(shRoute1.N1_LS_Min_Box, 1);
assert.equal(shRoute1.N1_LS_Max_Box, 2);

const missingQty = calculateOne(makeRow({ 'QTY /CONT': null }));
assert.equal(missingQty.FormulaStatus, 'ERROR');
assert.ok(missingQty.FormulaAlarms.some((alarm) => alarm.type === 'INVALID_QTY_PER_CONT'));
assert.equal(missingQty.N1_PC_Min_Box, null);

const missingBoxLayer = calculateOne(makeRow({ BoxLayer: null }));
assert.equal(missingBoxLayer.FormulaStatus, 'ERROR');
assert.ok(missingBoxLayer.FormulaAlarms.some((alarm) => alarm.type === 'BOX_LAYER_REQUIRED_FOR_MAX'));
assert.equal(missingBoxLayer.N1_PC_Max_Box, null);
assert.equal(missingBoxLayer.N1_LS_Max_Box, 2);

const unresolvedRoute = calculateOne(makeRow({ 'P/C Add': '' }));
assert.equal(unresolvedRoute.RouteCode, null);
assert.ok(unresolvedRoute.FormulaAlarms.some((alarm) => alarm.type === 'ROUTE_CODE_UNRESOLVED'));

console.log('Min-Max formula VBA parity test passed');
