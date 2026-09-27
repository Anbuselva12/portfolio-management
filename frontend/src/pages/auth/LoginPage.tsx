import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { ShieldCheck, ArrowRight, Lock, User, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Invalid username or password. Please try again.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center gap-2.5 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            FinFamily
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Sign in to access your family's portfolio and debt strategy dashboard.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/60 dark:shadow-none sm:rounded-3xl border border-slate-200/80 dark:border-slate-800">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-sm font-medium text-rose-800 dark:text-rose-300">{error}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. anbu"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Password
                </label>
                <span
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help"
                  title="Contact your family admin to generate a password reset code"
                >
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-lg shadow-cyan-600/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-60 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              New to FinFamily?{' '}
              <Link to="/register" className="font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>Local SQLite database • Private & self-hosted</span>
        </div>
      </div>
    </div>
  );
};
