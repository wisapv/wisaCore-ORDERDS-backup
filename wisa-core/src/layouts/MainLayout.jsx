import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-wisa-dark p-2 font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 bg-wisa-white rounded-[40px] ml-2 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}