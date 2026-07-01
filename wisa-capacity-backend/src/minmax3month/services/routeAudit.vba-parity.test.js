import assert from 'node:assert/strict';
import { auditRouteCodeFromCalBase } from './minmax.service.js';

const rows = [
  { CalBaseKey: '1', 'P/C Add': 'A-100', 'Kanban Print Address': 'A-100' },
  { CalBaseKey: '2', 'P/C Add': 'S200', 'Kanban Print Address': 'S200' },
  { CalBaseKey: '3', 'P/C Add': 'D300', 'Kanban Print Address': 'D300' },
];
const confirmed = auditRouteCodeFromCalBase({ rows, warnings: [] });
assert.equal(confirmed.recommendation.status, 'CONFIRMED');
assert.equal(confirmed.recommendation.fieldName, 'P/C Add');
assert.equal(confirmed.summary.routeResolvedRows, 3);

const needsReview = auditRouteCodeFromCalBase({ rows: rows.map((row) => ({ CalBaseKey: row.CalBaseKey })), warnings: [] });
assert.equal(needsReview.recommendation.status, 'NEEDS_REVIEW');
assert.equal(needsReview.summary.routeResolvedRows, 0);

console.log('RouteCode audit VBA parity test passed');
