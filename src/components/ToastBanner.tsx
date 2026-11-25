import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ToastBannerProps {
  message: string | null;
  type?: 'success' | 'error';
  onDismiss: () => void;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ message, type = 'success', onDismiss }) => {
  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-colors ${
        isError
          ? 'border-red-500/40 bg-red-950 text-red-100 dark:border-red-800 dark:bg-red-950/90'
          : 'border-[#E7E5E4] dark:border-slate-800 bg-[#18181B] text-white'
      }`}
    >
      {isError ? (
        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" />
      )}
      <span className="leading-snug">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className={`ml-1 rounded-md p-1 transition-colors ${
          isError
            ? 'text-red-300 hover:bg-red-900 hover:text-white'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
        }`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
