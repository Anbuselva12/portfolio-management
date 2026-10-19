import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
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
import { adminApi } from '../../api/endpoints/admin.api';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const isFairShare = location.pathname.startsWith('/fairshare');

  useEffect(() => {
    if (user?.role === 'admin') {
      adminApi.getPending()
        .then((res) => {
          if (Array.isArray(res)) setPendingCount(res.length);
        })
        .catch(() => {});
    }
  }, [user?.role]);

  const finFamilyLinks: NavItem[] = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/assets', icon: Briefcase, label: 'Assets' },
    { to: '/income', icon: TrendingUp, label: 'Income' },
    { to: '/loans', icon: CreditCard, label: 'Loans' },
    { to: '/strategies', icon: Zap, label: 'Debt Strategies' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { to: '/insurance', icon: Shield, label: 'Insurance' },
    ...(user?.role === 'admin'
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
    <aside className="hidden md:flex flex-col w-60 lg:w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0">
      {/* Brand & Appian-Style Multi-App Switcher */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-850">
        <AppSwitcher />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.label}
            to={link.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )
            }
          >
            <link.icon className="w-5 h-5 shrink-0" />
            <span className="truncate">{link.label}</span>
            {link.badge !== undefined && link.badge > 0 && (
              <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white animate-pulse">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profile & Logout Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-sm truncate min-w-0">
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
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors w-full cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};
