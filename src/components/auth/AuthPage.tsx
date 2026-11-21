import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { PortalState } from '../../types/portal';
import { validateStudentEmail } from '../../utils/formatters';
import { BrandMonogram } from '../BrandMonogram';

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
  state,
  initialMode = 'student-signin',
  onBackToLanding,
  onStudentLogin,
  onStudentRegister,
  onTeacherLogin,
}) => {
  const [authRole, setAuthRole] = useState<'student' | 'teacher'>(
    initialMode === 'teacher' ? 'teacher' : 'student'
  );
  const [studentMode, setStudentMode] = useState<'signin' | 'signup'>(
    initialMode === 'student-signup' ? 'signup' : 'signin'
  );

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

  // Teacher Sign In State (private & unpopulated)
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  // Form error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleStudentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const result = await onStudentLogin(studentEmail.trim().toLowerCase(), studentPassword, studentRememberMe);
    if (result.error) setErrorMessage(result.error);
  };

  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    // Strict client-side email domain validation
    const emailCheck = validateStudentEmail(regEmail);
    if (!emailCheck.valid) {
      setErrorMessage(emailCheck.error || 'Please enter a valid personal or school email.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

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

    setSuccessMessage(res.confirmationRequired
      ? 'Check your email to confirm your account. Once confirmed, sign in to see your approval status.'
      : 'Registration submitted. Your account is pending teacher approval.');
    setStudentMode('signin');
  };

  const handleTeacherSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const result = await onTeacherLogin(teacherEmail.trim().toLowerCase(), teacherPassword, teacherRememberMe);
    if (result.error) setErrorMessage(result.error);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8F7F4] px-4 py-12 selection:bg-[#4338CA]/15 selection:text-[#4338CA]">
      <div className="w-full max-w-[460px] space-y-6">
        {onBackToLanding && (
          <div>
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52525B] hover:text-[#18181B] transition-colors rounded-lg py-1 px-2 -ml-2"
            >
              <span>← Back to Home</span>
            </button>
          </div>
        )}

        {/* Brand Lockup with MA Monogram */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandMonogram size="lg" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#18181B]">
            MathsByAbdullah
          </h1>
          <p className="text-xs text-[#71717A]">
            Official Mathematics Learning Portal for IGCSE, O Level &amp; AS Level
          </p>
        </div>

        {/* Main Auth Card */}
        <div className="overflow-hidden rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] shadow-sm">
          {/* Top Role Selector */}
          <div className="grid grid-cols-2 border-b border-[#E7E5E4] bg-[#FAF9F7] p-1.5">
            <button
              type="button"
              onClick={() => {
                setAuthRole('student');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-semibold transition-all ${
                authRole === 'student'
                  ? 'bg-white text-[#18181B] shadow-sm'
                  : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              <GraduationCap className="h-4 w-4 text-[#4338CA]" />
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
                  ? 'bg-white text-[#18181B] shadow-sm'
                  : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-[#F97316]" />
              <span>Teacher Admin</span>
            </button>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Error Banner */}
            {errorMessage && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="leading-snug">{errorMessage}</p>
              </div>
            )}
            {successMessage && (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-800">
                {successMessage}
              </div>
            )}

            {authRole === 'student' ? (
              <div className="space-y-5">
                {/* Sign In vs Sign Up Toggle */}
                <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-[#18181B]">
                      {studentMode === 'signin'
                        ? 'Sign in to your dashboard'
                        : 'Register for student access'}
                    </h2>
                    <p className="text-xs text-[#71717A]">
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
                    className="text-xs font-semibold text-[#4338CA] hover:underline whitespace-nowrap shrink-0"
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
                        className="block text-xs font-semibold text-[#18181B]"
                      >
                        Student Email Address
                      </label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
                          aria-hidden="true"
                        />
                        <input
                          id="std-login-email"
                          type="email"
                          required
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          placeholder="e.g. yourname@gmail.com"
                          className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] py-2.5 pl-10 pr-3.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="std-login-password"
                        className="block text-xs font-semibold text-[#18181B]"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
                          aria-hidden="true"
                        />
                        <input
                          id="std-login-password"
                          type="password"
                          required
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] py-2.5 pl-10 pr-3.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Remember Me Checkbox */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex cursor-pointer items-center gap-2 text-[#52525B]">
                        <input
                          type="checkbox"
                          checked={studentRememberMe}
                          onChange={(e) => setStudentRememberMe(e.target.checked)}
                          className="h-3.5 w-3.5 rounded text-[#4338CA] focus:ring-[#4338CA]"
                        />
                        <span className="select-none font-medium text-[#18181B]">
                          Remember me on this device
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#18181B] py-3 text-xs font-semibold text-white transition-colors hover:bg-[#27272A]"
                    >
                      <span>Sign In to Student View</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  /* Student Sign Up Form */
                  <form onSubmit={handleStudentSignUp} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="reg-name"
                        className="block text-xs font-semibold text-[#18181B]"
                      >
                        Full Name
                      </label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
                          aria-hidden="true"
                        />
                        <input
                          id="reg-name"
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Taha Siddiqui"
                          className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] py-2 pl-10 pr-3 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-email"
                          className="block text-xs font-semibold text-[#18181B]"
                        >
                          Email Address
                        </label>
                        <input
                          id="reg-email"
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="student@gmail.com"
                          className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-password"
                          className="block text-xs font-semibold text-[#18181B]"
                        >
                          Create Password
                        </label>
                        <input
                          id="reg-password"
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="reg-grade"
                        className="block text-xs font-semibold text-[#18181B]"
                      >
                        Academic Grade / Exam Target
                      </label>
                      <select
                        id="reg-grade"
                        value={regGrade}
                        onChange={(e) => setRegGrade(e.target.value)}
                        className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
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
                        className="block text-xs font-semibold text-[#18181B]"
                      >
                        Request Course / Note to Abdullah (Optional)
                      </label>
                      <textarea
                        id="reg-note"
                        rows={2}
                        value={regNote}
                        onChange={(e) => setRegNote(e.target.value)}
                        placeholder="e.g. Interested in IGCSE Mathematics Extended paper drills..."
                        className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-xs text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <p className="text-[11px] text-[#71717A]">
                      Disposable and placeholder domains (@example.com, @test.com) are rejected. Please use your legitimate personal or school email.
                    </p>

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#18181B] py-3 text-xs font-semibold text-white transition-colors hover:bg-[#27272A]"
                    >
                      <span>Submit Sign Up</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Teacher Admin Sign In Form */
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-base font-bold text-[#18181B]">
                    Teacher &amp; Administrator Login
                  </h2>
                  <p className="text-xs text-[#71717A]">
                    Access live classroom controller, approvals queue, and schedules
                  </p>
                </div>

                <form onSubmit={handleTeacherSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="teacher-login-email"
                      className="block text-xs font-semibold text-[#18181B]"
                    >
                      Teacher Portal Email
                    </label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
                        aria-hidden="true"
                      />
                      <input
                        id="teacher-login-email"
                        type="email"
                        required
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="Enter teacher email"
                        className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] py-2.5 pl-10 pr-3.5 text-sm text-[#18181B] focus:border-[#F97316] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="teacher-login-password"
                      className="block text-xs font-semibold text-[#18181B]"
                    >
                      Admin Password / PIN
                    </label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
                        aria-hidden="true"
                      />
                      <input
                        id="teacher-login-password"
                        type="password"
                        required
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] py-2.5 pl-10 pr-3.5 text-sm text-[#18181B] focus:border-[#F97316] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex cursor-pointer items-center gap-2 text-[#52525B]">
                      <input
                        type="checkbox"
                        checked={teacherRememberMe}
                        onChange={(e) => setTeacherRememberMe(e.target.checked)}
                        className="h-3.5 w-3.5 rounded text-[#F97316] focus:ring-[#F97316]"
                      />
                      <span className="select-none font-medium text-[#18181B]">
                        Remember me on this device
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#18181B] py-3 text-xs font-semibold text-white transition-colors hover:bg-[#27272A]"
                  >
                    <span>Enter Teacher Admin Workspace</span>
                    <ArrowRight className="h-4 w-4 text-[#F97316]" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Quiet Subtitle */}
        <p className="text-center text-[11px] text-[#A1A1AA]">
          MathsByAbdullah · Academic Verification &amp; Secure Session
        </p>
      </div>
    </div>
  );
};
