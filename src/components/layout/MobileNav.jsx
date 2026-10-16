import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FlaskConical, FileText, Users, CheckSquare, User, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function MobileNav({ pendingCount = 0 }) {
  const { user } = useAuth();
  const items = [
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
    ...(user?.role === 'Technician' ? [{ label: 'New Test', path: '/new-test', icon: FlaskConical }] : []),
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Patients', path: '/patients', icon: Users },
    ...(user?.role === 'Clinician' ? [{ label: 'Reviews', path: '/review-queue', icon: CheckSquare, badge: pendingCount }] : []),
    ...(user?.role === 'Admin' ? [{ label: 'Inventory', path: '/inventory', icon: Package }] : []),
    { label: 'Profile', path: '/profile', icon: User }
  ];

  return <nav aria-label="Mobile navigation" className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex items-stretch justify-around overflow-x-auto safe-area-pb">
    {items.map(({ label, path, icon: Icon, badge }) => <NavLink key={path} to={path} className={({ isActive }) => `relative flex min-w-[64px] flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] font-semibold ${isActive ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}`}>
      <Icon className="w-5 h-5" />{badge > 0 && <span className="absolute top-1 right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] leading-4 text-center">{badge}</span>}<span>{label}</span>
    </NavLink>)}
  </nav>;
}
