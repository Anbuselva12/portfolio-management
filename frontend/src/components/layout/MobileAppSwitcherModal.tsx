import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, X, Check, ArrowRight, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { APP_CONFIGS, getCurrentApp } from './appConfig';

interface MobileAppSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppSwitcherModal: React.FC<MobileAppSwitcherModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  const currentApp = getCurrentApp(location.pathname);

  const handleSelectApp = (route: string) => {
    onClose();
    navigate(route);
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 dark:border-gray-800 shadow-2xl p-5 z-10 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-150 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Switch Workspace</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Select an application from the ecosystem</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* App List */}
        <div className="space-y-3 mt-4">
          {APP_CONFIGS.map((app) => {
            const isActive = currentApp.id === app.id;
            const Icon = app.icon;

            return (
              <button
                key={app.id}
                type="button"
                onClick={() => handleSelectApp(app.route)}
                className={clsx(
                  'w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer min-h-[64px]',
                  isActive
                    ? clsx(app.activeColor, 'shadow-xs ring-2 ring-emerald-500/20 dark:ring-emerald-400/20')
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
              >
                <div
                  className={clsx(
                    'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs',
                    app.color,
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-gray-900 dark:text-white">
                      {app.name}
                    </span>
                    {isActive ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                        <span>Launch</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {app.subtitle}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {app.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer tip */}
        <div className="mt-4 pt-3 border-t border-gray-150 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <span>Set default app in Settings</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        </div>
      </div>
    </div>
  );
};

