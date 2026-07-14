import { useNavigate } from 'react-router-dom';
import ActivityCalendar from './ActivityCalendar.jsx';

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
    <aside className="card-strong today-card custom-scrollbar">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          Today
        </p>

        <p className="mt-2 font-semibold leading-none" style={{ fontSize: '46px', letterSpacing: '-3px', color: 'var(--text-primary)' }}>
          {monthShort}
        </p>

        <p className="font-semibold leading-none" style={{ fontSize: '46px', letterSpacing: '-3px', color: YEAR_ACCENT }}>
          {year}
        </p>

        <div className="mt-6">
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {weekday} {day}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {monthLong} {year}
          </p>
        </div>

        <ActivityCalendar />
      </div>

      <div className="today-card-footer">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wisa-dark text-sm font-bold text-white">
            W
          </div>
          <span className="font-bold text-wisa-dark">wisaCore</span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/minmax3month')}
          className="btn-dark flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold"
        >
          Go to Min-Max <span aria-hidden="true">→</span>
        </button>
      </div>
    </aside>
  );
}
