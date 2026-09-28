import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { User, Shield, Users, Clock } from 'lucide-react';
import clsx from 'clsx';

interface SettingsNavProps {
  pendingCount?: number;
}

export const SettingsNav: React.FC<SettingsNavProps> = ({ pendingCount = 0 }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const tabs = [
    { to: '/settings/profile', label: 'My Profile', icon: User },
    ...(isAdmin ? [{ to: '/settings/family', label: 'Family Settings', icon: Shield }] : []),
    ...(isAdmin
      ? [
          {
            to: '/settings/members',
            label: 'Members & Access',
            icon: Users,
            badge: pendingCount,
          },
        ]
      : []),
    { to: '/settings/audit', label: 'Audit Trail', icon: Clock },
  ];

  return (
    <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-3 mb-6 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            clsx(
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer',
              isActive
                ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/80 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60'
            )
          }
        >
          <tab.icon className="w-4 h-4 shrink-0" />
          <span>{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white animate-pulse">
              {tab.badge}
            </span>
          )}
        </NavLink>
      ))}
    </div>
  );
};
