import { Search, Bell } from 'lucide-react';

export default function Header({ title = 'Overview', showActions = true }) {
  return (
    <header className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-wisa-dark">{title}</h1>
      {showActions && (
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-full bg-wisa-dark/5 flex items-center justify-center hover:bg-wisa-dark/10 transition">
            <Search size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-wisa-dark/5 flex items-center justify-center hover:bg-wisa-dark/10 transition relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-wisa-pink rounded-full" />
          </button>
          <div className="flex items-center gap-2 bg-wisa-dark/5 py-1.5 px-2 rounded-full cursor-pointer hover:bg-wisa-dark/10 transition ml-2">
            <div className="w-8 h-8 rounded-full bg-wisa-dark text-white flex items-center justify-center text-xs font-bold">
              AD
            </div>
            <span className="text-sm font-semibold pr-2">Admin W.</span>
          </div>
        </div>
      )}
    </header>
  );
}