import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FlaskConical, 
  FileText, 
  Users, 
  CheckSquare, 
  User, 
  LogOut,
  Package
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export function Sidebar({ pendingCount = 0 }) {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(user?.role === 'Technician' ? [{ label: 'New Test Wizard', path: '/new-test', icon: FlaskConical }] : []),
    { label: 'Test Reports', path: '/reports', icon: FileText },
    { label: 'Patients', path: '/patients', icon: Users },
    ...(user?.role === 'Clinician' ? [{
      label: 'Review Queue', 
      path: '/review-queue', 
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : null
    }] : []),
    ...(user?.role === 'Admin' ? [{ label: 'Inventory', path: '/inventory', icon: Package }] : []),
    { label: 'Profile', path: '/profile', icon: User }
  ];

  return (
    <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30">
      <div>
        {/* Top Logo */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <BrandLogo size="md" />
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold shadow-sm border border-teal-200/50 dark:border-teal-800/40'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Account */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        {/* User Session Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar name={user?.name} photoUrl={user?.photoUrl} />
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user?.name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user?.designation || user?.email}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
