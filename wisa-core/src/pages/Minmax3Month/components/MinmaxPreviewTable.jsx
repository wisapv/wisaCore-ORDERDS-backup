import renderCellValue from '../utils/renderCellValue';

export default function MinmaxPreviewTable({ title, rows = [], columns }) {
  const visibleRows = rows.slice(0, 20);
  const tableColumns = columns || (visibleRows.length ? Object.keys(visibleRows[0]) : []);
  return <div className="bg-black/40 border border-white/10 rounded-3xl p-5 overflow-hidden"><h3 className="text-white font-bold tracking-wide mb-4">{title}</h3><div className="overflow-auto custom-scrollbar">{visibleRows.length === 0 ? <p className="text-white/30 text-sm py-6 text-center">No rows</p> : <table className="w-full text-left border-collapse text-xs"><thead><tr>{tableColumns.map((column) => <th key={column} className="px-3 py-3 text-white/30 uppercase tracking-widest border-b border-white/10 whitespace-nowrap">{column}</th>)}</tr></thead><tbody className="text-white/70">{visibleRows.map((row, rowIndex) => <tr key={`row-${rowIndex}`} className="hover:bg-white/[0.02]">{tableColumns.map((column) => <td key={column} className="px-3 py-3 border-b border-white/5 whitespace-nowrap">{renderCellValue(row[column])}</td>)}</tr>)}</tbody></table>}</div></div>;
}
