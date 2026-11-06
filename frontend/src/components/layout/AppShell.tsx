import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileMoreSheet } from './MobileMoreSheet';
import { useAuthStore } from '../../store/auth.store';
import { useWorkspaceStore } from '../../store/workspace.store';
import { Home, CreditCard, Receipt, ArrowLeftRight, Menu, Wallet, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { adminApi } from '../../api/endpoints/admin.api';

interface TabItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

/** The four destinations used most on a phone; everything else lives under "More". */
const MOBILE_TABS: TabItem[] = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/loans', icon: CreditCard, label: 'Loans' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Statement' },
];

const TAB_BASE =
  'flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-[11px] font-medium transition-colors cursor-pointer';

export const AppShell: React.FC = () => {
  const { user } = useAuthStore();
  const loadWorkspace = useWorkspaceStore((s) => s.load);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    loadWorkspace(user?.familyId);
  }, [user?.familyId, loadWorkspace]);

  useEffect(() => {
    if (user?.role === 'admin') {
      adminApi
        .getPending()
        .then((res) => {
          if (Array.isArray(res)) setPendingCount(res.length);
        })
        .catch(() => {});
    }
  }, [user?.role]);

  // Close the phone menu on route change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  // Start every page at the top: the scroll container is <main>, not the window
  useEffect(() => {
    document.getElementById('app-main')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  // System dark mode listener
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="relative flex h-screen h-dvh w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Tablet / desktop sidebar (hidden below 768px) */}
      <Sidebar pendingCount={pendingCount} />

      {/* Phone top bar (< 768px) */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between pl-4 pr-3 z-40 safe-top">
        <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0" aria-label="FinFamily home">
          <span className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Wallet className="w-4.5 h-4.5" />
          </span>
          <span className="font-extrabold text-base tracking-tight text-gray-900 dark:text-white truncate">FinFamily</span>
        </Link>

        <Link
          to="/settings/profile"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
          aria-label="Account and settings"
        >
          <span className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </span>
        </Link>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main
          id="app-main"
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-5 md:px-8 pt-[4.5rem] md:pt-8 pb-28 md:pb-10 min-w-0"
        >
          <Outlet />
        </main>
      </div>

      {/* Phone bottom tab bar (< 768px) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 grid grid-cols-5 items-stretch px-1 z-40 h-16 safe-bottom"
        aria-label="Primary"
      >
        {MOBILE_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              clsx(
                TAB_BASE,
                isActive ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-gray-500 dark:text-gray-400',
              )
            }
          >
            <tab.icon className="w-5 h-5 mb-0.5" />
            <span>{tab.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={clsx(TAB_BASE, 'relative text-gray-500 dark:text-gray-400')}
          aria-label={pendingCount > 0 ? `More options, ${pendingCount} pending requests` : 'More options'}
          aria-haspopup="dialog"
        >
          <span className="relative">
            <Menu className="w-5 h-5 mb-0.5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
            )}
          </span>
          <span>More</span>
        </button>
      </nav>

      <MobileMoreSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} pendingCount={pendingCount} />
    </div>
  );
};
