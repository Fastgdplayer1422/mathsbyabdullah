import React, { useState } from 'react';
import {
  Clock,
  Loader2,
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
  onRefreshStatus: () => Promise<void> | void;
  onSignOut: () => void;
}

export const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({
  student,
  onRefreshStatus,
  onSignOut,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRejected = student.status === 'rejected';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshStatus();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-[#0B0F17] px-4 py-12 selection:bg-indigo-500/20 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-[480px] space-y-6">
        {/* Brand Lockup */}
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <BrandMonogram size="lg" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            MathsByAbdullah
          </h1>
        </div>

        {/* Status Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
          <div className="text-center space-y-3">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                isRejected
                  ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
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
                    ? 'border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    : 'border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {isRejected ? 'Registration Declined' : 'Awaiting Teacher Verification'}
              </span>

              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {isRejected
                  ? 'Registration Not Approved'
                  : 'Account Pending Teacher Approval'}
              </h2>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {isRejected
                ? 'Your registration request could not be approved for current tutoring cohorts at this time. If you believe this is in error, please contact Abdullah (Lead Tutor) directly.'
                : 'Your student registration has been received by Abdullah (Lead Tutor). Once your enrollment into your chosen course batches is confirmed, your portal access will be activated.'}
            </p>
          </div>

          {/* Student Profile Snapshot */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Registered Name:</span>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Email Address:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">{student.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Target Grade / Level:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{student.gradeLevel}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Submission Date:</span>
              <span className="text-slate-900 dark:text-slate-100 tabular-nums">
                {formatReadableDate(student.createdAt.slice(0, 10), true)}
              </span>
            </div>

            {student.requestNote && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Note to Tutor:</span>
                <p className="italic text-slate-800 dark:text-slate-200">&ldquo;{student.requestNote}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {!isRejected && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 py-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-teal-400" />
                )}
                <span>{isRefreshing ? 'Checking Status...' : 'Check Approval Status'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out / Switch Account</span>
            </button>
          </div>
        </div>

        {/* Contact info footer */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          <span>Questions? Contact: Abdullah (Lead Tutor)</span>
        </div>
      </div>
    </div>
  );
};
