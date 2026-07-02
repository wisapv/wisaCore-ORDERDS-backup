import { UploadCloud } from 'lucide-react';
import { REQUIRED_FILES } from '../constants/minmaxConstants.js';
import MinmaxStatusBadge from './MinmaxStatusBadge.jsx';

export default function MinmaxUploadGrid({ files, onFileChange }) {
  const handleDrop = (event, key) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) onFileChange(key, droppedFile);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {REQUIRED_FILES.map((item) => {
        const selected = Boolean(files[item.key]);
        return (
          <label key={item.key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, item.key)} className="group flex min-h-44 cursor-pointer flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-wisa-pink/60 hover:shadow-md focus-within:border-wisa-pink focus-within:ring-4 focus-within:ring-wisa-pink/15">
            <input type="file" accept={item.accept} className="sr-only" onChange={(event) => onFileChange(item.key, event.target.files?.[0])} />
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors group-hover:border-wisa-pink/30 group-hover:bg-pink-50 group-hover:text-wisa-pink"><UploadCloud size={22} strokeWidth={1.7} /></div>
              <MinmaxStatusBadge tone={selected ? 'success' : 'idle'}>{selected ? 'Selected' : 'Missing'}</MinmaxStatusBadge>
            </div>
            <div className="mt-5">
              <h3 className="text-base font-bold text-slate-950">{item.label}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.typeLabel} · {item.accept}</p>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-700 truncate">{selected ? files[item.key].name : 'Choose file or drop file here'}</p>
                <p className="mt-1 text-xs text-slate-500">Expected: {item.fileName}</p>
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
