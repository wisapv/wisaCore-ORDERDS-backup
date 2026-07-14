import { useNavigate } from 'react-router-dom';

const YEAR_ACCENT = '#ee9eb8';

export default function TodayCard() {
  const navigate = useNavigate();
  const now = new Date();
  const monthShort = now.toLocaleDateString('en-US', { month: 'short' });
  const year = now.getFullYear();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const day = now.getDate();
  const monthLong = now.toLocaleDateString('en-US', { month: 'long' });

  return (
    <div
      className="card-strong w-[290px] shrink-0 flex flex-col justify-between p-8"
      style={{ minHeight: 'calc(100vh - 48px)' }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Today</p>
        <p className="mt-2 leading-none font-semibold" style={{ fontSize: '46px', letterSpacing: '-3px', color: 'var(--text-primary)' }}>
          {monthShort}
        </p>
        <p className="leading-none font-semibold" style={{ fontSize: '46px', letterSpacing: '-3px', color: YEAR_ACCENT }}>
          {year}
        </p>
        <div className="mt-6">
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{weekday} {day}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{monthLong} {year}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-wisa-dark text-white flex items-center justify-center font-bold text-sm">W</div>
          <span className="font-bold text-wisa-dark">wisaCore</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/minmax3month')}
          className="btn-dark px-5 py-3 text-sm font-bold flex items-center justify-center gap-2"
        >
          Go to Min-Max <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
