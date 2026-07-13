import { useState } from 'react';
import Header from '../../components/Header.jsx';
import MinmaxCurrentTab from './MinmaxCurrentTab.jsx';
import MinmaxHistoryTab from './MinmaxHistoryTab.jsx';

const TABS = [
  { key: 'history', label: 'History' },
  { key: 'current', label: 'Current' },
];

export default function Minmax3MonthTabs() {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="min-h-full bg-slate-50 text-slate-950 flex flex-col gap-6">
      <div className="flex justify-center">
        <div className="flex gap-1 rounded-full bg-wisa-dark p-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                  isActive ? 'bg-wisa-white text-wisa-dark' : 'bg-transparent text-white/50 hover:text-white/80'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <Header title="Min-Max 3 Month" showActions={false} />

      {activeTab === 'history' ? <MinmaxHistoryTab /> : <MinmaxCurrentTab />}
    </div>
  );
}
