import { useMemo, useState } from 'react';
import { addMonths, formatMonthShort, parseMonthValue } from '../utils/monthLabel.js';
import renderCellValue from '../utils/renderCellValue.jsx';
import MinmaxEmptyState from './MinmaxEmptyState.jsx';

const FILTER_FIELDS = [
  { key: 'SupplierKey', label: 'Supplier Key' },
  { key: 'SUPL', label: 'SUPL' },
  { key: 'SupplierPlant', label: 'PLANT' },
  { key: 'S.DOCK', label: 'S.Dock' },
  { key: 'DOCK', label: 'DOCK' },
  { key: 'KBN', label: 'KBN' },
];

const MONTH_OPTIONS = [
  { key: 'N1', offset: 1, prefix: 'N1' },
  { key: 'N2', offset: 2, prefix: 'N2' },
  { key: 'N3', offset: 3, prefix: 'N3' },
];

// Both "Check LP Freq Status" and "Order Freq Status (Base Current)" are the same comparison
// (CurrentFreq vs OrderFreqForCalculation) - the original VBA sheet computes them from two
// columns that are always kept equal (W = U), so they always render identically here too.
function compareFreq(current, target) {
  const a = Number(current);
  const b = Number(target);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '-';
  if (a === b) return 'Same';
  return a < b ? 'Increase' : 'Decrease';
}

const buildColumns = (monthLabel, prefix) => [
  { header: 'Supplier Key', render: (row) => row.SupplierKey },
  { header: 'SUPL', render: (row) => row.SUPL },
  { header: 'PLANT', render: (row) => row.SupplierPlant },
  { header: 'S.Dock', render: (row) => row['S.DOCK'] },
  { header: 'DOCK', render: (row) => row.DOCK },
  { header: 'PART #', render: (row) => row['PART #'] },
  { header: 'Part Name', render: (row) => row['PART DESC'] },
  { header: 'KBN', render: (row) => row.KBN },
  { header: "Q'ty", render: (row) => row['QTY /CONT'] },
  { header: 'P/C Add', render: (row) => row['P/C Add'] },
  { header: 'Lineside Address', render: (row) => row['Lineside Address'] },
  { header: `LP Design Freq = [ ${monthLabel} ]`, render: (row) => row.CurrentFreq },
  { header: 'Check LP Freq Status', render: (row) => compareFreq(row.CurrentFreq, row.OrderFreqForCalculation) },
  { header: `AL Req LP Design Freq = [ ${monthLabel} ]`, render: (row) => row.OrderFreqForCalculation },
  { header: 'Order Freq Status (Base Current)', render: (row) => compareFreq(row.CurrentFreq, row.OrderFreqForCalculation) },
  { header: 'PC Min', render: (row) => row[`${prefix}_PC_Min_Box`] },
  { header: 'PC Max', render: (row) => row[`${prefix}_PC_Max_Box`] },
  { header: 'LS Min', render: (row) => row[`${prefix}_LS_Min_Box`] },
  { header: 'LS Max', render: (row) => row[`${prefix}_LS_Max_Box`] },
];

export default function MinmaxDataTable({ rows = [], targetMonth }) {
  const [selectedMonth, setSelectedMonth] = useState('N1');
  const [filters, setFilters] = useState({});

  const baseMonth = parseMonthValue(targetMonth);

  const monthLabels = useMemo(() => MONTH_OPTIONS.reduce((labels, option) => {
    labels[option.key] = (baseMonth && formatMonthShort(addMonths(baseMonth, option.offset))) || option.key;
    return labels;
  }, {}), [baseMonth]);

  const activeOption = MONTH_OPTIONS.find((option) => option.key === selectedMonth);
  const columns = useMemo(() => buildColumns(monthLabels[selectedMonth], activeOption.prefix), [monthLabels, selectedMonth, activeOption]);

  const handleFilterChange = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const filteredRows = useMemo(() => rows.filter((row) => FILTER_FIELDS.every(({ key }) => {
    const filterValue = filters[key];
    if (!filterValue) return true;
    return String(row[key] ?? '').toLowerCase().includes(filterValue.trim().toLowerCase());
  })), [rows, filters]);

  const visibleRows = filteredRows.slice(0, 20);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {MONTH_OPTIONS.map((option) => {
          const isActive = option.key === selectedMonth;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelectedMonth(option.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                isActive ? 'bg-wisa-pink text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {monthLabels[option.key]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {FILTER_FIELDS.map(({ key, label }) => (
          <input
            key={key}
            type="text"
            value={filters[key] || ''}
            onChange={(event) => handleFilterChange(key, event.target.value)}
            placeholder={`Filter ${label}`}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-wisa-pink focus:outline-none"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="font-bold tracking-wide text-slate-950">First 20 Min-Max Rows ({filteredRows.length} match{filteredRows.length === 1 ? '' : 'es'})</h3>
        </div>
        <div className="overflow-auto custom-scrollbar">
          {visibleRows.length === 0 ? (
            <div className="p-5"><MinmaxEmptyState message="No rows match the current filters." suggestion="Clear a filter field above to see more rows." /></div>
          ) : (
            <table className="w-full min-w-max border-collapse text-left text-xs">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.header} className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-3 font-bold uppercase tracking-widest text-slate-500">{column.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {visibleRows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`} className="hover:bg-pink-50/40">
                    {columns.map((column) => (
                      <td key={column.header} className="whitespace-nowrap border-b border-slate-100 px-3 py-3">{renderCellValue(column.render(row))}</td>
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
