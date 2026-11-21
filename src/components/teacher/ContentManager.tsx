import React, { useMemo, useRef, useState } from 'react';
import {
  Award,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  Assignment,
  Course,
  MaterialType,
  PortalState,
  StudentSubmission,
  StudyMaterial,
  UploadedFileMeta,
} from '../../types/portal';
import { downloadDataUrl, formatFileSize, readFileAsDataUrl } from '../../utils/fileHelpers';
import { formatReadableDate } from '../../utils/formatters';

interface ContentManagerProps {
  state: PortalState;
  onAddAssignment: (assignment: Omit<Assignment, 'id'>) => Promise<boolean>;
  onUpdateAssignment: (id: string, updates: Partial<Omit<Assignment, 'id'>>) => Promise<boolean>;
  onGradeAssignment: (
    assignmentId: string,
    studentId: string,
    grade: string,
    teacherFeedback: string
  ) => void;
  onDeleteAssignment: (id: string) => void;
  onAddMaterial: (material: Omit<StudyMaterial, 'id'>) => Promise<boolean>;
  onDeleteMaterial: (id: string) => void;
  onNotify: (msg: string) => void;
}

export const ContentManager: React.FC<ContentManagerProps> = ({
  state,
  onAddAssignment,
  onUpdateAssignment,
  onGradeAssignment,
  onDeleteAssignment,
  onAddMaterial,
  onDeleteMaterial,
  onNotify,
}) => {
  // Assignment form state
  const [asgCourseId, setAsgCourseId] = useState(state.courses[0]?.id ?? '');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDueDate, setAsgDueDate] = useState('2026-11-25');
  const [asgDescription, setAsgDescription] = useState('');
  const [asgResourceUrl, setAsgResourceUrl] = useState('');
  const [asgResourceLabel, setAsgResourceLabel] = useState('Worksheet PDF');
  const [asgAttachment, setAsgAttachment] = useState<UploadedFileMeta | null>(null);

  // Material form state
  const [matCourseId, setMatCourseId] = useState(state.courses[0]?.id ?? '');
  const [matType, setMatType] = useState<MaterialType>('notes');
  const [matTitle, setMatTitle] = useState('');
  const [matDate, setMatDate] = useState('2026-11-20');
  const [matMetaInfo, setMatMetaInfo] = useState('PDF Notes');
  const [matUrl, setMatUrl] = useState('');
  const [matAttachment, setMatAttachment] = useState<UploadedFileMeta | null>(null);

  // File input refs
  const asgFileInputRef = useRef<HTMLInputElement>(null);
  const matFileInputRef = useRef<HTMLInputElement>(null);
  const editAsgFileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [editingAsg, setEditingAsg] = useState<Assignment | null>(null);
  const [gradingModalData, setGradingModalData] = useState<{
    asg: Assignment;
    studentId: string;
    studentName: string;
    sub?: StudentSubmission;
  } | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');

  const courseLookup = useMemo(() => {
    const map: Record<string, Course> = {};
    for (const c of state.courses) map[c.id] = c;
    return map;
  }, [state.courses]);

  const effectiveAsgCourseId = asgCourseId || state.courses[0]?.id || '';
  const effectiveMatCourseId = matCourseId || state.courses[0]?.id || '';

  const handleAsgFileSelect = async (file?: File) => {
    if (!file) return;

    try {
      if (file.size > 20 * 1024 * 1024) {
        onNotify('Choose a file smaller than 20 MB.');
        return;
      }
      const dataUrl = await readFileAsDataUrl(file);
      const meta: UploadedFileMeta = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileData: dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      setAsgAttachment(meta);
      if (!asgResourceLabel || asgResourceLabel === 'Worksheet PDF') {
        setAsgResourceLabel(file.name);
      }
      onNotify(`Uploaded ${file.name} (${formatFileSize(file.size)})`);
    } catch {
      onNotify('Failed to process file upload.');
    }
  };

  const handleMatFileSelect = async (file?: File) => {
    if (!file) return;

    try {
      if (file.size > 20 * 1024 * 1024) {
        onNotify('Choose a file smaller than 20 MB.');
        return;
      }
      const dataUrl = await readFileAsDataUrl(file);
      const meta: UploadedFileMeta = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileData: dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      setMatAttachment(meta);
      setMatMetaInfo(`${formatFileSize(file.size)} · ${file.name}`);
      onNotify(`Uploaded ${file.name} (${formatFileSize(file.size)})`);
    } catch {
      onNotify('Failed to process file upload.');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim() || !asgDueDate || !asgDescription.trim() || !effectiveAsgCourseId) return;
    if (!asgAttachment) {
      onNotify('Upload an assignment file before publishing.');
      return;
    }
    const saved = await onAddAssignment({
      courseId: effectiveAsgCourseId,
      title: asgTitle.trim(),
      dueDate: asgDueDate,
      description: asgDescription.trim(),
      resourceUrl: asgResourceUrl.trim(),
      resourceLabel: asgResourceLabel.trim() || asgAttachment?.fileName || 'Resource File',
      attachment: asgAttachment || undefined,
    });
    if (!saved) return;
    setAsgTitle('');
    setAsgDescription('');
    setAsgResourceUrl('');
    setAsgAttachment(null);
    onNotify('Published new assignment with file to Student Portal');
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim() || !effectiveMatCourseId) return;
    if (!matAttachment) {
      onNotify('Upload a study material file before publishing.');
      return;
    }
    const saved = await onAddMaterial({
      courseId: effectiveMatCourseId,
      type: matType,
      title: matTitle.trim(),
      date: matDate,
      metaInfo:
        matMetaInfo.trim() ||
        (matAttachment
          ? `${formatFileSize(matAttachment.fileSize)} · ${matAttachment.fileName}`
          : matType === 'recording'
          ? '60 min · HD Recording'
          : 'PDF Notes'),
      url: matUrl.trim(),
      attachment: matAttachment || undefined,
    });
    if (!saved) return;
    setMatTitle('');
    setMatUrl('');
    setMatAttachment(null);
    onNotify('Added study material to Student Dashboard feed');
  };

  const handleSaveEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsg) return;
    const saved = await onUpdateAssignment(editingAsg.id, {
      courseId: editingAsg.courseId,
      title: editingAsg.title.trim(),
      dueDate: editingAsg.dueDate,
      description: editingAsg.description.trim(),
      resourceUrl: editingAsg.resourceUrl.trim(),
      resourceLabel: editingAsg.resourceLabel?.trim(),
      attachment: editingAsg.attachment,
    });
    if (!saved) return;
    onNotify(`Updated "${editingAsg.title}"`);
    setEditingAsg(null);
  };

  const openGradingModal = (
    asg: Assignment,
    studentId: string,
    studentName: string,
    sub?: StudentSubmission
  ) => {
    setGradingModalData({ asg, studentId, studentName, sub });
    setGradeValue(sub?.grade ?? '');
    setFeedbackValue(sub?.teacherFeedback ?? '');
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingModalData || !gradeValue.trim()) return;
    onGradeAssignment(
      gradingModalData.asg.id,
      gradingModalData.studentId,
      gradeValue.trim(),
      feedbackValue.trim()
    );
    onNotify(`Recorded grade for ${gradingModalData.studentName}`);
    setGradingModalData(null);
  };

  return (
    <div className="space-y-12">
      {/* Section 1: Assignment Publisher & Submissions */}
      <section aria-label="Assignments manager" className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Assignment Creator Form */}
        <form
          onSubmit={handleCreateAssignment}
          className="space-y-4 rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 lg:col-span-5 shadow-xs"
        >
          <div className="space-y-1 border-b border-[#E7E5E4] pb-3.5">
            <h2 className="font-display text-lg font-bold text-[#18181B]">
              Publish Assignment
            </h2>
            <p className="text-xs text-[#52525B]">
              Upload homework worksheets, past paper problems, or task instructions for students.
            </p>
          </div>

          {state.courses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E7E5E4] p-4 text-xs text-[#71717A]">
              No courses created yet. Please create a course batch first in the &ldquo;Courses&rdquo; tab before publishing assignments.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="asg-course" className="block text-xs font-semibold text-[#18181B]">
                  Target Course / Batch
                </label>
                <select
                  id="asg-course"
                  value={effectiveAsgCourseId}
                  onChange={(e) => setAsgCourseId(e.target.value)}
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm font-semibold text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                >
                  {state.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} · {c.batchName} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="asg-title" className="block text-xs font-semibold text-[#18181B]">
                  Assignment Title
                </label>
                <input
                  id="asg-title"
                  type="text"
                  required
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  placeholder="e.g. Problem Set 08: Circle Theorems"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="asg-due" className="block text-xs font-semibold text-[#18181B]">
                    Due Date
                  </label>
                  <input
                    id="asg-due"
                    type="date"
                    required
                    value={asgDueDate}
                    onChange={(e) => setAsgDueDate(e.target.value)}
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="asg-res-label" className="block text-xs font-semibold text-[#18181B]">
                    Attachment Label
                  </label>
                  <input
                    id="asg-res-label"
                    type="text"
                    value={asgResourceLabel}
                    onChange={(e) => setAsgResourceLabel(e.target.value)}
                    placeholder="Worksheet PDF"
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="asg-desc" className="block text-xs font-semibold text-[#18181B]">
                  Instructions &amp; Scope
                </label>
                <textarea
                  id="asg-desc"
                  rows={3}
                  required
                  value={asgDescription}
                  onChange={(e) => setAsgDescription(e.target.value)}
                  placeholder="Outline questions, mark scheme instructions, and submission requirements..."
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              {/* Real File Upload Zone for Assignment */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">
                  Resource File Attachment (Accepts Any File Type)
                </label>
                {asgAttachment ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-5 w-5 text-[#4338CA] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#18181B] truncate">{asgAttachment.fileName}</p>
                        <p className="text-[10px] text-[#52525B]">{formatFileSize(asgAttachment.fileSize)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadDataUrl(asgAttachment.fileData, asgAttachment.fileName)}
                        className="rounded-md border border-[#E7E5E4] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#18181B] hover:bg-[#F4F4F5]"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => setAsgAttachment(null)}
                        className="rounded-md p-1 text-[#71717A] hover:text-red-700"
                        title="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => asgFileInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        asgFileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleAsgFileSelect(event.dataTransfer.files[0]);
                    }}
                    className="cursor-pointer rounded-xl border-2 border-dashed border-[#E7E5E4] bg-[#F8F7F4] p-4 text-center hover:border-[#4338CA] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] transition-colors"
                  >
                    <input
                      ref={asgFileInputRef}
                      type="file"
                      accept="*/*"
                      tabIndex={-1}
                      aria-hidden="true"
                      onChange={(event) => {
                        void handleAsgFileSelect(event.target.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-5 w-5 text-[#71717A]" />
                    <p className="mt-1 text-xs font-semibold text-[#18181B]">Drop a file here or click to browse</p>
                    <p className="text-[10px] text-[#71717A]">PDF, Word docs, past-paper packs, images, spreadsheets</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#18181B] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A]"
              >
                <Plus className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
                <span>Publish Assignment</span>
              </button>
            </>
          )}
        </form>

        {/* Existing Assignments List */}
        <div className="space-y-4 lg:col-span-7">
          <h2 className="font-display text-lg font-bold text-[#18181B]">
            Published Assignments ({state.assignments.length})
          </h2>

          <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] shadow-xs">
            {state.assignments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-[#A1A1AA]" />
                <p className="mt-3 text-sm font-semibold text-[#18181B]">No assignments published</p>
                <p className="mt-1 text-xs text-[#71717A]">
                  Create an assignment on the left to publish it to student dashboards.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#E7E5E4]">
                {state.assignments.map((asg) => {
                  const course = courseLookup[asg.courseId];
                  const enrolledStudents = state.students.filter((s) =>
                    s.enrolledCourseIds.includes(asg.courseId)
                  );
                  const submissions = state.submissions.filter(
                    (s) => s.assignmentId === asg.id
                  );
                  const submittedCount = submissions.filter(
                    (s) => s.status === 'Submitted' || s.status === 'Graded'
                  ).length;

                  return (
                    <li
                      key={asg.id}
                      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[#FAF9F7]"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-semibold text-[#4338CA]">
                              {course ? `${course.code} · ${course.batchName}` : 'General'}
                            </span>
                            <span aria-hidden="true" className="text-[#D4D4D8]">·</span>
                            <span className="text-[#52525B] tabular-nums">
                              Due {formatReadableDate(asg.dueDate, false)}
                            </span>
                            <span aria-hidden="true" className="text-[#D4D4D8]">·</span>
                            <span className="font-semibold text-[#18181B] tabular-nums">
                              {submittedCount} / {enrolledStudents.length} Submitted
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-[#18181B]">{asg.title}</p>
                          <p className="text-xs text-[#52525B] line-clamp-2">{asg.description}</p>

                          {/* Attachment indicator & download */}
                          {asg.attachment && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => downloadDataUrl(asg.attachment!.fileData, asg.attachment!.fileName)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-[#F8F7F4] px-2.5 py-1 text-[11px] font-semibold text-[#18181B] hover:bg-[#E7E5E4]/60"
                              >
                                <Download className="h-3 w-3 text-[#4338CA]" />
                                <span>{asg.attachment.fileName} ({formatFileSize(asg.attachment.fileSize)})</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingAsg(asg)}
                            aria-label={`Edit ${asg.title}`}
                            className="rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] p-1.5 text-[#52525B] hover:border-[#18181B] hover:text-[#18181B]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteAssignment(asg.id);
                              onNotify(`Deleted "${asg.title}"`);
                            }}
                            aria-label={`Delete ${asg.title}`}
                            className="rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] p-1.5 text-[#52525B] hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Student Submissions List & PDF Download */}
                      {enrolledStudents.length > 0 && (
                        <div className="mt-2 rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-[#52525B]">
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              <span>Student Submissions &amp; Workings</span>
                            </span>
                            <span className="tabular-nums">
                              {submittedCount} of {enrolledStudents.length} turned in
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {enrolledStudents.map((std) => {
                              const sub = submissions.find((s) => s.studentId === std.id);
                              const status = sub?.status ?? 'Pending';

                              return (
                                <div
                                  key={std.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2.5 text-xs border border-[#F4F4F5]"
                                >
                                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                                    <span className="font-semibold text-[#18181B]">{std.name}</span>
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                        status === 'Graded'
                                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                          : status === 'Submitted'
                                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}
                                    >
                                      {status}
                                      {sub?.grade ? ` (${sub.grade})` : ''}
                                    </span>

                                    {/* Download Student Submitted PDF Button */}
                                    {sub?.attachment ? (
                                      <button
                                        type="button"
                                        onClick={() => downloadDataUrl(sub.attachment!.fileData, sub.attachment!.fileName)}
                                        className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] border border-[#C7D2FE] px-2 py-0.5 text-[11px] font-semibold text-[#4338CA] hover:bg-[#E0E7FF]"
                                        title={`Download ${sub.attachment.fileName}`}
                                      >
                                        <FileCheck className="h-3 w-3" />
                                        <span>Download PDF ({formatFileSize(sub.attachment.fileSize)})</span>
                                      </button>
                                    ) : sub?.submissionUrl ? (
                                      <a
                                        href={sub.submissionUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#4338CA] hover:underline inline-flex items-center gap-0.5 text-[11px]"
                                      >
                                        <span>Link</span>
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    ) : null}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => openGradingModal(asg, std.id, std.name, sub)}
                                    className="rounded border border-[#E7E5E4] bg-[#F8F7F4] px-2.5 py-1 text-[11px] font-semibold text-[#18181B] hover:bg-[#E7E5E4]/60"
                                  >
                                    {status === 'Graded' ? 'Edit Grade' : 'Grade / Review'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Notes & Recordings Publisher */}
      <section aria-label="Study materials manager" className="grid grid-cols-1 gap-8 border-t border-[#E7E5E4] pt-8 lg:grid-cols-12 lg:items-start">
        <form
          onSubmit={handleCreateMaterial}
          className="space-y-4 rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 lg:col-span-5 shadow-xs"
        >
          <div className="space-y-1 border-b border-[#E7E5E4] pb-3.5">
            <h2 className="font-display text-lg font-bold text-[#18181B]">
              Post Notes or Recording
            </h2>
            <p className="text-xs text-[#52525B]">
              Upload study materials, video recordings, or PDF notes to student dashboard feeds.
            </p>
          </div>

          {state.courses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E7E5E4] p-4 text-xs text-[#71717A]">
              No courses created yet. Please create a course batch first in the &ldquo;Courses&rdquo; tab before posting materials.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-[#18181B]">Material Type</span>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMatType('notes');
                      setMatMetaInfo('PDF Notes');
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                      matType === 'notes'
                        ? 'bg-[#4338CA] text-white'
                        : 'text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>PDF Notes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatType('recording');
                      setMatMetaInfo('HD Recording');
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                      matType === 'recording'
                        ? 'bg-[#F97316] text-[#18181B]'
                        : 'text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Recording</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mat-course" className="block text-xs font-semibold text-[#18181B]">
                  Target Course / Batch
                </label>
                <select
                  id="mat-course"
                  value={effectiveMatCourseId}
                  onChange={(e) => setMatCourseId(e.target.value)}
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm font-semibold text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                >
                  {state.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} · {c.batchName} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mat-title" className="block text-xs font-semibold text-[#18181B]">
                  Material Title
                </label>
                <input
                  id="mat-title"
                  type="text"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder={
                    matType === 'recording'
                      ? 'e.g. Recording: Quadratic Inequalities Walkthrough'
                      : 'e.g. Annotated Notes: Graph Transformations'
                  }
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="mat-date" className="block text-xs font-semibold text-[#18181B]">
                    Session Date
                  </label>
                  <input
                    id="mat-date"
                    type="date"
                    required
                    value={matDate}
                    onChange={(e) => setMatDate(e.target.value)}
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="mat-meta" className="block text-xs font-semibold text-[#18181B]">
                    Duration / Detail
                  </label>
                  <input
                    id="mat-meta"
                    type="text"
                    value={matMetaInfo}
                    onChange={(e) => setMatMetaInfo(e.target.value)}
                    placeholder="12 pages · PDF Notes"
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                  />
                </div>
              </div>

              {/* Real File Upload Zone for Material */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">
                  Upload File (Any Format: PDF, MP4, Audio, DOCX, ZIP)
                </label>
                {matAttachment ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {matType === 'recording' ? (
                        <Video className="h-5 w-5 text-[#F97316] shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-[#4338CA] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-[#18181B] truncate">{matAttachment.fileName}</p>
                        <p className="text-[10px] text-[#52525B]">{formatFileSize(matAttachment.fileSize)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadDataUrl(matAttachment.fileData, matAttachment.fileName)}
                        className="rounded-md border border-[#E7E5E4] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#18181B] hover:bg-[#F4F4F5]"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatAttachment(null)}
                        className="rounded-md p-1 text-[#71717A] hover:text-red-700"
                        title="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => matFileInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        matFileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleMatFileSelect(event.dataTransfer.files[0]);
                    }}
                    className="cursor-pointer rounded-xl border-2 border-dashed border-[#E7E5E4] bg-[#F8F7F4] p-4 text-center hover:border-[#4338CA] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] transition-colors"
                  >
                    <input
                      ref={matFileInputRef}
                      type="file"
                      accept="*/*"
                      tabIndex={-1}
                      aria-hidden="true"
                      onChange={(event) => {
                        void handleMatFileSelect(event.target.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-5 w-5 text-[#71717A]" />
                    <p className="mt-1 text-xs font-semibold text-[#18181B]">Drop a file here or click to browse</p>
                    <p className="text-[10px] text-[#71717A]">Video recordings, PDF notes, past papers, spreadsheets</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4338CA] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#3730A3]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add to Student Materials</span>
              </button>
            </>
          )}
        </form>

        {/* Materials List */}
        <div className="space-y-4 lg:col-span-7">
          <h2 className="font-display text-lg font-bold text-[#18181B]">
            Notes &amp; Recordings Feed ({state.materials.length})
          </h2>

          <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] shadow-xs">
            {state.materials.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-[#A1A1AA]" />
                <p className="mt-3 text-sm font-semibold text-[#18181B]">No study materials posted</p>
                <p className="mt-1 text-xs text-[#71717A]">
                  Upload PDF annotated notes, past papers, and video recordings for students.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#E7E5E4]">
                {state.materials.map((mat) => {
                  const course = courseLookup[mat.courseId];
                  const isRec = mat.type === 'recording';
                  return (
                    <li
                      key={mat.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-[#FAF9F7]"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            isRec
                              ? 'border-[#F97316]/25 bg-[#FFF7ED] text-[#C2410C]'
                              : 'border-[#4338CA]/20 bg-[#EEF2FF] text-[#4338CA]'
                          }`}
                        >
                          {isRec ? (
                            <Video className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-semibold text-[#18181B] leading-snug">
                            {mat.title}
                          </p>
                          <p className="text-xs text-[#71717A] tabular-nums">
                            {course ? `${course.code} · ${course.batchName}` : 'General'} ·{' '}
                            {formatReadableDate(mat.date, false)} · {mat.metaInfo}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {mat.attachment ? (
                          <button
                            type="button"
                            onClick={() => downloadDataUrl(mat.attachment!.fileData, mat.attachment!.fileName)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#18181B] hover:border-[#18181B]"
                          >
                            <Download className="h-3.5 w-3.5 text-[#4338CA]" />
                            <span>Download ({formatFileSize(mat.attachment.fileSize)})</span>
                          </button>
                        ) : mat.url ? (
                          <a
                            href={mat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E7E5E4] px-3 py-1.5 text-xs font-semibold text-[#18181B] hover:border-[#18181B]"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            onDeleteMaterial(mat.id);
                            onNotify(`Removed "${mat.title}"`);
                          }}
                          aria-label={`Delete ${mat.title}`}
                          className="rounded-lg border border-[#E7E5E4] p-1.5 text-[#71717A] hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Edit Assignment Modal */}
      {editingAsg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-asg-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/45 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3.5">
              <h3 id="edit-asg-title" className="font-display text-base font-bold text-[#18181B]">
                Edit Assignment
              </h3>
              <button
                type="button"
                onClick={() => setEditingAsg(null)}
                aria-label="Close edit assignment modal"
                className="rounded-lg p-1 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAssignment} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">Title</label>
                <input
                  type="text"
                  required
                  value={editingAsg.title}
                  onChange={(e) => setEditingAsg({ ...editingAsg, title: e.target.value })}
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#18181B]">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editingAsg.dueDate}
                    onChange={(e) => setEditingAsg({ ...editingAsg, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#18181B]">Attachment Label</label>
                  <input
                    type="text"
                    value={editingAsg.resourceLabel || ''}
                    onChange={(e) => setEditingAsg({ ...editingAsg, resourceLabel: e.target.value })}
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={editingAsg.description}
                  onChange={(e) => setEditingAsg({ ...editingAsg, description: e.target.value })}
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E7E5E4] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingAsg(null)}
                  className="rounded-lg border border-[#E7E5E4] px-4 py-2 text-xs font-semibold text-[#52525B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#18181B] px-5 py-2 text-xs font-semibold text-white hover:bg-[#27272A]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Modal with Student's Submitted PDF Download */}
      {gradingModalData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="asg-grade-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/45 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#E7E5E4] pb-3.5">
              <div>
                <p className="text-xs font-semibold text-[#0F766E]">Grade Submission</p>
                <h3 id="asg-grade-modal-title" className="font-display text-base font-bold text-[#18181B]">
                  {gradingModalData.studentName} · {gradingModalData.asg.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGradingModalData(null)}
                aria-label="Close grading modal"
                className="rounded-lg p-1 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Submitted PDF File Preview & Download */}
            {gradingModalData.sub?.attachment ? (
              <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#4338CA] flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4" />
                    <span>Submitted Workings PDF</span>
                  </span>
                  <span className="text-[10px] text-[#52525B]">
                    {formatFileSize(gradingModalData.sub.attachment.fileSize)}
                  </span>
                </div>
                <p className="font-semibold text-[#18181B] truncate">
                  {gradingModalData.sub.attachment.fileName}
                </p>
                <button
                  type="button"
                  onClick={() => downloadDataUrl(gradingModalData.sub!.attachment!.fileData, gradingModalData.sub!.attachment!.fileName)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#4338CA] py-2 text-xs font-semibold text-white hover:bg-[#3730A3]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download / View Student PDF</span>
                </button>
              </div>
            ) : gradingModalData.sub?.submissionUrl ? (
              <div className="rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] p-3 text-xs space-y-1">
                <span className="font-semibold text-[#52525B]">Submitted Link:</span>
                <a
                  href={gradingModalData.sub.submissionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[#4338CA] hover:underline font-mono truncate"
                >
                  {gradingModalData.sub.submissionUrl}
                </a>
              </div>
            ) : (
              <p className="text-xs text-[#71717A] italic">No file attached to this submission.</p>
            )}

            {gradingModalData.sub?.submissionNote && (
              <div className="rounded-xl bg-[#FAF9F7] border border-[#E7E5E4] p-2.5 text-xs text-[#52525B]">
                <strong className="text-[#18181B]">Student note:</strong> &ldquo;{gradingModalData.sub.submissionNote}&rdquo;
              </div>
            )}

            <form onSubmit={handleSaveGrade} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">
                  Score / Grade
                </label>
                <input
                  type="text"
                  required
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  placeholder="e.g. 38 / 40 (95%) or Grade 9"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm font-mono text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">
                  Feedback for {gradingModalData.studentName}
                </label>
                <textarea
                  rows={3}
                  value={feedbackValue}
                  onChange={(e) => setFeedbackValue(e.target.value)}
                  placeholder="Exam technique tips and feedback..."
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E7E5E4] pt-4">
                <button
                  type="button"
                  onClick={() => setGradingModalData(null)}
                  className="rounded-lg border border-[#E7E5E4] px-4 py-2 text-xs font-semibold text-[#52525B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#0F766E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#115E59]"
                >
                  Save Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
