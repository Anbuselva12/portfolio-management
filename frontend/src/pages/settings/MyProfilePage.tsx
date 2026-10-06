import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/endpoints/auth.api';
import { User, Lock, CheckCircle2, AlertCircle, Loader2, SlidersHorizontal, Palmtree } from 'lucide-react';
import { SettingsNav } from '../../components/layout/SettingsNav';

export const MyProfilePage: React.FC = () => {
  const location = useLocation();
  const isTracker = location.pathname.startsWith('/tracker');
  const isFairShare = location.pathname.startsWith('/fairshare');
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferredCurrency || 'INR');
  const [preferredApp, setPreferredApp] = useState<'finfamily' | 'expense_tracker' | 'fairshare'>(
    user?.preferredApp || 'finfamily',
  );
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [isChangingPw, setIsChangingPw] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await authApi.updateProfile({
        displayName: displayName.trim(),
        preferredCurrency,
        preferredApp,
      });
      setUser({
        ...user,
        displayName: displayName.trim(),
        preferredCurrency,
        preferredApp,
      });
      setProfileMsg('Profile preferences updated.');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg('Failed to update profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPwError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwError(null);
    setPwSuccess(null);
    setIsChangingPw(true);

    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPwSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsChangingPw(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {!isTracker && !isFairShare && <SettingsNav />}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {isTracker && <SlidersHorizontal className="w-6 h-6 text-primary" />}
          {isFairShare && <Palmtree className="w-6 h-6 text-emerald-600" />}
          <span>{isFairShare ? 'FairShare Settings' : isTracker ? 'Expense Tracker Settings' : 'Profile & Preferences'}</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isFairShare
            ? 'Manage your personal profile, credentials, and default landing workspace.'
            : isTracker
            ? 'Manage your personal profile, credentials, and default landing workspace.'
            : 'Manage your personal display name, account credentials, and localized currency.'}
        </p>
      </div>

      {/* User Information Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-600" />
          <span>Personal Details</span>
        </h2>

        {profileMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profileMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Username (System ID)
              </label>
              <input
                type="text"
                disabled
                value={user?.username || ''}
                className="mt-1 block w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Preferred Display Currency
            </label>
            <select
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
              className="mt-1 block w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Default Landing Application
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Select which workspace FinFamily opens automatically upon login.
            </p>
            <select
              value={preferredApp}
              onChange={(e) => setPreferredApp(e.target.value as any)}
              className="mt-1 block w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="finfamily">FinFamily (Wealth & Debt)</option>
              <option value="expense_tracker">Expense Tracker (Projects & Procurement)</option>
              <option value="fairshare">FairShare (Trips & Event Expenses)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isUpdatingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-cyan-600" />
          <span>Security & Password</span>
        </h2>

        {pwError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pwError}</span>
          </div>
        )}

        {pwSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pwSuccess}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingPw}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
            >
              {isChangingPw && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
