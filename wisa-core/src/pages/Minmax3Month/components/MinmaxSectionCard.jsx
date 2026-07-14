const VARIANT_CLASSES = {
  soft: 'card-soft p-5 md:p-6',
  strong: 'card-strong p-5 md:p-6',
};

export default function MinmaxSectionCard({ eyebrow, title, description, actions, children, className = '', variant = 'soft' }) {
  return (
    <section className={`${VARIANT_CLASSES[variant] || VARIANT_CLASSES.soft} ${className}`}>
      {(eyebrow || title || description || actions) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-wisa-pink">{eyebrow}</p>}
            {title && <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{title}</h2>}
            {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
