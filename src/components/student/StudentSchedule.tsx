import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  List,
  Radio,
  Video,
  VideoOff,
} from 'lucide-react';
import { Course, PortalState, ScheduleSession, SessionStatus, Student } from '../../types/portal';
import {
  addDays,
  DAY_OPTIONS,
  determineSessionStatus,
  formatEndTime,
  formatReadableDate,
  formatShortDay,
  formatWeeklySlots,
  getStartOfWeekMonday,
  parseDurationMinutes,
  toIsoDateString,
} from '../../utils/formatters';

interface StudentScheduleProps {
  state: PortalState;
  activeStudent: Student | null;
  selectedCourseFilter: string;
  onCourseFilterChange: (courseId: string) => void;
  onLogActivity: (studentId: string, action: string, details?: string) => void;
  onSwitchToTeacher: () => void;
}

const STATUS_BADGE: Record<
  SessionStatus,
  { icon: React.ReactNode; className: string; label: string }
> = {
  Live: {
    icon: <Radio className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />,
    className: 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]',
    label: 'Live',
  },
  Upcoming: {
    icon: <Clock className="h-3.5 w-3.5 text-[#4338CA]" aria-hidden="true" />,
    className: 'bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]',
    label: 'Upcoming',
  },
  Completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />,
    className: 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]',
    label: 'Completed',
  },
};

export const StudentSchedule: React.FC<StudentScheduleProps> = ({
  state,
  activeStudent,
  selectedCourseFilter,
  onCourseFilterChange,
  onLogActivity,
  onSwitchToTeacher,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');
  const [statusFilter, setStatusFilter] = useState<'All' | SessionStatus>('All');
  const [weekAnchor, setWeekAnchor] = useState<Date>(() =>
    getStartOfWeekMonday(new Date())
  );

  const enrolledCourseIds = activeStudent?.enrolledCourseIds ?? [];

  const enrolledCourses = useMemo(() => {
    return state.courses.filter((c) => enrolledCourseIds.includes(c.id));
  }, [state.courses, enrolledCourseIds]);

  const courseLookup = useMemo(() => {
    const map: Record<string, Course> = {};
    for (const c of state.courses) {
      map[c.id] = c;
    }
    return map;
  }, [state.courses]);

  // Automatically synthesize recurring sessions from enrolled courses' weekly timetable slots
  const synthesizedSessions = useMemo(() => {
    const result: ScheduleSession[] = [];
    const refNow = new Date();

    // In list view, generate 4 weeks starting from weekAnchor so student has a rich schedule view.
    // In week view, generate for the currently viewed 7-day weekAnchor.
    const weeksToGenerate = viewMode === 'list' ? 4 : 1;

    for (let w = 0; w < weeksToGenerate; w++) {
      const mondayForWeek = addDays(weekAnchor, w * 7);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = addDays(mondayForWeek, dayOffset);
        const isoDate = toIsoDateString(dayDate);
        const dayName = DAY_OPTIONS[dayOffset];

        for (const course of enrolledCourses) {
          const slots = course.weeklySlots || [];
          for (const slot of slots) {
            if (slot.day === dayName && slot.startTime) {
              const durationMin =
                slot.durationMinutes || parseDurationMinutes(slot.duration || '1 hour');
              const endT = formatEndTime(slot.startTime, durationMin);
              const status = determineSessionStatus(isoDate, slot.startTime, durationMin, refNow);

              result.push({
                id: `auto-${course.id}-${isoDate}-${slot.startTime.replace(/[^a-zA-Z0-9]/g, '')}`,
                courseId: course.id,
                topic: `${course.title} · Live Lecture`,
                date: isoDate,
                startTime: slot.startTime,
                endTime: endT,
                status,
                meetingUrl: state.meetingUrl || '',
              });
            }
          }
        }
      }
    }

    return result;
  }, [enrolledCourses, weekAnchor, viewMode, state.meetingUrl]);

  // Merge manual sessions and synthesized recurring weekly slots (manual entries take priority)
  const studentSessions = useMemo(() => {
    const manual = state.sessions.filter((s) => enrolledCourseIds.includes(s.courseId));
    const manualKeys = new Set(
      manual.map((s) => `${s.courseId}-${s.date}-${s.startTime.trim().toLowerCase()}`)
    );

    const nonDuplicateSynthesized = synthesizedSessions.filter(
      (s) => !manualKeys.has(`${s.courseId}-${s.date}-${s.startTime.trim().toLowerCase()}`)
    );

    return [...manual, ...nonDuplicateSynthesized];
  }, [state.sessions, enrolledCourseIds, synthesizedSessions]);

  const filteredSessions = useMemo(() => {
    return [...studentSessions]
      .filter((s) =>
        selectedCourseFilter === 'all' ? true : s.courseId === selectedCourseFilter
      )
      .filter((s) => (statusFilter === 'All' ? true : s.status === statusFilter))
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  }, [studentSessions, selectedCourseFilter, statusFilter]);

  const todayIso = toIsoDateString(new Date());

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekAnchor, i);
      const iso = toIsoDateString(d);
      return {
        iso,
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday: iso === todayIso,
      };
    });
  }, [weekAnchor, todayIso]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, ScheduleSession[]> = {};
    for (const s of filteredSessions) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [filteredSessions]);

  const weekRangeLabel = `${weekDays[0].month} ${weekDays[0].dayNum} – ${weekDays[6].month} ${weekDays[6].dayNum}, ${weekAnchor.getFullYear()}`;

  if (!activeStudent) {
    return (
      <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] px-6 py-14 text-center">
        <Calendar className="mx-auto h-8 w-8 text-[#A1A1AA]" />
        <p className="mt-3 text-sm font-semibold text-[#18181B]">No student profile selected</p>
        <p className="mt-1 text-xs text-[#71717A]">
          Create a student profile in Teacher Admin to view class schedules.
        </p>
        <button
          type="button"
          onClick={onSwitchToTeacher}
          className="mt-4 rounded-lg bg-[#18181B] px-4 py-2 text-xs font-semibold text-white"
        >
          Go to Teacher Admin
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#18181B]">
            Class Schedule
          </h1>
          <p className="text-sm text-[#52525B]">
            Weekly recurring lectures, timings, and direct classroom links for your enrolled courses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Course Filter */}
          <label className="sr-only" htmlFor="schedule-course-filter">
            Filter by course
          </label>
          <select
            id="schedule-course-filter"
            value={selectedCourseFilter}
            onChange={(e) => onCourseFilterChange(e.target.value)}
            disabled={enrolledCourses.length === 0}
            className="rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA]"
          >
            <option value="all">
              {enrolledCourses.length === 0 ? 'No Enrolled Courses' : 'All My Courses'}
            </option>
            {enrolledCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} · {c.batchName}
              </option>
            ))}
          </select>

          {/* List vs Week View Toggle */}
          <div
            role="group"
            aria-label="Schedule layout view"
            className="flex items-center rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] p-0.5"
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'list'
                  ? 'bg-[#18181B] text-white'
                  : 'text-[#52525B] hover:text-[#18181B]'
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'week'
                  ? 'bg-[#18181B] text-white'
                  : 'text-[#52525B] hover:text-[#18181B]'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Week</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recurring Weekly Timetable Overview Card */}
      {enrolledCourses.length > 0 && (
        <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#F4F4F5] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#4338CA]" />
                <h2 className="font-display text-sm font-bold text-[#18181B]">
                  Weekly Recurring Timetable
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-[#71717A]">
                Structured class slots populated directly from your enrolled batch timetables.
              </p>
            </div>

            {state.meetingUrl ? (
              <a
                href={state.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  onLogActivity(
                    activeStudent.id,
                    'Joined Permanent Classroom Room',
                    'Direct from schedule overview'
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-[#18181B] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A] whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                <Video className="h-3.5 w-3.5 text-[#F97316]" />
                <span>Join Permanent Room</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#71717A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4D4D8]" />
                Permanent Room Pending
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((c) => {
              const formattedSchedule =
                c.weeklySlots && c.weeklySlots.length > 0
                  ? formatWeeklySlots(c.weeklySlots)
                  : c.scheduleCadence || 'Schedule to be announced';

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#4338CA] uppercase tracking-wider">
                      {c.code}
                    </span>
                    <span className="text-[11px] font-semibold text-[#52525B]">
                      {c.classesPerWeek || c.weeklySlots?.length || 1}{' '}
                      {c.classesPerWeek === 1 ? 'class' : 'classes'} / wk
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#18181B] line-clamp-1">{c.title}</h3>
                    <p className="text-[11px] text-[#71717A]">{c.batchName}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18181B]">
                    <Clock className="h-3.5 w-3.5 text-[#F97316] shrink-0" />
                    <span className="truncate">{formattedSchedule}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E5E4] pb-4">
        <div role="group" aria-label="Filter by session status" className="flex flex-wrap gap-1.5">
          {(['All', 'Live', 'Upcoming', 'Completed'] as const).map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#4338CA] text-white'
                    : 'bg-[#FFFFFF] text-[#52525B] border border-[#E7E5E4] hover:text-[#18181B]'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        <p className="text-xs font-medium text-[#71717A] tabular-nums">
          Showing {filteredSessions.length}{' '}
          {filteredSessions.length === 1 ? 'session' : 'sessions'}
        </p>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] px-6 py-14 text-center">
            <Calendar className="mx-auto h-8 w-8 text-[#A1A1AA]" />
            <p className="mt-3 text-sm font-semibold text-[#18181B]">
              No classes match your current schedule view
            </p>
            <p className="mt-1 text-xs text-[#71717A]">
              {enrolledCourses.length === 0
                ? 'You have not been enrolled in any courses yet. Ask your tutor to add you to a batch.'
                : 'Upcoming lecture dates and Google Meet / Zoom links will appear once course schedule slots are configured.'}
            </p>
            {selectedCourseFilter !== 'all' || statusFilter !== 'All' ? (
              <button
                type="button"
                onClick={() => {
                  onCourseFilterChange('all');
                  setStatusFilter('All');
                }}
                className="mt-4 rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-4 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#E7E5E4]/60"
              >
                Reset Filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => {
              const course = courseLookup[session.courseId];
              const badge = STATUS_BADGE[session.status];
              const short = formatShortDay(session.date);
              const effectiveMeetingUrl =
                session.meetingUrl || state.meetingUrl || '';
              const hasLink = Boolean(
                effectiveMeetingUrl && effectiveMeetingUrl.trim().length > 0
              );
              const isToday = session.date === todayIso;

              return (
                <article
                  key={session.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-4 transition-colors duration-150 hover:border-[#D4D4D8] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Date Tile */}
                    <div
                      className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl border py-2 text-center tabular-nums ${
                        isToday
                          ? 'border-[#F97316] bg-[#FFF7ED] text-[#C2410C]'
                          : 'border-[#E7E5E4] bg-[#F8F7F4] text-[#18181B]'
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
                        {short.weekday}
                      </span>
                      <span className="font-display text-lg font-bold leading-tight">
                        {short.day}
                      </span>
                      <span className="text-[10px] font-medium opacity-75">{short.month}</span>
                    </div>

                    {/* Session Details */}
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-xs font-medium text-[#52525B]">
                          {course ? `${course.title} · ${course.batchName}` : 'General Session'}
                        </span>
                      </div>

                      <h2 className="font-display text-base font-bold text-[#18181B] leading-snug">
                        {session.topic}
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#71717A] tabular-nums">
                        <span>{formatReadableDate(session.date, false)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-medium text-[#52525B]">
                          {session.startTime} – {session.endTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Join Action */}
                  <div className="flex shrink-0 items-center pl-[72px] sm:pl-0">
                    {session.status === 'Completed' ? (
                      hasLink ? (
                        <a
                          href={effectiveMeetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            onLogActivity(
                              activeStudent.id,
                              'Opened Completed Session Link',
                              session.topic
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#52525B] transition-colors hover:border-[#18181B] hover:text-[#18181B] whitespace-nowrap shrink-0"
                        >
                          <span>Room Link</span>
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-xs font-medium text-[#71717A]">Session ended</span>
                      )
                    ) : hasLink ? (
                      <a
                        href={effectiveMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          onLogActivity(
                            activeStudent.id,
                            'Clicked Join Live Class',
                            session.topic
                          )
                        }
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          session.status === 'Live'
                            ? 'bg-[#F97316] text-[#18181B] hover:bg-[#EA580C] hover:text-white'
                            : 'bg-[#18181B] text-white hover:bg-[#27272A]'
                        }`}
                      >
                        <Video className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Join Meeting</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-[#E7E5E4] bg-[#F8F7F4] px-4 py-2 text-xs font-medium text-[#71717A] whitespace-nowrap shrink-0"
                      >
                        <VideoOff className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Link not posted yet</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        /* Interactive Weekly Grid View */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] px-5 py-3.5">
            <h2 className="font-display text-sm font-bold text-[#18181B] tabular-nums">
              Week of {weekRangeLabel}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setWeekAnchor(getStartOfWeekMonday(new Date()))
                }
                className="rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-1.5 text-xs font-semibold text-[#18181B] hover:bg-[#E7E5E4]/60"
              >
                Current Week
              </button>
              <button
                type="button"
                aria-label="Previous week"
                onClick={() => setWeekAnchor((prev) => addDays(prev, -7))}
                className="rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] p-1.5 text-[#18181B] hover:bg-[#F8F7F4]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next week"
                onClick={() => setWeekAnchor((prev) => addDays(prev, 7))}
                className="rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] p-1.5 text-[#18181B] hover:bg-[#F8F7F4]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {weekDays.map((day) => {
              const daySessions = sessionsByDate[day.iso] ?? [];
              return (
                <div
                  key={day.iso}
                  className={`flex min-h-[190px] flex-col rounded-2xl border bg-[#FFFFFF] p-3.5 ${
                    day.isToday ? 'border-[#F97316]' : 'border-[#E7E5E4]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-2.5">
                    <span className="text-xs font-semibold text-[#71717A]">{day.weekday}</span>
                    <span
                      className={`font-display text-sm font-bold tabular-nums ${
                        day.isToday
                          ? 'rounded-md bg-[#F97316] px-2 py-0.5 text-[#18181B]'
                          : 'text-[#18181B]'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                  </div>

                  <div className="mt-3 flex-1 space-y-2.5">
                    {daySessions.length === 0 ? (
                      <p className="pt-6 text-center text-[11px] text-[#A1A1AA]">No classes</p>
                    ) : (
                      daySessions.map((sess) => {
                        const course = courseLookup[sess.courseId];
                        const badge = STATUS_BADGE[sess.status];
                        const effectiveMeetingUrl =
                          sess.meetingUrl || state.meetingUrl || '';
                        const hasLink = Boolean(
                          effectiveMeetingUrl && effectiveMeetingUrl.trim().length > 0
                        );

                        return (
                          <div
                            key={sess.id}
                            className="space-y-1.5 rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] p-2.5"
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-semibold">
                              <span className="font-mono text-[#52525B] tabular-nums">
                                {sess.startTime}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[#18181B]">
                                {badge.icon}
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-[#18181B] leading-snug line-clamp-2">
                              {sess.topic}
                            </p>
                            <p className="text-[11px] text-[#71717A] truncate">
                              {course?.code ?? 'Class'}
                            </p>
                            {hasLink && sess.status !== 'Completed' ? (
                              <a
                                href={effectiveMeetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  onLogActivity(
                                    activeStudent.id,
                                    'Clicked Join Live Class',
                                    sess.topic
                                  )
                                }
                                className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#18181B] px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-[#27272A]"
                              >
                                <span>Join</span>
                                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                              </a>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
