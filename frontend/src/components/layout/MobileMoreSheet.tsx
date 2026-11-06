import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import clsx from 'clsx';
import { Portal } from '../ui/Portal';
import { useAuthStore } from '../../store/auth.store';
import { useIsFamily } from '../../store/workspace.store';
import { getNavLinks } from './navLinks';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCount: number;
}

/** Phone bottom sheet listing every destination, plus the signed-in user and log out. */
export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({ isOpen, onClose, pendingCount }) => {
  const { user, logout } = useAuthStore();
  const isFamily = useIsFamily();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const links = getNavLinks({ isAdmin: user?.role === 'admin', isFamily, pendingCount });

  return (
    <Portal>
      <div className="fixed inset-0 z-50 md:hidden flex items-end" role="dialog" aria-modal="true" aria-label="All sections">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

        <div className="relative w-full max-h-[88dvh] flex flex-col bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-200 dark:border-gray-800 safe-bottom">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold shrink-0">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white truncate">{user?.displayName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'Member'}</div>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 pb-3 pt-1" aria-label="All sections">
            <ul className="grid grid-cols-3 gap-2.5">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3.5 min-h-[84px] text-center text-xs font-semibold transition-colors',
                        isActive
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-500'
                          : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800',
                      )
                    }
                  >
                    <link.icon className="w-6 h-6 shrink-0" />
                    <span className="leading-tight">{link.label}</span>
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-[1.25rem] px-1 text-center text-[10px] font-bold rounded-full bg-amber-500 text-white">
                        {link.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="px-4 pb-4 pt-1">
            <button
              type="button"
              onClick={logout}
              className="min-h-[48px] flex items-center justify-center gap-2 w-full px-3 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
