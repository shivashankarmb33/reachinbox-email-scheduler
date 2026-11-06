import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Send,
  Zap,
  ShieldCheck,
  Loader2,
  Trash2,
  Bell,
  Clock,
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface SlackViewProps {
  connected: boolean;
  channelName?: string | null;
  onRefresh: () => void;
}

export const SlackView: React.FC<SlackViewProps> = ({
  connected,
  channelName,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [sendingTest, setSendingTest] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnectSlack = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/slack/connect`;
  };

  const handleDisconnectSlack = async () => {
    if (!confirm('Are you sure you want to disconnect your Slack workspace?')) return;
    setDisconnecting(true);
    try {
      await apiClient.delete('/api/slack/disconnect');
      showToast('info', 'Slack Disconnected', 'Your Slack workspace has been disconnected.');
      onRefresh();
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Failed to disconnect Slack');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTestNotification = async () => {
    setSendingTest(true);
    try {
      const res = await apiClient.post('/api/slack/test');
      if (res.data.success) {
        showToast(
          'success',
          'Slack Notification Sent!',
          `Test alert successfully posted to #${channelName || 'all-reachinbox-scheduler'}. Check Slack!`
        );
      } else {
        throw new Error(res.data.error || 'Slack failed to send');
      }
    } catch (err: any) {
      showToast(
        'error',
        'Notification Failed',
        err.response?.data?.error || err.message || 'Check Slack permissions.'
      );
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Slack Integration
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Real-time rate-limit alerts, email scheduling notifications, and delivery webhooks
        </p>
      </div>

      {/* Connection Status Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#4A154B] flex items-center justify-center text-white shadow-xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Slack Workspace Integration
                </h3>
                {connected ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-dark-card dark:text-slate-400">
                    Disconnected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Channel: <strong className="text-slate-700 dark:text-slate-200">#{channelName || 'all-reachinbox-scheduler'}</strong>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            {connected ? (
              <>
                <button
                  onClick={handleSendTestNotification}
                  disabled={sendingTest}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {sendingTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send Test Alert</span>
                </button>
                <button
                  onClick={handleDisconnectSlack}
                  disabled={disconnecting}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectSlack}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#4A154B] hover:bg-[#3f1240] text-white text-xs font-bold shadow-xs transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Connect Slack Workspace</span>
              </button>
            )}
          </div>
        </div>

        {/* Security & Token encryption notice */}
        <div className="pt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>OAuth 2.0 Bot tokens encrypted with AES-256-GCM before database storage</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Scope: chat:write</span>
        </div>
      </div>

      {/* Real-Time Slack Triggers Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
          <Bell className="w-4 h-4 text-indigo-500" />
          <span>Configured Slack Real-Time Events</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Trigger 1: Scheduled */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Clock className="w-3.5 h-3.5" />
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white">Email Scheduled Alert</h4>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Dispatched immediately when emails are enqueued. Contains batch ID, sender, recipient preview, and total email count.
            </p>
          </div>

          {/* Trigger 2: Sent */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white">Dispatch Success</h4>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Triggers when Nodemailer delivers to Ethereal SMTP. Posts a live Ethereal URL link directly in the Slack message.
            </p>
          </div>

          {/* Trigger 3: Failed */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white">Dispatch Failure</h4>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Fires if an SMTP transaction fails or retries are exhausted. Sends recipient details and exact error reasons.
            </p>
          </div>

          {/* Trigger 4: Rate limit */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white">Hourly Rate-Limit Threshold</h4>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Notifies channel when an account reaches its hourly dispatch quota. Remaining jobs are automatically delayed to the next window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
