import React, { useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  FolderOpen,
  Link2,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import {
  Assignment,
  AssignmentStatus,
  Course,
  PortalState,
  Student,
  SubmissionSaveResult,
  UploadedFileMeta,
} from '../../types/portal';
import { formatReadableDate } from '../../utils/formatters';
import { downloadDataUrl, formatFileSize, readFileAsDataUrl } from '../../utils/fileHelpers';

interface StudentAssignmentsProps {
  state: PortalState;
  activeStudent: Student | null;
  submissionsReady: boolean;
  submissionLoadError: string | null;
  onRefreshSubmissions: () => void;
  onSubmitAssignment: (
    assignmentId: string,
    studentId: string,
    submissionUrl: string,
    submissionNote: string,
    attachment?: UploadedFileMeta
  ) => Promise<SubmissionSaveResult>;
  onRetractSubmission: (assignmentId: string, studentId: string) => void;
  onNotify: (msg: string) => void;
  onSwitchToTeacher: () => void;
  onNavigateTab: (tab: 'photo-to-pdf') => void;
}

const ASSIGNMENT_STATUS_META: Record<
  AssignmentStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  Pending: {
    label: 'Pending',
    icon: <Clock className="h-3.5 w-3.5 text-[#C2410C]" aria-hidden="true" />,
    className: 'border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]',
  },
  Submitted: {
    label: 'Submitted',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-[#4338CA]" aria-hidden="true" />,
    className: 'border-[#C7D2FE] bg-[#EEF2FF] text-[#4338CA]',
  },
  Graded: {
    label: 'Graded',
    icon: <Award className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />,
    className: 'border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]',
  },
};

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({
  state,
  activeStudent,
  submissionsReady,
  submissionLoadError,
  onRefreshSubmissions,
  onSubmitAssignment,
  onRetractSubmission,
  onNotify,
  onSwitchToTeacher,
  onNavigateTab,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | AssignmentStatus>('All');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [activeModalAssignment, setActiveModalAssignment] = useState<Assignment | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionAttachment, setSubmissionAttachment] = useState<UploadedFileMeta | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Strict filtering by enrolled courses
  const studentAssignments = useMemo(() => {
    return state.assignments.filter((a) => enrolledCourseIds.includes(a.courseId));
  }, [state.assignments, enrolledCourseIds]);

  // Map each assignment with this student's specific submission
  const assignmentsWithStudentStatus = useMemo(() => {
    if (!activeStudent) return [];
    return studentAssignments.map((asg) => {
      const sub = state.submissions.find(
        (s) => s.assignmentId === asg.id && s.studentId === activeStudent.id
      );
      return {
        ...asg,
        status: (sub ? sub.status : 'Pending') as AssignmentStatus,
        submissionUrl: sub?.submissionUrl,
        submissionNote: sub?.submissionNote,
        submissionAttachment: sub?.attachment,
        submittedAt: sub?.submittedAt,
        grade: sub?.grade,
        teacherFeedback: sub?.teacherFeedback,
      };
    });
  }, [studentAssignments, state.submissions, activeStudent]);

  const counts = useMemo(() => {
    const res = { All: assignmentsWithStudentStatus.length, Pending: 0, Submitted: 0, Graded: 0 };
    for (const a of assignmentsWithStudentStatus) {
      res[a.status] += 1;
    }
    return res;
  }, [assignmentsWithStudentStatus]);

  const filteredAssignments = useMemo(() => {
    return assignmentsWithStudentStatus
      .filter((a) => (statusFilter === 'All' ? true : a.status === statusFilter))
      .filter((a) => (courseFilter === 'all' ? true : a.courseId === courseFilter));
  }, [assignmentsWithStudentStatus, statusFilter, courseFilter]);

  if (!activeStudent) {
    return (
      <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] px-6 py-14 text-center">
        <FolderOpen className="mx-auto h-8 w-8 text-[#A1A1AA]" />
        <p className="mt-3 text-sm font-semibold text-[#18181B]">No student profile selected</p>
        <p className="mt-1 text-xs text-[#71717A]">
          Create a student profile in Teacher Admin to access assignments and submission portals.
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

  const openSubmitModal = (assignment: Assignment & { submissionUrl?: string; submissionNote?: string }) => {
    setActiveModalAssignment(assignment);
    setSubmissionUrl(assignment.submissionUrl ?? '');
    setSubmissionNote(assignment.submissionNote ?? '');
    setSubmissionAttachment(null);
    setUploadError('');
    setSubmissionError('');
  };

  const handleSubmissionFile = async (file?: File) => {
    setUploadError('');
    setSubmissionAttachment(null);
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Choose a PDF smaller than 20 MB.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please upload a PDF file. If you have phone photos, convert them with Photo to PDF first.');
      return;
    }
    try {
      const header = new TextDecoder().decode(await file.slice(0, 1024).arrayBuffer());
      if (!header.includes('%PDF-')) {
        setUploadError('This file does not appear to be a valid PDF.');
        return;
      }
      const fileData = await readFileAsDataUrl(file);
      setSubmissionAttachment({ fileName: file.name, fileSize: file.size, fileType: 'application/pdf', fileData });
    } catch {
      setUploadError('We could not read this file. Please choose a valid PDF and try again.');
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalAssignment || !activeStudent || isSubmitting) return;
    if (!submissionAttachment) {
      setUploadError('Upload your completed workings as a PDF before submitting.');
      return;
    }

    setSubmissionError('');
    setIsSubmitting(true);
    try {
      const result = await onSubmitAssignment(activeModalAssignment.id, activeStudent.id, '', submissionNote, submissionAttachment);
      if (!result.success) {
        setSubmissionError(result.error || 'Your submission could not be saved. Please try again.');
        return;
      }
      onNotify(result.warning || `Submitted "${activeModalAssignment.title}"`);
      setActiveModalAssignment(null);
      setSubmissionUrl('');
      setSubmissionNote('');
      setSubmissionAttachment(null);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Your submission could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {submissionLoadError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-semibold">Saved submission status couldn&apos;t be verified.</p>
            <p className="text-xs">Submission actions are disabled to avoid duplicate work. {submissionLoadError}</p>
          </div>
          <button type="button" onClick={() => void onRefreshSubmissions()} className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-100">
            Retry loading
          </button>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#18181B]">
            Assignments &amp; Tasks
          </h1>
          <p className="text-sm text-[#52525B]">
            Download worksheets, track submission deadlines, and review tutor feedback.
          </p>
        </div>

        <div>
          <label htmlFor="assignments-course-filter" className="sr-only">
            Filter assignments by course
          </label>
          <select
            id="assignments-course-filter"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
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
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Assignment status filter"
        className="flex flex-wrap items-center gap-2 border-b border-[#E7E5E4] pb-4"
      >
        {(['All', 'Pending', 'Submitted', 'Graded'] as const).map((tab) => {
          const active = statusFilter === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#18181B] text-white'
                  : 'border border-[#E7E5E4] bg-[#FFFFFF] text-[#52525B] hover:text-[#18181B]'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  active ? 'text-zinc-300' : 'text-[#71717A]'
                }`}
              >
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Assignment Cards */}
      {filteredAssignments.length === 0 ? (
        <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] px-6 py-14 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-[#A1A1AA]" />
          <p className="mt-3 text-sm font-semibold text-[#18181B]">
            {enrolledCourses.length === 0
              ? 'You have not been enrolled in any courses yet'
              : 'No assignments assigned in this view'}
          </p>
          <p className="mt-1 text-xs text-[#71717A]">
            {enrolledCourses.length === 0
              ? 'Ask your tutor to enroll you in a subject batch to view coursework.'
              : 'Worksheets, problem sets, and past-paper drills will appear here when assigned.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAssignments.map((assignment) => {
            const course = courseLookup[assignment.courseId];
            const statusMeta = ASSIGNMENT_STATUS_META[assignment.status];

            return (
              <article
                key={assignment.id}
                className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 sm:p-6 transition-colors duration-150 hover:border-[#D4D4D8]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.icon}
                        <span>{statusMeta.label}</span>
                      </span>
                      <span className="font-semibold text-[#4338CA]">
                        {course ? `${course.title} · ${course.batchName}` : 'General'}
                      </span>
                      <span aria-hidden="true" className="text-[#D4D4D8]">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#52525B] tabular-nums">
                        <Calendar className="h-3.5 w-3.5 text-[#71717A]" aria-hidden="true" />
                        Due {formatReadableDate(assignment.dueDate, false)}
                      </span>
                    </div>

                    <h2 className="font-display text-lg font-bold tracking-tight text-[#18181B]">
                      {assignment.title}
                    </h2>

                    <p className="max-w-3xl text-sm leading-relaxed text-[#52525B]">
                      {assignment.description}
                    </p>

                    {/* Graded Feedback Box */}
                    {assignment.status === 'Graded' && (
                      <div className="mt-3 rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-4 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#0F766E]">
                            Tutor Assessment &amp; Feedback
                          </span>
                          {assignment.grade && (
                            <span className="font-mono text-xs font-bold text-[#0F766E] tabular-nums">
                              Score: {assignment.grade}
                            </span>
                          )}
                        </div>
                        {assignment.teacherFeedback && (
                          <p className="text-xs leading-relaxed text-[#134E4A]">
                            {assignment.teacherFeedback}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Submitted Details */}
                    {(assignment.status === 'Submitted' || assignment.status === 'Graded') &&
                      (assignment.submissionUrl || assignment.submissionNote || assignment.submissionAttachment) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-[#52525B]">
                          {assignment.submittedAt && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#18181B]">
                              <FileCheck2 className="h-3.5 w-3.5 text-[#4338CA]" aria-hidden="true" />
                              Submitted {assignment.submittedAt}
                            </span>
                          )}
                          {assignment.submissionUrl && (
                            <a
                              href={assignment.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-[#4338CA] hover:underline"
                            >
                              <span>View Submitted Link</span>
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          )}
                          {assignment.submissionAttachment && (
                            <button
                              type="button"
                              onClick={() => downloadDataUrl(assignment.submissionAttachment!.fileData, assignment.submissionAttachment!.fileName)}
                              className="inline-flex items-center gap-1 font-semibold text-[#4338CA] hover:underline"
                            >
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                              Download submitted PDF
                            </button>
                          )}
                          {assignment.submissionNote && (
                            <span className="text-[#71717A]">
                              Note: &ldquo;{assignment.submissionNote}&rdquo;
                            </span>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:flex-col lg:items-end">
                    {assignment.attachment ? (
                      <button type="button" onClick={() => downloadDataUrl(assignment.attachment!.fileData, assignment.attachment!.fileName)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2 text-xs font-semibold text-[#18181B] transition-colors hover:border-[#18181B] whitespace-nowrap shrink-0">
                        <span>Download {assignment.attachment.fileName}</span>
                      </button>
                    ) : assignment.resourceUrl ? (
                      <a href={assignment.resourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2 text-xs font-semibold text-[#18181B] transition-colors hover:border-[#18181B] whitespace-nowrap shrink-0">
                        <span>{assignment.resourceLabel || 'Resource Link'}</span><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : null}

                    {submissionsReady && assignment.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => openSubmitModal(assignment)}
                        className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A] whitespace-nowrap shrink-0"
                      >
                        <Send className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
                        <span>Submit Work</span>
                      </button>
                    )}

                    {submissionsReady && assignment.status === 'Submitted' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openSubmitModal(assignment)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#F8F7F4] whitespace-nowrap shrink-0"
                        >
                          <span>Replace PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRetractSubmission(assignment.id, activeStudent.id);
                            onNotify(`Moved "${assignment.title}" back to Pending`);
                          }}
                          title="Move back to Pending"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#71717A] hover:text-[#18181B] whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Undo</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Submit Work Modal */}
      {activeModalAssignment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/45 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E7E5E4] pb-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#4338CA]">
                  {activeStudent.name} · Submission
                </p>
                <h2
                  id="submit-modal-title"
                  className="font-display text-lg font-bold text-[#18181B]"
                >
                  {activeModalAssignment.title}
                </h2>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setActiveModalAssignment(null)}
                aria-label="Close submission modal"
                className="rounded-lg p-1.5 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label htmlFor="submission-pdf" className="block text-xs font-semibold text-[#18181B]">
                  Completed Workings (PDF only)
                </label>
                <input id="submission-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => void handleSubmissionFile(event.target.files?.[0])} className="block w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] p-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[#EEF2FF] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#4338CA]" />
                {submissionAttachment && <p className="text-xs text-[#4338CA]">{submissionAttachment.fileName} · {formatFileSize(submissionAttachment.fileSize)}</p>}
                {uploadError && <p role="alert" className="text-xs font-medium text-red-700">{uploadError}</p>}
                {submissionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">{submissionError}</p>}
                <button type="button" disabled={isSubmitting} onClick={() => { setActiveModalAssignment(null); onNavigateTab('photo-to-pdf'); }} className="text-xs font-semibold text-[#4338CA] underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">Need to turn phone photos into a PDF? Open Photo to PDF</button>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="submission-note"
                  className="block text-xs font-semibold text-[#18181B]"
                >
                  Note for Tutor (Optional)
                </label>
                <textarea
                  id="submission-note"
                  rows={3}
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="Any questions or notes on specific problems..."
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-[#E7E5E4] pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setActiveModalAssignment(null)}
                  className="rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#52525B] hover:text-[#18181B] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-5 py-2 text-xs font-semibold text-white hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
                  <span>{isSubmitting ? 'Saving…' : 'Mark as Submitted'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
