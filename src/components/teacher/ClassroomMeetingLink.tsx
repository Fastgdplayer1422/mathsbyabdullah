import React, { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Link2,
  Radio,
  Trash2,
  Video,
  VideoOff,
} from 'lucide-react';
import { PortalState } from '../../types/portal';
import { normalizeExternalUrl } from '../../utils/formatters';

interface ClassroomMeetingLinkProps {
  state: PortalState;
  onSaveMeetingLink: (url: string) => Promise<boolean>;
  onNotify: (msg: string) => void;
  onPreviewStudentView: () => void;
}

export const ClassroomMeetingLink: React.FC<ClassroomMeetingLinkProps> = ({
  state,
  onSaveMeetingLink,
  onNotify,
  onPreviewStudentView,
}) => {
  const [meetingUrlInput, setMeetingUrlInput] = useState(state.meetingUrl || '');
  const [justSaved, setJustSaved] = useState(false);

  const isConfigured = Boolean(state.meetingUrl && state.meetingUrl.trim().length > 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = normalizeExternalUrl(meetingUrlInput);
    const saved = await onSaveMeetingLink(cleanUrl);
    if (!saved) return;
    setMeetingUrlInput(cleanUrl);
    setJustSaved(true);
    onNotify('Saved permanent classroom meeting link');
    setTimeout(() => setJustSaved(false), 2500);
  };

  const handleClear = async () => {
    const saved = await onSaveMeetingLink('');
    if (!saved) return;
    setMeetingUrlInput('');
    onNotify('Cleared classroom meeting link');
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
      {/* Configuration Card */}
      <div className="space-y-6 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8 shadow-sm lg:col-span-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-[#E7E5E4] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
                <Video className="h-4 w-4" />
              </span>
              <h2 className="font-display text-xl font-bold text-[#18181B]">
                Classroom Meeting Link
              </h2>
            </div>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Set your single permanent Zoom or Google Meet room URL. This link automatically applies across all your courses, scheduled batches, and live class countdowns.
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
              isConfigured
                ? 'border-teal-200 bg-teal-50 text-teal-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConfigured ? 'bg-teal-500 animate-pulse' : 'bg-amber-400'
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
              className="block text-xs font-semibold text-[#18181B]"
            >
              Permanent Classroom URL (Zoom, Google Meet, Teams)
            </label>
            <div className="relative">
              <Link2
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
                aria-hidden="true"
              />
              <input
                id="classroom-meeting-url"
                type="text"
                required
                value={meetingUrlInput}
                onChange={(e) => setMeetingUrlInput(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij or https://zoom.us/j/123456789"
                className="w-full rounded-2xl border border-[#E7E5E4] bg-[#F8F7F4] py-3 pl-10 pr-4 text-sm font-mono text-[#18181B] placeholder:text-[#A1A1AA] placeholder:font-sans focus:border-[#4338CA] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[11px] text-[#71717A]">
              When students click &ldquo;Join Live Session&rdquo; on their dashboard, this room link opens in a new tab.
            </p>
          </div>

          {/* Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-6 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A] shadow-sm"
              >
                {justSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-[#F97316]" />
                    <span>Save Meeting Link</span>
                  </>
                )}
              </button>

              {isConfigured && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Link</span>
                </button>
              )}
            </div>

            {isConfigured && (
              <a
                href={state.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] bg-[#F8F7F4] px-4 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#E7E5E4]/70 transition-colors"
              >
                <span>Test Room Link</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#71717A]" />
              </a>
            )}
          </div>
        </form>

        {/* Informational Guidance Box */}
        <div className="rounded-2xl border border-[#FED7AA]/60 bg-[#FFFBF7] p-4 text-xs text-[#78350F] space-y-1.5">
          <strong className="font-semibold text-[#9A3412]">
            Automatic Student Live Class Banner:
          </strong>
          <p className="leading-relaxed">
            You don&apos;t need to configure manual dates or titles here. The Student Dashboard automatically calculates each student&apos;s upcoming class based on their enrolled batch&apos;s weekly schedule dropdowns (e.g., &ldquo;Mon &amp; Wed • 5:00 PM&rdquo;) and enables the &ldquo;Join Live Session&rdquo; button using this single permanent link.
          </p>
        </div>
      </div>

      {/* Live Preview Column */}
      <div className="space-y-4 lg:col-span-5">
        <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-[#18181B]">
              Student Banner Live Preview
            </h3>
            <span className="text-[11px] font-semibold text-[#71717A]">
              Dashboard Appearance
            </span>
          </div>

          {/* Student Banner Mockup */}
          <div className="rounded-2xl border border-[#EA580C] bg-[#F97316] p-5 text-[#18181B] space-y-3.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-3 py-1 text-[11px] font-semibold text-white tabular-nums">
              <Radio className="h-3 w-3 text-[#F97316]" aria-hidden="true" />
              <span>NEXT LIVE CLASS · STARTS IN 2H</span>
            </div>

            <div className="space-y-1">
              <h4 className="font-display text-lg font-bold leading-snug">
                IGCSE Mathematics · Extended Group A
              </h4>
              <p className="text-xs font-medium text-[#18181B]/85">
                Upcoming recurring slot: Monday, 5:00 PM
              </p>
            </div>

            <div className="pt-1">
              {isConfigured ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-4 py-2 text-xs font-semibold text-white">
                  <Video className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
                  <span>Join Live Session</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#18181B]/25 px-4 py-2 text-xs font-semibold text-[#18181B]/75">
                  <VideoOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Link not posted yet</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#F4F4F5] pt-3 flex items-center justify-between text-xs text-[#71717A]">
            <span>Active Link:</span>
            <span className="font-mono text-[#18181B] truncate max-w-[200px]">
              {state.meetingUrl || 'None set'}
            </span>
          </div>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onPreviewStudentView}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4338CA] hover:underline"
            >
              <span>Switch to Students &amp; Approvals tab</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
