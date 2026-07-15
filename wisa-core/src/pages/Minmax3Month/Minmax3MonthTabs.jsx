import { useCallback, useState } from 'react';
import Header from '../../components/Header.jsx';
import MinmaxCurrentTab from './MinmaxCurrentTab.jsx';
import MinmaxHistoryTab from './MinmaxHistoryTab.jsx';
import MinmaxSettingsTab from './MinmaxSettingsTab.jsx';

const TABS = [
  { key: 'history', label: 'History' },
  { key: 'current', label: 'Current' },
  { key: 'settings', label: 'Settings' },
];

export default function Minmax3MonthTabs() {
  const [activeTab, setActiveTab] = useState('history');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const handleCalculateSuccess = useCallback(() => {
    setHistoryRefreshKey((current) => current + 1);
    setActiveTab('history');
  }, []);

  const handleGoToSettings = useCallback(() => {
    setActiveTab('settings');
  }, []);

  return (
    <div className="minmax-surface custom-scrollbar h-full min-h-0 overflow-y-auto rounded-[40px] p-6 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-6">
        <div className="flex justify-center">
          <div className="card-strong flex gap-1 p-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                    isActive ? 'btn-dark' : 'bg-transparent text-wisa-dark/50 hover:text-wisa-dark/80'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <Header title="Min-Max 3 Month" showActions={false} />

        <div className={activeTab === 'history' ? 'flex flex-col gap-6' : 'hidden'}>
          <MinmaxHistoryTab key={historyRefreshKey} />
        </div>
        <div className={activeTab === 'current' ? 'flex flex-col gap-6' : 'hidden'}>
          <MinmaxCurrentTab onCalculateSuccess={handleCalculateSuccess} onGoToSettings={handleGoToSettings} />
        </div>
        <div className={activeTab === 'settings' ? 'flex flex-col gap-6' : 'hidden'}>
          <MinmaxSettingsTab />
        </div>
      </div>
    </div>
  );
}
