import renderCellValue from '../utils/renderCellValue.jsx';
import MinmaxEmptyState from './MinmaxEmptyState.jsx';

export default function MinmaxPreviewTable({ title, rows = [], columns }) {
  const visibleRows = rows.slice(0, 20);
  const tableColumns = columns || (visibleRows.length ? Object.keys(visibleRows[0]) : []);
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4"><h3 className="font-bold tracking-wide text-slate-950">{title}</h3></div>
      <div className="overflow-auto custom-scrollbar">
        {visibleRows.length === 0 ? <div className="p-5"><MinmaxEmptyState message="No rows to display yet." suggestion="Preview or process a file to inspect the first 20 rows." /></div> : (
          <table className="w-full min-w-max border-collapse text-left text-xs">
            <thead><tr>{tableColumns.map((column) => <th key={column} className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-3 font-bold uppercase tracking-widest text-slate-500">{column}</th>)}</tr></thead>
            <tbody className="text-slate-700">{visibleRows.map((row, rowIndex) => <tr key={`row-${rowIndex}`} className="hover:bg-pink-50/40">{tableColumns.map((column) => <td key={column} className="whitespace-nowrap border-b border-slate-100 px-3 py-3">{renderCellValue(row[column])}</td>)}</tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
