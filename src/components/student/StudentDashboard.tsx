import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Download,
  Image as ImageIcon,
  Radio,
  UserX,
  Video,
  VideoOff,
} from 'lucide-react';
import { Course, MaterialType, PortalState, Student, StudentTab } from '../../types/portal';
import {
  calculateNextLiveClass,
  formatReadableDate,
  formatWeeklySlots,
} from '../../utils/formatters';
import { downloadDataUrl, formatFileSize } from '../../utils/fileHelpers';

interface StudentDashboardProps {
  state: PortalState;
  activeStudent: Student | null;
  onNavigateTab: (tab: StudentTab) => void;
  onSelectCourseForSchedule: (courseId: string) => void;
  onLogActivity: (studentId: string, action: string, details?: string) => void;
  onSwitchToTeacher: () => void;
}

const ACCENT_STYLES: Record<
  Course['accentColor'],
  { headerBg: string; headerText: string; badgeText: string; ringHover: string }
> = {
  indigo: {
    headerBg: 'bg-[#4338CA]',
    headerText: 'text-white',
    badgeText: 'text-[#4338CA]',
    ringHover: 'hover:border-[#4338CA]/40',
  },
  orange: {
    headerBg: 'bg-[#EA580C]',
    headerText: 'text-white',
    badgeText: 'text-[#C2410C]',
    ringHover: 'hover:border-[#EA580C]/40',
  },
  teal: {
    headerBg: 'bg-[#0F766E]',
    headerText: 'text-white',
    badgeText: 'text-[#0F766E]',
    ringHover: 'hover:border-[#0F766E]/40',
  },
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  state,
  activeStudent,
  onNavigateTab,
  onSelectCourseForSchedule,
  onLogActivity,
  onSwitchToTeacher,
}) => {
  const [materialFilter, setMaterialFilter] = useState<'all' | MaterialType>('all');

  // Strict filtering by enrolled courses
  const enrolledCourseIds = activeStudent?.enrolledCourseIds ?? [];

  const enrolledCourses = useMemo(() => {
    return state.courses.filter((c) => enrolledCourseIds.includes(c.id));
  }, [state.courses, enrolledCourseIds]);

  const enrolledSessions = useMemo(() => {
    return state.sessions.filter((s) => enrolledCourseIds.includes(s.courseId));
  }, [state.sessions, enrolledCourseIds]);

  const enrolledMaterials = useMemo(() => {
    return state.materials.filter((m) => enrolledCourseIds.includes(m.courseId));
  }, [state.materials, enrolledCourseIds]);

  const enrolledAssignments = useMemo(() => {
    return state.assignments.filter((a) => enrolledCourseIds.includes(a.courseId));
  }, [state.assignments, enrolledCourseIds]);

  // Compute pending assignments for THIS student
  const pendingAssignmentsCount = useMemo(() => {
    if (!activeStudent) return 0;
    return enrolledAssignments.filter((asg) => {
      const sub = state.submissions.find(
        (s) => s.assignmentId === asg.id && s.studentId === activeStudent.id
      );
      return !sub || sub.status === 'Pending';
    }).length;
  }, [enrolledAssignments, state.submissions, activeStudent]);

  // Counts per course
  const courseCounts = useMemo(() => {
    const map: Record<string, { upcoming: number; materials: number }> = {};
    for (const c of enrolledCourses) {
      map[c.id] = { upcoming: 0, materials: 0 };
    }
    for (const s of enrolledSessions) {
      if (s.status !== 'Completed' && map[s.courseId]) {
        map[s.courseId].upcoming += 1;
      }
    }
    for (const m of enrolledMaterials) {
      if (map[m.courseId]) {
        map[m.courseId].materials += 1;
      }
    }
    return map;
  }, [enrolledCourses, enrolledSessions, enrolledMaterials]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    const sorted = [...enrolledMaterials].sort((a, b) => b.date.localeCompare(a.date));
    if (materialFilter === 'all') return sorted;
    return sorted.filter((m) => m.type === materialFilter);
  }, [enrolledMaterials, materialFilter]);

  const courseLookup = useMemo(() => {
    const map: Record<string, Course> = {};
    for (const c of state.courses) {
      map[c.id] = c;
    }
    return map;
  }, [state.courses]);

  // When no students exist in the system
  if (!activeStudent) {
    return (
      <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] px-6 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8F7F4] text-[#71717A]">
          <UserX className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-[#18181B]">
          No Student Profiles Created Yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#52525B]">
          This tutoring portal is starting on a clean slate. Switch to Teacher Admin to create student accounts, set up courses, and schedule live classes.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onSwitchToTeacher}
            className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A]"
          >
            <span>Open Teacher Admin</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Automatically calculate next live class from enrolled courses' weekly timetable slots
  const calculatedNext = useMemo(() => {
    return calculateNextLiveClass(enrolledCourses);
  }, [enrolledCourses]);

  const meetingUrl = state.meetingUrl || state.liveHero?.meetingUrl || '';
  const hasMeetingLink = Boolean(meetingUrl && meetingUrl.trim().length > 0);
  const firstName = activeStudent.name.split(' ')[0];

  return (
    <div className="space-y-8">
      {/* Header Row: Personalized Greeting + 3 Metric Stat Pills */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-[#71717A] tabular-nums">
            {activeStudent.gradeLevel} · Today
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#18181B] sm:text-3xl text-balance">
            Hi {firstName} — here&apos;s your learning overview
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('schedule')}
            className="group flex items-center gap-3 rounded-full border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-left transition-colors duration-150 hover:border-[#4338CA]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA]"
          >
            <span className="font-display text-base font-bold text-[#18181B] tabular-nums">
              {enrolledCourses.length}
            </span>
            <span className="text-xs font-medium text-[#52525B] whitespace-nowrap">
              Active Courses
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('assignments')}
            className="group flex items-center gap-3 rounded-full border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-left transition-colors duration-150 hover:border-[#F97316]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            <span className="font-display text-base font-bold text-[#C2410C] tabular-nums">
              {pendingAssignmentsCount}
            </span>
            <span className="text-xs font-medium text-[#52525B] whitespace-nowrap">
              Pending Assignments
            </span>
          </button>

          <a
            href="#study-materials"
            className="group flex items-center gap-3 rounded-full border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-left transition-colors duration-150 hover:border-[#4338CA]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA]"
          >
            <span className="font-display text-base font-bold text-[#4338CA] tabular-nums">
              {enrolledMaterials.length}
            </span>
            <span className="text-xs font-medium text-[#52525B] whitespace-nowrap">
              Study Materials
            </span>
          </a>
        </div>
      </section>

      {/* Next Live Class Hero Banner (Automatically Calculated from Weekly Timetable or Fallback) */}
      {calculatedNext ? (
        <section
          aria-label="Next live class"
          className="relative overflow-hidden rounded-3xl border border-[#EA580C] bg-[#F97316] p-6 sm:p-8 shadow-sm"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white tabular-nums">
                <Radio
                  className={`h-3.5 w-3.5 text-[#F97316] ${
                    calculatedNext.isLiveNow ? 'animate-pulse' : ''
                  }`}
                  aria-hidden="true"
                />
                <span>
                  {calculatedNext.isLiveNow ? 'LIVE NOW' : 'NEXT LIVE CLASS'} ·{' '}
                  {calculatedNext.countdownLabel.toUpperCase()}
                </span>
              </div>

              <h2 className="font-display text-2xl font-bold tracking-tight text-[#18181B] sm:text-[32px] sm:leading-[1.15] text-balance">
                {calculatedNext.course.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-[#18181B]/90">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-[#18181B]" aria-hidden="true" />
                  <span>
                    {calculatedNext.course.batchName} ({calculatedNext.course.code})
                  </span>
                </span>
                <span aria-hidden="true" className="text-[#18181B]/45">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Calendar className="h-4 w-4 text-[#18181B]" aria-hidden="true" />
                  <span>{calculatedNext.displayDayTime}</span>
                </span>
                <span aria-hidden="true" className="text-[#18181B]/45">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Clock className="h-4 w-4 text-[#18181B]" aria-hidden="true" />
                  <span>{calculatedNext.durationLabel}</span>
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
              {hasMeetingLink ? (
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    onLogActivity(
                      activeStudent.id,
                      'Clicked Join Live Class',
                      `${calculatedNext.course.title} · ${calculatedNext.course.batchName}`
                    )
                  }
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#18181B] px-6 py-3.5 text-sm font-semibold text-white transition-transform duration-150 hover:bg-[#27272A] active:scale-[0.99] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B] shadow-md"
                >
                  <Video className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
                  <span>Join Live Session</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2.5 rounded-full bg-[#18181B]/25 px-6 py-3.5 text-sm font-semibold text-[#18181B]/75 whitespace-nowrap shrink-0"
                >
                  <VideoOff className="h-4 w-4" aria-hidden="true" />
                  <span>Link not posted yet</span>
                </button>
              )}
              <p className="text-xs font-medium text-[#18181B]/80">
                {hasMeetingLink
                  ? 'Opens permanent video classroom in a new tab'
                  : 'Your tutor will save the classroom meeting link shortly'}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section
          aria-label="No live class scheduled"
          className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-7 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#71717A]">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>NO LIVE CLASS CURRENTLY SCHEDULED</span>
              </div>
              <h2 className="font-display text-lg font-bold text-[#18181B]">
                {enrolledCourses.length === 0
                  ? 'Enroll in courses to see live lectures'
                  : 'No upcoming live sessions posted for your courses'}
              </h2>
              <p className="text-xs text-[#52525B]">
                Your tutor will configure your batch weekly schedule and save the video classroom link.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('schedule')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-4 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#E7E5E4]/60 whitespace-nowrap shrink-0"
            >
              <span>View Full Schedule</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* 2-Column Main Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left Column: My Courses / Batches */}
        <section aria-label="My courses" className="space-y-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-tight text-[#18181B]">
              My Courses &amp; Batches
            </h2>
            {enrolledCourses.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('schedule')}
                className="text-xs font-semibold text-[#4338CA] hover:underline whitespace-nowrap shrink-0"
              >
                Full Schedule
              </button>
            )}
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] px-5 py-10 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-[#A1A1AA]" />
              <p className="mt-3 text-sm font-semibold text-[#18181B]">
                You haven&apos;t been enrolled in any courses yet
              </p>
              <p className="mt-1 text-xs text-[#71717A]">
                Once your tutor enrolls you in an IGCSE or AS Level batch, your courses and materials will appear here.
              </p>
              <button
                type="button"
                onClick={onSwitchToTeacher}
                className="mt-4 rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-1.5 text-xs font-semibold text-[#18181B] hover:bg-[#E7E5E4]/60"
              >
                Manage Enrollments in Teacher Admin
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {enrolledCourses.map((course) => {
                const accent = ACCENT_STYLES[course.accentColor];
                const counts = courseCounts[course.id] ?? { upcoming: 0, materials: 0 };

                return (
                  <article
                    key={course.id}
                    className={`overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] transition-colors duration-150 ${accent.ringHover}`}
                  >
                    <div className={`${accent.headerBg} ${accent.headerText} px-5 py-3.5`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold tracking-wider uppercase opacity-90">
                          {course.code}
                        </span>
                        <span className="text-xs font-medium opacity-90 whitespace-nowrap">
                          {course.instructor}
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-base font-bold leading-snug">
                        {course.title} · {course.batchName}
                      </h3>
                    </div>

                    <div className="space-y-4 p-5">
                      {(course.scheduleCadence ||
                        (course.weeklySlots && course.weeklySlots.length > 0)) && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-[#FED7AA]/80 bg-[#FFF7ED] px-2.5 py-1 text-xs font-semibold text-[#C2410C] w-fit">
                          <Calendar className="h-3.5 w-3.5 text-[#EA580C]" />
                          <span>
                            {course.scheduleCadence ||
                              formatWeeklySlots(course.weeklySlots || [])}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-[#F4F4F5] pt-3.5">
                        <div className="flex items-center gap-4 text-xs text-[#52525B] tabular-nums">
                          <span>
                            <strong className="font-semibold text-[#18181B]">
                              {counts.upcoming}
                            </strong>{' '}
                            upcoming {counts.upcoming === 1 ? 'class' : 'classes'}
                          </span>
                          <span aria-hidden="true" className="text-[#D4D4D8]">
                            ·
                          </span>
                          <span>
                            <strong className="font-semibold text-[#18181B]">
                              {counts.materials}
                            </strong>{' '}
                            {counts.materials === 1 ? 'material' : 'materials'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectCourseForSchedule(course.id)}
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${accent.badgeText} hover:underline whitespace-nowrap shrink-0`}
                        >
                          <span>View Classes</span>
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Notes & Recordings */}
        <section
          id="study-materials"
          aria-label="Notes and recordings"
          className="space-y-4 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight text-[#18181B]">
              Notes &amp; Recordings
            </h2>

            {enrolledMaterials.length > 0 && (
              <div
                role="group"
                aria-label="Filter study materials"
                className="flex items-center gap-1 rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] p-1"
              >
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'recording', label: 'Recordings' },
                    { id: 'notes', label: 'PDF Notes' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMaterialFilter(option.id)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      materialFilter === option.id
                        ? 'bg-[#18181B] text-white'
                        : 'text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF]">
            {filteredMaterials.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-[#A1A1AA]" />
                <p className="mt-3 text-sm font-semibold text-[#18181B]">
                  No study materials available
                </p>
                <p className="mt-1 text-xs text-[#71717A]">
                  {enrolledCourses.length === 0
                    ? 'Enroll in courses to access lecture recordings and revision notes.'
                    : 'Notes and class recordings uploaded by your tutor will appear here.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#E7E5E4]">
                {filteredMaterials.map((item) => {
                  const course = courseLookup[item.courseId];
                  const isRecording = item.type === 'recording';
                  const attachment = item.attachment;
                  const fileName = attachment?.fileName ?? '';
                  const fileType = attachment?.fileType.toLowerCase() ?? '';
                  const isImage = fileType.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(fileName);
                  const isVideo = fileType.startsWith('video/') || fileType.startsWith('audio/') || isRecording;
                  const attachmentLabel = isImage ? 'Image' : isVideo ? 'Video / Recording' : fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Document';
                  const hasUrl = Boolean(item.url);

                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 px-5 py-4 transition-colors duration-150 hover:bg-[#FAF9F7] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            isRecording
                              ? 'border-[#F97316]/25 bg-[#FFF7ED] text-[#C2410C]'
                              : 'border-[#4338CA]/20 bg-[#EEF2FF] text-[#4338CA]'
                          }`}
                        >
                          {isRecording ? (
                            <Video className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          )}
                        </span>

                        <div className="min-w-0 space-y-1">
                          <h3 className="text-sm font-semibold text-[#18181B] leading-snug">
                            {item.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#71717A] tabular-nums">
                            <span className="font-medium text-[#52525B]">
                              {course ? `${course.title} · ${course.batchName}` : 'General'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{formatReadableDate(item.date, false)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.metaInfo}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-12 sm:pl-0">
                        {attachment && (
                          <>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-medium text-[#52525B]">
                              {isImage ? <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> : isVideo ? <Video className="h-3.5 w-3.5" aria-hidden="true" /> : <FileText className="h-3.5 w-3.5" aria-hidden="true" />}
                              {attachmentLabel}
                              <span className="text-[#A1A1AA]">·</span>
                              {formatFileSize(attachment.fileSize)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                downloadDataUrl(attachment.fileData, attachment.fileName);
                                onLogActivity(activeStudent.id, 'Downloaded Note/Recording', item.title);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#18181B] transition-colors hover:border-[#18181B] hover:bg-[#18181B] hover:text-white"
                            >
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                              Download
                            </button>
                          </>
                        )}
                        {!attachment && hasUrl && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => onLogActivity(activeStudent.id, 'Opened Note/Recording', item.title)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#18181B] transition-colors duration-150 hover:border-[#18181B] hover:bg-[#18181B] hover:text-white whitespace-nowrap shrink-0"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        )}
                        {!attachment && !hasUrl && (
                          <span className="inline-flex items-center rounded-lg border border-[#E7E5E5] bg-[#F8F7F4] px-3.5 py-2 text-xs font-medium text-[#71717A]">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
