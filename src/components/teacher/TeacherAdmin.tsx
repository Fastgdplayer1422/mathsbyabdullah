import React, { useMemo, useState } from 'react';
import type { ProfileQueryDebug } from '../../hooks/usePortalStore';
import {
  BookOpen,
  Calendar,
  FolderKanban,
  Radio,
  RotateCcw,
  Users,
  Video,
} from 'lucide-react';
import {
  Assignment,
  Course,
  LiveSessionHero,
  PortalState,
  ScheduleSession,
  Student,
  StudentStatus,
  StudyMaterial,
  TeacherTab,
} from '../../types/portal';
import { ClassroomMeetingLink } from './ClassroomMeetingLink';
import { ContentManager } from './ContentManager';
import { CoursesManager } from './CoursesManager';
import { ScheduleManager } from './ScheduleManager';
import { StudentsManager } from './StudentsManager';

interface TeacherAdminProps {
  state: PortalState;
  profileDebug: ProfileQueryDebug;
  activeTab: TeacherTab;
  onTabChange: (tab: TeacherTab) => void;
  onSaveMeetingLink: (url: string) => Promise<boolean>;
  onPublishHero: (hero: Omit<LiveSessionHero, 'updatedAt'> | null) => Promise<boolean>;
  onAddCourse: (course: Omit<Course, 'id'>) => Promise<boolean>;
  onUpdateCourse: (id: string, updates: Partial<Omit<Course, 'id'>>) => Promise<boolean>;
  onDeleteCourse: (id: string) => void;
  onApproveStudent: (studentId: string, courseIds: string[]) => void;
  onRejectStudent: (studentId: string) => void;
  onChangeStudentStatus: (studentId: string, status: StudentStatus) => void;
  onAddStudent: (student: Omit<Student, 'id' | 'createdAt'>, initialPassword: string) => Promise<Student>;
  onUpdateStudent: (id: string, updates: Partial<Omit<Student, 'id' | 'createdAt'>>) => void;
  onDeleteStudent: (id: string) => void;
  onToggleEnrollment: (studentId: string, courseId: string) => void;
  onAddSession: (session: Omit<ScheduleSession, 'id'>) => Promise<boolean>;
  onUpdateSession: (id: string, updates: Partial<Omit<ScheduleSession, 'id'>>) => Promise<boolean>;
  onDeleteSession: (id: string) => void;
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
  onResetAllData: () => void;
  onNotify: (msg: string) => void;
}

export const TeacherAdmin: React.FC<TeacherAdminProps> = ({
  state,
  profileDebug,
  activeTab,
  onTabChange,
  onSaveMeetingLink,
  onPublishHero,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onApproveStudent,
  onRejectStudent,
  onChangeStudentStatus,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onToggleEnrollment,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onAddAssignment,
  onUpdateAssignment,
  onGradeAssignment,
  onDeleteAssignment,
  onAddMaterial,
  onDeleteMaterial,
  onResetAllData,
  onNotify,
}) => {
  const [confirmWipe, setConfirmWipe] = useState(false);

  const pendingCount = useMemo(
    () => state.students.filter((student) => student.status.trim().toLowerCase() === 'pending').length,
    [state.students]
  );

  return (
    <div className="space-y-7">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4 border-b border-[#E7E5E4] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
            Teacher Admin Control Panel · Lead Tutor Mode
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Manage Classes, Enrollments &amp; Activity
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Wipe All Data Button */}
          {!confirmWipe ? (
            <button
              type="button"
              onClick={() => setConfirmWipe(true)}
              title="Reset portal to clean slate with empty data"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-700 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset All Data</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-1.5">
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">Wipe all data to empty?</span>
              <button
                type="button"
                onClick={() => {
                  onResetAllData();
                  setConfirmWipe(false);
                  onNotify('Reset all data to clean slate');
                }}
                className="rounded-md bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Confirm Wipe
              </button>
              <button
                type="button"
                onClick={() => setConfirmWipe(false)}
                className="rounded-md px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Focused Section Tabs */}
      <div
        role="tablist"
        aria-label="Teacher admin sections"
        className="flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'live-controller'}
          onClick={() => onTabChange('live-controller')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'live-controller'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Video
            className={`h-3.5 w-3.5 ${
              activeTab === 'live-controller' ? 'text-teal-400' : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <span>1. Classroom Meeting Link</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'schedule-manager'}
          onClick={() => onTabChange('schedule-manager')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'schedule-manager'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar
            className={`h-3.5 w-3.5 ${
              activeTab === 'schedule-manager' ? 'text-teal-400' : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <span>2. Schedule</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'content-manager'}
          onClick={() => onTabChange('content-manager')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'content-manager'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FolderKanban
            className={`h-3.5 w-3.5 ${
              activeTab === 'content-manager' ? 'text-teal-400' : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <span>3. Assignments &amp; Notes</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'courses-manager'}
          onClick={() => onTabChange('courses-manager')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'courses-manager'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen
            className={`h-3.5 w-3.5 ${
              activeTab === 'courses-manager' ? 'text-indigo-400' : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <span>4. Courses &amp; Batches ({state.courses.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'students-enrollments'}
          onClick={() => onTabChange('students-enrollments')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'students-enrollments'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users
            className={`h-3.5 w-3.5 ${
              activeTab === 'students-enrollments' ? 'text-indigo-400' : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <span>5. Students &amp; Approvals</span>
          {pendingCount > 0 && (
            <span
              className="rounded-full bg-teal-600 px-1.5 py-0.2 text-[10px] font-bold text-white tabular-nums"
              title={`${pendingCount} pending registration request(s)`}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'live-controller' && (
        <ClassroomMeetingLink
          state={state}
          onSaveMeetingLink={onSaveMeetingLink}
          onNotify={onNotify}
          onPreviewStudentView={() => onTabChange('students-enrollments')}
        />
      )}

      {activeTab === 'schedule-manager' && (
        <ScheduleManager
          state={state}
          onAddSession={onAddSession}
          onUpdateSession={onUpdateSession}
          onDeleteSession={onDeleteSession}
          onPromoteToLiveHero={onPublishHero}
          onNotify={onNotify}
        />
      )}

      {activeTab === 'content-manager' && (
        <ContentManager
          state={state}
          onAddAssignment={onAddAssignment}
          onUpdateAssignment={onUpdateAssignment}
          onGradeAssignment={onGradeAssignment}
          onDeleteAssignment={onDeleteAssignment}
          onAddMaterial={onAddMaterial}
          onDeleteMaterial={onDeleteMaterial}
          onNotify={onNotify}
        />
      )}

      {activeTab === 'courses-manager' && (
        <CoursesManager
          state={state}
          onAddCourse={onAddCourse}
          onUpdateCourse={onUpdateCourse}
          onDeleteCourse={onDeleteCourse}
          onToggleEnrollment={onToggleEnrollment}
          onNotify={onNotify}
        />
      )}

      {activeTab === 'students-enrollments' && (
        <StudentsManager
          state={state}
          profileDebug={profileDebug}
          onApproveStudent={onApproveStudent}
          onRejectStudent={onRejectStudent}
          onChangeStudentStatus={onChangeStudentStatus}
          onAddStudent={onAddStudent}
          onUpdateStudent={onUpdateStudent}
          onDeleteStudent={onDeleteStudent}
          onToggleEnrollment={onToggleEnrollment}
          onGradeAssignment={onGradeAssignment}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
