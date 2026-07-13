import { Download, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import MinmaxEmptyState from './components/MinmaxEmptyState.jsx';
import MinmaxSectionCard from './components/MinmaxSectionCard.jsx';
import MinmaxStatusBadge from './components/MinmaxStatusBadge.jsx';
import { HISTORY_URL, historyDownloadUrl } from './constants/minmaxConstants.js';
import { MONTH_ABBR, formatMonthLabel, parseMonthValue } from './utils/monthLabel.js';

function formatCreatedAt(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString ?? '-');
  const day = date.getDate();
  const month = MONTH_ABBR[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hours}:${minutes}`;
}

function sortHistoryGroups(history) {
  return [...history].sort((a, b) => {
    const monthA = parseMonthValue(a.targetMonth);
    const monthB = parseMonthValue(b.targetMonth);
    if (monthA && monthB) return (monthB.year * 12 + monthB.month) - (monthA.year * 12 + monthA.month);
    if (monthA) return -1;
    if (monthB) return 1;
    return String(b.targetMonth).localeCompare(String(a.targetMonth));
  });
}

function sortRunsByRevisionDesc(runs) {
  return [...runs].sort((a, b) => b.revision - a.revision);
}

export default function MinmaxHistoryTab() {
  const [state, setState] = useState({ status: 'loading', history: [], message: '' });

  useEffect(() => {
    let isMounted = true;

    fetch(HISTORY_URL)
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!isMounted) return;
        if (ok && result.success) {
          setState({ status: 'ready', history: result.history || [], message: '' });
        } else {
          setState({ status: 'error', history: [], message: result.message || 'Failed to load Min-Max history.' });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setState({ status: 'error', history: [], message: 'Unable to connect to backend at localhost:3000.' });
      });

    return () => { isMounted = false; };
  }, []);

  if (state.status === 'loading') {
    return (
      <MinmaxSectionCard eyebrow="History" title="Calculation history">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
          <LoaderCircle className="animate-spin" size={18} />
          Loading calculation history...
        </div>
      </MinmaxSectionCard>
    );
  }

  if (state.status === 'error') {
    return (
      <MinmaxSectionCard eyebrow="History" title="Calculation history">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{state.message}</div>
      </MinmaxSectionCard>
    );
  }

  if (state.history.length === 0) {
    return (
      <MinmaxSectionCard eyebrow="History" title="Calculation history">
        <MinmaxEmptyState message="ยังไม่มีประวัติการคำนวณ" suggestion="กด Current เพื่อเริ่มคำนวณ" />
      </MinmaxSectionCard>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sortHistoryGroups(state.history).map((group) => {
        const runs = sortRunsByRevisionDesc(group.runs || []);
        return (
          <MinmaxSectionCard
            key={group.targetMonth}
            eyebrow="History"
            title={formatMonthLabel(group.targetMonth)}
            description={`${runs.length} revision${runs.length === 1 ? '' : 's'}`}
          >
            <div className="flex flex-col gap-3">
              {runs.map((run, index) => (
                <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MinmaxStatusBadge tone={index === 0 ? 'loading' : 'idle'}>REV {run.revision}</MinmaxStatusBadge>
                    <span className="text-sm text-slate-500">{formatCreatedAt(run.createdAt)}</span>
                  </div>
                  <a
                    href={historyDownloadUrl(run.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-700 transition-colors hover:border-wisa-pink hover:text-wisa-pink"
                  >
                    <Download size={14} />
                    Download
                  </a>
                </div>
              ))}
            </div>
          </MinmaxSectionCard>
        );
      })}
    </div>
  );
}
