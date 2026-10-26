import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useIsFamily } from '../../store/workspace.store';
import { AppSwitcher } from './AppSwitcher';
import {
  Home,
  Briefcase,
  TrendingUp,
  CreditCard,
  Receipt,
  ArrowLeftRight,
  Shield,
  Settings,
  LogOut,
  Zap,
  Clock,
  Wallet,
  Users,
  Palmtree,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  badge?: number;
}

/** `pendingCount` (admin join requests) is fetched once by AppShell and shared with the phone menu. */
export const Sidebar: React.FC<{ pendingCount?: number }> = ({ pendingCount = 0 }) => {
  const { user, logout } = useAuthStore();
  const isFamily = useIsFamily();
  const location = useLocation();
  const isFairShare = location.pathname.startsWith('/fairshare');

  const finFamilyLinks: NavItem[] = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/assets', icon: Briefcase, label: 'Assets' },
    { to: '/income', icon: TrendingUp, label: 'Income' },
    { to: '/loans', icon: CreditCard, label: 'Loans' },
    { to: '/strategies', icon: Zap, label: 'Debt Strategies' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { to: '/insurance', icon: Shield, label: 'Insurance' },
    ...(user?.role === 'admin' && isFamily
      ? [{ to: '/settings/members', icon: Users, label: 'Members & Access', badge: pendingCount }]
      : []),
    { to: '/settings/audit', icon: Clock, label: 'Audit Trail' },
    { to: '/settings/profile', icon: Settings, label: 'Settings' },
  ];

  const fairShareLinks: NavItem[] = [
    { to: '/fairshare', icon: Palmtree, label: 'Trips & Events' },
    { to: '/fairshare/settings', icon: Settings, label: 'Settings' },
  ];

  const links = isFairShare ? fairShareLinks : finFamilyLinks;

  return (
    <aside className="hidden md:flex flex-col w-[4.5rem] lg:w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0">
      {/* Brand & Appian-Style Multi-App Switcher */}
      <div className="p-2 lg:p-3 border-b border-gray-100 dark:border-gray-850">
        <AppSwitcher />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 lg:px-3 py-4 space-y-1.5 overflow-y-auto" aria-label="Main">
        {links.map((link) => (
          <NavLink
            key={link.label}
            to={link.to}
            title={link.label}
            aria-label={link.label}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )
            }
          >
            <link.icon className="w-5 h-5 shrink-0" />
            <span className="truncate hidden lg:inline">{link.label}</span>
            {link.badge !== undefined && link.badge > 0 && (
              <span className="absolute top-1 right-1 lg:static lg:ml-auto min-w-[1.1rem] lg:min-w-0 text-center px-1 lg:px-2 py-0 lg:py-0.5 text-[10px] lg:text-xs font-bold rounded-full bg-amber-500 text-white animate-pulse">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profile & Logout Footer */}
      <div className="p-2 lg:p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/40">
        <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 lg:mb-3" title={user?.displayName}>
          <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-sm truncate min-w-0 hidden lg:block">
            <div className="font-semibold text-gray-900 dark:text-white truncate">
              {user?.displayName}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-xs capitalize truncate">
              {user?.role || 'Member'}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Log out"
          aria-label="Log out"
          className="flex items-center justify-center lg:justify-start gap-2 px-3 py-2 min-h-[40px] text-xs font-semibold text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors w-full cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">Log out</span>
        </button>
      </div>
    </aside>
  );
};
