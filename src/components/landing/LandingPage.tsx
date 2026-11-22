import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  LogIn,
  Menu,
  Moon,
  Smartphone,
  Sun,
  UserPlus,
  Video,
  X,
} from 'lucide-react';
import { Course } from '../../types/portal';
import { BrandMonogram } from '../BrandMonogram';
import { useTheme } from '../../hooks/useTheme';

interface LandingPageProps {
  courses: Course[];
  onOpenStudentLogin: () => void;
  onOpenStudentSignup: () => void;
  onOpenTeacherLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  courses,
  onOpenStudentLogin,
  onOpenStudentSignup,
  onOpenTeacherLogin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500/20 transition-colors">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-3.5">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <BrandMonogram size="md" />
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  MathsByAbdullah
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Mathematics Tutoring Portal
                </span>
              </div>
            </div>

            {/* Desktop Anchor Links */}
            <nav aria-label="Landing page navigation" className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <a href="#curriculum" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Curriculum &amp; Batches
              </a>
              <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Key Features
              </a>
              <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                How It Works
              </a>
              <a href="#photo-to-pdf" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Photo-to-PDF
              </a>
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={onOpenTeacherLogin}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white"
                title="Teacher Portal Login"
              >
                <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span className="hidden sm:inline">Teacher Portal</span>
                <span className="sm:hidden">Teacher</span>
              </button>

              <button
                type="button"
                onClick={onOpenStudentLogin}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Student Sign In</span>
              </button>

              <button
                type="button"
                onClick={onOpenStudentSignup}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-900 dark:bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-indigo-500 shadow-xs"
              >
                <span>Join as Student</span>
                <ArrowRight className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                {theme === 'dark' ? <Sun className="size-4 text-amber-300" /> : <Moon className="size-4" />}
              </button>

              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="landing-mobile-menu"
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                {mobileMenuOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div id="landing-mobile-menu" className="border-t border-slate-200 dark:border-slate-800 pb-4 pt-3 sm:hidden">
              <nav aria-label="Mobile landing page navigation" className="grid gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                <a href="#curriculum" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800">Curriculum &amp; Batches</a>
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800">Key Features</a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800">How It Works</a>
                <a href="#photo-to-pdf" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800">Photo-to-PDF</a>
              </nav>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenTeacherLogin(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <Lock className="size-4" aria-hidden="true" /> Teacher Portal
                </button>
                <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenStudentLogin(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <LogIn className="size-4" aria-hidden="true" /> Student Sign In
                </button>
                <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenStudentSignup(); }} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 px-4 text-sm font-semibold text-white">
                  Join as a Student <ArrowRight className="size-4 text-teal-400" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. Hero Section with Subtle Geometric Pattern Overlay (~10% opacity) */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:pt-28 lg:pb-32">
        {/* Subtle Geometric / Grid Background Pattern (~10% opacity) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <svg
            className="absolute inset-0 h-full w-full stroke-slate-300 dark:stroke-slate-700 [mask-image:radial-gradient(100%_100%_at_top_center,white,transparent_80%)] opacity-10 dark:opacity-[0.08]"
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="landing-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="1" />
                <circle cx="40" cy="0" r="1.5" className="fill-slate-400 dark:fill-slate-600" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#landing-grid-pattern)" />
          </svg>
        </div>

        <div className="mx-auto max-w-[1240px]">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            {/* Main Headline */}
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl lg:text-6xl sm:leading-[1.12] text-balance">
              Focused Mathematics Tutoring. <br />
              <span className="text-indigo-600 dark:text-indigo-400">Structured for Real Mastery.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base text-slate-600 dark:text-slate-400 sm:text-lg sm:leading-relaxed text-balance">
              Live interactive small-group batches, fixed recurring weekly timetables, curated notes,
              and past-paper resources—designed to turn complex mathematical methods into instinctive
              problem-solving skills.
            </p>

            {/* Hero Action Buttons */}
            <div className="flex flex-col items-center justify-center gap-3 pt-3 sm:flex-row sm:gap-4">
              <button
                type="button"
                onClick={onOpenStudentSignup}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-slate-900 dark:bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white transition-transform hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-[0.99] shadow-md"
              >
                <UserPlus className="h-4 w-4 text-teal-400" aria-hidden="true" />
                <span>Join as a Student</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onOpenStudentLogin}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-7 py-3.5 text-sm font-semibold text-slate-900 dark:text-slate-100 transition-colors hover:border-slate-400 dark:hover:border-slate-600 shadow-xs"
              >
                <LogIn className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span>Student Sign In</span>
              </button>
            </div>

            {/* Quick Proof Pills */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-6 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Fixed Recurring Weekly Timetables
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Permanent Classroom Room Link
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Built-in Photo-to-PDF Scanner
              </span>
            </div>
          </div>

          {/* Interactive Hero Card Preview */}
          <div className="mt-14 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
            <div className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>ACTIVE CLASSROOM PORTAL ARCHITECTURE</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Tutor: Abdullah · Lead Mathematics Specialist
              </span>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-6 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <Calendar className="h-4 w-4" />
                  <span>Structured Timetables</span>
                </div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  1 to 5 Classes / Week
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Batches are scheduled with structured 30-minute intervals and automatic recurring
                  student timetables.
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                  <Video className="h-4 w-4" />
                  <span>Permanent Room Link</span>
                </div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  One-Click Live Access
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  No hunting for meeting codes. A single permanent video classroom link connects you
                  every week.
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                  <FileCheck className="h-4 w-4" />
                  <span>Strict PDF Workings</span>
                </div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Verified Step-by-Step
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Turn phone photos of handwritten working sheets into A4 portrait PDFs for tutor review
                  and marks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 3-Column Feature Strip */}
      <section id="features" className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-16 sm:px-6 lg:py-24 transition-colors">
        <div className="mx-auto max-w-[1240px] space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Everything You Need in One Place
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              Engineered for Serious Maths Students
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No disorganized WhatsApp groups or lost attachments. Every class, worksheet, recording,
              and submission is structured seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-7 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                  Live Interactive Batches &amp; Fixed Weekly Timetables
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Consistent weekly schedules with custom 1 to 5 class frequencies. Real-time Next Class
                  countdown banners, automatic timetable population, and permanent meeting room links.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <span>View batch timings in portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-7 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                  Curated Notes, Recordings &amp; Assignments
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Real file uploads for exam-style past paper packs, handwritten solution notes, and
                  annotated lesson video recordings available for download 24/7.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <span>Direct downloadable resources</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-7 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                  Built-in Handwritten Work-to-PDF Scanner
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Snap notebook workings on your phone or tablet camera. Rotate pages, reorder steps,
                  and export crisp A4 PDFs to submit straight to your tutor for grading.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Built directly into Student Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works (3 Steps) */}
      <section id="how-it-works" className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-4 py-16 sm:px-6 lg:py-24 transition-colors">
        <div className="mx-auto max-w-[1240px] space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Simple Three-Step Onboarding
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              How MathsByAbdullah Works
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              From initial registration to your first live class in three straightforward steps.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Step 01
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-800 text-xs font-bold text-white">
                  1
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Register &amp; Select Level
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Sign up with your personal or school email, choose your target qualification (IGCSE,
                GCSE, or A-Level), and add any specific topic goals or syllabus requirements.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Step 02
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  2
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Get Approved &amp; Assigned to a Batch
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Your profile is verified by Abdullah. Once approved, you are assigned to your designated
                curriculum batch and recurring timetable slots automatically.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Step 03
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                  3
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Attend Live Classes &amp; Submit PDF Workings
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Join live sessions with the permanent classroom link, download worksheets, and submit
                clean handwritten workings converted to PDF using the built-in scanner.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Photo-to-PDF Scanner Spotlight */}
      <section id="photo-to-pdf" className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-16 sm:px-6 lg:py-24 transition-colors">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <div className="space-y-6 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 px-3.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile-Optimized Scanner Tool</span>
              </div>

              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl sm:leading-tight">
                No Scanner App Needed. <br />
                <span className="text-teal-600 dark:text-teal-400">Snap, Rotate &amp; Export A4 PDFs.</span>
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Mathematics requires step-by-step handwritten working. With the built-in{' '}
                <strong>Photo to PDF</strong> tool, students can upload photos from their phone or
                camera, arrange page order, rotate orientations, and compile into standardized A4 PDF
                files ready for marking.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-800 text-[10px] font-bold text-white">
                    ✓
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-200">Multiple Photos:</strong> Upload any number of problem working sheets in one go.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-800 text-[10px] font-bold text-white">
                    ✓
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-200">Reorder &amp; Rotate:</strong> Move pages up/down and fix sideways camera angles in seconds.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-800 text-[10px] font-bold text-white">
                    ✓
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-200">Direct Assignment Submission:</strong> Send the PDF straight to an open task without downloading.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenStudentLogin}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 px-6 py-3 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors"
                >
                  <span>Sign In to Access Scanner</span>
                  <ArrowRight className="h-3.5 w-3.5 text-teal-400" />
                </button>
              </div>
            </div>

            {/* Visual Scanner Mockup Card */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Student Workings to PDF Generator
                    </span>
                  </div>
                  <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    A4 Portrait
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { page: 1, title: 'Question 1–3 Workings', tag: 'Algebraic Proofs' },
                    { page: 2, title: 'Question 4 Calculation', tag: 'Trigonometry' },
                    { page: 3, title: 'Question 5 Graph Sketch', tag: 'Calculus' },
                  ].map((p) => (
                    <div
                      key={p.page}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2 text-center"
                    >
                      <div className="h-24 rounded-lg bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 p-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">Page {p.page}</span>
                        <span className="truncate w-full mt-1 text-[9px]">{p.tag}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">{p.title}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Output: Maths_Workings.pdf</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">3 A4 pages · Instant download or submit</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ PDF Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Active Batches & Curriculum Showcase */}
      <section id="curriculum" className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-4 py-16 sm:px-6 lg:py-20 transition-colors">
        <div className="mx-auto max-w-[1240px] space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Curriculum Batches
              </span>
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                Tutoring Batches &amp; Timetables
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenStudentSignup}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>Request custom batch</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Academic Batches Currently Enrolling
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  New batches for Cambridge &amp; Edexcel IGCSE, GCSE, and A-Level are enrolling now.
                </p>
                <button
                  type="button"
                  onClick={onOpenStudentSignup}
                  className="mt-4 rounded-full bg-slate-900 dark:bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-indigo-500"
                >
                  Register Interest
                </button>
              </div>
            ) : (
              courses.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {c.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {c.classesPerWeek || c.weeklySlots?.length || 1}{' '}
                      {c.classesPerWeek === 1 ? 'class' : 'classes'} / wk
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">{c.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.batchName}</p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {c.description || 'Comprehensive syllabus coverage, weekly problem sets, and past-paper techniques.'}
                  </p>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-200">
                      <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      <span className="truncate">{c.scheduleCadence || 'Weekly Schedule'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 7. Bottom CTA Strip */}
      <section className="bg-slate-900 dark:bg-slate-950 text-white px-4 py-16 sm:px-6 lg:py-20 border-t border-slate-800">
        <div className="mx-auto max-w-[1240px] text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium text-slate-300">
            <GraduationCap className="h-3.5 w-3.5 text-teal-400" />
            <span>Structured Academic Tutoring</span>
          </div>

          <h2 className="font-display text-3xl font-extrabold sm:text-4xl text-balance">
            Ready to Build True Mathematical Confidence?
          </h2>

          <p className="mx-auto max-w-xl text-sm text-slate-400 sm:text-base text-balance">
            Submit your student registration in less than 2 minutes. Once approved, gain instant access
            to the live classroom, weekly schedule, and curated problem sets.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenStudentSignup}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-500 px-8 py-3.5 text-sm font-bold text-white transition-colors shadow-lg"
            >
              <span>Register as a Student</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onOpenStudentLogin}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Student Sign In</span>
            </button>
          </div>
        </div>
      </section>

      {/* 8. Minimalist Academic Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 px-4 sm:px-6 transition-colors">
        <div className="mx-auto max-w-[1240px] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <BrandMonogram size="sm" />
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                MathsByAbdullah
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Focused Mathematics Tutoring Portal
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            <button
              type="button"
              onClick={onOpenStudentLogin}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Student Sign In
            </button>
            <button
              type="button"
              onClick={onOpenStudentSignup}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Student Registration
            </button>
            <button
              type="button"
              onClick={onOpenTeacherLogin}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Teacher Admin
            </button>
          </div>

          <p className="text-center sm:text-right">
            &copy; {new Date().getFullYear()} MathsByAbdullah. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
