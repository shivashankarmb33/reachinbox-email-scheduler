import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowRight, ShieldCheck, Zap, Bell, Search, AlertCircle, Info, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, devLogin, loading } = useAuth();
  const [devEmail, setDevEmail] = useState('demo@reachinbox.ai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const authError = urlParams.get('error');
  const authMsg = urlParams.get('msg');

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await devLogin(devEmail, 'ReachInbox Demo User');
      window.location.href = '/dashboard';
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error || err.message || 'Failed to authenticate demo session'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center space-x-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            ReachInbox
          </h1>
        </div>
        <p className="text-center text-sm text-slate-400">
          Full-Stack Distributed Email Job Scheduler
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-800/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-700/60">
          {/* Query Param Warning / Error banner */}
          {(authError || errorMessage) && (
            <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-300">
                  {authError === 'google_not_configured'
                    ? 'Google OAuth Setup Required'
                    : 'Authentication Alert'}
                </p>
                <p className="mt-0.5 text-slate-300 leading-relaxed">
                  {errorMessage || authMsg || 'Authentication failed. Please verify credentials.'}
                </p>
              </div>
            </div>
          )}

          {/* Primary Action: Google OAuth 2.0 */}
          <button
            onClick={loginWithGoogle}
            disabled={loading || isSubmitting}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl border border-slate-600 bg-slate-900 hover:bg-slate-950 text-white text-sm font-semibold shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {/* Google SVG Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800 px-3 text-slate-400 font-medium">
                Or Instant Demo Access
              </span>
            </div>
          </div>

          {/* Quick Dev Demo Access */}
          <form onSubmit={handleDevSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Evaluation Account Email</span>
                <span className="text-[10px] text-emerald-400">Instant Access</span>
              </label>
              <input
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="demo@reachinbox.ai"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <>
                  <span>Launch Demo Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Setup Notice */}
          <div className="mt-4 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/40 text-[11px] text-slate-400 flex items-start space-x-2">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Clicking <strong>Launch Demo Session</strong> provisions a demo user and test sender account in PostgreSQL with Ethereal SMTP.
            </span>
          </div>

          {/* Feature highlights */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 space-y-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>BullMQ & Redis delayed job processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Slack rate-limit alerting with chat.postMessage</span>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Elasticsearch full-text search indexing</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>PostgreSQL ACID durability & restart persistence</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
