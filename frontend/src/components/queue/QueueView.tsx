import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Cpu,
} from 'lucide-react';
import { apiClient } from '../../services/api';

interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  isPaused: boolean;
  total: number;
}

export const QueueView: React.FC = () => {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/api/queue/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch queue stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Queue Monitoring & Bull Board
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Distributed email queue telemetry running over Redis persistent data structures
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300 dark:border-dark-border text-indigo-600 focus:ring-indigo-500"
            />
            <span>Auto-poll (3s)</span>
          </label>

          <button
            onClick={fetchStats}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Refresh Queue Stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <a
            href={`${backendUrl}/admin/queues`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <span>Launch Bull Board UI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Live State Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Waiting */}
        <div className="p-4 rounded-xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Waiting
          </span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {stats?.waiting ?? 0}
          </p>
          <span className="text-[10px] text-slate-400">Ready for pick up</span>
        </div>

        {/* Active */}
        <div className="p-4 rounded-xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider block">
            Active
          </span>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {stats?.active ?? 0}
          </p>
          <span className="text-[10px] text-slate-400">Worker executing</span>
        </div>

        {/* Delayed */}
        <div className="p-4 rounded-xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider block">
            Delayed
          </span>
          <p className="text-2xl font-extrabold text-amber-500 dark:text-amber-400 mt-1">
            {stats?.delayed ?? 0}
          </p>
          <span className="text-[10px] text-slate-400">Scheduled time</span>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider block">
            Completed
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats?.completed ?? 0}
          </p>
          <span className="text-[10px] text-slate-400">Successful dispatches</span>
        </div>

        {/* Failed */}
        <div className="p-4 rounded-xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider block">
            Failed
          </span>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {stats?.failed ?? 0}
          </p>
          <span className="text-[10px] text-slate-400">Exceeded retries</span>
        </div>

        {/* Status */}
        <div className="p-4 rounded-xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Queue State
          </span>
          <div className="mt-1 flex items-center space-x-1.5">
            {stats?.isPaused ? (
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-600">
                <PauseCircle className="w-4 h-4" />
                <span>Paused</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600">
                <PlayCircle className="w-4 h-4" />
                <span>Active</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400">Accepting jobs</span>
        </div>
      </div>

      {/* Bull Board Quick Access Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bull Board Administrative Dashboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mounted at <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">{backendUrl}/admin/queues</code>
              </p>
            </div>
          </div>

          <a
            href={`${backendUrl}/admin/queues`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold transition-colors"
          >
            <span>Open Bull Board</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200/60 dark:border-dark-border text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Capabilities available inside Bull Board:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li>Inspect raw BullMQ job payloads, delayed timestamps, and stack traces.</li>
            <li>Manually retry failed jobs or promote delayed jobs for immediate execution.</li>
            <li>Pause, resume, and clean expired completed jobs directly from the UI.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
