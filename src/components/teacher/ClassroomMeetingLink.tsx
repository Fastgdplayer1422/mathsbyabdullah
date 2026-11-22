import React, { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  Radio,
  Video,
  VideoOff,
} from 'lucide-react';
import { PortalState } from '../../types/portal';
import { normalizeExternalUrl } from '../../utils/formatters';

interface ClassroomMeetingLinkProps {
  state: PortalState;
  onSaveMeetingLink: (url: string) => Promise<boolean>;
  onNotify: (msg: string) => void;
  onPreviewStudentView?: () => void;
}

export const ClassroomMeetingLink: React.FC<ClassroomMeetingLinkProps> = ({
  state,
  onSaveMeetingLink,
  onNotify,
  onPreviewStudentView,
}) => {
  const [meetingUrlInput, setMeetingUrlInput] = useState(state.meetingUrl || '');
  const [justSaved, setJustSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isConfigured = Boolean(state.meetingUrl && state.meetingUrl.trim().length > 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanUrl = normalizeExternalUrl(meetingUrlInput);
      const saved = await onSaveMeetingLink(cleanUrl);
      if (!saved) return;
      setMeetingUrlInput(cleanUrl);
      setJustSaved(true);
      onNotify('Saved permanent classroom meeting link');
      setTimeout(() => setJustSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      const saved = await onSaveMeetingLink('');
      if (!saved) return;
      setMeetingUrlInput('');
      onNotify('Cleared classroom meeting link');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
      {/* Configuration Card */}
      <div className="space-y-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm lg:col-span-7 transition-colors">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                <Video className="h-4 w-4" />
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Classroom Meeting Link
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Set your single permanent Zoom or Google Meet room URL. This link automatically applies across all your courses, scheduled batches, and live class countdowns.
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
              isConfigured
                ? 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                : 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConfigured ? 'bg-teal-500 animate-pulse' : 'bg-indigo-400'
              }`}
            />
            <span>{isConfigured ? 'Permanent Room Active' : 'No Link Configured'}</span>
          </span>
        </div>

        {/* Meeting Link Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="classroom-meeting-url"
              className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
            >
              Permanent Classroom URL (Zoom, Google Meet, Teams)
            </label>
            <div className="relative">
              <Link2
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="classroom-meeting-url"
                type="text"
                required
                disabled={isSaving}
                value={meetingUrlInput}
                onChange={(e) => setMeetingUrlInput(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij or https://zoom.us/j/123456789"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 pl-10 pr-4 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-sans focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              When students click &ldquo;Join Live Session&rdquo; on their dashboard, this room link opens in a new tab.
            </p>
          </div>

          {/* Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-indigo-500 shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : justSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-teal-400" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-teal-400" />
                    <span>Save Meeting Link</span>
                  </>
                )}
              </button>

              {isConfigured && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 dark:border-red-900 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 transition-colors disabled:opacity-50"
                >
                  <span>Remove Link</span>
                </button>
              )}
            </div>

            {isConfigured && (
              <a
                href={state.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>Test Open Room Link</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </form>

        {/* Benefits summary list */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            How the Permanent Link Works
          </h3>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-teal-600 dark:text-teal-400 font-bold">✓</span>
              <span><strong>Zero weekly setup:</strong> No need to copy-paste links into WhatsApp groups every Sunday.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 dark:text-teal-400 font-bold">✓</span>
              <span><strong>Automatic student mapping:</strong> Students always find the working room button on their Next Class hero banner.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 dark:text-teal-400 font-bold">✓</span>
              <span><strong>Instant update:</strong> If your link ever changes, update it here once and all students receive it instantly.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm lg:col-span-5 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Live Student View Preview</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Dashboard Appearance
          </span>
        </div>

        {/* Student Banner Mockup */}
        <div className="rounded-2xl border border-slate-800 dark:border-slate-700 bg-slate-900 p-5 text-white space-y-3.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200 tabular-nums border border-slate-700">
            <Radio className="h-3 w-3 text-teal-400" aria-hidden="true" />
            <span>NEXT LIVE CLASS · STARTS IN 2H</span>
          </div>

          <div className="space-y-1">
            <h4 className="font-display text-lg font-bold leading-snug text-white">
              IGCSE Mathematics · Extended Group A
            </h4>
            <p className="text-xs font-medium text-slate-300">
              Upcoming recurring slot: Monday, 5:00 PM
            </p>
          </div>

          <div className="pt-1">
            {isConfigured ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">
                <Video className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                <span>Join Live Session</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 border border-slate-700">
                <VideoOff className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Link not posted yet</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Active Link:</span>
          <span className="font-mono text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
            {state.meetingUrl || 'None set'}
          </span>
        </div>

        {onPreviewStudentView && (
          <button
            type="button"
            onClick={onPreviewStudentView}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Switch to Student View
          </button>
        )}
      </div>
    </div>
  );
};
