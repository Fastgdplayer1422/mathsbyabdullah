import React, { useState } from 'react';
import { Loader2, LogOut, Moon, Sun } from 'lucide-react';
import { RoleMode, Student, StudentTab, TeacherTab } from '../types/portal';
import { BrandMonogram } from './BrandMonogram';
import { useTheme } from '../hooks/useTheme';

interface TopNavProps {
  role: RoleMode;
  studentTab?: StudentTab;
  onStudentTabChange?: (tab: StudentTab) => void;
  teacherTab?: TeacherTab;
  onTeacherTabChange?: (tab: TeacherTab) => void;
  activeStudent?: Student | null;
  pendingRequestsCount?: number;
  onSignOut: () => Promise<void> | void;
}

const STUDENT_TABS: { id: StudentTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'photo-to-pdf', label: 'Photo to PDF' },
];

const TEACHER_TABS: { id: TeacherTab; label: string }[] = [
  { id: 'live-controller', label: 'Meeting Link' },
  { id: 'schedule-manager', label: 'Schedule' },
  { id: 'content-manager', label: 'Assignments & Notes' },
  { id: 'courses-manager', label: 'Courses' },
  { id: 'students-enrollments', label: 'Students & Approvals' },
];

export const TopNav: React.FC<TopNavProps> = ({
  role,
  studentTab = 'dashboard',
  onStudentTabChange,
  teacherTab = 'live-controller',
  onTeacherTabChange,
  activeStudent,
  pendingRequestsCount = 0,
  onSignOut,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  const handleSignOutClick = async () => {
    setIsSigningOut(true);
    setSignOutError(false);
    try {
      await onSignOut();
    } catch {
      setSignOutError(true);
    } finally {
      setIsSigningOut(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:gap-6">
        {/* Left: Brand Monogram (MA) + MathsByAbdullah */}
        <div className="flex shrink-0 items-center gap-2.5">
          <BrandMonogram size="sm" />
          <span className="font-display text-[17px] font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            MathsByAbdullah
          </span>
        </div>

        {/* Center: Navigation Tabs (Desktop) */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-6">
          {role === 'student' && onStudentTabChange
            ? STUDENT_TABS.map((tab) => {
                const active = studentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onStudentTabChange(tab.id)}
                    className={`relative py-1.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded ${
                      active
                        ? 'text-slate-900 dark:text-slate-100 font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 -bottom-[13px] h-[2px] bg-indigo-600 dark:bg-indigo-400"
                      />
                    )}
                  </button>
                );
              })
            : onTeacherTabChange &&
              TEACHER_TABS.map((tab) => {
                const active = teacherTab === tab.id;
                const isStudentTab = tab.id === 'students-enrollments';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTeacherTabChange(tab.id)}
                    className={`relative inline-flex items-center gap-1.5 py-1.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded ${
                      active
                        ? 'text-slate-900 dark:text-slate-100 font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isStudentTab && pendingRequestsCount > 0 && (
                      <span
                        className="inline-flex items-center justify-center rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums leading-none"
                        title={`${pendingRequestsCount} pending approval request(s)`}
                      >
                        {pendingRequestsCount}
                      </span>
                    )}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 -bottom-[13px] h-[2px] bg-indigo-600 dark:bg-indigo-400"
                      />
                    )}
                  </button>
                );
              })}
        </nav>

        {/* Right: Theme Toggle + User Profile Badge + Sign Out Button */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
            )}
          </button>

          {/* Profile Badge */}
          <div
            className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 pl-1.5 pr-3 shrink-0"
            title={
              role === 'student' && activeStudent
                ? `${activeStudent.name} (${activeStudent.gradeLevel})`
                : 'Abdullah (Lead Tutor)'
            }
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                role === 'student' ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-900 dark:bg-slate-700'
              }`}
            >
              {role === 'student'
                ? activeStudent
                  ? getInitials(activeStudent.name)
                  : 'ST'
                : 'MA'}
            </span>
            <span className="text-xs font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap max-w-[130px] truncate">
              {role === 'student'
                ? activeStudent
                  ? activeStudent.name
                  : 'Student'
                : 'Abdullah'}
            </span>
          </div>

          {signOutError && <span role="alert" className="max-w-24 text-[10px] font-medium text-red-600 dark:text-red-400">Sign-out failed</span>}
          {/* Sign Out Button with Loading Spinner */}
          <button
            type="button"
            onClick={handleSignOutClick}
            disabled={isSigningOut}
            aria-busy={isSigningOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 disabled:cursor-wait disabled:opacity-50"
          >
            {isSigningOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-hidden="true" />
            ) : (
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isSigningOut ? 'Signing out…' : 'Sign Out'}</span>
            <span className="sr-only sm:hidden">{isSigningOut ? 'Signing out' : 'Sign out'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Strip */}
      <nav
        aria-label="Mobile navigation"
        className="flex lg:hidden items-center gap-2 overflow-x-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2"
      >
        {role === 'student' && onStudentTabChange
          ? STUDENT_TABS.map((tab) => {
              const active = studentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStudentTabChange(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })
          : onTeacherTabChange &&
            TEACHER_TABS.map((tab) => {
              const active = teacherTab === tab.id;
              const isStudentTab = tab.id === 'students-enrollments';
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTeacherTabChange(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isStudentTab && pendingRequestsCount > 0 && (
                    <span className="rounded-full bg-teal-500 px-1.5 py-0.2 text-[9px] font-bold text-white tabular-nums">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              );
            })}
      </nav>
    </header>
  );
};
