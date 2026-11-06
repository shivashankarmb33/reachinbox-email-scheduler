import React from 'react';
import {
  LayoutDashboard,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { EmailStats } from '../../types';

export type NavTab =
  | 'overview'
  | 'all'
  | 'scheduled'
  | 'sent'
  | 'failed'
  | 'analytics'
  | 'slack'
  | 'queue'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  stats: EmailStats;
  slackConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  stats,
  slackConnected,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'all' as NavTab,
      label: 'All Emails',
      icon: Mail,
      badge: stats.total > 0 ? stats.total : undefined,
    },
    {
      id: 'scheduled' as NavTab,
      label: 'Scheduled',
      icon: Clock,
      badge: stats.scheduled > 0 ? stats.scheduled : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400',
    },
    {
      id: 'sent' as NavTab,
      label: 'Sent Emails',
      icon: CheckCircle2,
      badge: stats.sent > 0 ? stats.sent : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
    },
    {
      id: 'failed' as NavTab,
      label: 'Failed Emails',
      icon: AlertTriangle,
      badge: stats.failed > 0 ? stats.failed : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400',
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      id: 'slack' as NavTab,
      label: 'Slack Integration',
      icon: MessageSquare,
      dot: slackConnected ? 'bg-emerald-500' : 'bg-slate-400',
    },
    {
      id: 'queue' as NavTab,
      label: 'Queue Monitoring',
      icon: Layers,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-white dark:bg-dark-surface border-r border-slate-200 dark:border-dark-border transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 dark:border-dark-border">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Mail className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent block leading-tight">
                ReachInbox
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Job Scheduler
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors shrink-0"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                collapsed ? 'justify-center px-0 py-3' : 'px-3.5 py-2.5 space-x-3'
              } ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-dark-card border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {/* Active side indicator */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
              )}

              <Icon
                className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                }`}
              />

              {!collapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}

              {/* Badge count or dot indicator */}
              {!collapsed && item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    item.badgeColor ||
                    'bg-slate-100 text-slate-700 dark:bg-dark-card dark:text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {!collapsed && item.dot && (
                <span
                  className={`w-2 h-2 rounded-full ${item.dot} ${
                    item.dot.includes('emerald') ? 'animate-pulse' : ''
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Controls: Theme Toggle & User Info */}
      <div className="p-3 border-t border-slate-200/80 dark:border-dark-border space-y-2">
        {/* Dark/Light mode switcher */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors ${
            collapsed ? 'justify-center py-2 px-0' : 'px-3 py-2 space-x-3'
          }`}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
          {!collapsed && (
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>

        {/* User Card & Logout */}
        <div
          className={`flex items-center rounded-xl p-2 bg-slate-50 dark:bg-dark-card border border-slate-200/60 dark:border-dark-border ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center space-x-2.5 overflow-hidden">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-dark-border object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[110px]">
                  {user?.email}
                </p>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
