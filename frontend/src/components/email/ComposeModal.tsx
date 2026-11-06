import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import {
  X,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Gauge,
  Send,
  Eye,
  Edit3,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { Sender } from '../../types';
import { useToast } from '../../context/ToastContext';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2000);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);

  // Recipient chips state
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [invalidCount, setInvalidCount] = useState<number>(0);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Active view: Edit vs Preview tab
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize defaults on modal open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setActiveTab('editor');

      // Set default startTime to now + 2 minutes
      const defaultDate = new Date(Date.now() + 2 * 60 * 1000);
      defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());
      setStartTime(defaultDate.toISOString().slice(0, 16));

      // Fetch user's senders
      apiClient
        .get('/api/senders')
        .then((res) => {
          if (res.data.success && res.data.senders.length > 0) {
            setSenders(res.data.senders);
            setSelectedSenderId(res.data.senders[0].id);
            setDelayBetweenEmails(res.data.senders[0].minimumDelay || 2000);
            setHourlyLimit(res.data.senders[0].hourlyLimit || 50);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Add individual recipient chips
  const addRecipientChip = (raw: string) => {
    const cleaned = raw.trim().toLowerCase();
    if (!cleaned) return;

    if (EMAIL_REGEX.test(cleaned)) {
      if (!recipients.includes(cleaned)) {
        setRecipients((prev) => [...prev, cleaned]);
      }
      setRecipientInput('');
    } else {
      setInvalidCount((prev) => prev + 1);
      setError(`"${cleaned}" is not a valid email address.`);
    }
  };

  const handleKeyDownRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addRecipientChip(recipientInput);
    } else if (e.key === 'Backspace' && !recipientInput && recipients.length > 0) {
      // Remove last chip
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  const removeRecipientChip = (indexToRemove: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Parse CSV File via PapaParse
  const processCsvFile = (file: File) => {
    setCsvFileName(file.name);
    setError(null);

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows = results.data as string[][];
        const extractedEmails: string[] = [];
        let invalid = 0;

        parsedRows.forEach((row) => {
          row.forEach((cell) => {
            const trimmed = String(cell).trim().toLowerCase();
            if (trimmed) {
              if (EMAIL_REGEX.test(trimmed)) {
                extractedEmails.push(trimmed);
              } else if (trimmed.includes('@')) {
                invalid++;
              }
            }
          });
        });

        // Deduplicate
        const unique = Array.from(new Set([...recipients, ...extractedEmails]));
        setRecipients(unique);
        setInvalidCount((prev) => prev + invalid);
        showToast(
          'info',
          'CSV Processed',
          `Added ${extractedEmails.length} recipients (${invalid} invalid skipped).`
        );
      },
      error: (err) => {
        setError(`CSV parse failed: ${err.message}`);
      },
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processCsvFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processCsvFile(file);
  };

  // Quick preset shortcuts for scheduled time
  const setQuickTime = (minutesAhead: number) => {
    const date = new Date(Date.now() + minutesAhead * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    setStartTime(date.toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If input has text when submitting, commit it first
    if (recipientInput.trim()) {
      addRecipientChip(recipientInput);
    }

    if (!selectedSenderId) {
      setError('Please select or create an email sender.');
      return;
    }
    if (!subject.trim()) {
      setError('Please provide an email subject.');
      return;
    }
    if (!body.trim()) {
      setError('Please provide an email body.');
      return;
    }
    if (recipients.length === 0) {
      setError('Please provide at least one recipient (add chips or upload CSV).');
      return;
    }
    if (!startTime) {
      setError('Please select a scheduled start date & time.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        senderId: selectedSenderId,
        subject,
        body,
        recipients,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails: Number(delayBetweenEmails),
        hourlyLimit: Number(hourlyLimit),
      };

      const res = await apiClient.post('/api/emails/schedule', payload);

      if (res.data.success) {
        showToast(
          'success',
          'Emails Scheduled Successfully',
          `Enqueued ${recipients.length} jobs into BullMQ. Rate limit: ${hourlyLimit}/hr.`
        );
        onSuccess();
        onClose();
      } else {
        setError(res.data.error || 'Failed to schedule emails');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error scheduling emails');
    } finally {
      setLoading(false);
    }
  };

  const selectedSender = senders.find((s) => s.id === selectedSenderId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-dark-border animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-dark-border flex items-center justify-between bg-slate-50/60 dark:bg-dark-card/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Compose & Schedule Emails
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Multi-recipient dispatch with BullMQ queue and Redis atomic rate limiting
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Editor / Preview Tab Switcher */}
            <div className="flex items-center bg-slate-200/80 dark:bg-dark-card p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'editor'
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Compose</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'editor' ? (
            <>
              {/* Sending Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sending Account (SMTP Sender)
                </label>
                {senders.length > 0 ? (
                  <select
                    value={selectedSenderId}
                    onChange={(e) => {
                      setSelectedSenderId(e.target.value);
                      const s = senders.find((item) => item.id === e.target.value);
                      if (s) {
                        setDelayBetweenEmails(s.minimumDelay);
                        setHourlyLimit(s.hourlyLimit);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                  >
                    {senders.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.email} ({s.smtpHost}) • Limit: {s.hourlyLimit}/hr • Min Delay: {s.minimumDelay}ms
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
                    No senders found. Please configure a sender or log in with Google to auto-provision an Ethereal SMTP account.
                  </div>
                )}
              </div>

              {/* Recipient Input with Multi-Email Chips */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Recipients ({recipients.length} added)
                    </label>
                    {invalidCount > 0 && (
                      <span className="text-[10px] text-rose-500 font-medium">
                        ({invalidCount} invalid filtered)
                      </span>
                    )}
                  </div>
                  {recipients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecipients([]);
                        setInvalidCount(0);
                      }}
                      className="text-[11px] text-rose-500 hover:text-rose-600 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                <div className="p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card focus-within:ring-2 focus-within:ring-indigo-500 min-h-[50px] flex flex-wrap gap-1.5 items-center">
                  {recipients.map((email, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-in fade-in"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipientChip(idx)}
                        className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyDown={handleKeyDownRecipient}
                    onBlur={() => {
                      if (recipientInput.trim()) addRecipientChip(recipientInput);
                    }}
                    placeholder={
                      recipients.length === 0
                        ? 'Type recipient email and hit Enter, space or comma...'
                        : 'Add more...'
                    }
                    className="flex-1 min-w-[200px] text-xs bg-transparent border-0 focus:outline-none text-slate-800 dark:text-slate-200 py-1 px-1 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* CSV Drag & Drop Upload Section */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-300 dark:border-dark-border hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-dark-card/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {csvFileName ? `Loaded: ${csvFileName}` : 'Drag & drop CSV or click to browse'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Auto-extracts emails and strips duplicates automatically
                    </p>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule Update & Sprint Review"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Body (Markdown or Plain Text supported)
                </label>
                <textarea
                  rows={4}
                  placeholder="Hi there,&#10;&#10;We're following up on our previous conversation regarding..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-dark-card text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Scheduling Parameters Grid */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-card/50 border border-slate-200 dark:border-dark-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Dispatch Controls</span>
                  </span>
                  {/* Quick preset buttons */}
                  <div className="flex items-center space-x-1 text-[10px]">
                    <span className="text-slate-400">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setQuickTime(2)}
                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-dark-card text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                    >
                      +2m
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTime(15)}
                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-dark-card text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTime(60)}
                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-dark-card text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                    >
                      +1hr
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Start Date & Time */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Start Date & Time</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Delay Between Sends */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Delay (ms)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={delayBetweenEmails}
                      onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Hourly Sending Limit */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                      <Gauge className="w-3 h-3" />
                      <span>Hourly Limit</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      value={hourlyLimit}
                      onChange={(e) => setHourlyLimit(Number(e.target.value))}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Live Preview Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-dark-border pb-2">
                  <span className="text-slate-400">From:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSender?.email || 'Default Sender'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-dark-border pb-2">
                  <span className="text-slate-400">To ({recipients.length}):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-sm">
                    {recipients.length > 0
                      ? recipients.slice(0, 3).join(', ') +
                        (recipients.length > 3 ? ` + ${recipients.length - 3} more` : '')
                      : 'No recipients selected yet'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-dark-border pb-2">
                  <span className="text-slate-400">Subject:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {subject || '(Empty subject)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Schedule:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {startTime ? new Date(startTime).toLocaleString() : 'Immediate'}
                  </span>
                </div>
              </div>

              {/* Rendered Email Body Preview */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-xs">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Rendered Email Message
                </h4>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans"
                  dangerouslySetInnerHTML={{
                    __html: body ? body.replace(/\n/g, '<br/>') : '<em>(Empty message body)</em>',
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-dark-border flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {recipients.length} target recipients queued
            </span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scheduling Jobs...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      Schedule {recipients.length > 0 ? `${recipients.length} Emails` : 'Emails'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
