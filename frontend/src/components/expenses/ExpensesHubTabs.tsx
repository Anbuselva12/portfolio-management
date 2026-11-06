import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const TABS = [
  { to: '/expenses', label: 'Household', end: true },
  { to: '/expenses/projects', label: 'Projects', end: false },
];

/** Segmented switch between daily household expenses and long-running projects (Design-Spec-06 §1a). */
export const ExpensesHubTabs: React.FC = () => (
  <nav aria-label="Expense views" className="flex md:inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 gap-1">
    {TABS.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        end={tab.end}
        className={({ isActive }) =>
          clsx(
            'min-h-[40px] px-4 max-md:flex-1 max-md:justify-center inline-flex items-center rounded-lg text-sm font-semibold transition-colors',
            isActive
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
          )
        }
      >
        {tab.label}
      </NavLink>
    ))}
  </nav>
);
