import React from 'react';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { ScheduledEmail } from '../../types';

interface ScheduledTableProps {
  emails: ScheduledEmail[];
  loading: boolean;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({ emails, loading }) => {
  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-xs text-slate-500">Loading scheduled emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3 border border-slate-100">
          <Clock className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">No scheduled emails</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          You don't have any emails currently queued for delivery. Click "Compose Email" to schedule a new batch.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <th className="py-3 px-4">Recipient</th>
            <th className="py-3 px-4">Subject</th>
            <th className="py-3 px-4">Scheduled For</th>
            <th className="py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
          {emails.map((email) => (
            <tr key={email.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="py-3 px-4 font-medium text-slate-900">
                {email.recipient}
              </td>
              <td className="py-3 px-4 max-w-xs truncate" title={email.subject}>
                {email.subject}
              </td>
              <td className="py-3 px-4 text-slate-500 flex items-center space-x-1.5 whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date(email.scheduledAt).toLocaleString()}</span>
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                {email.status === 'PROCESSING' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
                    Processing
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3 h-3 mr-1 text-amber-500" />
                    Scheduled
                  </span>
                )}
                {email.failureReason && (
                  <span
                    className="ml-2 text-rose-500 cursor-help"
                    title={email.failureReason}
                  >
                    <AlertCircle className="w-3.5 h-3.5 inline" />
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

