import React from 'react';
import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string | null;
  deltaDirection?: 'up' | 'down' | 'neutral';
  subValue?: string;
  isLoading?: boolean;
  tooltip?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, delta, deltaDirection, subValue, isLoading, tooltip }) => {
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm animate-pulse min-w-[240px]">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm min-w-[240px]" title={tooltip}>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</h3>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tabular-nums">{value}</div>
      {(delta || subValue) && (
        <div className="flex items-center gap-2 text-sm">
          {delta && (
            <span className={clsx(
              'flex items-center font-medium',
              deltaDirection === 'up' ? 'text-positive' : deltaDirection === 'down' ? 'text-negative' : 'text-gray-500'
            )}>
              {deltaDirection === 'up' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : deltaDirection === 'down' ? <ArrowDownRight className="w-4 h-4 mr-1" /> : <Minus className="w-4 h-4 mr-1" />}
              {delta}
            </span>
          )}
          {subValue && <span className="text-gray-500 dark:text-gray-400">{subValue}</span>}
        </div>
      )}
    </div>
  );
};
