import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import {
  Assignment,
  Course,
  PortalState,
  Student,
  StudentStatus,
  StudentSubmission,
} from '../../types/portal';
import { downloadDataUrl, formatFileSize } from '../../utils/fileHelpers';
import { formatReadableDate, validateStudentEmail } from '../../utils/formatters';

interface StudentsManagerProps {
  state: PortalState;
  onApproveStudent: (studentId: string, courseIds: string[]) => void;
  onRejectStudent: (studentId: string) => void;
  onChangeStudentStatus: (studentId: string, status: StudentStatus) => void;
  onAddStudent: (student: Omit<Student, 'id' | 'createdAt'>, initialPassword: string) => Promise<Student>;
  onUpdateStudent: (id: string, updates: Partial<Omit<Student, 'id' | 'createdAt'>>) => void;
  onDeleteStudent: (id: string) => void;
  onToggleEnrollment: (studentId: string, courseId: string) => void;
  onGradeAssignment: (
    assignmentId: string,
    studentId: string,
    grade: string,
    feedback: string
  ) => void;
  onNotify: (msg: string) => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({
  state,
  onApproveStudent,
  onRejectStudent,
  onChangeStudentStatus,
  onAddStudent,
  onDeleteStudent,
  onToggleEnrollment,
  onGradeAssignment,
  onNotify,
}) => {
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Add Student Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addGrade, setAddGrade] = useState('Year 11 / IGCSE');
  const [addNotes, setAddNotes] = useState('');
  const [addCourses, setAddCourses] = useState<string[]>([]);
  const [addEmailError, setAddEmailError] = useState<string | null>(null);

  // Approve & Enroll Modal
  const [approvingStudent, setApprovingStudent] = useState<Student | null>(null);
  const [selectedCourseIdsForApproval, setSelectedCourseIdsForApproval] = useState<string[]>([]);

  // Profile Drawer
  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null);

  // Grade Modal in drawer
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<StudentSubmission | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  const courseLookup = useMemo(() => {
    const map: Record<string, Course> = {};
    for (const c of state.courses) map[c.id] = c;
    return map;
  }, [state.courses]);

  // Split students into Pending and Approved/Others
  const pendingStudents = useMemo(() => {
    return state.students.filter((s) => s.status === 'pending');
  }, [state.students]);

  const activeStudents = useMemo(() => {
    return state.students.filter((s) => s.status !== 'pending');
  }, [state.students]);

  const filteredActiveStudents = useMemo(() => {
    if (!searchQuery.trim()) return activeStudents;
    const q = searchQuery.toLowerCase();
    return activeStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.gradeLevel.toLowerCase().includes(q)
    );
  }, [activeStudents, searchQuery]);

  const drawerStudent = useMemo(() => {
    return state.students.find((s) => s.id === drawerStudentId) || null;
  }, [state.students, drawerStudentId]);

  const studentLogs = useMemo(() => {
    if (!drawerStudent) return [];
    return state.activityLogs
      .filter((log) => log.studentId === drawerStudent.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [state.activityLogs, drawerStudent]);

  const studentAssignments = useMemo(() => {
    if (!drawerStudent) return [];
    return state.assignments.filter((a) =>
      drawerStudent.enrolledCourseIds.includes(a.courseId)
    );
  }, [state.assignments, drawerStudent]);

  const studentSubmissionsMap = useMemo(() => {
    if (!drawerStudent) return {};
    const map: Record<string, StudentSubmission> = {};
    for (const sub of state.submissions) {
      if (sub.studentId === drawerStudent.id) {
        map[sub.assignmentId] = sub;
      }
    }
    return map;
  }, [state.submissions, drawerStudent]);

  // Handle open approval modal
  const openApprovalModal = (student: Student) => {
    setApprovingStudent(student);
    // Pre-select all courses if only 1-2, or keep empty
    setSelectedCourseIdsForApproval([]);
  };

  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingStudent) return;
    onApproveStudent(approvingStudent.id, selectedCourseIdsForApproval);
    onNotify(
      `Approved ${approvingStudent.name} and enrolled in ${selectedCourseIdsForApproval.length} course(s)`
    );
    setApprovingStudent(null);
  };

  const toggleApprovalCourse = (courseId: string) => {
    setSelectedCourseIdsForApproval((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleManualAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddEmailError(null);
    if (!addName.trim() || !addEmail.trim()) return;

    const emailCheck = validateStudentEmail(addEmail);
    if (!emailCheck.valid) {
      setAddEmailError(emailCheck.error || 'Please enter a valid personal or school email.');
      return;
    }

    if (addPassword.length < 8) {
      setAddEmailError('Use a temporary password with at least 8 characters.');
      return;
    }

    const emailNormalized = addEmail.trim().toLowerCase();
    const duplicate = state.students.some(
      (s) => s.email.toLowerCase() === emailNormalized
    );
    if (duplicate) {
      setAddEmailError('A student with this email address is already registered.');
      return;
    }

    try {
      await onAddStudent({
        name: addName.trim(),
        email: emailNormalized,
        status: 'pending',
        gradeLevel: addGrade.trim(),
        notes: addNotes.trim(),
        enrolledCourseIds: [],
      }, addPassword);
    } catch (error) {
      setAddEmailError(error instanceof Error ? error.message : 'Unable to create this account.');
      return;
    }

    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddNotes('');
    setAddCourses([]);
    setAddEmailError(null);
    setShowAddModal(false);
    onNotify(`Created a student account for ${emailNormalized}. Review the pending request to approve and enroll them.`);
  };

  const openGradeModal = (asg: Assignment, currentSub?: StudentSubmission) => {
    setGradingAssignment(asg);
    setGradingSubmission(currentSub || null);
    setGradeInput(currentSub?.grade || '');
    setFeedbackInput(currentSub?.teacherFeedback || '');
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingAssignment || !drawerStudent) return;
    onGradeAssignment(gradingAssignment.id, drawerStudent.id, gradeInput, feedbackInput);
    onNotify(`Recorded grade for ${drawerStudent.name}`);
    setGradingAssignment(null);
  };

  const formatLogTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E7E5E4] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-[#18181B]">
              Registration Requests &amp; Student Directory
            </h2>
            {pendingStudents.length > 0 && (
              <span className="rounded-full bg-[#EA580C] px-2.5 py-0.5 text-xs font-bold text-white tabular-nums">
                {pendingStudents.length} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-[#52525B]">
            Review new student signups, grant batch permissions, and track individual progress.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#27272A] whitespace-nowrap shrink-0"
        >
          <UserPlus className="h-3.5 w-3.5 text-[#F97316]" />
          <span>Manually Add Student</span>
        </button>
      </div>

      {/* 1. Pending Approvals Queue (at the top) */}
      <section aria-label="Pending Approvals" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#EA580C]" />
            <h3 className="font-display text-sm font-bold text-[#18181B]">
              Pending Approval Queue ({pendingStudents.length})
            </h3>
          </div>
          <span className="text-xs text-[#71717A]">
            Students cannot access portal materials until approved
          </span>
        </div>

        {pendingStudents.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-center shadow-sm">
            <UserCheck className="mx-auto h-7 w-7 text-[#0F766E]" />
            <p className="mt-2 text-sm font-semibold text-[#18181B]">
              All registration requests reviewed
            </p>
            <p className="mt-1 text-xs text-[#71717A]">
              When students sign up on the portal login page, their requests will appear here for one-click approval and course batch enrollment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {pendingStudents.map((student) => (
              <article
                key={student.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#FED7AA] bg-[#FFFBF7] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-bold text-[#18181B]">
                      {student.name}
                    </span>
                    <span className="rounded-full bg-[#FED7AA] px-2 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                      Awaiting Verification
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#52525B] border border-[#E7E5E4]">
                      {student.gradeLevel}
                    </span>
                  </div>

                  <p className="text-xs text-[#71717A] tabular-nums">
                    {student.email} · Submitted {formatReadableDate(student.createdAt.slice(0, 10), true)}
                  </p>

                  {student.requestNote && (
                    <div className="rounded-xl border border-[#FED7AA]/60 bg-white p-2.5 text-xs text-[#78350F]">
                      <strong className="font-semibold text-[#9A3412]">Student Note:</strong> &ldquo;{student.requestNote}&rdquo;
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openApprovalModal(student)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#18181B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#27272A] shadow-sm whitespace-nowrap shrink-0"
                  >
                    <Check className="h-3.5 w-3.5 text-[#F97316]" />
                    <span>Approve &amp; Enroll</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onRejectStudent(student.id);
                      onNotify(`Declined registration for ${student.name}`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors whitespace-nowrap shrink-0"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 2. Active Student Directory */}
      <section aria-label="Student Directory" className="space-y-4 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#4338CA]" />
            <h3 className="font-display text-sm font-bold text-[#18181B]">
              Registered Student Directory ({activeStudents.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-full border border-[#E7E5E4] bg-white py-1.5 pl-8 pr-3 text-xs text-[#18181B] focus:border-[#4338CA] focus:outline-none"
            />
          </div>
        </div>

        {activeStudents.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-8 text-center text-xs text-[#71717A]">
            No active student accounts. Approve a pending request above or click &ldquo;Manually Add Student&rdquo;.
          </div>
        ) : filteredActiveStudents.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-8 text-center text-xs text-[#71717A]">
            No students match your search &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActiveStudents.map((student) => {
              const enrolledCourses = state.courses.filter((c) =>
                student.enrolledCourseIds.includes(c.id)
              );
              const logCount = state.activityLogs.filter(
                (l) => l.studentId === student.id
              ).length;
              const isRejected = student.status === 'rejected';

              return (
                <article
                  key={student.id}
                  className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-sm transition-colors hover:border-[#D4D4D8]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setDrawerStudentId(student.id)}
                      className="flex items-start gap-3.5 text-left min-w-0 flex-1 focus-visible:outline-none"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
                          isRejected
                            ? 'bg-red-50 text-red-600'
                            : 'bg-[#EEF2FF] text-[#4338CA]'
                        }`}
                      >
                        {student.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display text-base font-bold text-[#18181B] hover:text-[#4338CA] transition-colors">
                            {student.name}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isRejected
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]'
                            }`}
                          >
                            {isRejected ? 'Suspended / Declined' : 'Approved'}
                          </span>
                          <span className="text-xs text-[#71717A]">
                            {student.gradeLevel}
                          </span>
                        </div>

                        <p className="text-xs text-[#71717A]">
                          {student.email} · Registered {formatReadableDate(student.createdAt.slice(0, 10), false)}
                        </p>

                        {student.notes && (
                          <p className="text-xs text-[#52525B] line-clamp-1 italic">
                            &ldquo;{student.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawerStudentId(student.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-1.5 text-xs font-semibold text-[#18181B] hover:bg-[#E7E5E4]/60 whitespace-nowrap shrink-0"
                      >
                        <span>Profile &amp; Logs ({logCount})</span>
                      </button>

                      {isRejected ? (
                        <button
                          type="button"
                          onClick={() => {
                            onChangeStudentStatus(student.id, 'approved');
                            onNotify(`Reactivated access for ${student.name}`);
                          }}
                          className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onChangeStudentStatus(student.id, 'rejected');
                            onNotify(`Suspended portal access for ${student.name}`);
                          }}
                          title="Suspend student access"
                          className="rounded-lg border border-[#E7E5E4] p-1.5 text-[#71717A] hover:bg-amber-50 hover:text-amber-700"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onDeleteStudent(student.id);
                          onNotify(`Deleted student "${student.name}"`);
                        }}
                        aria-label={`Delete ${student.name}`}
                        className="rounded-lg border border-[#E7E5E4] p-1.5 text-[#71717A] hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Enrolled Courses Chips */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#F4F4F5] pt-3 text-xs">
                    <span className="font-medium text-[#71717A]">Enrolled:</span>
                    {enrolledCourses.length === 0 ? (
                      <span className="text-[#A1A1AA] italic">No courses assigned yet</span>
                    ) : (
                      enrolledCourses.map((c) => (
                        <span
                          key={c.id}
                          className="rounded-md border border-[#E7E5E4] bg-[#F8F7F4] px-2 py-0.5 text-[11px] font-semibold text-[#18181B]"
                        >
                          {c.code} · {c.batchName}
                        </span>
                      ))
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Approve & Enroll Modal */}
      {approvingStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/50 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-lg rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between border-b border-[#E7E5E4] pb-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#EA580C]">Account Approval</span>
                <h3 id="approve-modal-title" className="font-display text-lg font-bold text-[#18181B]">
                  Approve {approvingStudent.name}
                </h3>
                <p className="text-xs text-[#71717A]">
                  {approvingStudent.email} · {approvingStudent.gradeLevel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApprovingStudent(null)}
                className="rounded-lg p-1 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {approvingStudent.requestNote && (
              <div className="rounded-xl border border-[#FED7AA] bg-[#FFFBF7] p-3 text-xs text-[#78350F]">
                <strong>Student requested note:</strong> &ldquo;{approvingStudent.requestNote}&rdquo;
              </div>
            )}

            <form onSubmit={handleConfirmApproval} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#18181B]">
                  Select Course Batches to Enroll Student Upon Approval
                </label>

                {state.courses.length === 0 ? (
                  <p className="rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] p-3 text-xs text-[#71717A]">
                    No courses created yet. You can approve the student now and create courses in the Courses tab later.
                  </p>
                ) : (
                  <div className="space-y-2 rounded-2xl border border-[#E7E5E4] bg-[#F8F7F4] p-3.5">
                    {state.courses.map((course) => {
                      const checked = selectedCourseIdsForApproval.includes(course.id);
                      return (
                        <label
                          key={course.id}
                          className="flex cursor-pointer items-center justify-between rounded-xl bg-white p-2.5 text-xs font-medium text-[#18181B] border border-[#E7E5E4]"
                        >
                          <div>
                            <p className="font-semibold">{course.title} · {course.batchName}</p>
                            <p className="text-[11px] text-[#71717A]">{course.code}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleApprovalCourse(course.id)}
                            className="h-4 w-4 rounded text-[#4338CA] focus:ring-[#4338CA]"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setApprovingStudent(null)}
                  className="rounded-lg border border-[#E7E5E4] px-4 py-2 text-xs font-semibold text-[#52525B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-5 py-2 text-xs font-semibold text-white hover:bg-[#27272A]"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#F97316]" />
                  <span>Activate &amp; Enroll Student</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Student Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-add-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/50 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-lg rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#E7E5E4] pb-3.5">
              <div className="space-y-0.5">
                <h3 id="manual-add-title" className="font-display text-base font-bold text-[#18181B]">
                  Manually Add Approved Student
                </h3>
                <p className="text-xs text-[#71717A]">
                  Creates an account that is already active with immediate portal access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-[#71717A] hover:bg-[#F4F4F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleManualAddStudent} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#18181B]">Full Name</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Abdullah Khan"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#18181B]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => {
                      setAddEmail(e.target.value);
                      if (addEmailError) setAddEmailError(null);
                    }}
                    placeholder="student@gmail.com"
                    className={`w-full rounded-xl border bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B] ${
                      addEmailError ? 'border-red-400 bg-red-50/30' : 'border-[#E7E5E4]'
                    }`}
                  />
                  {addEmailError && (
                    <p className="text-[11px] font-medium text-red-600">{addEmailError}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#18181B]">Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#18181B]">Grade / Year</label>
                <input
                  type="text"
                  required
                  value={addGrade}
                  onChange={(e) => setAddGrade(e.target.value)}
                  placeholder="Year 11 / IGCSE"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#18181B]">Tutor Notes</label>
                <input
                  type="text"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Target grade, strengths, goals..."
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-[#E7E5E4] px-4 py-2 text-xs font-semibold text-[#52525B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#18181B] px-5 py-2 text-xs font-semibold text-white hover:bg-[#27272A]"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Profile & Activity Log Drawer */}
      {drawerStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-drawer-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/50 p-3 sm:p-6 backdrop-blur-[2px]"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-[#E7E5E4] bg-[#FAF9F7] p-5 sm:p-6">
              <div className="flex items-start gap-3.5 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4338CA] font-display text-base font-bold text-white">
                  {drawerStudent.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id="student-drawer-title"
                      className="font-display text-xl font-bold text-[#18181B]"
                    >
                      {drawerStudent.name}
                    </h3>
                    <span className="rounded-full border border-[#E7E5E4] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#52525B]">
                      {drawerStudent.gradeLevel}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        drawerStudent.status === 'approved'
                          ? 'bg-teal-50 text-teal-700'
                          : drawerStudent.status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {drawerStudent.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-[#71717A]">
                    {drawerStudent.email} · Registered {formatReadableDate(drawerStudent.createdAt.slice(0, 10), false)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerStudentId(null)}
                aria-label="Close student profile drawer"
                className="rounded-lg p-1.5 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-7">
              {/* 1. Enrolled Courses */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-bold text-[#18181B] flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#4338CA]" />
                    <span>Course Batch Enrollments</span>
                  </h4>
                  <span className="text-xs text-[#71717A]">
                    {drawerStudent.enrolledCourseIds.length} active
                  </span>
                </div>

                {state.courses.length === 0 ? (
                  <p className="text-xs text-[#71717A]">No courses created yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {state.courses.map((course) => {
                      const isEnrolled = drawerStudent.enrolledCourseIds.includes(course.id);
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => onToggleEnrollment(drawerStudent.id, course.id)}
                          className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                            isEnrolled
                              ? 'border-[#4338CA]/40 bg-[#EEF2FF] text-[#18181B]'
                              : 'border-[#E7E5E4] bg-[#F8F7F4] text-[#71717A] hover:border-[#D4D4D8]'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold leading-snug">
                              {course.title} · {course.batchName}
                            </p>
                            <p className="text-[11px] opacity-80">{course.code}</p>
                          </div>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                              isEnrolled ? 'bg-[#4338CA] text-white' : 'border border-[#D4D4D8] bg-white'
                            }`}
                          >
                            {isEnrolled && '✓'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 2. Assignments & Progress */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-bold text-[#18181B] flex items-center gap-2">
                    <Award className="h-4 w-4 text-[#0F766E]" />
                    <span>Assignments &amp; Submissions</span>
                  </h4>
                  <span className="text-xs text-[#71717A]">
                    {studentAssignments.length} assigned
                  </span>
                </div>

                {studentAssignments.length === 0 ? (
                  <p className="text-xs text-[#71717A]">
                    No assignments currently assigned for this student&apos;s courses.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {studentAssignments.map((asg) => {
                      const sub = studentSubmissionsMap[asg.id];
                      const status = sub?.status || 'Pending';
                      const course = courseLookup[asg.courseId];

                      return (
                        <div
                          key={asg.id}
                          className="rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] p-3.5 space-y-2"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="font-semibold text-[#4338CA]">
                                  {course?.code}
                                </span>
                                <span aria-hidden="true" className="text-[#D4D4D8]">
                                  ·
                                </span>
                                <span className="text-[#71717A] tabular-nums">
                                  Due {formatReadableDate(asg.dueDate, false)}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#18181B]">{asg.title}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                                  status === 'Graded'
                                    ? 'border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]'
                                    : status === 'Submitted'
                                    ? 'border-[#C7D2FE] bg-[#EEF2FF] text-[#4338CA]'
                                    : 'border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]'
                                }`}
                              >
                                {status}
                                {sub?.grade ? ` · ${sub.grade}` : ''}
                              </span>

                              <button
                                type="button"
                                onClick={() => openGradeModal(asg, sub)}
                                className="rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-semibold text-[#18181B] hover:bg-[#F4F4F5]"
                              >
                                {status === 'Graded' ? 'Edit Grade' : 'Grade / Review'}
                              </button>
                            </div>
                          </div>

                          {sub?.attachment && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => downloadDataUrl(sub.attachment!.fileData, sub.attachment!.fileName)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#4338CA] hover:bg-[#E0E7FF] transition-colors"
                              >
                                <FileCheck className="h-3.5 w-3.5" />
                                <span>Download Submitted PDF ({formatFileSize(sub.attachment.fileSize)})</span>
                                <Download className="h-3 w-3" />
                              </button>
                            </div>
                          )}

                          {sub?.submissionUrl && (
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                              <a
                                href={sub.submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-[#4338CA] hover:underline"
                              >
                                <span>Submitted Link</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {sub.submissionNote && (
                                <span className="text-[#71717A] truncate">
                                  &ldquo;{sub.submissionNote}&rdquo;
                                </span>
                              )}
                            </div>
                          )}

                          {sub?.teacherFeedback && (
                            <p className="rounded-lg bg-white p-2 text-[11px] text-[#0F766E] border border-[#CCFBF1]">
                              <strong>Teacher remarks:</strong> {sub.teacherFeedback}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 3. Chronological Activity Log */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-bold text-[#18181B] flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#F97316]" />
                    <span>Chronological Activity Log</span>
                  </h4>
                  <span className="text-xs text-[#71717A] tabular-nums">
                    {studentLogs.length} events recorded
                  </span>
                </div>

                {studentLogs.length === 0 ? (
                  <p className="text-xs text-[#71717A]">
                    No activity recorded for this student yet.
                  </p>
                ) : (
                  <div className="rounded-xl border border-[#E7E5E4] bg-[#FFFFFF] divide-y divide-[#F4F4F5] max-h-60 overflow-y-auto">
                    {studentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between gap-3 p-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-[#18181B]">{log.action}</p>
                          {log.details && (
                            <p className="text-[#71717A] text-[11px] truncate">{log.details}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] text-[#A1A1AA] tabular-nums">
                          {formatLogTime(log.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-[#E7E5E4] bg-[#FAF9F7] px-5 py-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setDrawerStudentId(null)}
                className="rounded-full bg-[#18181B] px-5 py-2 text-xs font-semibold text-white hover:bg-[#27272A]"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {gradingAssignment && drawerStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="grade-student-asg-title"
          className="fixed inset-0 z-60 flex items-center justify-center bg-[#18181B]/45 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-[#E7E5E4] pb-3.5">
              <div>
                <p className="text-xs font-semibold text-[#0F766E]">Grade Submission</p>
                <h3 id="grade-student-asg-title" className="font-display text-base font-bold text-[#18181B]">
                  {drawerStudent.name} · {gradingAssignment.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGradingAssignment(null)}
                aria-label="Close grading modal"
                className="rounded-lg p-1 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {gradingSubmission?.attachment && (
              <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3 text-xs space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#4338CA] flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4" />
                    <span>Submitted Student PDF</span>
                  </span>
                  <span className="text-[10px] text-[#52525B]">
                    {formatFileSize(gradingSubmission.attachment.fileSize)}
                  </span>
                </div>
                <p className="font-semibold text-[#18181B] truncate">
                  {gradingSubmission.attachment.fileName}
                </p>
                <button
                  type="button"
                  onClick={() => downloadDataUrl(gradingSubmission!.attachment!.fileData, gradingSubmission!.attachment!.fileName)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#4338CA] py-2 text-xs font-semibold text-white hover:bg-[#3730A3]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download / View Student PDF</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveGrade} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">
                  Score / Grade
                </label>
                <input
                  type="text"
                  required
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  placeholder="e.g. 38 / 40 (95%) or Grade 9"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm font-mono text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">
                  Feedback for {drawerStudent.name}
                </label>
                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Exam technique tips, strong points, improvement areas..."
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E7E5E4] pt-4">
                <button
                  type="button"
                  onClick={() => setGradingAssignment(null)}
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
