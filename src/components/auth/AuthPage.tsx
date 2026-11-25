import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { PortalState } from '../../types/portal';
import { validateStudentEmail } from '../../utils/formatters';
import { BrandMonogram } from '../BrandMonogram';
import { useTheme } from '../../hooks/useTheme';

interface AuthPageProps {
  state: PortalState;
  initialMode?: 'student-signin' | 'student-signup' | 'teacher';
  onBackToLanding?: () => void;
  onStudentLogin: (email: string, password: string, rememberMe: boolean) => Promise<{ error?: string }>;
  onStudentRegister: (data: {
    name: string;
    email: string;
    password: string;
    gradeLevel: string;
    requestNote?: string;
  }) => Promise<{ success: boolean; error?: string; confirmationRequired?: boolean }>;
  onTeacherLogin: (email: string, password: string, rememberMe: boolean) => Promise<{ error?: string }>;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  state: _state,
  initialMode = 'student-signin',
  onBackToLanding,
  onStudentLogin,
  onStudentRegister,
  onTeacherLogin,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [authRole, setAuthRole] = useState<'student' | 'teacher'>(
    initialMode === 'teacher' ? 'teacher' : 'student'
  );
  const [studentMode, setStudentMode] = useState<'signin' | 'signup'>(
    initialMode === 'student-signup' ? 'signup' : 'signin'
  );

  React.useEffect(() => {
    if (initialMode === 'student-signup') {
      setAuthRole('student');
      setStudentMode('signup');
    } else if (initialMode === 'student-signin') {
      setAuthRole('student');
      setStudentMode('signin');
    } else if (initialMode === 'teacher') {
      setAuthRole('teacher');
    }
  }, [initialMode]);

  // Remember me states
  const [studentRememberMe, setStudentRememberMe] = useState(true);
  const [teacherRememberMe, setTeacherRememberMe] = useState(true);

  // Student Sign In State
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Student Sign Up State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGrade, setRegGrade] = useState('Year 11 / IGCSE');
  const [regNote, setRegNote] = useState('');

  // Teacher Sign In State
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  // Loading spinner states for async actions
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleStudentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const result = await onStudentLogin(studentEmail.trim().toLowerCase(), studentPassword, studentRememberMe);
      if (result.error) {
        setErrorMessage(result.error);
        if (
          result.error.toLowerCase().includes('no student profile') ||
          result.error.toLowerCase().includes('complete your registration')
        ) {
          setRegEmail(studentEmail.trim().toLowerCase());
          setRegPassword(studentPassword);
          setStudentMode('signup');
        }
      }
    } catch {
      setErrorMessage('Unable to sign in right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    const emailCheck = validateStudentEmail(regEmail);
    if (!emailCheck.valid) {
      setErrorMessage(emailCheck.error || 'Please enter a valid personal or school email.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onStudentRegister({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        gradeLevel: regGrade.trim(),
        requestNote: regNote.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Unable to submit registration. Please try again.');
        return;
      }

      setSuccessMessage(
        res.confirmationRequired
          ? 'Check your email to confirm your account. Once confirmed, sign in to see your approval status.'
          : 'Registration submitted. Your account is pending teacher approval.'
      );
      setStudentMode('signin');
    } catch {
      setErrorMessage('Registration could not be completed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const result = await onTeacherLogin(teacherEmail.trim().toLowerCase(), teacherPassword, teacherRememberMe);
      if (result.error) setErrorMessage(result.error);
    } catch {
      setErrorMessage('Unable to sign in right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-[#0B0F17] px-4 py-12 selection:bg-indigo-500/20 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-[460px] space-y-6">
        <div className="flex items-center justify-between">
          {onBackToLanding ? (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors rounded-lg py-1 px-2 -ml-2"
            >
              <span>← Back to Home</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Brand Lockup with MA Monogram */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandMonogram size="lg" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            MathsByAbdullah
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official Mathematics Learning Portal for IGCSE, O Level &amp; AS Level
          </p>
        </div>

        {/* Main Auth Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
          {/* Top Role Selector */}
          <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-1.5">
            <button
              type="button"
              onClick={() => {
                setAuthRole('student');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-semibold transition-all ${
                authRole === 'student'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthRole('teacher');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-semibold transition-all ${
                authRole === 'teacher'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>Teacher Admin</span>
            </button>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Error Banner */}
            {errorMessage && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="leading-snug">{errorMessage}</p>
              </div>
            )}
            {successMessage && (
              <div role="status" className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50 dark:bg-teal-950/40 p-3 text-xs leading-relaxed text-teal-800 dark:text-teal-300">
                {successMessage}
              </div>
            )}

            {authRole === 'student' ? (
              <div className="space-y-5">
                {/* Sign In vs Sign Up Toggle */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      {studentMode === 'signin'
                        ? 'Sign in to your dashboard'
                        : 'Register for student access'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {studentMode === 'signin'
                        ? 'Access your enrolled batches and live classes'
                        : 'Verified student registrations are approved directly'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentMode(studentMode === 'signin' ? 'signup' : 'signin');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    {studentMode === 'signin' ? 'New student?' : 'Have an account?'}
                  </button>
                </div>

                {studentMode === 'signin' ? (
                  /* Student Sign In Form */
                  <form onSubmit={handleStudentSignIn} className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="std-login-email"
                        className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                      >
                        Student Email Address
                      </label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="std-login-email"
                          type="email"
                          required
                          disabled={isSubmitting}
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          placeholder="e.g. yourname@gmail.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="std-login-password"
                        className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="std-login-password"
                          type="password"
                          required
                          disabled={isSubmitting}
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Remember Me Checkbox */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={studentRememberMe}
                          onChange={(e) => setStudentRememberMe(e.target.checked)}
                          className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-600 border-slate-300 dark:border-slate-600"
                        />
                        <span className="select-none font-medium text-slate-800 dark:text-slate-200">
                          Remember me on this device
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 py-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Student View</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Student Sign Up Form */
                  <form onSubmit={handleStudentSignUp} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="reg-name"
                        className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                      >
                        Full Name
                      </label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="reg-name"
                          type="text"
                          required
                          disabled={isSubmitting}
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Taha Siddiqui"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-email"
                          className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                        >
                          Email Address
                        </label>
                        <input
                          id="reg-email"
                          type="email"
                          required
                          disabled={isSubmitting}
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="student@gmail.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-password"
                          className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                        >
                          Create Password
                        </label>
                        <input
                          id="reg-password"
                          type="password"
                          required
                          disabled={isSubmitting}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="reg-grade"
                        className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                      >
                        Academic Grade / Exam Target
                      </label>
                      <select
                        id="reg-grade"
                        value={regGrade}
                        disabled={isSubmitting}
                        onChange={(e) => setRegGrade(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-50"
                      >
                        <option value="Year 10 / IGCSE">Year 10 / IGCSE</option>
                        <option value="Year 11 / IGCSE">Year 11 / IGCSE</option>
                        <option value="Year 12 / AS Level">Year 12 / AS Level</option>
                        <option value="Year 13 / A2 Level">Year 13 / A2 Level</option>
                        <option value="O Level Candidate">O Level Candidate</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="reg-note"
                        className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                      >
                        Request Course / Note to Abdullah (Optional)
                      </label>
                      <textarea
                        id="reg-note"
                        rows={2}
                        disabled={isSubmitting}
                        value={regNote}
                        onChange={(e) => setRegNote(e.target.value)}
                        placeholder="e.g. Interested in IGCSE Mathematics Extended paper drills..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-50"
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Disposable and placeholder domains (@example.com, @test.com) are rejected. Please use your legitimate personal or school email.
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 py-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          <span>Submitting Registration...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Sign Up</span>
                          <ArrowRight className="h-4 w-4 text-teal-400" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Teacher Admin Sign In Form */
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    Teacher &amp; Administrator Login
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Access live classroom controller, approvals queue, and schedules
                  </p>
                </div>

                <form onSubmit={handleTeacherSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="teacher-login-email"
                      className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                    >
                      Teacher Portal Email
                    </label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id="teacher-login-email"
                        type="email"
                        required
                        disabled={isSubmitting}
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="Enter teacher email"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="teacher-login-password"
                      className="block text-xs font-semibold text-slate-900 dark:text-slate-200"
                    >
                      Admin Password / PIN
                    </label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id="teacher-login-password"
                        type="password"
                        required
                        disabled={isSubmitting}
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={teacherRememberMe}
                        onChange={(e) => setTeacherRememberMe(e.target.checked)}
                        className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-600 border-slate-300 dark:border-slate-600"
                      />
                      <span className="select-none font-medium text-slate-800 dark:text-slate-200">
                        Remember me on this device
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 py-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Verifying credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter Teacher Admin Workspace</span>
                        <ArrowRight className="h-4 w-4 text-teal-400" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Quiet Subtitle */}
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          MathsByAbdullah · Academic Verification &amp; Secure Session
        </p>
      </div>
    </div>
  );
};
