import { LayoutGrid, Wallet, BarChart3, Box, User, LogOut, Cat, ChevronDown } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-wisa-dark h-full flex flex-col py-8 rounded-3xl shadow-2xl overflow-hidden flex-shrink-0">

      <div className="flex items-center gap-3 px-8 mb-12 cursor-pointer">
        <Cat className="text-wisa-pink" size={32} strokeWidth={2.5} />
        <span className="text-white font-bold text-2xl tracking-wide">wisaCore</span>
      </div>

      <nav className="flex flex-col gap-1 w-full flex-1">
        <MenuItem to="/"         icon={<LayoutGrid size={20} />} label="Dashboard" />
        <MenuItem to="/capacity" icon={<Box size={20} />}        label="Capacity Flowrack" />
        <MenuItem to="/minmax3month" icon={<BarChart3 size={20} />}  label="Min-Max 3 Month" />
        <MenuItem to="#"         icon={<User size={20} />}       label="HR"      hasDropdown />
        <MenuItem to="#"         icon={<Wallet size={20} />}     label="Tickets" />
        <MenuItem to="#"         icon={<BarChart3 size={20} />}  label="Reports" />
      </nav>

      <div className="px-6 mt-auto">
        <button className="flex items-center gap-4 text-white/50 hover:text-wisa-pink transition-colors w-full p-4 rounded-xl hover:bg-white/5">
          <LogOut size={20} />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}

function MenuItem({ to, icon, label, hasDropdown = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between w-full px-8 py-4 transition-all relative ${
          isActive && to !== '#'
            ? 'bg-wisa-pink/15 text-white'
            : 'text-white/50 hover:text-white hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && to !== '#' && (
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-md shadow-[2px_0_10px_rgba(255,255,255,0.5)]" />
          )}
          <div className="flex items-center gap-4">
            <span className={isActive && to !== '#' ? 'text-wisa-pink' : ''}>{icon}</span>
            <span className="font-medium text-sm tracking-wide">{label}</span>
          </div>
          {hasDropdown && (
            <ChevronDown size={16} className={isActive ? 'text-white' : 'text-white/30'} />
          )}
        </>
      )}
    </NavLink>
  );
}