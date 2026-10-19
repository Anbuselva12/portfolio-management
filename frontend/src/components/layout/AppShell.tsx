import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../store/auth.store';
import {
  Home,
  Briefcase,
  TrendingUp,
  CreditCard,
  Receipt,
  Shield,
  Settings,
  LogOut,
  Zap,
  Clock,
  Menu,
  X,
  Wallet,
  Users,
  Palmtree,
  LayoutGrid,
  ChevronDown,
  ArrowLeftRight,
  ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';
import { adminApi } from '../../api/endpoints/admin.api';
import { APP_CONFIGS, getCurrentApp } from './appConfig';
import { MobileAppSwitcherModal } from './MobileAppSwitcherModal';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isAppSwitcherModalOpen, setIsAppSwitcherModalOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const currentApp = getCurrentApp(location.pathname);

  useEffect(() => {
    if (user?.role === 'admin') {
      adminApi.getPending()
        .then((res) => {
          if (Array.isArray(res)) setPendingCount(res.length);
        })
        .catch(() => {});
    }
  }, [user?.role]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // System dark mode listener
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  interface MobileNavLink {
    to: string;
    icon: any;
    label: string;
    badge?: number;
  }

  const finFamilyLinks: MobileNavLink[] = [
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

  const fairShareLinks: MobileNavLink[] = [
    { to: '/fairshare', icon: Palmtree, label: 'Trips & Events' },
    { to: '/fairshare/settings', icon: Settings, label: 'Settings' },
  ];

  const drawerNavLinks: MobileNavLink[] =
    currentApp.id === 'fairshare' ? fairShareLinks : finFamilyLinks;

  const profileSettingsRoute =
    currentApp.id === 'fairshare' ? '/fairshare/settings' : '/settings/profile';

  return (
    <div className="relative flex h-screen h-dvh w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Desktop / Tablet Sidebar (hidden on screens < 768px) */}
      <Sidebar />

      {/* Mobile Top Header Bar (< 768px) */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 z-40">
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburger button */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="min-h-[44px] min-w-[44px] relative flex items-center justify-center p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
            {pendingCount > 0 && currentApp.id === 'finfamily' && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse" />
            )}
          </button>

          {/* Current App Trigger (Opens App Switcher Modal) */}
          <button
            type="button"
            onClick={() => setIsAppSwitcherModalOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-850/80 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer min-w-0"
            title="Tap to switch applications"
          >
            <div
              className={clsx(
                'w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs',
                currentApp.color,
              )}
            >
              <currentApp.icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                {currentApp.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </div>
          </button>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Apps Switcher Button */}
          <button
            type="button"
            onClick={() => setIsAppSwitcherModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 cursor-pointer"
            title="Switch workspace"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Apps</span>
          </button>

          {/* User Profile Avatar */}
          <Link
            to={profileSettingsRoute}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Account profile"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          </Link>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer Navigation */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Drawer sheet */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs',
                    currentApp.color,
                  )}
                >
                  <currentApp.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-base text-gray-900 dark:text-white">{currentApp.name}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{currentApp.subtitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-Drawer Quick App Switcher Section */}
            <div className="p-3 bg-gray-50 dark:bg-gray-850/60 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Switch Workspace
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    setIsAppSwitcherModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {APP_CONFIGS.map((app) => {
                  const isActive = currentApp.id === app.id;
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        navigate(app.route);
                      }}
                      className={clsx(
                        'flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer',
                        isActive
                          ? 'border-emerald-500 bg-white dark:bg-gray-800 shadow-xs ring-1 ring-emerald-500/30'
                          : 'border-transparent bg-white/50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800',
                      )}
                    >
                      <div
                        className={clsx(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-white mb-1 shadow-xs',
                          app.color,
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-extrabold text-gray-800 dark:text-gray-200 truncate w-full">
                        {app.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nav list for Current Workspace */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {currentApp.name} Navigation
              </div>
              {drawerNavLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                      isActive
                        ? clsx(currentApp.color, 'font-semibold shadow-xs')
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
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

            {/* User Profile & Logout footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-sm truncate">
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{user?.displayName}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs capitalize">{user?.role || 'Member'}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="min-h-[44px] flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/60"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-20 md:pb-0 p-3.5 sm:p-5 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Context-Aware Bottom Tab Bar on Mobile (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 grid grid-cols-4 items-center px-1 z-40 safe-bottom">
        {currentApp.id === 'fairshare' ? (
          <>
            <NavLink
              to="/fairshare"
              end
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-gray-500 dark:text-gray-400',
                )
              }
            >
              <Palmtree className="w-5 h-5 mb-0.5" />
              <span>Trips</span>
            </NavLink>

            <NavLink
              to="/fairshare/settings"
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-gray-500 dark:text-gray-400',
                )
              }
            >
              <Settings className="w-5 h-5 mb-0.5" />
              <span>Settings</span>
            </NavLink>

            <button
              type="button"
              onClick={() => setIsAppSwitcherModalOpen(true)}
              className="flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-5 h-5 mb-0.5" />
              <span>Switch</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span>Menu</span>
            </button>
          </>
        ) : (
          <>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                    : 'text-gray-500 dark:text-gray-400',
                )
              }
            >
              <Home className="w-5 h-5 mb-0.5" />
              <span>Dash</span>
            </NavLink>

            <NavLink
              to="/loans"
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                    : 'text-gray-500 dark:text-gray-400',
                )
              }
            >
              <CreditCard className="w-5 h-5 mb-0.5" />
              <span>Loans</span>
            </NavLink>

            <button
              type="button"
              onClick={() => setIsAppSwitcherModalOpen(true)}
              className="flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-cyan-600 transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-5 h-5 mb-0.5" />
              <span>Switch</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-[11px] font-medium relative text-gray-500 dark:text-gray-400 hover:text-cyan-600 transition-colors cursor-pointer"
              aria-label="More navigation options"
            >
              <div className="relative">
                <Menu className="w-5 h-5 mb-0.5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse" />
                )}
              </div>
              <span>More</span>
            </button>
          </>
        )}
      </nav>

      {/* Mobile App Switcher Modal Sheet */}
      <MobileAppSwitcherModal
        isOpen={isAppSwitcherModalOpen}
        onClose={() => setIsAppSwitcherModalOpen(false)}
      />
    </div>
  );
};
