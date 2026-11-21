import React from 'react';
import {
  Clock,
  LogOut,
  Mail,
  RefreshCw,
  UserX,
} from 'lucide-react';
import { Student } from '../../types/portal';
import { formatReadableDate } from '../../utils/formatters';
import { BrandMonogram } from '../BrandMonogram';

interface PendingApprovalPageProps {
  student: Student;
  onRefreshStatus: () => void;
  onSignOut: () => void;
}

export const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({
  student,
  onRefreshStatus,
  onSignOut,
}) => {
  const isRejected = student.status === 'rejected';

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8F7F4] px-4 py-12 selection:bg-[#4338CA]/15 selection:text-[#4338CA]">
      <div className="w-full max-w-[480px] space-y-6">
        {/* Brand Lockup */}
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <BrandMonogram size="lg" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#18181B]">
            MathsByAbdullah
          </h1>
        </div>

        {/* Status Card */}
        <div className="overflow-hidden rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-3">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                isRejected ? 'bg-red-50 text-red-600' : 'bg-[#FFF7ED] text-[#EA580C]'
              }`}
            >
              {isRejected ? (
                <UserX className="h-7 w-7" aria-hidden="true" />
              ) : (
                <Clock className="h-7 w-7" aria-hidden="true" />
              )}
            </div>

            <div className="space-y-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  isRejected
                    ? 'border border-red-200 bg-red-50 text-red-700'
                    : 'border border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]'
                }`}
              >
                {isRejected ? 'Registration Declined' : 'Awaiting Teacher Verification'}
              </span>

              <h2 className="font-display text-xl font-bold text-[#18181B]">
                {isRejected
                  ? 'Registration Not Approved'
                  : 'Account Pending Teacher Approval'}
              </h2>
            </div>

            <p className="text-xs leading-relaxed text-[#52525B]">
              {isRejected
                ? 'Your registration request could not be approved for current tutoring cohorts at this time. If you believe this is in error, please contact Abdullah (Lead Tutor) directly.'
                : 'Your student registration has been received by Abdullah (Lead Tutor). Once your enrollment into your chosen course batches is confirmed, your portal access will be activated.'}
            </p>
          </div>

          {/* Student Profile Snapshot */}
          <div className="rounded-2xl border border-[#E7E5E4] bg-[#F8F7F4] p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Registered Name:</span>
              <strong className="font-semibold text-[#18181B]">{student.name}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Email Address:</span>
              <span className="font-mono text-[#18181B]">{student.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Target Grade / Level:</span>
              <span className="font-medium text-[#18181B]">{student.gradeLevel}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Submission Date:</span>
              <span className="text-[#18181B] tabular-nums">
                {formatReadableDate(student.createdAt.slice(0, 10), true)}
              </span>
            </div>

            {student.requestNote && (
              <div className="border-t border-[#E7E5E4] pt-2 mt-1">
                <span className="text-[#71717A] block mb-0.5">Note to Tutor:</span>
                <p className="italic text-[#18181B]">&ldquo;{student.requestNote}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {!isRejected && (
              <button
                type="button"
                onClick={onRefreshStatus}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#18181B] py-3 text-xs font-semibold text-white transition-colors hover:bg-[#27272A]"
              >
                <RefreshCw className="h-4 w-4 text-[#F97316]" />
                <span>Check Approval Status</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#E7E5E4] bg-white py-2.5 text-xs font-semibold text-[#52525B] hover:text-[#18181B] hover:border-[#18181B] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out / Switch Account</span>
            </button>
          </div>
        </div>

        {/* Contact info footer */}
        <div className="text-center text-xs text-[#71717A] flex items-center justify-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          <span>Questions? Contact: Abdullah (Lead Tutor)</span>
        </div>
      </div>
    </div>
  );
};
