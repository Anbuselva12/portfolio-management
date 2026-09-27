import React from 'react';
import { X } from 'lucide-react';

interface SlideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const SlideDrawer: React.FC<SlideDrawerProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full md:w-[480px] bg-white dark:bg-gray-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
