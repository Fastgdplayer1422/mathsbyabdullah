import React, { useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  FolderOpen,
  Loader2,
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
  UploadedFileMeta,
} from '../../types/portal';
import { formatReadableDate } from '../../utils/formatters';
import { downloadDataUrl, formatFileSize, readFileAsDataUrl } from '../../utils/fileHelpers';
import { PdfPreviewDialog } from '../PdfPreviewDialog';

interface StudentAssignmentsProps {
  state: PortalState;
  activeStudent: Student | null;
  onSubmitAssignment: (
    assignmentId: string,
    studentId: string,
    submissionUrl: string,
    submissionNote: string,
    attachment?: UploadedFileMeta
  ) => Promise<any> | void;
  onRetractSubmission: (assignmentId: string, studentId: string) => void;
  onNotify: (msg: string) => void;
  onSwitchToTeacher: () => void;
  onNavigateTab: (tab: 'photo-to-pdf') => void;
}

function normalizeAssignmentStatus(status?: string | null): AssignmentStatus {
  if (!status) return 'Pending';
  const s = status.trim().toLowerCase();
  if (s === 'submitted') return 'Submitted';
  if (s === 'graded') return 'Graded';
  return 'Pending';
}

const ASSIGNMENT_STATUS_META: Record<
  AssignmentStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  Pending: {
    label: 'Pending',
    icon: <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />,
    className: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  Submitted: {
    label: 'Submitted',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />,
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300',
  },
  Graded: {
    label: 'Graded',
    icon: <Award className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />,
    className: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/50 dark:text-teal-300',
  },
};

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({
  state,
  activeStudent,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewPdf, setPreviewPdf] = useState<{ src: string; fileName: string; hideDownload?: boolean } | null>(null);

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

  // Map each assignment with this student's specific submission (robust against ID casing and status formatting)
  const assignmentsWithStudentStatus = useMemo(() => {
    if (!activeStudent) return [];
    return studentAssignments.map((asg) => {
      const sub = state.submissions.find(
        (s) =>
          String(s.assignmentId).toLowerCase() === String(asg.id).toLowerCase() &&
          String(s.studentId).toLowerCase() === String(activeStudent.id).toLowerCase()
      );
      const status = normalizeAssignmentStatus(sub?.status);
      const fileUrl = asg.fileUrl || asg.attachment?.fileData;
      const fileName = asg.fileName || asg.attachment?.fileName || asg.resourceLabel || `${asg.title}.pdf`;
      const gradedFileUrl = sub?.gradedFileUrl || sub?.reviewAttachment?.fileData;
      const gradedFileName = sub?.gradedFileName || sub?.reviewAttachment?.fileName || 'graded-feedback.pdf';
      const studentFileUrl = sub?.fileUrl || sub?.attachment?.fileData;
      const studentFileName = sub?.fileName || sub?.attachment?.fileName || 'student-submission.pdf';
      return {
        ...asg,
        status,
        submissionUrl: sub?.submissionUrl,
        submissionNote: sub?.submissionNote,
        submissionAttachment: sub?.attachment,
        submittedAt: sub?.submittedAt,
        grade: sub?.grade,
        teacherFeedback: sub?.teacherFeedback,
        reviewAttachment: sub?.reviewAttachment,
        fileUrl,
        fileName,
        gradedFileUrl,
        gradedFileName,
        studentFileUrl,
        studentFileName,
      };
    });
  }, [studentAssignments, state.submissions, activeStudent]);

  const counts = useMemo(() => {
    const res = { All: assignmentsWithStudentStatus.length, Pending: 0, Submitted: 0, Graded: 0 };
    for (const a of assignmentsWithStudentStatus) {
      if (a.status in res) {
        res[a.status] += 1;
      }
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
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center">
        <FolderOpen className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">No student profile selected</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Create a student profile in Teacher Admin to access assignments and submission portals.
        </p>
        <button
          type="button"
          onClick={onSwitchToTeacher}
          className="mt-4 rounded-lg bg-slate-900 dark:bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
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
    if (!activeModalAssignment || !activeStudent) return;
    if (!submissionAttachment) {
      setUploadError('Upload your completed workings as a PDF before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await onSubmitAssignment(activeModalAssignment.id, activeStudent.id, '', submissionNote, submissionAttachment);
      if (result && result.success === false) {
        setUploadError(result.error || 'Submission could not be saved. Please try again.');
        return;
      }
      onNotify(`Submitted "${activeModalAssignment.title}"`);
      setActiveModalAssignment(null);
      setSubmissionUrl('');
      setSubmissionNote('');
      setSubmissionAttachment(null);
    } catch {
      setUploadError('Submission could not be completed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {previewPdf && (
        <PdfPreviewDialog
          src={previewPdf.src}
          fileName={previewPdf.fileName}
          hideDownload={previewPdf.hideDownload}
          onClose={() => setPreviewPdf(null)}
        />
      )}
      {/* Header Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Assignments &amp; Tasks
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
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
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
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
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4"
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
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  active ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
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
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {enrolledCourses.length === 0
              ? 'You have not been enrolled in any courses yet'
              : 'No assignments assigned in this view'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {enrolledCourses.length === 0
              ? 'Ask your tutor to enroll you in a subject batch to view coursework.'
              : 'Worksheets, problem sets, and past-paper drills will appear here when assigned.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAssignments.map((assignment) => {
            const course = courseLookup[assignment.courseId];
            const statusMeta = ASSIGNMENT_STATUS_META[assignment.status] || ASSIGNMENT_STATUS_META.Pending;

            return (
              <article
                key={assignment.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 transition-colors duration-150 hover:border-slate-300 dark:hover:border-slate-700"
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
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {course ? `${course.title} · ${course.batchName}` : 'General'}
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        Due {formatReadableDate(assignment.dueDate, false)}
                      </span>
                    </div>

                    <h2 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {assignment.title}
                    </h2>

                    <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {assignment.description}
                    </p>

                    {/* Teacher Assignment PDF Container */}
                    {(assignment.fileUrl || assignment.attachment?.fileData) && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/40 p-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {assignment.fileName || assignment.attachment?.fileName || assignment.resourceLabel || `${assignment.title}.pdf`}
                            </span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                              Worksheet &amp; Task Materials (PDF)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPdf({
                                src: assignment.fileUrl || assignment.attachment!.fileData,
                                fileName: assignment.fileName || assignment.attachment?.fileName || `${assignment.title}.pdf`,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Preview PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadDataUrl(
                                assignment.fileUrl || assignment.attachment!.fileData,
                                assignment.fileName || assignment.attachment?.fileName || `${assignment.title}.pdf`
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Download PDF</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Graded Feedback Box */}
                    {assignment.status === 'Graded' && (
                      <div className="mt-3 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50 dark:bg-teal-950/40 p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                            Tutor Assessment &amp; Feedback
                          </span>
                          {assignment.grade && (
                            <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300 tabular-nums">
                              Score: {assignment.grade}
                            </span>
                          )}
                        </div>
                        {assignment.teacherFeedback && (
                          <p className="text-xs leading-relaxed text-teal-900 dark:text-teal-200">
                            {assignment.teacherFeedback}
                          </p>
                        )}
                        {/* Graded Work PDF Container */}
                        {(assignment.gradedFileUrl || assignment.reviewAttachment?.fileData) && (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-100/60 dark:bg-teal-950/60 p-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-teal-700 dark:text-teal-400 shrink-0" aria-hidden="true" />
                              <div className="min-w-0">
                                <span className="block text-xs font-semibold text-teal-900 dark:text-teal-200">
                                  Graded Work
                                </span>
                                <span className="block text-[11px] text-teal-700 dark:text-teal-300 truncate">
                                  {assignment.gradedFileName || assignment.reviewAttachment?.fileName || 'graded-feedback.pdf'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPdf({
                                  src: assignment.gradedFileUrl || assignment.reviewAttachment!.fileData,
                                  fileName: assignment.gradedFileName || assignment.reviewAttachment?.fileName || 'Graded Work.pdf',
                                  hideDownload: true,
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 dark:bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 dark:hover:bg-teal-500 transition-colors whitespace-nowrap"
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Preview Graded PDF</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submitted Details */}
                    {(assignment.status === 'Submitted' || assignment.status === 'Graded') &&
                      (assignment.submissionUrl || assignment.submissionNote || assignment.submissionAttachment || assignment.studentFileUrl) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-600 dark:text-slate-400">
                          {assignment.submittedAt && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-200">
                              <FileCheck2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                              Submitted {assignment.submittedAt}
                            </span>
                          )}
                          {assignment.submissionUrl && (
                            <a
                              href={assignment.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <span>View Submitted Link</span>
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          )}
                          {(assignment.studentFileUrl || assignment.submissionAttachment) && (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPdf({
                                    src: assignment.studentFileUrl || assignment.submissionAttachment!.fileData,
                                    fileName: assignment.studentFileName || assignment.submissionAttachment?.fileName || 'submission.pdf',
                                  })
                                }
                                className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>View submitted PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadDataUrl(
                                    assignment.studentFileUrl || assignment.submissionAttachment!.fileData,
                                    assignment.studentFileName || assignment.submissionAttachment?.fileName || 'submission.pdf'
                                  )
                                }
                                className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                                title="Download submitted PDF"
                              >
                                <Download className="h-3 w-3" aria-hidden="true" />
                                <span>Download</span>
                              </button>
                            </div>
                          )}
                          {assignment.submissionNote && (
                            <span className="text-slate-500 dark:text-slate-400">
                              Note: &ldquo;{assignment.submissionNote}&rdquo;
                            </span>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:flex-col lg:items-end">
                    {(assignment.fileUrl || assignment.attachment) ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPdf({
                              src: assignment.fileUrl || assignment.attachment!.fileData,
                              fileName: assignment.fileName || assignment.attachment?.fileName || `${assignment.title}.pdf`,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:border-slate-400 dark:hover:border-slate-600 whitespace-nowrap shrink-0"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Preview PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadDataUrl(
                              assignment.fileUrl || assignment.attachment!.fileData,
                              assignment.fileName || assignment.attachment?.fileName || `${assignment.title}.pdf`
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:border-slate-400 dark:hover:border-slate-600 whitespace-nowrap shrink-0"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    ) : assignment.resourceUrl ? (
                      <a
                        href={assignment.resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:border-slate-400 dark:hover:border-slate-600 whitespace-nowrap shrink-0"
                      >
                        <span>{assignment.resourceLabel || 'Resource Link'}</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : null}

                    {assignment.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => openSubmitModal(assignment)}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-indigo-500 whitespace-nowrap shrink-0"
                      >
                        <Send className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                        <span>Submit Work</span>
                      </button>
                    )}

                    {assignment.status === 'Submitted' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openSubmitModal(assignment)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
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
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap shrink-0"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {activeStudent.name} · Submission
                </p>
                <h2
                  id="submit-modal-title"
                  className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
                >
                  {activeModalAssignment.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalAssignment(null)}
                aria-label="Close submission modal"
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label htmlFor="submission-pdf" className="block text-xs font-semibold text-slate-900 dark:text-slate-200">
                  Completed Workings (PDF only)
                </label>
                <input
                  id="submission-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={isSubmitting}
                  onChange={(event) => void handleSubmissionFile(event.target.files?.[0])}
                  className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 dark:file:bg-indigo-950/60 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-600 dark:file:text-indigo-400"
                />
                {submissionAttachment && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {submissionAttachment.fileName} · {formatFileSize(submissionAttachment.fileSize)}
                  </p>
                )}
                {uploadError && <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{uploadError}</p>}
                <button
                  type="button"
                  onClick={() => { setActiveModalAssignment(null); onNavigateTab('photo-to-pdf'); }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline underline-offset-2"
                >
                  Need to turn phone photos into a PDF? Open Photo to PDF
                </button>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="submission-note"
                  className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                >
                  Note for Tutor (Optional)
                </label>
                <textarea
                  id="submission-note"
                  rows={3}
                  value={submissionNote}
                  disabled={isSubmitting}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="Any questions or notes on specific problems..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModalAssignment(null)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" aria-hidden="true" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                      <span>Mark as Submitted</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
