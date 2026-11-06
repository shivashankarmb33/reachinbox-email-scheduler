import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Database,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Gauge,
  Clock,
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { EmailStats } from '../../types';

interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  isPaused: boolean;
  total: number;
}

interface AnalyticsViewProps {
  stats: EmailStats;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ stats }) => {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchQueueStats = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/queue/stats');
      if (res.data.success && res.data.stats) {
        setQueueStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load queue stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStats();
    const interval = setInterval(fetchQueueStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalDelivered = stats.sent + stats.failed;
  const deliverySuccessRate =
    totalDelivered > 0 ? Math.round((stats.sent / totalDelivered) * 100) : 100;
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            System & Queue Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time BullMQ background queues, Redis rate limit compliance, and dispatch metrics
          </p>
        </div>
        <button
          onClick={fetchQueueStats}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* High-level summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Delivery Success Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Delivery Success
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {deliverySuccessRate}%
            </span>
            <span className="text-xs text-slate-400">
              ({stats.sent} / {Math.max(totalDelivered, 1)})
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-dark-card h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${deliverySuccessRate}%` }}
            />
          </div>
        </div>

        {/* BullMQ Delayed Queue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Delayed Jobs
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {queueStats?.delayed ?? 0}
            </span>
            <span className="text-xs text-slate-400">waiting for timestamp</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Precision millisecond timer execution via Redis sorted sets
          </p>
        </div>

        {/* Active Dispatches */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Workers
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {queueStats?.active ?? 0}
            </span>
            <span className="text-xs text-slate-400">concurrency = 5</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Nodemailer Ethereal SMTP delivery pipeline
          </p>
        </div>

        {/* Failed Dispatches */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Failed Jobs
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {queueStats?.failed ?? stats.failed}
            </span>
            <span className="text-xs text-slate-400">retry budget: 3 attempts</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Exponential backoff with automated Slack alerting
          </p>
        </div>
      </div>

      {/* BullMQ Real-Time Queue Breakdown */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/80 dark:border-dark-border p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                BullMQ Email Queue State
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct Redis hash table & zset counter inspection
              </p>
            </div>
          </div>

          <a
            href={`${backendUrl}/admin/queues`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Launch Bull Board UI →
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200/60 dark:border-dark-border">
            <p className="text-[11px] text-slate-400 font-medium">Waiting</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {queueStats?.waiting ?? 0}
            </p>
            <span className="text-[10px] text-slate-400">Ready in queue</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200/60 dark:border-dark-border">
            <p className="text-[11px] text-slate-400 font-medium">Active</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {queueStats?.active ?? 0}
            </p>
            <span className="text-[10px] text-slate-400">Currently executing</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200/60 dark:border-dark-border">
            <p className="text-[11px] text-slate-400 font-medium">Delayed</p>
            <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1">
              {queueStats?.delayed ?? 0}
            </p>
            <span className="text-[10px] text-slate-400">Scheduled for future</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200/60 dark:border-dark-border">
            <p className="text-[11px] text-slate-400 font-medium">Completed</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {queueStats?.completed ?? stats.sent}
            </p>
            <span className="text-[10px] text-slate-400">Cleanly finished</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200/60 dark:border-dark-border">
            <p className="text-[11px] text-slate-400 font-medium">Failed</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {queueStats?.failed ?? stats.failed}
            </p>
            <span className="text-[10px] text-slate-400">Exceeded retries</span>
          </div>
        </div>
      </div>

      {/* Infrastructure Node Health Cards */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/80 dark:border-dark-border p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
          <Server className="w-4 h-4 text-indigo-500" />
          <span>Core Infrastructure Health</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          {/* Postgres */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 flex items-start space-x-3">
            <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 dark:text-white">PostgreSQL 16</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Port 5432 • Prisma ORM • ACID persistence
              </p>
            </div>
          </div>

          {/* Redis */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 flex items-start space-x-3">
            <Zap className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 dark:text-white">Redis 7</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Port 6379 • AOF enabled • Lua rate limiters
              </p>
            </div>
          </div>

          {/* Elasticsearch */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 flex items-start space-x-3">
            <Activity className="w-5 h-5 text-cyan-500 mt-0.5" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 dark:text-white">Elasticsearch 8</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Port 9200 • Full-text inverted index
              </p>
            </div>
          </div>

          {/* BullMQ Worker */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/40 flex items-start space-x-3">
            <Gauge className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 dark:text-white">BullMQ Worker</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Process Active • Concurrency = 5
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
