import React, { useEffect, useState } from 'react';
import { UserMinus, X } from 'lucide-react';
import { familyApi } from '../../api/endpoints/family.api';
import { formatDate } from '../../utils/date';

interface FamilyNotice {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
}

/** Admin-only banner listing membership events (a member was removed or left) until dismissed. */
export const FamilyNotices: React.FC = () => {
  const [notices, setNotices] = useState<FamilyNotice[]>([]);

  useEffect(() => {
    familyApi
      .getNotifications()
      .then((rows) => setNotices(Array.isArray(rows) ? rows : []))
      .catch(() => setNotices([]));
  }, []);

  const dismiss = async (id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
    try {
      await familyApi.dismissNotification(id);
    } catch {
      // Re-shown on next load if the dismissal did not persist.
    }
  };

  if (!notices.length) return null;

  return (
    <section aria-label="Family notifications" className="space-y-2">
      {notices.map((n) => (
        <div
          key={n.id}
          role="status"
          className="flex items-start gap-3 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <UserMinus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 break-words">{n.message}</p>
            <p className="text-[11px] text-slate-400 mt-1">{formatDate(n.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(n.id)}
            aria-label={`Dismiss: ${n.title}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </section>
  );
};
