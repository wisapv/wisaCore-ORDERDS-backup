import Header from '../components/Header.jsx';
import TodayCard from '../components/TodayCard.jsx';

const STATS = [
  {
    label: 'Total Parts',
    value: '12,480',
    badge: '+3.2%',
    color: 'text-green-600 bg-green-50',
  },
  {
    label: 'Capacity Used',
    value: '78%',
    badge: '+5.1%',
    color: 'text-green-600 bg-green-50',
  },
  {
    label: 'Pending Tasks',
    value: '34',
    badge: '-2',
    color: 'text-red-500 bg-red-50',
  },
];

const ACTIVITIES = [
  {
    name: 'Upload NQC File',
    meta: 'CapacityPage • 10 min ago',
    status: 'Done',
    cls: 'bg-green-50 text-green-700',
  },
  {
    name: 'Review HR Report',
    meta: 'HR Module • 1 hr ago',
    status: 'Pending',
    cls: 'bg-orange-50 text-orange-700',
  },
  {
    name: 'Q2 Capacity Check',
    meta: 'Reports • 2 hr ago',
    status: 'Review',
    cls: 'bg-indigo-50 text-indigo-700',
  },
  {
    name: 'Update Part List',
    meta: 'Capacity • 3 hr ago',
    status: 'Done',
    cls: 'bg-green-50 text-green-700',
  },
];

export default function Overview() {
  return (
    <div
      className="
        overview-surface
        grid
        h-full
        min-h-0
        w-full
        grid-cols-[290px_minmax(0,1fr)]
        gap-6
        overflow-hidden
        rounded-[40px]
        p-6
      "
      style={{ background: 'var(--page-gradient)' }}
    >
      <TodayCard />

      <section
        className="
          min-w-0
          min-h-0
          overflow-y-auto
          px-4
          py-5
          custom-scrollbar
        "
      >
        <Header
          title="Overview"
          titleClassName="text-[31px] font-medium tracking-[-1.4px]"
        />

        <div className="flex flex-col gap-8 pb-5">
          <div className="grid grid-cols-3 gap-4">
            {STATS.map((stat) => (
              <article key={stat.label} className="card-soft p-5">
                <p className="mb-1 text-xs font-medium text-gray-400">
                  {stat.label}
                </p>

                <p className="text-3xl font-bold text-wisa-dark">
                  {stat.value}
                </p>

                <span
                  className={`
                    mt-2
                    inline-block
                    rounded-full
                    px-2
                    py-0.5
                    text-xs
                    font-semibold
                    ${stat.color}
                  `}
                >
                  {stat.badge}
                </span>
              </article>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-base font-bold text-wisa-dark">
              Recent Activity
            </h2>

            <div
              className="card-soft p-6"
              style={{ borderRadius: '28px' }}
            >
              {ACTIVITIES.map((activity) => (
                <div
                  key={activity.name}
                  className="
                    grid
                    grid-cols-[1fr_auto]
                    items-center
                    border-b
                    border-[rgba(92,43,62,0.12)]
                    px-0
                    py-6
                    last:border-b-0
                  "
                >
                  <div>
                    <p className="text-sm font-medium text-wisa-dark">
                      {activity.name}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-400">
                      {activity.meta}
                    </p>
                  </div>

                  <span
                    className={`
                      rounded-full
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      ${activity.cls}
                    `}
                  >
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}