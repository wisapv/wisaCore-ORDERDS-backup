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
      <Header title="Min-Max 3 Month" />

      <div className="-mt-4 flex gap-2 border-b border-slate-200">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-t-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition ${
                isActive ? 'border-b-2 border-wisa-pink text-wisa-pink' : 'border-b-2 border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'history' ? <MinmaxHistoryTab /> : <MinmaxCurrentTab />}
    </div>
  );
}
