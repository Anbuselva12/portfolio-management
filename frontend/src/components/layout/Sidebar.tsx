import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Home, Briefcase, TrendingUp, CreditCard, Receipt, Shield, Settings, LogOut, Zap, Clock } from 'lucide-react';
import clsx from 'clsx';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();

  const links = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/assets', icon: Briefcase, label: 'Assets' },
    { to: '/income', icon: TrendingUp, label: 'Income' },
    { to: '/loans', icon: CreditCard, label: 'Loans' },
    { to: '/strategies', icon: Zap, label: 'Debt Strategies' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/insurance', icon: Shield, label: 'Insurance' },
    { to: '/settings/audit', icon: Clock, label: 'Audit Trail' },
    { to: '/settings/profile', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <div className="p-4 md:p-6 text-xl font-bold text-gray-900 dark:text-white">
        FinFamily
      </div>
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.label}
            to={link.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                isActive
                  ? 'bg-accent text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )
            }
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold">
            {user?.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-sm">
            <div className="font-semibold text-gray-900 dark:text-white">{user?.displayName}</div>
            <div className="text-gray-500 dark:text-gray-400 text-xs">{user?.role}</div>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors w-full">
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );
};
