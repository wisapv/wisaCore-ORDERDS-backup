const toneClasses = {
  idle: 'bg-slate-100 text-slate-600 border-slate-200',
  loading: 'bg-pink-50 text-wisa-pink border-pink-200',
  accent: 'bg-[#ee9eb8] text-white border-transparent',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  dark: 'bg-slate-950 text-white border-slate-800',
};

export default function MinmaxStatusBadge({ tone = 'idle', children, className = '' }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${toneClasses[tone] || toneClasses.idle} ${className}`}>{children}</span>;
}
