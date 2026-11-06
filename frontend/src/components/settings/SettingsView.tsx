import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Trash2,
  Clock,
  Gauge,
  Loader2,
  X,
  AlertCircle,
  Moon,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { Sender } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // New sender form state
  const [email, setEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.ethereal.email');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [minimumDelay, setMinimumDelay] = useState(2000);
  const [autoGenerateEthereal, setAutoGenerateEthereal] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSenders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/senders');
      if (res.data.success) {
        setSenders(res.data.senders || []);
      }
    } catch (err) {
      console.error('Failed to load senders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSenders();
  }, []);

  const handleCreateSender = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError('Please enter a valid sender email.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        email,
        smtpHost,
        smtpPort: Number(smtpPort),
        hourlyLimit: Number(hourlyLimit),
        minimumDelay: Number(minimumDelay),
        autoGenerateEthereal,
      };

      if (!autoGenerateEthereal) {
        payload.smtpUser = smtpUser;
        payload.smtpPass = smtpPass;
      }

      const res = await apiClient.post('/api/senders', payload);
      if (res.data.success) {
        showToast('success', 'Sender Account Added', `Account ${email} created successfully.`);
        setIsModalOpen(false);
        // Reset form
        setEmail('');
        fetchSenders();
      } else {
        setFormError(res.data.error || 'Failed to create sender.');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Error creating sender.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSender = async (id: string, senderEmail: string) => {
    if (!confirm(`Are you sure you want to delete sender account ${senderEmail}?`)) return;

    try {
      const res = await apiClient.delete(`/api/senders/${id}`);
      if (res.data.success) {
        showToast('info', 'Sender Deleted', `Account ${senderEmail} removed.`);
        fetchSenders();
      }
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.response?.data?.error || 'Could not delete sender');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Settings & Sending Accounts
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure multi-sender SMTP credentials, dispatch delays, and sending limits
        </p>
      </div>

      {/* Senders Management Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-border gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Sending Accounts ({senders.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Emails dispatched using these credentials and rate limit rules
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sender Account</span>
          </button>
        </div>

        {/* Sender list */}
        <div className="pt-4 divide-y divide-slate-100 dark:divide-dark-border">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
              <span>Loading sender accounts...</span>
            </div>
          ) : senders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <p className="font-semibold text-slate-700 dark:text-slate-300">No senders found</p>
              <p className="mt-1">Add a sender to start dispatching scheduled emails.</p>
            </div>
          ) : (
            senders.map((s) => (
              <div
                key={s.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white">{s.email}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {s.smtpHost || 'smtp.ethereal.email'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Gauge className="w-3 h-3" />
                      <span>Limit: {s.hourlyLimit} emails/hr</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Delay: {s.minimumDelay}ms</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleDeleteSender(s.id, s.email)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Sender"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preferences & Appearance Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Preferences & Account Info
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Theme switcher card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Appearance Theme</p>
                <p className="text-[11px] text-slate-400">Currently: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-xs font-semibold shadow-2xs hover:bg-slate-50 transition-colors"
            >
              Toggle
            </button>
          </div>

          {/* User session status */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Authenticated User</p>
              <p className="text-[11px] text-slate-400">{user?.email || 'demo@reachinbox.ai'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Sender Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-dark-border animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-dark-card/40">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Sending Account
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSender} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Auto Ethereal toggle */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                    Auto-Provision Ethereal Test Account
                  </span>
                  <span className="text-[11px] text-indigo-700/80 dark:text-indigo-300">
                    Automatically fetches ephemeral SMTP test credentials
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoGenerateEthereal}
                  onChange={(e) => setAutoGenerateEthereal(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sender Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="marketing@reachinbox.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!autoGenerateEthereal && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMTP User
                    </label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hourly Limit (emails/hr)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Delay (ms)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={minimumDelay}
                    onChange={(e) => setMinimumDelay(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-dark-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
