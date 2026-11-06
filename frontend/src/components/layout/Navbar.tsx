import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Mail, Send, Activity, MessageSquare } from 'lucide-react';

interface NavbarProps {
  onComposeClick: () => void;
  slackConnected: boolean;
  slackChannel?: string | null;
  onSlackClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onComposeClick,
  slackConnected,
  slackChannel,
  onSlackClick,
}) => {
  const { user, logout } = useAuth();
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                ReachInbox
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Scheduler
              </span>
            </div>
          </div>

          {/* Action buttons & User menu */}
          <div className="flex items-center space-x-4">
            {/* Bull Board link */}
            <a
              href={`${backendUrl}/admin/queues`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Bull Board</span>
            </a>

            {/* Slack Connection Pill */}
            <button
              onClick={onSlackClick}
              className={`inline-flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                slackConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 ${slackConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>
                {slackConnected
                  ? `Slack: #${slackChannel || 'active'}`
                  : 'Connect Slack'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  slackConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
            </button>

            {/* Compose New Email Button */}
            <button
              onClick={onComposeClick}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm shadow-indigo-200 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Compose Email</span>
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-none">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate max-w-[140px]">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

