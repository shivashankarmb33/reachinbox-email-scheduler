import React, { useState } from 'react';
import {
  Search,
  Send,
  MessageSquare,
  Activity,
  Sun,
  Moon,
  X,
  Menu,
} from 'lucide-react';
import { Sidebar, NavTab } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { EmailStats } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  stats: EmailStats;
  slackConnected: boolean;
  slackChannel?: string | null;
  onComposeClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  stats,
  slackConnected,
  slackChannel,
  onComposeClick,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans flex flex-col antialiased">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            onTabChange(tab);
            setMobileMenuOpen(false);
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          stats={stats}
          slackConnected={slackConnected}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-white dark:bg-dark-surface z-50">
            <Sidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                onTabChange(tab);
                setMobileMenuOpen(false);
              }}
              collapsed={false}
              onToggleCollapse={() => setMobileMenuOpen(false)}
              stats={stats}
              slackConnected={slackConnected}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-slate-200 dark:border-dark-border px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Elasticsearch Global Search Input */}
          <form
            onSubmit={onSearchSubmit}
            className="relative flex-1 max-w-md w-full"
          >
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search emails, recipients, subjects via Elasticsearch..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full text-xs pl-9 pr-14 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-100/70 dark:bg-dark-card text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Right Action Icons & Badges */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Bull Board Quick Link */}
            <a
              href={`${backendUrl}/admin/queues`}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              title="Open Bull Board Queue UI"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Bull Board</span>
            </a>

            {/* Slack Status Pill */}
            <button
              onClick={() => onTabChange('slack')}
              className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                slackConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                  : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-400 border-slate-200 dark:border-dark-border hover:bg-slate-50'
              }`}
            >
              <MessageSquare
                className={`w-3.5 h-3.5 ${
                  slackConnected ? 'text-emerald-500' : 'text-slate-400'
                }`}
              />
              <span className="hidden sm:inline">
                {slackConnected
                  ? `Slack: #${slackChannel || 'active'}`
                  : 'Connect Slack'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  slackConnected
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            {/* Primary Action: Compose Email */}
            <button
              onClick={onComposeClick}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Schedule Email</span>
              <span className="sm:hidden">Compose</span>
            </button>
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
