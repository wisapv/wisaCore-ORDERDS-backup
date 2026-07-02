import { AlertTriangle, Siren } from 'lucide-react';

function ListPanel({ title, items, tone, icon }) {
  if (!items.length) return null;
  const styles = tone === 'red' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800';
  return <div className={`rounded-2xl border p-4 text-sm ${styles}`}><p className="mb-2 flex items-center gap-2 font-bold">{icon} {title}</p><ul className="list-disc space-y-1 pl-5">{items.map((item, index) => <li key={`${title}-${index}`}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ul></div>;
}

export default function MinmaxWarnings({ warnings = [], alarms = [] }) {
  return <><ListPanel title="Warnings" items={warnings} tone="amber" icon={<AlertTriangle size={16} />} /><ListPanel title="Alarms" items={alarms} tone="red" icon={<Siren size={16} />} /></>;
}
