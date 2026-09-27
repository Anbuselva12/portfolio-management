import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Hourglass, LogOut, RefreshCw, ArrowLeft } from 'lucide-react';

export const PendingApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, initialize } = useAuthStore();

  useEffect(() => {
    // Poll every 8 seconds to check if Admin has approved the request
    const interval = setInterval(async () => {
      await initialize();
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.status === 'active') {
        navigate('/dashboard');
      } else if (currentUser?.status === 'unaffiliated') {
        navigate('/onboarding/family-selection');
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [initialize, navigate]);

  const handleChooseDifferent = () => {
    navigate('/onboarding/family-selection');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
          <Hourglass className="w-8 h-8 animate-pulse" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Waiting for Admin Approval
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Your request to join the family is awaiting review by a family administrator. Once approved, you'll gain access to the shared portfolio.
        </p>

        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl mb-6 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>This page automatically refreshes when approved.</span>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleChooseDifferent}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Choose a different family</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
