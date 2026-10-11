import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { mockApi } from '../../services/mockApi';

export function AppLayout() {
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const refreshPendingCount = async () => {
    try {
      const stats = await mockApi.getDashboardStats();
      setPendingCount(stats?.pendingReviewsCount || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshPendingCount();
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar pendingCount={pendingCount} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header pendingCount={pendingCount} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ refreshPendingCount }} />
        </main>
      </div>
      <MobileNav pendingCount={pendingCount} />
    </div>
  );
}
