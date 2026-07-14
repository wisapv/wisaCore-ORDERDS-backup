import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const STORAGE_KEY = 'wisacore-dashboard-activities-v1';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readStoredActivities() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) days.push(null);
  for (let day = 1; day <= lastDay.getDate(); day += 1) days.push(new Date(year, month, day));
  while (days.length % 7 !== 0) days.push(null);

  return days;
}

function AddActivityModal({ selectedDate, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState('Pending');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    onSave({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: toDateKey(selectedDate),
      title: cleanTitle,
      time,
      status,
    });
  };

  return createPortal(
    <div className="activity-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="activity-modal-card" onSubmit={handleSubmit}>
        <button type="button" className="activity-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <p className="activity-modal-eyebrow">New activity</p>
        <h2 className="activity-modal-title">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>

        <label className="activity-form-field">
          <span>Activity name</span>
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Upload NQC file" />
        </label>

        <div className="activity-form-grid">
          <label className="activity-form-field">
            <span>Time</span>
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>

          <label className="activity-form-field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>Pending</option>
              <option>Review</option>
              <option>Done</option>
            </select>
          </label>
        </div>

        <button type="submit" className="btn-dark activity-save-button" disabled={!title.trim()}>
          Add activity
        </button>
      </form>
    </div>,
    document.body,
  );
}

export default function ActivityCalendar() {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [activities, setActivities] = useState(readStoredActivities);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  }, [activities]);

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const selectedKey = toDateKey(selectedDate);
  const activityDateKeys = useMemo(() => new Set(activities.map((activity) => activity.date)), [activities]);
  const selectedActivities = useMemo(
    () => activities.filter((activity) => activity.date === selectedKey).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    [activities, selectedKey],
  );

  const changeMonth = (offset) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(next);
    setSelectedDate(next);
  };

  const saveActivity = (activity) => {
    setActivities((current) => [...current, activity]);
    setIsAdding(false);
  };

  const deleteActivity = (activityId) => {
    setActivities((current) => current.filter((activity) => activity.id !== activityId));
  };

  return (
    <div className="activity-calendar">
      <div className="calendar-header">
        <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
          <ChevronLeft size={17} />
        </button>
        <p>{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>

      <div className="calendar-grid">
        {calendarDays.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="calendar-empty" />;

          const dateKey = toDateKey(date);
          const isSelected = dateKey === selectedKey;
          const isToday = dateKey === toDateKey(today);
          const hasActivity = activityDateKeys.has(dateKey);

          return (
            <button
              key={dateKey}
              type="button"
              className={`calendar-day ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${hasActivity ? 'has-activity' : ''}`}
              onClick={() => setSelectedDate(date)}
              aria-label={date.toLocaleDateString('en-US')}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="calendar-divider" />

      <div className="selected-date-header">
        <div>
          <p className="selected-date-label">Selected date</p>
          <p className="selected-date-value">
            {selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button type="button" className="calendar-add-button" onClick={() => setIsAdding(true)}>
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="selected-activities">
        {selectedActivities.length === 0 ? (
          <button type="button" className="activity-empty" onClick={() => setIsAdding(true)}>
            No activity yet — click to add
          </button>
        ) : (
          selectedActivities.map((activity) => (
            <div key={activity.id} className="activity-item-compact">
              <div className="activity-item-dot" />
              <div className="activity-item-copy">
                <p>{activity.title}</p>
                <span>{activity.time || 'All day'} · {activity.status}</span>
              </div>
              <button type="button" onClick={() => deleteActivity(activity.id)} aria-label={`Delete ${activity.title}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <AddActivityModal selectedDate={selectedDate} onClose={() => setIsAdding(false)} onSave={saveActivity} />
      )}
    </div>
  );
}
