import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className || ''}`} />
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'neutral' }> = ({ children, variant = 'neutral' }) => {
  const styles = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
};
