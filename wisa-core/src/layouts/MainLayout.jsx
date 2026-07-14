import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';

export default function MainLayout() {
  const { pathname } = useLocation();
  const usesGradientSurface = pathname === '/' || pathname.startsWith('/minmax3month') ||
  pathname.startsWith('/capacity');

  return (
    <div className="flex h-screen bg-wisa-dark p-2 font-sans overflow-hidden">
      <Sidebar />

      <main
        className={`flex-1 min-w-0 ml-2 rounded-[40px] overflow-hidden ${
          usesGradientSurface ? 'bg-transparent' : 'bg-wisa-white p-6 overflow-y-auto'
        }`}
      >
        {usesGradientSurface ? (
          <Outlet />
        ) : (
          <div className="max-w-7xl mx-auto min-h-full">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
