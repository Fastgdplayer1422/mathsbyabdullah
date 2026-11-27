import React from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { downloadDataUrl } from '../utils/fileHelpers';

interface PdfPreviewDialogProps {
  src: string;
  fileName: string;
  hideDownload?: boolean;
  onClose: () => void;
}

export const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({ src, fileName, hideDownload, onClose }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="pdf-preview-title"
    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"
  >
    <section className="flex h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h2 id="pdf-preview-title" className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{fileName}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Open in new tab"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span>Open in Tab</span>
          </a>
          {!hideDownload && (
            <button
              type="button"
              onClick={() => downloadDataUrl(src, fileName)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Download aria-hidden="true" className="size-3.5" />
              Download
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PDF preview"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      </header>
      <iframe title={`PDF preview: ${fileName}`} src={src} className="min-h-0 flex-1 bg-slate-100 dark:bg-slate-800" />
    </section>
  </div>
);
