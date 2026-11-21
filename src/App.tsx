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
import { StudentTab, TeacherTab, UserSession } from './types/portal';
import { supabase } from './lib/supabase';
import { selectWithOptionalColumns } from './lib/supabase-schema';

export default function App() {
  const {
    state,
    loading: portalLoading,
    loadError,
    submissionLoadError,
    submissionsReady,
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
  const [authLoading, setAuthLoading] = useState(true);

  const [authMode, setAuthMode] = useState<'landing' | 'student-signin' | 'student-signup' | 'teacher'>('landing');
  const [studentTab, setStudentTab] = useState<StudentTab>('dashboard');
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('live-controller');
  const [scheduleCourseFilter, setScheduleCourseFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setToastMessage(message);
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
    if (email?.trim().toLowerCase() === 'aa6993248@gmail.com') {
      setSession({ role: 'teacher' });
      return;
    }

    const { data: profile, error } = await selectWithOptionalColumns(
      'profiles',
      'id,role,status,full_name',
      (projection) => supabase.from('profiles').select(projection).eq('id', userId).maybeSingle(),
    );
    if (error || !profile) {
      setSession(null);
      return;
    }
    setSession(profile.role?.trim().toLowerCase() === 'teacher' ? { role: 'teacher' } : { role: 'student', studentId: profile.id });
  }, [notify]);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        setSession(null);
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
        else { setSession(null); setAuthLoading(false); }
      }, 0);
    });
    void restore();
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, [loadAuthenticatedRole]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    notify('Signed out of MathsByAbdullah');
  }, [notify]);

  const authenticate = useCallback(async (email: string, password: string, expectedRole: 'student' | 'teacher') => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password.trim(),
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
    if (expectedRole === 'teacher' && userEmail === 'aa6993248@gmail.com') {
      setSession({ role: 'teacher' });
      setAuthLoading(false);
      notify('Welcome Abdullah. Teacher Admin active.');
      return {};
    }

    const { data: profile, error: profileError } = await selectWithOptionalColumns(
      'profiles',
      'id,role,status,full_name,email',
      (projection) => supabase.from('profiles').select(projection).eq('id', data.user.id).maybeSingle(),
    );
    if (profileError || !profile || profile.role?.trim().toLowerCase() !== expectedRole) {
      await supabase.auth.signOut();
      if (profileError && import.meta.env.DEV) {
        console.error('[auth] Profile lookup failed', { code: profileError.code,  });
      }
      return { error: profileError?.message || 'Invalid email or password.' };
    }
    setSession(expectedRole === 'teacher' ? { role: 'teacher' } : { role: 'student', studentId: profile.id });
    setAuthLoading(false);
    if (expectedRole === 'student') {
      if (profile.status?.trim().toLowerCase() === 'approved') {
        logActivity(profile.id, 'Logged In', 'Student session started');
        const displayName = profile.full_name || profile.email || 'student';
        notify(`Welcome back, ${displayName.split(' ')[0]}!`);
      } else {
        notify('Your account is awaiting teacher approval.');
      }
    } else {
      notify('Welcome Abdullah. Teacher Admin active.');
    }
    return {};
  }, [logActivity, notify]);

  const handleStudentLogin = useCallback((email: string, password: string) => authenticate(email, password, 'student'), [authenticate]);
  const handleTeacherLogin = useCallback((email: string, password: string) => authenticate(email, password, 'teacher'), [authenticate]);

  // Current logged in student
  const activeStudent = useMemo(() => {
    if (!session || session.role !== 'student') return null;
    return state.students.find((s) => s.id === session.studentId) || null;
  }, [session, state.students]);

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
        <ToastBanner message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </>
    );
  }

  // 2. If logged in as student
  if (session.role === 'student') {
    // If student record was deleted by teacher in another tab
    if (!activeStudent) {
      return (
        <>
          <AuthPage
            state={state}
            onStudentLogin={handleStudentLogin}
            onStudentRegister={registerStudent}
            onTeacherLogin={handleTeacherLogin}
          />
          <ToastBanner
            message="Your account session expired or was removed. Please log in again."
            onDismiss={() => setToastMessage(null)}
          />
        </>
      );
    }

    // If student status is pending or rejected: Dedicated Status Gate
    if (activeStudent.status !== 'approved') {
      return (
        <>
          <PendingApprovalPage
            student={activeStudent}
            onRefreshStatus={handleRefreshStudentApproval}
            onSignOut={handleSignOut}
          />
          <ToastBanner message={toastMessage} onDismiss={() => setToastMessage(null)} />
        </>
      );
    }

    // Approved student: Full Classroom Dashboard
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#18181B]">
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
    <Suspense fallback={<div role="status" className="flex min-h-[40vh] items-center justify-center text-sm text-[#71717A]">Loading photo scanner…</div>}>
      <PhotoToPdfScanner
        state={state}
        activeStudent={activeStudent}
        submissionsReady={submissionsReady}
        submissionLoadError={submissionLoadError}
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
              submissionsReady={submissionsReady}
              submissionLoadError={submissionLoadError}
              onRefreshSubmissions={refreshPortalData}
              onSubmitAssignment={submitAssignment}
              onRetractSubmission={retractSubmission}
              onNotify={notify}
              onSwitchToTeacher={() => {}}
              onNavigateTab={setStudentTab}
            />
          )}
        </main>

        <footer className="border-t border-[#E7E5E4] bg-[#F8F7F4]">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-xs text-[#71717A] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>MathsByAbdullah · Mathematics Tutoring Portal</p>
            <p>Signed in as {activeStudent.name} ({activeStudent.gradeLevel})</p>
          </div>
        </footer>

        <ToastBanner message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </div>
    );
  }

  // 3. If logged in as Teacher: Full Teacher Admin Workspace
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#18181B]">
      <TopNav
        role="teacher"
        teacherTab={teacherTab}
        onTeacherTabChange={handleTeacherTabChange}
        pendingRequestsCount={pendingRequestsCount}
        onSignOut={handleSignOut}
      />

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-8 sm:px-6 lg:py-10">
        {loadError && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
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

      <footer className="border-t border-[#E7E5E4] bg-[#F8F7F4]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-xs text-[#71717A] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>MathsByAbdullah · Teacher &amp; Lead Tutor Workspace</p>
          <div className="flex items-center gap-3">
            {pendingRequestsCount > 0 && (
              <button
                type="button"
                onClick={() => handleTeacherTabChange('students-enrollments')}
                className="font-semibold text-[#EA580C] hover:underline"
              >
                {pendingRequestsCount} pending approval request(s)
              </button>
            )}
            <span>Logged in as Abdullah (Lead Tutor)</span>
          </div>
        </div>
      </footer>

      <ToastBanner message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
