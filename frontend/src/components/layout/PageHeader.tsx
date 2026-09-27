import React from 'react';

export const PageHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
    {action && <div>{action}</div>}
  </div>
);
