import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints/admin.api';
import { Member } from '../../types';
import { SlideDrawer } from '../../components/ui/SlideDrawer';
import {
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  KeyRound,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Copy,
  Clock,
  Shield,
  UserCheck,
} from 'lucide-react';

export const MembersAccessPage: React.FC = () => {
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Reset code dialog
  const [resetCodeModal, setResetCodeModal] = useState<{ username: string; code: string } | null>(null);

  useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    setIsLoading(true);
    try {
      const pending = await adminApi.getPending();
      setPendingMembers(pending || []);
    } catch {
      setPendingMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approve(id);
      await loadMembersData();
    } catch {
      alert('Failed to approve member.');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this join request?')) return;
    try {
      await adminApi.reject(id);
      await loadMembersData();
    } catch {
      alert('Failed to reject member.');
    }
  };

  const handleDirectInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !inviteDisplayName.trim() || !invitePassword) {
      setInviteError('All fields are required.');
      return;
    }
    setInviteError(null);
    setIsInviting(true);

    try {
      await adminApi.inviteMember({
        username: inviteUsername.trim(),
        displayName: inviteDisplayName.trim(),
        password: invitePassword,
      });
      setIsInviteOpen(false);
      setInviteUsername('');
      setInviteDisplayName('');
      setInvitePassword('');
      alert('Member invited successfully and added directly to family.');
      await loadMembersData();
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Failed to invite member.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleResetPassword = async (id: string, username: string) => {
    if (!confirm(`Generate a one-time password reset code for ${username}?`)) return;
    try {
      const res = await adminApi.resetPassword(id);
      setResetCodeModal({ username, code: res.code });
    } catch {
      alert('Failed to generate reset code.');
    }
  };

  const handleToggleDeactivate = async (id: string, currentlyActive: boolean) => {
    const action = currentlyActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} this member?`)) return;

    try {
      await adminApi.patchMember(id, {
        isActive: !currentlyActive,
        status: currentlyActive ? 'deactivated' : 'active',
      });
      await loadMembersData();
    } catch {
      alert(`Failed to ${action} member.`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Members & Access Control
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage who can view and contribute to your family's financial portfolio.
          </p>
        </div>
        <button
          onClick={() => {
            setInviteError(null);
            setIsInviteOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member Directly</span>
        </button>
      </div>

      {/* Pending Join Requests */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pending Join Requests ({pendingMembers.length})
            </h2>
          </div>
          {pendingMembers.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400">
              Needs Review
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-slate-400 text-sm">Checking pending requests...</div>
        ) : pendingMembers.length === 0 ? (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-sm">
            No pending join requests at this time.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {pendingMembers.map((member) => (
              <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/30 dark:bg-amber-950/10">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    {member.displayName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Username: <span className="font-mono text-slate-700 dark:text-slate-300">@{member.username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(member.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve Access</span>
                  </button>
                  <button
                    onClick={() => handleReject(member.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Member Drawer */}
      <SlideDrawer
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Direct Member Invitation"
      >
        <form onSubmit={handleDirectInvite} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create an account directly for a family member. They will bypass the approval queue and have instant member access.
          </p>

          {inviteError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Username *
            </label>
            <input
              type="text"
              required
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g. karthik"
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Display Name *
            </label>
            <input
              type="text"
              required
              value={inviteDisplayName}
              onChange={(e) => setInviteDisplayName(e.target.value)}
              placeholder="e.g. Karthik Sankar"
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Temporary Password *
            </label>
            <input
              type="password"
              required
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              placeholder="Min 6 characters"
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Provide this temporary password to your family member so they can log in.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInviting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isInviting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create & Invite</span>
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Reset Code Modal */}
      {resetCodeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Password Reset Code Generated
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Relay this single-use code to <strong>@{resetCodeModal.username}</strong> so they can log in and update their password:
            </p>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-lg font-extrabold tracking-widest text-slate-900 dark:text-white select-all border border-slate-200 dark:border-slate-700">
              {resetCodeModal.code}
            </div>
            <button
              onClick={() => setResetCodeModal(null)}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
