import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, ChevronDown, Check, ArrowRight, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { APP_CONFIGS, getCurrentApp } from './appConfig';

export const AppSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentApp = getCurrentApp(location.pathname);
  const CurrentIcon = currentApp.icon;

  const handleSelectApp = (route: string) => {
    setIsOpen(false);
    navigate(route);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Brand Header / Switcher Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center justify-center lg:justify-between p-2 lg:p-3 rounded-2xl transition-all cursor-pointer border text-left group',
          isOpen
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-xs'
            : 'bg-white dark:bg-gray-900 border-transparent hover:bg-gray-50 dark:hover:bg-gray-850 hover:border-gray-200 dark:hover:border-gray-800',
        )}
        title="Click to switch applications"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105',
              currentApp.color,
            )}
          >
            <CurrentIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 hidden lg:block">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-gray-900 dark:text-white truncate">
                {currentApp.name}
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                App
              </span>
            </div>
            <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">
              {currentApp.subtitle}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors shrink-0">
          <LayoutGrid className="w-4 h-4 opacity-70" />
          <ChevronDown
            className={clsx(
              'w-3.5 h-3.5 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Appian-Style App Switcher Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Switch Workspace</span>
            </div>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
              Multi-App Platform
            </span>
          </div>

          <div className="space-y-1.5 mt-2">
            {APP_CONFIGS.map((app) => {
              const isActive = currentApp.id === app.id;
              const Icon = app.icon;

              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleSelectApp(app.route)}
                  className={clsx(
                    'w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer group/item',
                    isActive
                      ? clsx(app.activeColor, 'shadow-xs')
                      : 'border-transparent hover:border-gray-200 dark:hover:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60',
                  )}
                >
                  <div
                    className={clsx(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs',
                      app.color,
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900 dark:text-white group-hover/item:text-cyan-600 dark:group-hover/item:text-cyan-400 transition-colors">
                        {app.name}
                      </span>
                      {isActive ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {app.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 px-3 py-1 flex items-center justify-between text-[11px] text-gray-400">
            <span>Configure default in Settings</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>
      )}
    </div>
  );
};
