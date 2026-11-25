import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ToastBanner } from './components/ToastBanner';
import { TopNav } from './components/TopNav';
import { AuthPage } from './components/auth/AuthPage';
import { LandingPage } from './components/landing/LandingPage';
const PhotoToPdfScanner = lazy(() =>
  import('./components/student/PhotoToPdfScanner').then(({ PhotoToPdfScanner }) => ({ default: PhotoToPdfScanner })),
);
import { PendingApprovalPage } from './components/auth/PendingApprovalPage';
import { StudentAssignments } from './components/student/StudentAssignments';
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentSchedule } from './components/student/StudentSchedule';
import { TeacherAdmin } from './components/teacher/TeacherAdmin';
import { usePortalStore } from './hooks/usePortalStore';
import { Student, StudentStatus, StudentTab, TeacherTab, UserSession } from './types/portal';
import { supabase } from './lib/supabase';
import { selectWithOptionalColumns } from './lib/supabase-schema';

export default function App() {
  const {
    state,
    loading: portalLoading,
    loadError,
    profileDebug,
    refreshPortalData,
    logActivity,
    saveMeetingLink,
    registerStudent,
    approveStudent,
    rejectStudent,
    changeStudentStatus,
    publishLiveHero,
    addCourse,
    updateCourse,
    deleteCourse,
    addStudent,
    updateStudent,
    deleteStudent,
    toggleStudentEnrollment,
    addSession,
    updateSession,
    deleteSession,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    submitAssignment,
    retractSubmission,
    gradeAssignment,
    addMaterial,
    deleteMaterial,
    resetAllData,
  } = usePortalStore();

  const [session, setSession] = useState<UserSession>(null);
  const [sessionStudentFallback, setSessionStudentFallback] = useState<Student | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [authMode, setAuthMode] = useState<'landing' | 'student-signin' | 'student-signup' | 'teacher'>('landing');
  const [studentTab, setStudentTab] = useState<StudentTab>('dashboard');
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('live-controller');
  const [scheduleCourseFilter, setScheduleCourseFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
  }, []);

  const handleTeacherTabChange = useCallback((tab: TeacherTab) => {
    setTeacherTab(tab);
    if (tab === 'students-enrollments') void refreshPortalData();
  }, [refreshPortalData]);

  useEffect(() => {
    if (session?.role === 'teacher') void refreshPortalData();
  }, [session?.role, refreshPortalData]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const loadAuthenticatedRole = useCallback(async (userId: string, email?: string | null) => {
    const userEmail = email?.trim().toLowerCase();
    if (userEmail === 'aa6993248@gmail.com') {
      setSession({ role: 'teacher' });
      return;
    }

    const { data: profile } = await selectWithOptionalColumns(
      'profiles',
      'id,role,status,full_name,email,grade_level,notes,request_note,created_at',
      (projection) => supabase.from('profiles').select(projection).eq('id', userId).maybeSingle(),
    );

    const isTeacher = userEmail === 'aa6993248@gmail.com' || profile?.role?.trim().toLowerCase() === 'teacher';
    if (isTeacher) {
      setSession({ role: 'teacher' });
      return;
    }

    // If no profile row exists for that user in public.profiles:
    // Let them complete registration normally without showing "waiting for approval"
    if (!profile) {
      setSession(null);
      setSessionStudentFallback(null);
      setAuthMode('student-signup');
      return;
    }

    const studentStatus = (profile.status || '').trim().toLowerCase();
    // Treat accounts without a teacher role as valid student accounts unless rejected
    if (studentStatus === 'rejected') {
      await supabase.auth.signOut();
      setSession(null);
      setSessionStudentFallback(null);
      return;
    }

    const studentId = profile.id || userId;
    setSessionStudentFallback({
      id: studentId,
      name: profile.full_name || (userEmail ? userEmail.split('@')[0] : 'Student'),
      email: profile.email || userEmail || '',
      status: (studentStatus === 'approved' ? 'approved' : 'pending') as StudentStatus,
      gradeLevel: profile.grade_level || '',
      notes: profile.notes,
      requestNote: profile.request_note,
      enrolledCourseIds: [],
      createdAt: profile.created_at || new Date().toISOString(),
    });
    setSession({ role: 'student', studentId });
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        setSession(null);
        setSessionStudentFallback(null);
        setAuthLoading(false);
        return;
      }
      await loadAuthenticatedRole(data.session.user.id, data.session.user.email);
      if (active) setAuthLoading(false);
    };
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      window.setTimeout(() => {
        if (!active) return;
        if (authSession) void loadAuthenticatedRole(authSession.user.id, authSession.user.email).finally(() => setAuthLoading(false));
        else { setSession(null); setSessionStudentFallback(null); setAuthLoading(false); }
      }, 0);
    });
    void restore();
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, [loadAuthenticatedRole]);

  const handleSignOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setSessionStudentFallback(null);
    notify('Signed out of MathsByAbdullah');
  }, [notify]);

  const authenticate = useCallback(async (email: string, password: string, expectedRole: 'student' | 'teacher') => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error || !data.user) {
      if (error && import.meta.env.DEV) {
        console.error('[auth] Supabase sign-in failed', { code: error.code, status: error.status });
      }
      if (error?.code === 'invalid_credentials' || error?.code === 'user_not_found' || /invalid login credentials/i.test(error?.message || '')) {
        return { error: 'Invalid email or password.' };
      }
      if (/email not confirmed/i.test(error?.message || '')) {
        return { error: 'Please confirm your email address before signing in.' };
      }
      return { error: error?.message || 'Unable to sign in. Please try again.' };
    }

    const userEmail = data.user.email?.trim().toLowerCase();
    const { data: profile } = await selectWithOptionalColumns(
      'profiles',
      'id,role,status,full_name,email,grade_level,notes,request_note,created_at',
      (projection) => supabase.from('profiles').select(projection).eq('id', data.user.id).maybeSingle(),
    );

    const isTeacher = userEmail === 'aa6993248@gmail.com' || profile?.role?.trim().toLowerCase() === 'teacher';

    if (expectedRole === 'teacher') {
      if (isTeacher) {
        setSession({ role: 'teacher' });
        setAuthLoading(false);
        notify('Welcome Abdullah. Teacher Admin active.');
        return {};
      }
      await supabase.auth.signOut();
      return { error: 'This account is not configured for the selected portal. Please choose the correct sign-in option or contact your teacher.' };
    }

    // Expected role is student:
    if (isTeacher) {
      await supabase.auth.signOut();
      return { error: 'This account is configured for the Teacher Admin portal. Please choose Teacher Portal sign-in.' };
    }

    // If no profile row exists for that user in public.profiles:
    // Let them complete registration normally without showing "waiting for approval"
    if (!profile) {
      setSession(null);
      setSessionStudentFallback(null);
      setAuthMode('student-signup');
      setAuthLoading(false);
      return {
        error: 'No student profile was found for this account. Please complete your registration below.',
      };
    }

    const studentStatus = (profile.status || '').trim().toLowerCase();
    if (studentStatus === 'rejected') {
      await supabase.auth.signOut();
      return { error: 'Your registration request could not be approved for current tutoring cohorts at this time. Please contact Abdullah (Lead Tutor) directly.' };
    }

    const studentId = profile.id || data.user.id;
    const studentRecord: Student = {
      id: studentId,
      name: profile.full_name || data.user.user_metadata?.full_name || (userEmail ? userEmail.split('@')[0] : 'Student'),
      email: profile.email || userEmail || '',
      status: (studentStatus === 'approved' ? 'approved' : 'pending') as StudentStatus,
      gradeLevel: profile.grade_level || data.user.user_metadata?.grade_level || '',
      notes: profile.notes,
      requestNote: profile.request_note || data.user.user_metadata?.request_note,
      enrolledCourseIds: [],
      createdAt: profile.created_at || new Date().toISOString(),
    };
    setSessionStudentFallback(studentRecord);

    setSession({ role: 'student', studentId });
    setAuthLoading(false);

    if (studentStatus === 'approved') {
      logActivity(studentId, 'Logged In', 'Student session started');
      const displayName = studentRecord.name;
      notify(`Welcome back, ${displayName.split(' ')[0]}!`);
    } else if (studentStatus === 'pending') {
      notify('Your account is awaiting teacher approval.');
    }
    return {};
  }, [logActivity, notify]);

  const handleStudentLogin = useCallback((email: string, password: string) => authenticate(email, password, 'student'), [authenticate]);
  const handleTeacherLogin = useCallback((email: string, password: string) => authenticate(email, password, 'teacher'), [authenticate]);

  // Current logged in student
  const activeStudent = useMemo(() => {
    if (!session || session.role !== 'student') return null;
    const found = state.students.find(
      (s) => s.id.toLowerCase() === session.studentId.toLowerCase()
    );
    if (found) return found;
    if (sessionStudentFallback && sessionStudentFallback.id.toLowerCase() === session.studentId.toLowerCase()) {
      return sessionStudentFallback;
    }
    return null;
  }, [session, state.students, sessionStudentFallback]);

  // Pending approval requests counter for teacher top bar
  const pendingRequestsCount = useMemo(() => {
    return state.students.filter((student) => student.status.trim().toLowerCase() === 'pending').length;
  }, [state.students]);

  // Log dashboard view for approved student
  useEffect(() => {
    if (
      session?.role === 'student' &&
      activeStudent?.status.trim().toLowerCase() === 'approved' &&
      studentTab === 'dashboard'
    ) {
      logActivity(activeStudent.id, 'Viewed Dashboard', 'Overview page opened');
    }
  }, [session?.role, activeStudent?.status, activeStudent?.id, studentTab, logActivity]);

  const handleRefreshStudentApproval = useCallback(() => {
    if (!activeStudent) return;
    const status = activeStudent.status.trim().toLowerCase();
    if (status === 'approved') {
      notify('Congratulations! Your account has been approved.');
    } else if (status === 'pending') {
      notify('Still awaiting teacher verification. Please check back shortly.');
    } else {
      notify('Your registration was not approved.');
    }
  }, [activeStudent, notify]);

  const handleSelectCourseForSchedule = useCallback((courseId: string) => {
    setScheduleCourseFilter(courseId);
    setStudentTab('schedule');
  }, []);

  if (authLoading) {
    return (
      <main role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-[#0B0F17] dark:text-slate-300">
        <span className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-indigo-600/25 border-t-indigo-600 dark:border-indigo-400/25 dark:border-t-indigo-400" />
          Restoring your secure session…
        </span>
      </main>
    );
  }

  // 1. Public landing page and the selected sign-in flow
  if (!session) {
    return (
      <>
        {authMode === 'landing' ? (
          <LandingPage
            courses={state.courses}
            onOpenStudentLogin={() => setAuthMode('student-signin')}
            onOpenStudentSignup={() => setAuthMode('student-signup')}
            onOpenTeacherLogin={() => setAuthMode('teacher')}
          />
        ) : (
          <AuthPage
            key={authMode}
            state={state}
            initialMode={authMode}
            onBackToLanding={() => setAuthMode('landing')}
            onStudentLogin={handleStudentLogin}
            onStudentRegister={registerStudent}
            onTeacherLogin={handleTeacherLogin}
          />
        )}
        <ToastBanner message={toastMessage} type={toastType} onDismiss={() => setToastMessage(null)} />
      </>
    );
  }

  // 2. If logged in as student
  if (session.role === 'student') {
    // If student record was deleted by teacher in another tab or profile does not exist
    if (!activeStudent) {
      return (
        <>
          <AuthPage
            state={state}
            initialMode="student-signup"
            onBackToLanding={() => setAuthMode('landing')}
            onStudentLogin={handleStudentLogin}
            onStudentRegister={registerStudent}
            onTeacherLogin={handleTeacherLogin}
          />
          <ToastBanner
            message="No registration profile was found for this account. Please complete your registration below."
            type="error"
            onDismiss={() => setToastMessage(null)}
          />
        </>
      );
    }

    // Only show "waiting for approval" if the signed-in user's profile in public.profiles actually has status === 'pending'
    if (activeStudent.status === 'pending') {
      return (
        <>
          <PendingApprovalPage
            student={activeStudent}
            onRefreshStatus={handleRefreshStudentApproval}
            onSignOut={handleSignOut}
          />
          <ToastBanner message={toastMessage} type={toastType} onDismiss={() => setToastMessage(null)} />
        </>
      );
    }

    if (activeStudent.status !== 'approved') {
      return (
        <>
          <AuthPage
            state={state}
            initialMode="student-signup"
            onBackToLanding={() => setAuthMode('landing')}
            onStudentLogin={handleStudentLogin}
            onStudentRegister={registerStudent}
            onTeacherLogin={handleTeacherLogin}
          />
          <ToastBanner message={toastMessage} type={toastType} onDismiss={() => setToastMessage(null)} />
        </>
      );
    }

    // Approved student: Full Classroom Dashboard
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 transition-colors">
        <TopNav
          role="student"
          studentTab={studentTab}
          onStudentTabChange={setStudentTab}
          activeStudent={activeStudent}
          onSignOut={handleSignOut}
        />

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-8 sm:px-6 lg:py-10">
          {studentTab === 'dashboard' && (
            <StudentDashboard
              state={state}
              activeStudent={activeStudent}
              onNavigateTab={setStudentTab}
              onSelectCourseForSchedule={handleSelectCourseForSchedule}
              onLogActivity={logActivity}
              onSwitchToTeacher={() => {}}
            />
          )}

          {studentTab === 'schedule' && (
            <StudentSchedule
              state={state}
              activeStudent={activeStudent}
              selectedCourseFilter={scheduleCourseFilter}
              onCourseFilterChange={setScheduleCourseFilter}
              onLogActivity={logActivity}
              onSwitchToTeacher={() => {}}
            />
          )}

          {studentTab === 'photo-to-pdf' && (
            <Suspense fallback={<div role="status" className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400">Loading photo scanner…</div>}>
              <PhotoToPdfScanner
                state={state}
                activeStudent={activeStudent}
                onSubmitAssignment={submitAssignment}
                onNotify={notify}
                onNavigateTab={setStudentTab}
              />
            </Suspense>
          )}

          {studentTab === 'assignments' && (
            <StudentAssignments
              state={state}
              activeStudent={activeStudent}
              onSubmitAssignment={submitAssignment}
              onRetractSubmission={retractSubmission}
              onNotify={notify}
              onSwitchToTeacher={() => {}}
              onNavigateTab={setStudentTab}
            />
          )}
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>MathsByAbdullah · Mathematics Tutoring Portal</p>
            <p>Signed in as {activeStudent.name} ({activeStudent.gradeLevel})</p>
          </div>
        </footer>

        <ToastBanner message={toastMessage} type={toastType} onDismiss={() => setToastMessage(null)} />
      </div>
    );
  }

  // 3. If logged in as Teacher: Full Teacher Admin Workspace
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 transition-colors">
      <TopNav
        role="teacher"
        teacherTab={teacherTab}
        onTeacherTabChange={handleTeacherTabChange}
        pendingRequestsCount={pendingRequestsCount}
        onSignOut={handleSignOut}
      />

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-8 sm:px-6 lg:py-10">
        {loadError && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">
            Supabase save/load error: {loadError}
          </div>
        )}
        <TeacherAdmin
          state={state}
          profileDebug={profileDebug}
          activeTab={teacherTab}
          onTabChange={handleTeacherTabChange}
          onSaveMeetingLink={saveMeetingLink}
          onPublishHero={publishLiveHero}
          onAddCourse={addCourse}
          onUpdateCourse={updateCourse}
          onDeleteCourse={deleteCourse}
          onApproveStudent={approveStudent}
          onRejectStudent={rejectStudent}
          onChangeStudentStatus={changeStudentStatus}
          onAddStudent={addStudent}
          onUpdateStudent={updateStudent}
          onDeleteStudent={deleteStudent}
          onToggleEnrollment={toggleStudentEnrollment}
          onAddSession={addSession}
          onUpdateSession={updateSession}
          onDeleteSession={deleteSession}
          onAddAssignment={addAssignment}
          onUpdateAssignment={updateAssignment}
          onGradeAssignment={gradeAssignment}
          onDeleteAssignment={deleteAssignment}
          onAddMaterial={addMaterial}
          onDeleteMaterial={deleteMaterial}
          onResetAllData={resetAllData}
          onNotify={notify}
        />
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>MathsByAbdullah · Teacher &amp; Lead Tutor Workspace</p>
          <div className="flex items-center gap-3">
            {pendingRequestsCount > 0 && (
              <button
                type="button"
                onClick={() => handleTeacherTabChange('students-enrollments')}
                className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                {pendingRequestsCount} pending approval request(s)
              </button>
            )}
            <span>Logged in as Abdullah (Lead Tutor)</span>
          </div>
        </div>
      </footer>

      <ToastBanner message={toastMessage} type={toastType} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
