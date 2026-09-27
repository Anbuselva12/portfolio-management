import React from 'react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent/90 transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  );
};
