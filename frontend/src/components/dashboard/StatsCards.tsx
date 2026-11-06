import React from 'react';
import { Mail, Clock, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { EmailStats } from '../../types';

interface StatsCardsProps {
  stats: EmailStats;
  loading: boolean;
  onCardClick?: (filter: 'all' | 'scheduled' | 'sent' | 'failed') => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading, onCardClick }) => {
  const cards = [
    {
      id: 'all' as const,
      label: 'Total Tracked Emails',
      value: stats.total,
      sublabel: 'Aggregated PostgreSQL records',
      icon: Mail,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
      borderColor: 'border-indigo-100 dark:border-indigo-900/50',
    },
    {
      id: 'scheduled' as const,
      label: 'Scheduled in BullMQ',
      value: stats.scheduled,
      sublabel: 'Awaiting timer or delayed',
      icon: Clock,
      iconColor: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-100 dark:border-amber-900/50',
    },
    {
      id: 'sent' as const,
      label: 'Successfully Sent',
      value: stats.sent,
      sublabel: 'Delivered via Ethereal SMTP',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-100 dark:border-emerald-900/50',
    },
    {
      id: 'failed' as const,
      label: 'Failed Dispatches',
      value: stats.failed,
      sublabel: 'Exceeded retry budget',
      icon: AlertTriangle,
      iconColor: 'text-rose-500 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-100 dark:border-rose-900/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onCardClick?.(card.id)}
            className={`p-5 rounded-2xl bg-white dark:bg-dark-surface border ${card.borderColor} shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {card.label}
              </span>
              <div
                className={`w-9 h-9 rounded-xl ${card.bgColor} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}
              >
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>

            <div className="mt-3">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {loading ? (
                  <span className="inline-block w-12 h-7 bg-slate-200 dark:bg-dark-card animate-pulse rounded-lg" />
                ) : (
                  card.value.toLocaleString()
                )}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-1 flex items-center justify-between">
                <span>{card.sublabel}</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
