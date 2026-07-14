import { UploadCloud } from 'lucide-react';
import { REQUIRED_FILES, isFileFieldSelected } from '../constants/minmaxConstants.js';
import MinmaxStatusBadge from './MinmaxStatusBadge.jsx';

const filePreviewLabel = (item, value) => {
  if (item.multiple) {
    const count = value?.length || 0;
    return count > 0 ? `${count} file${count === 1 ? '' : 's'} selected` : `Choose or drop ${item.fileName}`;
  }
  return value ? value.name : `Choose or drop ${item.fileName}`;
};

export default function MinmaxUploadGrid({ files, onFileChange, fileErrors = {} }) {
  const handleDrop = (event, item) => {
    event.preventDefault();
    if (item.multiple) {
      if (event.dataTransfer.files?.length) onFileChange(item.key, event.dataTransfer.files);
      return;
    }
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) onFileChange(item.key, droppedFile);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {REQUIRED_FILES.map((item) => {
        const selected = isFileFieldSelected(item, files[item.key]);
        const hasError = !selected && Boolean(fileErrors[item.key]);
        return (
          <label key={item.key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, item)} className={`${selected ? 'border-wisa-pink/50 bg-pink-50/40' : hasError ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'} group flex cursor-pointer items-center gap-4 rounded-[24px] border p-4 shadow-sm transition-all hover:border-wisa-pink/60 hover:shadow-md focus-within:border-wisa-pink focus-within:ring-4 focus-within:ring-wisa-pink/15`}>
            <input
              type="file"
              accept={item.accept}
              multiple={item.multiple}
              className="sr-only"
              onChange={(event) => onFileChange(item.key, item.multiple ? event.target.files : event.target.files?.[0])}
            />
            <div className={`${selected ? 'border-wisa-pink/30 bg-wisa-pink/10 text-wisa-pink' : hasError ? 'border-red-200 bg-red-50 text-red-500' : 'border-slate-200 bg-slate-50 text-slate-500'} flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors group-hover:border-wisa-pink/30 group-hover:bg-pink-50 group-hover:text-wisa-pink`}><UploadCloud size={22} strokeWidth={1.7} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-950">{item.label}</h3><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{item.typeLabel} · {item.accept}</p></div>
                <MinmaxStatusBadge tone={selected ? 'success' : hasError ? 'error' : 'idle'} className="shrink-0">{selected ? 'Selected' : hasError ? 'Required' : 'Missing'}</MinmaxStatusBadge>
              </div>
              <p className="mt-3 truncate rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">{filePreviewLabel(item, files[item.key])}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
