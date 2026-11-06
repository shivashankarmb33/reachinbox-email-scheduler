import React, { useState } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Send,
  User,
  Hash,
  AlertCircle,
  Code,
  Eye,
} from 'lucide-react';
import { ScheduledEmail } from '../../types';

interface EmailDetailDrawerProps {
  email: ScheduledEmail | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmailDetailDrawer: React.FC<EmailDetailDrawerProps> = ({
  email,
  isOpen,
  onClose,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

  if (!isOpen || !email) return null;

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sent Successfully</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Processing Dispatch</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Delivery Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white dark:bg-dark-surface border-l border-slate-200 dark:border-dark-border shadow-2xl flex flex-col transform transition ease-in-out duration-300">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-dark-card/40">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Email Details
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ID: <span className="font-mono">{email.id.slice(0, 12)}...</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(email.status)}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Failure Alert Banner (if failed) */}
            {email.failureReason && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs">
                <div className="flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold">Delivery Failure Reason</h5>
                    <p className="mt-1 font-mono text-[11px] text-rose-700 dark:text-rose-300">
                      {email.failureReason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Core Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200/80 dark:border-dark-border text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-400 font-medium block flex items-center space-x-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Recipient</span>
                </span>
                <span className="text-slate-900 dark:text-white font-semibold mt-1 block break-all">
                  {email.recipient}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 font-medium block flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Scheduled Time</span>
                </span>
                <span className="text-slate-900 dark:text-white font-semibold mt-1 block">
                  {new Date(email.scheduledAt).toLocaleString()}
                </span>
              </div>

              {email.sentAt && (
                <div>
                  <span className="text-slate-400 dark:text-slate-400 font-medium block flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Sent Time</span>
                  </span>
                  <span className="text-slate-900 dark:text-white font-semibold mt-1 block">
                    {new Date(email.sentAt).toLocaleString()}
                  </span>
                </div>
              )}

              {email.providerMessageId && (
                <div>
                  <span className="text-slate-400 dark:text-slate-400 font-medium block flex items-center space-x-1">
                    <Hash className="w-3 h-3 text-indigo-400" />
                    <span>SMTP Message ID</span>
                  </span>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                      {email.providerMessageId}
                    </span>
                    <button
                      onClick={() => handleCopyId(email.providerMessageId || '')}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="Copy Message ID"
                    >
                      {copiedId ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ethereal Preview Action Pill */}
            {email.previewUrl && (
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                    Live Ethereal SMTP Webhook
                  </span>
                </div>
                <a
                  href={email.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <span>Open in Ethereal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Subject Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-900 dark:text-white">
                {email.subject}
              </div>
            </div>

            {/* Body View Mode Tabs & Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Email Body
                </label>
                <div className="flex items-center bg-slate-100 dark:bg-dark-card p-0.5 rounded-md border border-slate-200 dark:border-dark-border text-[11px]">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Formatted</span>
                  </button>
                  <button
                    onClick={() => setViewMode('source')}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors ${
                      viewMode === 'source'
                        ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>Plain/HTML</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/60 p-4 max-h-72 overflow-y-auto">
                {viewMode === 'preview' ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans"
                    dangerouslySetInnerHTML={{
                      __html: email.body.replace(/\n/g, '<br/>'),
                    }}
                  />
                ) : (
                  <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                    {email.body}
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Created: {new Date(email.createdAt).toLocaleDateString()}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

