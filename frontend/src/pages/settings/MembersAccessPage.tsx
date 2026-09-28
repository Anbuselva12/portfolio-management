import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { adminApi } from '../../api/endpoints/admin.api';
import { Member } from '../../types';
import { SlideDrawer } from '../../components/ui/SlideDrawer';
import { SettingsNav } from '../../components/layout/SettingsNav';
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
  Check,
  RefreshCw,
  UserX,
} from 'lucide-react';

export const MembersAccessPage: React.FC = () => {
  const { user } = useAuthStore();
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Reset code dialog
  const [resetCodeModal, setResetCodeModal] = useState<{ username: string; code: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    setIsLoading(true);
    try {
      const [pending, all] = await Promise.all([
        adminApi.getPending().catch(() => []),
        adminApi.getAllMembers().catch(() => []),
      ]);
      setPendingMembers(pending || []);
      const nonPending = (all || []).filter(
        (m: any) => m.status !== 'pending_approval'
      );
      setActiveMembers(nonPending);
    } catch {
      setPendingMembers([]);
      setActiveMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string, name: string) => {
    setProcessingId(`approve-${id}`);
    try {
      await adminApi.approve(id);
      setActionFeedback(`Approved access for ${name}. They can now access the family dashboard.`);
      setTimeout(() => setActionFeedback(null), 5000);
      await loadMembersData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve member.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to reject the join request from ${name}?`)) return;
    setProcessingId(`reject-${id}`);
    try {
      await adminApi.reject(id);
      setActionFeedback(`Rejected join request for ${name}.`);
      setTimeout(() => setActionFeedback(null), 5000);
      await loadMembersData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject member.');
    } finally {
      setProcessingId(null);
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
        username: inviteUsername.trim().toLowerCase(),
        displayName: inviteDisplayName.trim(),
        password: invitePassword,
      });
      setIsInviteOpen(false);
      setInviteUsername('');
      setInviteDisplayName('');
      setInvitePassword('');
      setActionFeedback(`Member @${inviteUsername.trim().toLowerCase()} added directly to family.`);
      setTimeout(() => setActionFeedback(null), 5000);
      await loadMembersData();
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Failed to invite member.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleResetPassword = async (id: string, username: string) => {
    if (!confirm(`Generate a temporary password reset code for @${username}?`)) return;
    setProcessingId(`reset-${id}`);
    try {
      const res = await adminApi.resetPassword(id);
      setResetCodeModal({ username, code: res.newPassword || res.code });
      setCopiedCode(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate reset code.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleDeactivate = async (id: string, currentlyActive: boolean, name: string) => {
    const action = currentlyActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} ${name}'s account?`)) return;

    setProcessingId(`status-${id}`);
    try {
      await adminApi.patchMember(id, {
        isActive: !currentlyActive,
        status: currentlyActive ? 'deactivated' : 'active',
      });
      setActionFeedback(`Account for ${name} has been ${currentlyActive ? 'deactivated' : 'reactivated'}.`);
      setTimeout(() => setActionFeedback(null), 5000);
      await loadMembersData();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action} member.`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyCode = () => {
    if (resetCodeModal?.code) {
      navigator.clipboard.writeText(resetCodeModal.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Navigation tabs */}
      <SettingsNav pendingCount={pendingMembers.length} />

      {/* Action feedback toast */}
      {actionFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Members & Access Control</span>
            {pendingMembers.length > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                {pendingMembers.length} Pending
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review join requests, manage active family members, and control portfolio permissions.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadMembersData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh members list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setInviteError(null);
              setIsInviteOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Member Directly</span>
          </button>
        </div>
      </div>

      {/* Section 1: Pending Join Requests */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Pending Join Requests</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  {pendingMembers.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                People who found your family and requested permission to join.
              </p>
            </div>
          </div>
          {pendingMembers.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 animate-pulse">
              Action Required
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
            <span>Loading pending requests...</span>
          </div>
        ) : pendingMembers.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-850/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <UserCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No pending join requests
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When someone requests to join your family group, they will appear here for you to approve or reject.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-amber-200 dark:border-amber-900/60 rounded-xl overflow-hidden bg-amber-50/20 dark:bg-amber-950/10">
            {pendingMembers.map((member: any) => {
              const displayName = member.displayName || member.display_name || member.username;
              const isApproving = processingId === `approve-${member.id}`;
              const isRejecting = processingId === `reject-${member.id}`;

              return (
                <div
                  key={member.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-950/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{displayName}</span>
                        <span className="text-[11px] font-mono font-normal text-slate-500 dark:text-slate-400">
                          @{member.username}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Requested: {new Date(member.createdAt || member.created_at || Date.now()).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">Pending Approval</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleApprove(member.id, displayName)}
                      disabled={isApproving || isRejecting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                    >
                      {isApproving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Approve Access</span>
                    </button>
                    <button
                      onClick={() => handleReject(member.id, displayName)}
                      disabled={isApproving || isRejecting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isRejecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Active Family Members */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Family Members</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  {activeMembers.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Members who have active or configured access to your family portfolio.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
            <span>Loading members...</span>
          </div>
        ) : activeMembers.length === 0 ? (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-sm">
            No active members found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {activeMembers.map((m: any) => {
              const displayName = m.displayName || m.display_name || m.username;
              const isCurrentUser = m.id === user?.id;
              const isActive = m.isActive ?? m.is_active ?? (m.status === 'active');
              const role = m.role || 'member';

              return (
                <div
                  key={m.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                            You
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full capitalize ${
                            role === 'admin'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {role}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isActive
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Username: <span className="font-mono text-slate-700 dark:text-slate-300">@{m.username}</span>
                        {m.createdAt && (
                          <span className="ml-2">• Joined {new Date(m.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleResetPassword(m.id, m.username)}
                      disabled={processingId === `reset-${m.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Generate a temporary password reset code"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Reset Code</span>
                    </button>
                    {!isCurrentUser && (
                      <button
                        onClick={() => handleToggleDeactivate(m.id, isActive, displayName)}
                        disabled={processingId === `status-${m.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Reactivate</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
              Initial Password *
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
              Share this initial password with your family member so they can log in.
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Temporary Password Generated
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share this temporary password with <strong>@{resetCodeModal.username}</strong> so they can log into their account:
            </p>
            <div className="relative">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-lg font-extrabold tracking-widest text-slate-900 dark:text-white select-all border border-slate-200 dark:border-slate-700">
                {resetCodeModal.code}
              </div>
              <button
                onClick={handleCopyCode}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied to clipboard!' : 'Copy code'}</span>
              </button>
            </div>
            <button
              onClick={() => setResetCodeModal(null)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
