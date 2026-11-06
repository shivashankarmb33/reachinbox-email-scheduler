import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Mail,
  Calendar,
  Send,
  Eye,
} from 'lucide-react';
import { ScheduledEmail, EmailStatus } from '../../types';

interface EmailTableProps {
  emails: ScheduledEmail[];
  loading: boolean;
  onSelectEmail: (email: ScheduledEmail) => void;
  statusFilter?: EmailStatus | 'ALL';
  onStatusFilterChange?: (status: EmailStatus | 'ALL') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  onComposeClick?: () => void;
}

type SortField = 'recipient' | 'subject' | 'scheduledAt' | 'status';
type SortDirection = 'asc' | 'desc';

export const EmailTable: React.FC<EmailTableProps> = ({
  emails,
  loading,
  onSelectEmail,
  statusFilter = 'ALL',
  onStatusFilterChange,
  emptyTitle = 'No emails found',
  emptySubtitle = 'No emails matched your current filters or query.',
  onComposeClick,
}) => {
  const [sortField, setSortField] = useState<SortField>('scheduledAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort emails
  const sortedEmails = useMemo(() => {
    return [...emails].sort((a, b) => {
      let aVal: string | number = a[sortField] || '';
      let bVal: string | number = b[sortField] || '';

      if (sortField === 'scheduledAt') {
        aVal = new Date(a.scheduledAt).getTime();
        bVal = new Date(b.scheduledAt).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [emails, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ml-1 inline" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ml-1 inline" />
    );
  };

  const renderStatusBadge = (status: EmailStatus) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Sent</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Processing</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>Scheduled</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-dark-border">
          <div className="h-4 bg-slate-200 dark:bg-dark-card rounded w-1/4 animate-pulse mb-2" />
          <div className="h-3 bg-slate-100 dark:bg-dark-card/60 rounded w-1/3 animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-dark-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center space-x-4 animate-pulse">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-dark-card" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-200 dark:bg-dark-card rounded w-1/3" />
                <div className="h-3 bg-slate-100 dark:bg-dark-card/60 rounded w-1/2" />
              </div>
              <div className="w-24 h-6 bg-slate-200 dark:bg-dark-card rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedEmails.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-xs p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
          <Mail className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          {emptyTitle}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          {emptySubtitle}
        </p>
        {onComposeClick && (
          <button
            onClick={onComposeClick}
            className="mt-5 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Schedule New Email</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-xs overflow-hidden">
      {/* Table Filter Subheader (optional quick filter) */}
      {onStatusFilterChange && (
        <div className="px-5 py-3 border-b border-slate-100 dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-dark-card/30">
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 font-medium mr-1">Filter:</span>
            {(['ALL', 'SCHEDULED', 'PROCESSING', 'SENT', 'FAILED'] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => onStatusFilterChange(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    statusFilter === s
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-dark-card'
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              )
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Showing {sortedEmails.length} records
          </span>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-dark-card/50 border-b border-slate-200 dark:border-dark-border text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th
                onClick={() => handleSort('recipient')}
                className="py-3 px-5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
              >
                Recipient {renderSortIcon('recipient')}
              </th>
              <th
                onClick={() => handleSort('subject')}
                className="py-3 px-5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
              >
                Subject {renderSortIcon('subject')}
              </th>
              <th
                onClick={() => handleSort('scheduledAt')}
                className="py-3 px-5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
              >
                Time {renderSortIcon('scheduledAt')}
              </th>
              <th
                onClick={() => handleSort('status')}
                className="py-3 px-5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none"
              >
                Status {renderSortIcon('status')}
              </th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-xs text-slate-700 dark:text-slate-300">
            {sortedEmails.map((email) => (
              <tr
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className="hover:bg-slate-50/70 dark:hover:bg-dark-card/50 transition-colors cursor-pointer group"
              >
                {/* Recipient */}
                <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-dark-card flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {email.recipient.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{email.recipient}</span>
                  </div>
                </td>

                {/* Subject */}
                <td className="py-3.5 px-5 max-w-xs truncate text-slate-800 dark:text-slate-200">
                  <div className="truncate font-normal" title={email.subject}>
                    {email.subject}
                  </div>
                </td>

                {/* Date/Time */}
                <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                    <span>
                      {new Date(email.sentAt || email.scheduledAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="py-3.5 px-5 whitespace-nowrap">
                  {renderStatusBadge(email.status)}
                </td>

                {/* Actions & Preview Link */}
                <td className="py-3.5 px-5 text-right whitespace-nowrap">
                  <div
                    className="flex items-center justify-end space-x-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {email.previewUrl && (
                      <a
                        href={email.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                        title="View Email in Ethereal"
                      >
                        <span>Ethereal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => onSelectEmail(email)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
                      title="Inspect Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
