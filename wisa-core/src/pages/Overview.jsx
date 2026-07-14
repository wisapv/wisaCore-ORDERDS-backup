import Header from '../components/Header.jsx';
import TodayCard from '../components/TodayCard.jsx';

const STATS = [
  { label: 'Total Parts',   value: '12,480', badge: '+3.2%', color: 'text-green-600 bg-green-50' },
  { label: 'Capacity Used', value: '78%',    badge: '+5.1%', color: 'text-green-600 bg-green-50' },
  { label: 'Pending Tasks', value: '34',     badge: '-2',    color: 'text-red-500 bg-red-50'     },
];

const ACTIVITIES = [
  { name: 'Upload NQC File',   meta: 'CapacityPage • 10 min ago', status: 'Done',    cls: 'bg-green-50 text-green-700'   },
  { name: 'Review HR Report',  meta: 'HR Module • 1 hr ago',      status: 'Pending', cls: 'bg-orange-50 text-orange-700' },
  { name: 'Q2 Capacity Check', meta: 'Reports • 2 hr ago',        status: 'Review',  cls: 'bg-indigo-50 text-indigo-700' },
  { name: 'Update Part List',  meta: 'Capacity • 3 hr ago',       status: 'Done',    cls: 'bg-green-50 text-green-700'   },
];

export default function Overview() {
  return (
    <div
      className="page-decoration relative flex h-full w-full overflow-hidden rounded-[40px]"
      style={{ background: 'var(--page-gradient)' }}
    >
      <TodayCard />

      <div className="flex-1 h-full overflow-y-auto p-10">
        <Header title="Overview" titleClassName="text-[31px] font-medium tracking-[-1.4px]" />

        <div className="flex flex-col gap-8">

          <div className="grid grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="card-soft p-5">
                <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-wisa-dark">{s.value}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-2 inline-block ${s.color}`}>
                  {s.badge}
                </span>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-base font-bold text-wisa-dark mb-3">Recent Activity</h2>
            <div className="card-soft p-6" style={{ borderRadius: '28px' }}>
              {ACTIVITIES.map((a) => (
                <div key={a.name} className="grid grid-cols-[1fr_auto] items-center py-6 px-0 border-b border-[rgba(92,43,62,0.12)] last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-wisa-dark">{a.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.meta}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${a.cls}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
