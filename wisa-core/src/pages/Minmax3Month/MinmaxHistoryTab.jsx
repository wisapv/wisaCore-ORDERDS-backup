import MinmaxSectionCard from './components/MinmaxSectionCard.jsx';

// Placeholder for STEP 2 - real history list/fetch/download UI is built in STEP 3.
export default function MinmaxHistoryTab() {
  return (
    <MinmaxSectionCard
      eyebrow="History"
      title="Calculation history"
      description="History content coming soon."
    >
      <p className="text-sm text-slate-400">This tab will list past Min-Max calculation runs by month and revision.</p>
    </MinmaxSectionCard>
  );
}
