import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../store/auth.store';
import { Home, Briefcase, Receipt, Shield, Settings } from 'lucide-react';
import clsx from 'clsx';

export const BottomTabBar: React.FC = () => {
  const links = [
    { to: '/dashboard', icon: Home, label: 'Dash' },
    { to: '/assets', icon: Briefcase, label: 'Assets' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/insurance', icon: Shield, label: 'Insurance' },
    { to: '/settings/profile', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around p-2 z-40">
      {links.map((link) => (
        <NavLink
          key={link.label}
          to={link.to}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center p-2 text-xs',
              isActive ? 'text-accent' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )
          }
        >
          <link.icon className="w-6 h-6 mb-1" />
          <span>{link.label}</span>
        </NavLink>
      ))}
    </div>
  );
};

export const AppShell: React.FC = () => {
  const { user } = useAuthStore();
  
  // Basic dark mode based on system (could add a toggle)
  React.useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
};
