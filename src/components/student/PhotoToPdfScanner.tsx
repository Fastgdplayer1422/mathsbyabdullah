import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCw,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { Assignment, PortalState, Student, UploadedFileMeta } from '../../types/portal';
import { formatFileSize, readFileAsDataUrl } from '../../utils/fileHelpers';

interface PhotoToPdfScannerProps {
  state: PortalState;
  activeStudent: Student;
  onSubmitAssignment: (
    assignmentId: string,
    studentId: string,
    submissionUrl: string,
    submissionNote: string,
    attachment?: UploadedFileMeta
  ) => Promise<any> | void;
  onNotify: (msg: string) => void;
  onNavigateTab: (tab: 'dashboard' | 'assignments') => void;
}

interface ScannedPage {
  id: string;
  name: string;
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270 degrees
}

export const PhotoToPdfScanner: React.FC<PhotoToPdfScannerProps> = ({
  state,
  activeStudent,
  onSubmitAssignment,
  onNotify,
  onNavigateTab,
}) => {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [pdfFileName, setPdfFileName] = useState('Maths_Workings.pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState<{
    dataUrl: string;
    size: number;
    fileName: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Enrolled courses for this student
  const enrolledCourseIds = activeStudent.enrolledCourseIds || [];

  // Open assignments for this student
  const openAssignments = state.assignments.filter((a) =>
    enrolledCourseIds.includes(a.courseId)
  );

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPages: ScannedPage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const supportedImageName = /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!supportedMimeTypes.includes(file.type) && !supportedImageName) {
        onNotify(`${file.name} is not a supported image. Choose JPG, PNG, or WEBP.`);
        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        newPages.push({
          id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          dataUrl,
          rotation: 0,
        });
      } catch (err) {
        console.error('Failed reading image:', err);
      }
    }

    if (newPages.length > 0) {
      setPages((prev) => [...prev, ...newPages]);
      setLastGeneratedPdf(null);
      onNotify(`Added ${newPages.length} image page(s) to scanner`);
    }

    // Reset input
    e.target.value = '';
  };

  const handleMovePage = (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
    setLastGeneratedPdf(null);
  };

  const handleRotatePage = (index: number) => {
    setPages((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        rotation: (updated[index].rotation + 90) % 360,
      };
      return updated;
    });
    setLastGeneratedPdf(null);
  };

  const handleRemovePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    setLastGeneratedPdf(null);
  };

  const handleClearAll = () => {
    if (pages.length === 0) return;
    if (window.confirm('Remove all pages from scanner?')) {
      setPages([]);
      setLastGeneratedPdf(null);
    }
  };

  /**
   * Transforms an image onto a rotated canvas if necessary
   */
  const getRenderableImageDataUrl = (page: ScannedPage): Promise<{
    dataUrl: string;
    width: number;
    height: number;
  }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const { rotation } = page;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: page.dataUrl, width: img.width, height: img.height });
          return;
        }

        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve({
          dataUrl: rotatedDataUrl,
          width: canvas.width,
          height: canvas.height,
        });
      };
      img.onerror = () => {
        resolve({ dataUrl: page.dataUrl, width: 800, height: 1100 });
      };
      img.src = page.dataUrl;
    });
  };

  /**
   * Generates the multi-page A4 PDF using jsPDF
   */
  const generatePdfBlob = async (): Promise<{ dataUrl: string; size: number; fileName: string } | null> => {
    if (pages.length === 0) return null;

    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = pageHeight - 2 * margin;

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          doc.addPage('a4', 'portrait');
        }

        const page = pages[i];
        const { dataUrl, width, height } = await getRenderableImageDataUrl(page);

        // Calculate aspect ratio to fit cleanly inside A4 margins
        const widthRatio = availableWidth / width;
        const heightRatio = availableHeight / height;
        const scale = Math.min(widthRatio, heightRatio);

        const renderWidth = width * scale;
        const renderHeight = height * scale;
        const xOffset = margin + (availableWidth - renderWidth) / 2;
        const yOffset = margin + (availableHeight - renderHeight) / 2;

        const imageFormat = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(dataUrl, imageFormat, xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');

        // Elegant minimal page counter at the bottom center
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i + 1} of ${pages.length} · MathsByAbdullah Workings`,
          pageWidth / 2,
          pageHeight - 4,
          { align: 'center' }
        );
      }

      const pdfDataUrl = doc.output('datauristring');
      // Approximate bytes from data URI
      const base64Part = pdfDataUrl.split(',')[1] || '';
      const approximateBytes = Math.round((base64Part.length * 3) / 4);

      const result = {
        dataUrl: pdfDataUrl,
        size: approximateBytes,
        fileName: pdfFileName.endsWith('.pdf') ? pdfFileName : `${pdfFileName}.pdf`,
      };

      setLastGeneratedPdf(result);
      return result;
    } catch (err) {
      console.error('PDF Generation failed:', err);
      onNotify('Failed to compile PDF. Check image formats.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    const compiled = lastGeneratedPdf || (await generatePdfBlob());
    if (!compiled) return;

    try {
      const link = document.createElement('a');
      link.href = compiled.dataUrl;
      link.download = compiled.fileName || 'Maths_Workings.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onNotify(`Downloaded ${compiled.fileName}`);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleSubmitToAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId) {
      onNotify('Please select an open assignment to submit this PDF to.');
      return;
    }

    setIsSubmitting(true);
    try {
      const compiled = lastGeneratedPdf || (await generatePdfBlob());
      if (!compiled) return;

      const attachment: UploadedFileMeta = {
        fileName: compiled.fileName,
        fileSize: compiled.size,
        fileType: 'application/pdf',
        fileData: compiled.dataUrl,
        uploadedAt: new Date().toISOString(),
      };

      const result = await onSubmitAssignment(
        selectedAssignmentId,
        activeStudent.id,
        '',
        submissionNote.trim() || `Submitted via Photo-to-PDF Scanner (${pages.length} pages)`,
        attachment
      );
      if (result && result.success === false) {
        onNotify(result.error || 'Submission failed. Please try again.');
        return;
      }

      const targetAsg = state.assignments.find((a) => a.id === selectedAssignmentId);
      onNotify(`Successfully submitted PDF to "${targetAsg?.title || 'Assignment'}"!`);

      // Reset and redirect
      setSelectedAssignmentId('');
      setSubmissionNote('');
      onNavigateTab('assignments');
    } catch {
      onNotify('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#E7E5E4] dark:border-slate-700 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4338CA] text-white">
              <Camera className="h-4 w-4" />
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#18181B] dark:text-slate-100">
              Photo to PDF Scanner
            </h1>
          </div>
          <p className="text-xs text-[#52525B] dark:text-slate-300">
            Snap or upload photos of your handwritten notebook workings, reorder pages, and compile
            clean A4 PDFs for tutor grading.
          </p>
        </div>

        {pages.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-lg border border-[#E7E5E4] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-[#71717A] dark:text-slate-400 hover:border-red-300 hover:text-red-700 transition-colors"
            >
              Clear All ({pages.length})
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#18181B] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#27272A] transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              )}
              <span>Download PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Upload Action Zone */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Device File Picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group cursor-pointer rounded-2xl border-2 border-dashed border-[#E7E5E4] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-900 p-6 text-center transition-colors hover:border-[#4338CA] hover:bg-[#FAF9F7] dark:bg-slate-800"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4338CA] group-hover:scale-105 transition-transform">
            <Upload className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-sm font-bold text-[#18181B] dark:text-slate-100">Choose Photos from Device</h2>
          <p className="mt-1 text-xs text-[#71717A] dark:text-slate-400">
            Select single or multiple working sheet photos (JPG, PNG, WEBP)
          </p>
        </div>

        {/* Camera Snap Picker */}
        <div
          onClick={() => cameraInputRef.current?.click()}
          className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/50"
        >
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFilesSelected}
            className="hidden"
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
            <Camera className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-sm font-bold text-[#18181B] dark:text-slate-100">Snap with Phone / Tablet Camera</h2>
          <p className="mt-1 text-xs text-[#71717A] dark:text-slate-400">
            Directly open camera to photograph your notebook pages in sequence
          </p>
        </div>
      </div>

      {/* 3. Page Gallery / Thumbnail Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-[#18181B] dark:text-slate-100">
              Scanned Working Pages ({pages.length})
            </h2>
            {pages.length > 0 && (
              <span className="text-xs text-[#71717A] dark:text-slate-400">
                Drag or use arrows to reorder pages in chronological sequence
              </span>
            )}
          </div>

          {pages.length > 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#4338CA] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add More Pages</span>
            </button>
          )}
        </div>

        {pages.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5E4] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-900 px-6 py-14 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-[#A1A1AA]" />
            <h3 className="mt-3 text-sm font-semibold text-[#18181B] dark:text-slate-100">No photos added yet</h3>
            <p className="mt-1 text-xs text-[#71717A] dark:text-slate-400">
              Upload photos or take camera pictures above to arrange your assignment PDF.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {pages.map((page, idx) => (
              <div
                key={page.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(idx));
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceIndex = Number(event.dataTransfer.getData('text/plain'));
                  if (!Number.isInteger(sourceIndex) || sourceIndex === idx) return;
                  setPages((current) => {
                    const reordered = [...current];
                    const [movedPage] = reordered.splice(sourceIndex, 1);
                    reordered.splice(idx, 0, movedPage);
                    return reordered;
                  });
                  setLastGeneratedPdf(null);
                }}
                className="overflow-hidden rounded-2xl border border-[#E7E5E4] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-900 shadow-xs flex flex-col justify-between"
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-[#F4F4F5] bg-[#FAF9F7] dark:bg-slate-800 px-3.5 py-2">
                  <span className="font-mono text-xs font-bold text-[#18181B] dark:text-slate-100">
                    Page {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRotatePage(idx)}
                      title="Rotate 90° clockwise"
                      className="rounded-md p-1 text-[#71717A] dark:text-slate-400 hover:bg-[#E7E5E4]/60 hover:text-[#18181B] dark:text-slate-100"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePage(idx)}
                      title="Delete page"
                      className="rounded-md p-1 text-[#71717A] dark:text-slate-400 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Thumbnail Preview with Rotation */}
                <div className="relative flex h-52 items-center justify-center bg-[#F8F7F4] dark:bg-slate-800 p-3 overflow-hidden">
                  <img
                    src={page.dataUrl}
                    alt={`Page ${idx + 1}`}
                    style={{
                      transform: `rotate(${page.rotation}deg)`,
                      maxHeight: page.rotation % 180 !== 0 ? '160px' : '190px',
                      maxWidth: page.rotation % 180 !== 0 ? '160px' : '100%',
                    }}
                    className="object-contain rounded transition-transform duration-200"
                  />
                  {page.rotation > 0 && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-[#18181B]/75 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {page.rotation}°
                    </span>
                  )}
                </div>

                {/* Footer Controls: Reorder Buttons */}
                <div className="flex items-center justify-between border-t border-[#F4F4F5] bg-[#FAF9F7] dark:bg-slate-800 p-2">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMovePage(idx, 'prev')}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-[#52525B] dark:text-slate-300 hover:text-[#18181B] dark:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Move Up</span>
                  </button>

                  <button
                    type="button"
                    disabled={idx === pages.length - 1}
                    onClick={() => handleMovePage(idx, 'next')}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-[#52525B] dark:text-slate-300 hover:text-[#18181B] dark:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span>Move Down</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Generation & Export / Submission Section */}
      {pages.length > 0 && (
        <div className="rounded-3xl border border-[#E7E5E4] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-[#E7E5E4] dark:border-slate-700 pb-4">
            <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-slate-100">
              PDF Export &amp; Direct Assignment Submission
            </h2>
            <p className="text-xs text-[#52525B] dark:text-slate-300 mt-0.5">
              Compile your {pages.length} working page(s) into a unified A4 portrait PDF document.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            {/* Left: Document Settings & Download */}
            <div className="space-y-4 lg:col-span-5">
              <div className="space-y-1.5">
                <label htmlFor="pdf-filename" className="block text-xs font-semibold text-[#18181B] dark:text-slate-100">
                  Document File Name
                </label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A] dark:text-slate-400" />
                  <input
                    id="pdf-filename"
                    type="text"
                    value={pdfFileName}
                    onChange={(e) => {
                      setPdfFileName(e.target.value);
                      setLastGeneratedPdf(null);
                    }}
                    placeholder="Maths_Workings.pdf"
                    className="w-full rounded-xl border border-[#E7E5E4] dark:border-slate-700 bg-[#F8F7F4] dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-[#18181B] dark:text-slate-100 focus:border-[#4338CA] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#E7E5E4] dark:border-slate-700 bg-[#FAF9F7] dark:bg-slate-800 p-4 text-xs text-[#52525B] dark:text-slate-300 space-y-1.5">
                <div className="flex justify-between font-semibold text-[#18181B] dark:text-slate-100">
                  <span>Page Format:</span>
                  <span>A4 Portrait (210 × 297 mm)</span>
                </div>
                <div className="flex justify-between font-semibold text-[#18181B] dark:text-slate-100">
                  <span>Total Pages:</span>
                  <span>{pages.length} page(s)</span>
                </div>
                <div className="flex justify-between font-semibold text-[#18181B] dark:text-slate-100">
                  <span>Orientation:</span>
                  <span>Standardized Centered Margins</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#18181B] bg-[#FFFFFF] dark:bg-slate-900 px-5 py-3 text-xs font-semibold text-[#18181B] dark:text-slate-100 hover:bg-[#18181B] hover:text-white transition-colors"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#4338CA]" />
                ) : (
                  <Download className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                )}
                <span>Download PDF to Device</span>
              </button>
            </div>

            {/* Right: Direct Submission to Open Assignment */}
            <div className="rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF]/40 p-5 lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#4338CA]">
                <Send className="h-4 w-4" />
                <span>Submit Directly to an Open Assignment</span>
              </div>

              <p className="text-xs text-[#52525B] dark:text-slate-300">
                Attach this generated PDF directly to one of your active coursework tasks without
                downloading and re-uploading manually.
              </p>

              <form onSubmit={handleSubmitToAssignment} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="submit-asg-select" className="block text-xs font-semibold text-[#18181B] dark:text-slate-100">
                    Select Assignment
                  </label>
                  <select
                    id="submit-asg-select"
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#E7E5E4] dark:border-slate-700 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#18181B] dark:text-slate-100 focus:border-[#4338CA] focus:outline-none"
                  >
                    <option value="">-- Choose an Open Assignment --</option>
                    {openAssignments.map((asg) => (
                      <option key={asg.id} value={asg.id}>
                        {asg.title} (Due: {asg.dueDate})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="submit-asg-note" className="block text-xs font-semibold text-[#18181B] dark:text-slate-100">
                    Note for Abdullah (Optional)
                  </label>
                  <input
                    id="submit-asg-note"
                    type="text"
                    value={submissionNote}
                    onChange={(e) => setSubmissionNote(e.target.value)}
                    placeholder="e.g. Completed all questions including Question 6 challenge"
                    className="w-full rounded-xl border border-[#E7E5E4] dark:border-slate-700 bg-white px-3.5 py-2 text-xs text-[#18181B] dark:text-slate-100 focus:border-[#4338CA] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGenerating || isSubmitting || !selectedAssignmentId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 px-5 py-3 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  {isGenerating || isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-teal-400" />
                  )}
                  <span>{isSubmitting ? 'Submitting PDF...' : 'Generate & Submit PDF Workings'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
