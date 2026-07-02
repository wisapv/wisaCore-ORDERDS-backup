import { UploadCloud } from 'lucide-react';
import { REQUIRED_FILES } from '../constants/minmaxConstants.js';

export default function MinmaxUploadGrid({ files, onFileChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {REQUIRED_FILES.map((item) => (
        <label key={item.key} className="bg-black/40 border border-white/10 rounded-3xl p-5 cursor-pointer hover:border-wisa-pink/50 hover:bg-wisa-pink/5 transition-all group">
          <input type="file" accept={item.accept} className="hidden" onChange={(event) => onFileChange(item.key, event.target.files?.[0])} />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 group-hover:text-wisa-pink text-white/70 transition-colors"><UploadCloud size={22} strokeWidth={1.5} /></div>
            <div className="min-w-0"><p className="text-white font-semibold text-sm truncate">{item.label}</p><p className="text-white/40 text-xs truncate">{files[item.key] ? files[item.key].name : 'Choose file'}</p></div>
          </div>
        </label>
      ))}
    </div>
  );
}
