import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  LogIn,
  RotateCw,
  Shield,
  Smartphone,
  Sparkles,
  UserPlus,
  Video,
} from 'lucide-react';
import { Course } from '../../types/portal';
import { BrandMonogram } from '../BrandMonogram';

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
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#18181B] antialiased selection:bg-[#F97316]/20">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[#E7E5E4] bg-[#F8F7F4]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <BrandMonogram size="md" />
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-[#18181B]">
                MathsByAbdullah
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
                Mathematics Tutoring Portal
              </span>
            </div>
          </div>

          {/* Desktop Anchor Links */}
          <nav aria-label="Landing page navigation" className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#52525B]">
            <a href="#curriculum" className="hover:text-[#18181B] transition-colors">
              Curriculum &amp; Batches
            </a>
            <a href="#features" className="hover:text-[#18181B] transition-colors">
              Key Features
            </a>
            <a href="#how-it-works" className="hover:text-[#18181B] transition-colors">
              How It Works
            </a>
            <a href="#photo-to-pdf" className="hover:text-[#18181B] transition-colors">
              Photo-to-PDF
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onOpenTeacherLogin}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#52525B] transition-colors hover:border-[#18181B] hover:text-[#18181B]"
              title="Teacher Portal Login"
            >
              <Lock className="h-3 w-3 text-[#71717A]" aria-hidden="true" />
              <span className="hidden sm:inline">Teacher Portal</span>
              <span className="sm:hidden">Teacher</span>
            </button>

            <button
              type="button"
              onClick={onOpenStudentLogin}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#18181B] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#18181B] transition-colors hover:bg-[#18181B] hover:text-white"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Student Sign In</span>
            </button>

            <button
              type="button"
              onClick={onOpenStudentSignup}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#18181B] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A] shadow-xs"
            >
              <span>Join as Student</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden border-b border-[#E7E5E4] bg-radial-[at_top_center] from-[#FFFFFF] via-[#F8F7F4] to-[#F3F1EC] px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:pt-28 lg:pb-32">
        <div className="mx-auto max-w-[1240px]">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            {/* Qualification Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C2410C] shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />
              <span>Cambridge &amp; Edexcel · IGCSE · GCSE · AS &amp; A-Level</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#18181B] sm:text-5xl lg:text-6xl sm:leading-[1.12] text-balance">
              Focused Mathematics Tutoring. <br />
              <span className="text-[#4338CA]">Structured for Real Mastery.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base text-[#52525B] sm:text-lg sm:leading-relaxed text-balance">
              Live interactive small-group batches, fixed recurring weekly timetables, curated notes,
              and past-paper resources—designed to turn complex mathematical methods into instinctive
              problem-solving skills.
            </p>

            {/* Hero Action Buttons */}
            <div className="flex flex-col items-center justify-center gap-3 pt-3 sm:flex-row sm:gap-4">
              <button
                type="button"
                onClick={onOpenStudentSignup}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-[#18181B] px-8 py-3.5 text-sm font-semibold text-white transition-transform hover:bg-[#27272A] active:scale-[0.99] shadow-md"
              >
                <UserPlus className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
                <span>Join as a Student</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onOpenStudentLogin}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-[#E7E5E4] bg-[#FFFFFF] px-7 py-3.5 text-sm font-semibold text-[#18181B] transition-colors hover:border-[#18181B] shadow-xs"
              >
                <LogIn className="h-4 w-4 text-[#4338CA]" aria-hidden="true" />
                <span>Student Sign In</span>
              </button>
            </div>

            {/* Quick Proof Pills */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-6 text-xs font-medium text-[#71717A]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#0F766E]" />
                Fixed Recurring Weekly Timetables
              </span>
              <span aria-hidden="true" className="text-[#D4D4D8]">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#0F766E]" />
                Permanent Classroom Room Link
              </span>
              <span aria-hidden="true" className="text-[#D4D4D8]">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#0F766E]" />
                Built-in Photo-to-PDF Scanner
              </span>
            </div>
          </div>

          {/* Interactive Hero Card Preview */}
          <div className="mt-14 overflow-hidden rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] shadow-lg">
            <div className="border-b border-[#F4F4F5] bg-[#FAF9F7] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#18181B]">
                <div className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                <span>ACTIVE CLASSROOM PORTAL ARCHITECTURE</span>
              </div>
              <span className="text-xs text-[#71717A] tabular-nums">
                Tutor: Abdullah · Lead Mathematics Specialist
              </span>
            </div>

            <div className="grid grid-cols-1 divide-y divide-[#E7E5E4] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-6 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4338CA]">
                  <Calendar className="h-4 w-4" />
                  <span>Structured Timetables</span>
                </div>
                <h2 className="font-display text-base font-bold text-[#18181B]">
                  1 to 5 Classes / Week
                </h2>
                <p className="text-xs text-[#52525B] leading-relaxed">
                  Batches are scheduled with structured 30-minute intervals and automatic recurring
                  student timetables.
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#EA580C]">
                  <Video className="h-4 w-4" />
                  <span>Permanent Room Link</span>
                </div>
                <h2 className="font-display text-base font-bold text-[#18181B]">
                  One-Click Live Access
                </h2>
                <p className="text-xs text-[#52525B] leading-relaxed">
                  No hunting for meeting codes. A single permanent video classroom link connects you
                  every week.
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
                  <FileCheck className="h-4 w-4" />
                  <span>Strict PDF Workings</span>
                </div>
                <h2 className="font-display text-base font-bold text-[#18181B]">
                  Verified Step-by-Step
                </h2>
                <p className="text-xs text-[#52525B] leading-relaxed">
                  Turn phone photos of handwritten working sheets into A4 portrait PDFs for tutor review
                  and marks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 3-Column Feature Strip (Requested by User) */}
      <section id="features" className="border-b border-[#E7E5E4] bg-[#FFFFFF] px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-[1240px] space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4338CA]">
              Everything You Need in One Place
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#18181B] sm:text-4xl">
              Engineered for Serious Maths Students
            </h2>
            <p className="text-sm text-[#52525B]">
              No disorganized WhatsApp groups or lost attachments. Every class, worksheet, recording,
              and submission is structured seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#E7E5E4] bg-[#F8F7F4] p-7 transition-colors hover:border-[#D4D4D8]">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4338CA]">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#18181B]">
                  Live Interactive Batches &amp; Fixed Weekly Timetables
                </h3>
                <p className="text-sm text-[#52525B] leading-relaxed">
                  Consistent weekly schedules with custom 1 to 5 class frequencies. Real-time Next Class
                  countdown banners, automatic timetable population, and permanent meeting room links.
                </p>
              </div>

              <div className="mt-6 border-t border-[#E7E5E4] pt-4 text-xs font-semibold text-[#4338CA] flex items-center gap-1">
                <span>View batch timings in portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#E7E5E4] bg-[#F8F7F4] p-7 transition-colors hover:border-[#D4D4D8]">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#18181B]">
                  Curated Notes, Recordings &amp; Assignments
                </h3>
                <p className="text-sm text-[#52525B] leading-relaxed">
                  Real file uploads for exam-style past paper packs, handwritten solution notes, and
                  annotated lesson video recordings available for download 24/7.
                </p>
              </div>

              <div className="mt-6 border-t border-[#E7E5E4] pt-4 text-xs font-semibold text-[#EA580C] flex items-center gap-1">
                <span>Direct downloadable resources</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#E7E5E4] bg-[#F8F7F4] p-7 transition-colors hover:border-[#D4D4D8]">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0F766E]">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#18181B]">
                  Built-in Handwritten Work-to-PDF Scanner
                </h3>
                <p className="text-sm text-[#52525B] leading-relaxed">
                  Snap notebook workings on your phone or tablet camera. Rotate pages, reorder steps,
                  and export crisp A4 PDFs to submit straight to your tutor for grading.
                </p>
              </div>

              <div className="mt-6 border-t border-[#E7E5E4] pt-4 text-xs font-semibold text-[#0F766E] flex items-center gap-1">
                <span>Built directly into Student Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works (3 Steps Requested by User) */}
      <section id="how-it-works" className="border-b border-[#E7E5E4] bg-[#F8F7F4] px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-[1240px] space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              Simple Three-Step Onboarding
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#18181B] sm:text-4xl">
              How MathsByAbdullah Works
            </h2>
            <p className="text-sm text-[#52525B]">
              From initial registration to your first live class in three straightforward steps.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#71717A] uppercase tracking-wider">
                  Step 01
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#18181B] text-xs font-bold text-white">
                  1
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-[#18181B]">
                Register &amp; Select Level
              </h3>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Sign up with your personal or school email, choose your target qualification (IGCSE,
                GCSE, or A-Level), and add any specific topic goals or syllabus requirements.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#71717A] uppercase tracking-wider">
                  Step 02
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4338CA] text-xs font-bold text-white">
                  2
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-[#18181B]">
                Get Approved &amp; Assigned to a Batch
              </h3>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Your profile is verified by Abdullah. Once approved, you are assigned to your designated
                curriculum batch and recurring timetable slots automatically.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#71717A] uppercase tracking-wider">
                  Step 03
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EA580C] text-xs font-bold text-white">
                  3
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-[#18181B]">
                Attend Live Classes &amp; Submit PDF Workings
              </h3>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Join live sessions with the permanent classroom link, download worksheets, and submit
                clean handwritten workings converted to PDF using the built-in scanner.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Photo-to-PDF Scanner Spotlight */}
      <section id="photo-to-pdf" className="border-b border-[#E7E5E4] bg-[#FFFFFF] px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <div className="space-y-6 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3.5 py-1 text-xs font-bold text-[#0F766E]">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile-Optimized Scanner Tool</span>
              </div>

              <h2 className="font-display text-3xl font-bold tracking-tight text-[#18181B] sm:text-4xl sm:leading-tight">
                No Scanner App Needed. <br />
                <span className="text-[#0F766E]">Snap, Rotate &amp; Export A4 PDFs.</span>
              </h2>

              <p className="text-sm text-[#52525B] leading-relaxed">
                Mathematics requires step-by-step handwritten working. With the built-in{' '}
                <strong>Photo to PDF</strong> tool, students can upload photos from their phone or
                camera, arrange page order, rotate orientations, and compile into standardized A4 PDF
                files ready for marking.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">
                    ✓
                  </div>
                  <p className="text-xs text-[#52525B]">
                    <strong>Multiple Photos:</strong> Upload any number of problem working sheets in one go.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">
                    ✓
                  </div>
                  <p className="text-xs text-[#52525B]">
                    <strong>Reorder &amp; Rotate:</strong> Move pages up/down and fix sideways camera angles in seconds.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">
                    ✓
                  </div>
                  <p className="text-xs text-[#52525B]">
                    <strong>Direct Assignment Submission:</strong> Send the PDF straight to an open task without downloading.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenStudentLogin}
                  className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-6 py-3 text-xs font-semibold text-white hover:bg-[#27272A] transition-colors"
                >
                  <span>Sign In to Access Scanner</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#F97316]" />
                </button>
              </div>
            </div>

            {/* Visual Scanner Mockup Card */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-[#E7E5E4] bg-[#F8F7F4] p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#4338CA]" />
                    <span className="text-xs font-bold text-[#18181B]">
                      Student Workings to PDF Generator
                    </span>
                  </div>
                  <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-bold text-[#4338CA]">
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
                      className="rounded-xl border border-[#E7E5E4] bg-[#FFFFFF] p-3 space-y-2 text-center"
                    >
                      <div className="h-24 rounded-lg bg-[#FAF9F7] border border-dashed border-[#D4D4D8] flex flex-col items-center justify-center text-[10px] text-[#71717A] p-2">
                        <span className="font-mono font-bold text-xs text-[#18181B]">Page {p.page}</span>
                        <span className="truncate w-full mt-1 text-[9px]">{p.tag}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#18181B] truncate">{p.title}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-[#FFFFFF] border border-[#E7E5E4] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#18181B]">Output: Maths_Workings.pdf</span>
                    <p className="text-[11px] text-[#71717A]">3 A4 pages · Instant download or submit</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#10B981]/15 px-3 py-1 text-[11px] font-bold text-[#047857]">
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
      <section id="curriculum" className="border-b border-[#E7E5E4] bg-[#F8F7F4] px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-[1240px] space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#4338CA]">
                Curriculum Batches
              </span>
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#18181B] sm:text-3xl">
                Tutoring Batches &amp; Timetables
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenStudentSignup}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4338CA] hover:underline"
            >
              <span>Request custom batch</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-[#A1A1AA]" />
                <h3 className="mt-3 text-sm font-semibold text-[#18181B]">
                  Academic Batches Currently Enrolling
                </h3>
                <p className="mt-1 text-xs text-[#71717A]">
                  New batches for Cambridge &amp; Edexcel IGCSE, GCSE, and A-Level are enrolling now.
                </p>
                <button
                  type="button"
                  onClick={onOpenStudentSignup}
                  className="mt-4 rounded-full bg-[#18181B] px-5 py-2 text-xs font-semibold text-white hover:bg-[#27272A]"
                >
                  Register Interest
                </button>
              </div>
            ) : (
              courses.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-[#EEF2FF] px-2.5 py-1 text-xs font-bold text-[#4338CA] uppercase tracking-wider">
                      {c.code}
                    </span>
                    <span className="text-xs font-semibold text-[#71717A]">
                      {c.classesPerWeek || c.weeklySlots?.length || 1}{' '}
                      {c.classesPerWeek === 1 ? 'class' : 'classes'} / wk
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-base font-bold text-[#18181B]">{c.title}</h3>
                    <p className="text-xs text-[#71717A] mt-0.5">{c.batchName}</p>
                  </div>

                  <p className="text-xs text-[#52525B] line-clamp-2">
                    {c.description || 'Comprehensive syllabus coverage, weekly problem sets, and past-paper techniques.'}
                  </p>

                  <div className="border-t border-[#F4F4F5] pt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-[#18181B]">
                      <Clock className="h-3.5 w-3.5 text-[#F97316]" />
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
      <section className="bg-[#18181B] text-white px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-[1240px] text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium text-zinc-300">
            <GraduationCap className="h-3.5 w-3.5 text-[#F97316]" />
            <span>Structured Academic Tutoring</span>
          </div>

          <h2 className="font-display text-3xl font-extrabold sm:text-4xl text-balance">
            Ready to Build True Mathematical Confidence?
          </h2>

          <p className="mx-auto max-w-xl text-sm text-zinc-400 sm:text-base text-balance">
            Submit your student registration in less than 2 minutes. Once approved, gain instant access
            to the live classroom, weekly schedule, and curated problem sets.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenStudentSignup}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#F97316] px-8 py-3.5 text-sm font-bold text-[#18181B] hover:bg-[#EA580C] hover:text-white transition-colors shadow-lg"
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
      <footer className="border-t border-[#E7E5E4] bg-[#F8F7F4] py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-[1240px] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#71717A]">
          <div className="flex items-center gap-3">
            <BrandMonogram size="sm" />
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-[#18181B]">
                MathsByAbdullah
              </span>
              <span className="text-[10px] text-[#71717A]">
                Focused Mathematics Tutoring Portal
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            <button
              type="button"
              onClick={onOpenStudentLogin}
              className="hover:text-[#18181B] transition-colors"
            >
              Student Sign In
            </button>
            <button
              type="button"
              onClick={onOpenStudentSignup}
              className="hover:text-[#18181B] transition-colors"
            >
              Student Registration
            </button>
            <button
              type="button"
              onClick={onOpenTeacherLogin}
              className="hover:text-[#18181B] transition-colors"
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
