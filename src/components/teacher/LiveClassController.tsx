import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Clock,
  Eraser,
  Link2,
  Radio,
  Send,
  Trash2,
  Video,
  VideoOff,
} from 'lucide-react';
import { Course, LiveSessionHero, PortalState } from '../../types/portal';
import { formatReadableDate } from '../../utils/formatters';

interface LiveClassControllerProps {
  state: PortalState;
  onPublishHero: (hero: Omit<LiveSessionHero, 'updatedAt'> | null) => void;
  onNotify: (msg: string) => void;
  onPreviewStudentView: () => void;
}

export const LiveClassController: React.FC<LiveClassControllerProps> = ({
  state,
  onPublishHero,
  onNotify,
  onPreviewStudentView,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    state.liveHero?.sessionId ?? ''
  );
  const [courseId, setCourseId] = useState<string>(
    state.liveHero?.courseId ?? state.courses[0]?.id ?? ''
  );
  const [status, setStatus] = useState<'live' | 'upcoming'>(
    state.liveHero?.status ?? 'upcoming'
  );
  const [badgeLabel, setBadgeLabel] = useState(
    state.liveHero?.badgeLabel ?? 'STARTS IN 2H'
  );
  const [classTitle, setClassTitle] = useState(
    state.liveHero?.classTitle ?? ''
  );
  const [batchName, setBatchName] = useState(
    state.liveHero?.batchName ?? ''
  );
  const [dateLabel, setDateLabel] = useState(
    state.liveHero?.dateLabel ?? 'Today'
  );
  const [timeLabel, setTimeLabel] = useState(
    state.liveHero?.timeLabel ?? '18:00 – 19:15'
  );
  const [timezone, setTimezone] = useState(
    state.liveHero?.timezone ?? 'GMT+4'
  );
  const [meetingUrl, setMeetingUrl] = useState(
    state.liveHero?.meetingUrl ?? ''
  );

  useEffect(() => {
    if (state.liveHero) {
      setSelectedSessionId(state.liveHero.sessionId ?? '');
      setCourseId(state.liveHero.courseId ?? state.courses[0]?.id ?? '');
      setStatus(state.liveHero.status);
      setBadgeLabel(state.liveHero.badgeLabel);
      setClassTitle(state.liveHero.classTitle);
      setBatchName(state.liveHero.batchName);
      setDateLabel(state.liveHero.dateLabel);
      setTimeLabel(state.liveHero.timeLabel);
      setTimezone(state.liveHero.timezone);
      setMeetingUrl(state.liveHero.meetingUrl);
    }
  }, [state.liveHero, state.courses]);

  const courseLookup: Record<string, Course> = {};
  for (const c of state.courses) {
    courseLookup[c.id] = c;
  }

  const handlePickSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const found = state.sessions.find((s) => s.id === sessionId);
    if (!found) return;
    const course = courseLookup[found.courseId];
    setCourseId(found.courseId);
    setClassTitle(found.topic);
    setBatchName(course ? `${course.title} · ${course.batchName}` : 'General Cohort');
    setDateLabel(formatReadableDate(found.date, true));
    setTimeLabel(`${found.startTime} – ${found.endTime}`);
    setMeetingUrl(found.meetingUrl);
    if (found.status === 'Live') {
      setStatus('live');
      setBadgeLabel('JOINING OPEN');
    } else {
      setStatus('upcoming');
      setBadgeLabel('STARTS IN 2H');
    }
  };

  const handlePickCourse = (cId: string) => {
    setCourseId(cId);
    const course = courseLookup[cId];
    if (course && !batchName) {
      setBatchName(`${course.title} · ${course.batchName}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classTitle.trim()) return;
    onPublishHero({
      sessionId: selectedSessionId || undefined,
      courseId: courseId || undefined,
      status,
      badgeLabel: badgeLabel.trim(),
      classTitle: classTitle.trim(),
      batchName: batchName.trim() || 'General Cohort',
      dateLabel: dateLabel.trim(),
      timeLabel: timeLabel.trim(),
      timezone: timezone.trim(),
      meetingUrl: meetingUrl.trim(),
    });
    onNotify('Published live class banner to Student Dashboard');
  };

  const handleClearHero = () => {
    onPublishHero(null);
    setClassTitle('');
    setBatchName('');
    setMeetingUrl('');
    setSelectedSessionId('');
    onNotify('Cleared live class banner from Student Dashboard');
  };

  const hasPreviewLink = Boolean(meetingUrl.trim());

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
      {/* Configuration Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 lg:col-span-7"
      >
        <div className="flex items-start justify-between border-b border-[#E7E5E4] pb-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#18181B]">
              Live Class &amp; Meeting Link Controller
            </h2>
            <p className="text-xs text-[#52525B]">
              Update the Student Dashboard hero banner and active Zoom / Google Meet room link in real time.
            </p>
          </div>

          {state.liveHero && (
            <button
              type="button"
              onClick={handleClearHero}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Banner</span>
            </button>
          )}
        </div>

        {/* Load from Scheduled Session */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="hero-session-picker"
              className="block text-xs font-semibold text-[#18181B]"
            >
              Load from Scheduled Session (Optional)
            </label>
            <select
              id="hero-session-picker"
              value={selectedSessionId}
              onChange={(e) => handlePickSession(e.target.value)}
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            >
              <option value="">Custom Hero Details</option>
              {state.sessions.map((s) => {
                const c = courseLookup[s.courseId];
                return (
                  <option key={s.id} value={s.id}>
                    {s.date} ({s.startTime}) · {c?.code ?? 'Class'} — {s.topic}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="hero-course-picker"
              className="block text-xs font-semibold text-[#18181B]"
            >
              Target Course (For Student Filtering)
            </label>
            <select
              id="hero-course-picker"
              value={courseId}
              onChange={(e) => handlePickCourse(e.target.value)}
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            >
              <option value="">All / Open to All</option>
              {state.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {c.batchName} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status & Badge Label */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-[#18181B]">Session State</span>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] p-1">
              <button
                type="button"
                onClick={() => {
                  setStatus('upcoming');
                  if (badgeLabel === 'JOINING OPEN' || !badgeLabel) {
                    setBadgeLabel('STARTS IN 2H');
                  }
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  status === 'upcoming'
                    ? 'bg-[#18181B] text-white'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('live');
                  if (badgeLabel === 'STARTS IN 2H' || !badgeLabel) {
                    setBadgeLabel('ROOM OPEN');
                  }
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  status === 'live'
                    ? 'bg-[#F97316] text-[#18181B]'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                Live Now
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="hero-badge-label" className="block text-xs font-semibold text-[#18181B]">
              Countdown / Lead Label
            </label>
            <input
              id="hero-badge-label"
              type="text"
              value={badgeLabel}
              onChange={(e) => setBadgeLabel(e.target.value)}
              placeholder="e.g. STARTS IN 2H"
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Class Title & Batch Name */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="hero-class-title" className="block text-xs font-semibold text-[#18181B]">
              Class Title
            </label>
            <input
              id="hero-class-title"
              type="text"
              required
              value={classTitle}
              onChange={(e) => setClassTitle(e.target.value)}
              placeholder="e.g. Quadratic Inequalities & Graph Transformations"
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="hero-batch-name" className="block text-xs font-semibold text-[#18181B]">
              Batch / Group Name
            </label>
            <input
              id="hero-batch-name"
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. IGCSE Mathematics · Extended Group A"
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Date, Time & Timezone */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="hero-date-label" className="block text-xs font-semibold text-[#18181B]">
              Display Date
            </label>
            <input
              id="hero-date-label"
              type="text"
              required
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              placeholder="Fri, Nov 20, 2026"
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="hero-time-label" className="block text-xs font-semibold text-[#18181B]">
              Time Window
            </label>
            <input
              id="hero-time-label"
              type="text"
              required
              value={timeLabel}
              onChange={(e) => setTimeLabel(e.target.value)}
              placeholder="18:00 – 19:15"
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm font-mono text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="hero-timezone" className="block text-xs font-semibold text-[#18181B]">
              Timezone
            </label>
            <input
              id="hero-timezone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="GMT+4 (Dubai)"
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Meeting Link */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="hero-meeting-url" className="block text-xs font-semibold text-[#18181B]">
              Meeting Link (Zoom / Google Meet)
            </label>
            {meetingUrl && (
              <button
                type="button"
                onClick={() => setMeetingUrl('')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#71717A] hover:text-[#18181B]"
              >
                <Eraser className="h-3 w-3" aria-hidden="true" />
                <span>Clear link</span>
              </button>
            )}
          </div>
          <div className="relative">
            <Link2
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
              aria-hidden="true"
            />
            <input
              id="hero-meeting-url"
              type="text"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] py-2.5 pl-10 pr-3.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-[#71717A]">
            Leave blank to show the disabled &ldquo;Link not posted yet&rdquo; state on the student banner.
          </p>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E5E4] pt-4">
          <button
            type="button"
            onClick={onPreviewStudentView}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4338CA] hover:underline"
          >
            <span>Switch to Student View</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A]"
          >
            <Send className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
            <span>Publish to Student Dashboard</span>
          </button>
        </div>
      </form>

      {/* Live Student Hero Preview */}
      <div className="space-y-4 lg:col-span-5">
        <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-[#18181B]">
              Student Banner Preview
            </h3>
            <span className="text-[11px] font-medium text-[#71717A]">
              {classTitle.trim() ? 'Live draft' : 'Empty'}
            </span>
          </div>

          {classTitle.trim() ? (
            <div className="rounded-2xl border border-[#EA580C] bg-[#F97316] p-5 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-3 py-1 text-[11px] font-semibold text-white tabular-nums">
                <Radio className="h-3 w-3 text-[#F97316]" aria-hidden="true" />
                <span>
                  {status === 'live' ? 'LIVE NOW' : 'NEXT LIVE CLASS'}
                  {badgeLabel.trim() ? ` · ${badgeLabel.trim()}` : ''}
                </span>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-display text-xl font-bold leading-snug text-[#18181B]">
                  {classTitle}
                </h4>
                <p className="text-xs font-semibold text-[#18181B]/85">
                  {batchName || 'Batch Name'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#18181B]/90 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  {dateLabel || 'Date TBA'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {timeLabel || 'Time TBA'} {timezone}
                </span>
              </div>

              <div className="pt-1">
                {hasPreviewLink ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-4 py-2 text-xs font-semibold text-white">
                    <Video className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
                    <span>Join Live Session</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#18181B]/25 px-4 py-2 text-xs font-semibold text-[#18181B]/75">
                    <VideoOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Link not posted yet</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E7E5E4] p-8 text-center text-xs text-[#71717A]">
              No active live banner published. Students will see the &ldquo;No live class currently scheduled&rdquo; state.
            </div>
          )}

          <p className="text-xs leading-relaxed text-[#71717A]">
            Students will only see this banner if they are enrolled in the target course.
          </p>
        </div>
      </div>
    </div>
  );
};
