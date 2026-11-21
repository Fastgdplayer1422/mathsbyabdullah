import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-[#E7E5E4] bg-[#18181B] px-4 py-3 text-sm font-medium text-white shadow-lg"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F97316]" />
      <span className="leading-snug">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
