import React from 'react';
import { CheckCircle2, XCircle, ExternalLink, Mail } from 'lucide-react';
import { ScheduledEmail } from '../../types';

interface SentTableProps {
  emails: ScheduledEmail[];
  loading: boolean;
}

export const SentTable: React.FC<SentTableProps> = ({ emails, loading }) => {
  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-xs text-slate-500">Loading sent email activity...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3 border border-slate-100">
          <Mail className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">No sent emails yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Completed email sends and failed deliveries will appear here with message IDs and Ethereal preview links.
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
            <th className="py-3 px-4">Sent Timestamp</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">SMTP Delivery Verification</th>
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
              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                {email.sentAt ? new Date(email.sentAt).toLocaleString() : 'N/A'}
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                {email.status === 'SENT' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                    Sent
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                    title={email.failureReason || 'Delivery failed'}
                  >
                    <XCircle className="w-3 h-3 mr-1 text-rose-500" />
                    Failed
                  </span>
                )}
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                {email.previewUrl ? (
                  <a
                    href={email.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-medium underline"
                  >
                    <span>View in Ethereal</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                ) : email.providerMessageId ? (
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {email.providerMessageId.slice(0, 18)}...
                  </span>
                ) : email.failureReason ? (
                  <span className="text-[11px] text-rose-600 truncate max-w-[200px] block" title={email.failureReason}>
                    {email.failureReason}
                  </span>
                ) : (
                  <span className="text-slate-400">N/A</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

