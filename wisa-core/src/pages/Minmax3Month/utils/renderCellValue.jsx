const textEquals = (a, b) => String(a ?? '').trim().toUpperCase() === String(b ?? '').trim().toUpperCase();

export default function renderCellValue(value) {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400">-</span>;
  if (textEquals(value, '-')) return <span className="text-slate-400">-</span>;
  if (textEquals(value, 'NO Data')) return <span className="font-semibold text-amber-700">NO Data</span>;
  if (textEquals(value, 'Err') || textEquals(value, 'Error')) return <span className="font-semibold text-red-700">{String(value)}</span>;
  if (typeof value === 'number') return value.toLocaleString();
  if (Array.isArray(value) || typeof value === 'object') return <span className="text-slate-500">{JSON.stringify(value)}</span>;
  return String(value);
}
