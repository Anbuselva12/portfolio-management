import React, { useCallback, useState } from 'react';
import { LogOut } from 'lucide-react';
import { familyApi } from '../../api/endpoints/family.api';
import { useAuthStore } from '../../store/auth.store';
import { RemovalConfirmModal } from './RemovalConfirmModal';

/** Lets a family member leave. Their contributions are deleted and the admin is notified. */
export const LeaveFamilyCard: React.FC = () => {
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const loadImpact = useCallback(() => familyApi.leaveImpact(), []);

  return (
    <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">Leave this family</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Everything you added to the family (assets, income, loans, expenses, insurance) is permanently deleted. You can
        start again on your own or join another family afterwards.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 min-h-[44px] inline-flex items-center gap-2 px-4 rounded-xl text-sm font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
      >
        <LogOut className="w-4 h-4" /> Leave family
      </button>
      {open && (
        <RemovalConfirmModal
          mode="leave"
          personName="you"
          loadImpact={loadImpact}
          onConfirm={async () => {
            await familyApi.leave();
            await logout();
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};
