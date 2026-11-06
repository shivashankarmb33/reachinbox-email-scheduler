import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { NavTab } from '../components/layout/Sidebar';
import { StatsCards } from '../components/dashboard/StatsCards';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { EmailTable } from '../components/email/EmailTable';
import { EmailDetailDrawer } from '../components/email/EmailDetailDrawer';
import { ComposeModal } from '../components/email/ComposeModal';
import { Pagination } from '../components/common/Pagination';
import { AnalyticsView } from '../components/analytics/AnalyticsView';
import { SlackView } from '../components/slack/SlackView';
import { QueueView } from '../components/queue/QueueView';
import { SettingsView } from '../components/settings/SettingsView';
import { apiClient } from '../services/api';
import { ScheduledEmail, EmailStats, EmailStatus } from '../types';
import {
  Send,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // Stats State
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    scheduled: 0,
    sent: 0,
    failed: 0,
  });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Email Tables Data
  const [emails, setEmails] = useState<ScheduledEmail[]>([]);
  const [tableLoading, setTableLoading] = useState<boolean>(true);

  // Status Filter within table
  const [tableStatusFilter, setTableStatusFilter] = useState<EmailStatus | 'ALL'>('ALL');

  // Pagination & Search
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');

  // Modals & Drawer
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Slack state
  const [slackConnected, setSlackConnected] = useState<boolean>(false);
  const [slackChannel, setSlackChannel] = useState<string | null>(null);

  // 1. Fetch Slack Status
  const fetchSlackStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/slack/status');
      if (res.data.success) {
        setSlackConnected(res.data.connected);
        setSlackChannel(res.data.channelName);
      }
    } catch {
      // Ignored if not yet configured
    }
  }, []);

  // 2. Fetch Aggregated Statistics
  const fetchStats = useCallback(async () => {
    try {
      const [scheduledRes, sentRes] = await Promise.all([
        apiClient.get('/api/emails/scheduled?limit=1'),
        apiClient.get('/api/emails/sent?limit=1'),
      ]);

      const scheduledCount = scheduledRes.data.total || 0;
      const sentFailedCount = sentRes.data.total || 0;

      let failedCount = 0;
      try {
        const queueRes = await apiClient.get('/api/queue/stats');
        failedCount = queueRes.data.stats?.failed || 0;
      } catch {
        // queue stats fallback
      }

      setStats({
        total: scheduledCount + sentFailedCount,
        scheduled: scheduledCount,
        sent: Math.max(0, sentFailedCount - failedCount),
        failed: failedCount,
      });
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 3. Fetch Emails for Active View
  const fetchEmails = useCallback(async () => {
    setTableLoading(true);
    try {
      if (activeSearch.trim()) {
        // Full-text search via Elasticsearch endpoint
        const res = await apiClient.get('/api/emails/search', {
          params: {
            q: activeSearch.trim(),
            page,
            limit: 15,
          },
        });
        if (res.data.success) {
          setEmails(res.data.emails || []);
          setTotalItems(res.data.total || 0);
          setTotalPages(res.data.totalPages || 1);
        }
      } else if (activeTab === 'scheduled') {
        const res = await apiClient.get('/api/emails/scheduled', {
          params: { page, limit: 15 },
        });
        if (res.data.success) {
          setEmails(res.data.emails || []);
          setTotalItems(res.data.total || 0);
          setTotalPages(res.data.totalPages || 1);
        }
      } else if (activeTab === 'sent') {
        const res = await apiClient.get('/api/emails/sent', {
          params: { page, limit: 15 },
        });
        if (res.data.success) {
          const sentOnly = (res.data.emails || []).filter(
            (e: any) => e.status === 'SENT'
          );
          setEmails(sentOnly);
          setTotalItems(sentOnly.length);
          setTotalPages(res.data.totalPages || 1);
        }
      } else if (activeTab === 'failed') {
        const res = await apiClient.get('/api/emails/sent', {
          params: { page, limit: 15 },
        });
        if (res.data.success) {
          const failedOnly = (res.data.emails || []).filter(
            (e: any) => e.status === 'FAILED'
          );
          setEmails(failedOnly);
          setTotalItems(failedOnly.length);
          setTotalPages(1);
        }
      } else {
        // 'overview' or 'all': fetch combined recent scheduled and sent
        const [scheduledRes, sentRes] = await Promise.all([
          apiClient.get('/api/emails/scheduled', { params: { page: 1, limit: 10 } }),
          apiClient.get('/api/emails/sent', { params: { page: 1, limit: 10 } }),
        ]);

        const combined = [
          ...(scheduledRes.data.emails || []),
          ...(sentRes.data.emails || []),
        ];

        // Sort by scheduledAt or sentAt descending
        combined.sort(
          (a, b) =>
            new Date(b.sentAt || b.scheduledAt).getTime() -
            new Date(a.sentAt || a.scheduledAt).getTime()
        );

        setEmails(combined);
        setTotalItems(
          (scheduledRes.data.total || 0) + (sentRes.data.total || 0)
        );
        setTotalPages(Math.max(scheduledRes.data.totalPages || 1, sentRes.data.totalPages || 1));
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setTableLoading(false);
    }
  }, [activeTab, activeSearch, page]);

  // Initial load and polling every 5s for live job updates
  useEffect(() => {
    fetchSlackStatus();
    fetchStats();
    fetchEmails();

    const interval = setInterval(() => {
      fetchStats();
      fetchEmails();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchSlackStatus, fetchStats, fetchEmails]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchQuery);
    if (activeTab === 'overview') setActiveTab('all');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setPage(1);
  };

  const handleEmailClick = (email: ScheduledEmail) => {
    setSelectedEmail(email);
    setIsDrawerOpen(true);
  };

  // Filtered emails for table view based on quick pills
  const displayEmails = useMemo(() => {
    if (tableStatusFilter === 'ALL') return emails;
    return emails.filter((e) => e.status === tableStatusFilter);
  }, [emails, tableStatusFilter]);

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setPage(1);
      }}
      stats={stats}
      slackConnected={slackConnected}
      slackChannel={slackChannel}
      onComposeClick={() => setIsComposeOpen(true)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchSubmit={handleSearchSubmit}
      onClearSearch={handleClearSearch}
    >
      {/* View Router */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Welcome Banner Card */}
          <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/40">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Production-Minded Email Scheduler</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Monitor delayed BullMQ dispatches, atomic Redis Lua rate limiters, Ethereal SMTP delivery proofs, and live Slack alerts.
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-col items-start gap-2.5 shrink-0">
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Quick Schedule Email</span>
                </button>
                <button
                  onClick={() => setActiveTab('queue')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  <span>Inspect BullMQ Queues</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <StatsCards
            stats={stats}
            loading={statsLoading}
            onCardClick={(filter) => {
              if (filter === 'all') setActiveTab('all');
              else if (filter === 'scheduled') setActiveTab('scheduled');
              else if (filter === 'sent') setActiveTab('sent');
              else if (filter === 'failed') setActiveTab('failed');
            }}
          />

          {/* Interactive Activity Chart */}
          <ActivityChart stats={stats} emails={emails} loading={statsLoading} />

          {/* Recent Activity Table Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent Email Activity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Latest scheduled and dispatched emails across all queues
                </p>
              </div>

              <button
                onClick={() => setActiveTab('all')}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>View All Emails</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <EmailTable
              emails={displayEmails.slice(0, 8)}
              loading={tableLoading}
              onSelectEmail={handleEmailClick}
              onComposeClick={() => setIsComposeOpen(true)}
              emptyTitle="No recent emails"
              emptySubtitle="You haven't scheduled any emails yet. Click below to compose your first campaign."
            />
          </div>
        </div>
      )}

      {/* View: All Emails */}
      {activeTab === 'all' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                All Tracked Emails
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full history of scheduled, processing, sent, and failed email dispatches
              </p>
            </div>
            <button
              onClick={() => {
                fetchStats();
                fetchEmails();
              }}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 text-slate-500 self-start"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${tableLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <EmailTable
            emails={displayEmails}
            loading={tableLoading}
            onSelectEmail={handleEmailClick}
            statusFilter={tableStatusFilter}
            onStatusFilterChange={setTableStatusFilter}
            onComposeClick={() => setIsComposeOpen(true)}
          />

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={15}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* View: Scheduled Emails */}
      {activeTab === 'scheduled' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>Scheduled Emails ({stats.scheduled})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active jobs waiting in BullMQ Redis delayed set for execution
              </p>
            </div>
            <button
              onClick={() => {
                fetchStats();
                fetchEmails();
              }}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 text-slate-500"
            >
              <RefreshCw className={`w-4 h-4 ${tableLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <EmailTable
            emails={displayEmails}
            loading={tableLoading}
            onSelectEmail={handleEmailClick}
            onComposeClick={() => setIsComposeOpen(true)}
            emptyTitle="No scheduled emails queued"
            emptySubtitle="All jobs have finished executing or none have been enqueued yet."
          />

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={15}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* View: Sent Emails */}
      {activeTab === 'sent' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Successfully Sent Emails ({stats.sent})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Delivered via Ethereal SMTP with verified preview URLs
              </p>
            </div>
            <button
              onClick={() => {
                fetchStats();
                fetchEmails();
              }}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 text-slate-500"
            >
              <RefreshCw className={`w-4 h-4 ${tableLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <EmailTable
            emails={displayEmails}
            loading={tableLoading}
            onSelectEmail={handleEmailClick}
            onComposeClick={() => setIsComposeOpen(true)}
            emptyTitle="No sent emails recorded"
            emptySubtitle="Completed dispatches will appear here alongside their Ethereal preview links."
          />

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={15}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* View: Failed Emails */}
      {activeTab === 'failed' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Failed Email Dispatches ({stats.failed})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Jobs that exceeded retry budgets or encountered SMTP errors
              </p>
            </div>
            <button
              onClick={() => {
                fetchStats();
                fetchEmails();
              }}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 text-slate-500"
            >
              <RefreshCw className={`w-4 h-4 ${tableLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <EmailTable
            emails={displayEmails}
            loading={tableLoading}
            onSelectEmail={handleEmailClick}
            onComposeClick={() => setIsComposeOpen(true)}
            emptyTitle="No failed emails"
            emptySubtitle="All email delivery attempts have processed cleanly with 0 failures."
          />
        </div>
      )}

      {/* View: Analytics */}
      {activeTab === 'analytics' && <AnalyticsView stats={stats} />}

      {/* View: Slack Integration */}
      {activeTab === 'slack' && (
        <SlackView
          connected={slackConnected}
          channelName={slackChannel}
          onRefresh={fetchSlackStatus}
        />
      )}

      {/* View: Queue Monitoring */}
      {activeTab === 'queue' && <QueueView />}

      {/* View: Settings */}
      {activeTab === 'settings' && <SettingsView />}

      {/* Email Details Slide-Over Drawer */}
      <EmailDetailDrawer
        email={selectedEmail}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedEmail(null);
        }}
      />

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          fetchStats();
          fetchEmails();
        }}
      />
    </AppLayout>
  );
};
