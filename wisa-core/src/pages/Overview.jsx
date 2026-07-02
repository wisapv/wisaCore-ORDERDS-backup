import Header from '../components/Header.jsx';
import bgFloral from '../assets/floral-bg.jpg';

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
    <div className="flex h-full w-full bg-wisa-white overflow-hidden rounded-[30px] relative">

      {/* ฝั่งซ้าย */}
      <div className="flex-1 p-10 h-full overflow-y-auto pr-[32%]">
        <Header title="Overview" />
        <div className="flex flex-col gap-8">

          <div className="grid grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
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
            <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
              {ACTIVITIES.map((a) => (
                <div key={a.name} className="flex items-center justify-between px-5 py-3.5">
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

      {/* ฝั่งขวา — รูปดอกไม้ */}
      <div className="absolute right-0 top-0 bottom-0 w-[30%] h-full pointer-events-none z-10">
        <div
          className="w-full h-full"
          style={{
            maskImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M10,0 C5,15 15,35 5,50 C-5,65 15,85 10,100 L100,100 L100,0 Z" fill="black"/></svg>')`,
            maskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M10,0 C5,15 15,35 5,50 C-5,65 15,85 10,100 L100,100 L100,0 Z" fill="black"/></svg>')`,
            WebkitMaskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${bgFloral}")`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundAttachment: 'local',
            }}
          />
        </div>
      </div>

    </div>
  );
}