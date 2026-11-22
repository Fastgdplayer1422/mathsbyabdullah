import { UploadedFileMeta } from '../types/portal';

/**
 * Reads a browser File object as a base64 Data URL.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human-readable strings (e.g. 350 KB, 2.4 MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const idx = Math.min(i, units.length - 1);
  const size = bytes / Math.pow(1024, idx);
  return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export type FileCategory = 'pdf' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

/**
 * Returns a simplified categorization for uploaded files
 */
export function getFileCategory(fileType: string = '', fileName: string = ''): FileCategory {
  const mime = fileType.toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (mime.includes('pdf') || ext === 'pdf') {
    return 'pdf';
  }
  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'heic'].includes(ext)
  ) {
    return 'image';
  }
  if (
    mime.startsWith('video/') ||
    ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)
  ) {
    return 'video';
  }
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)
  ) {
    return 'audio';
  }
  if (
    mime.includes('word') ||
    mime.includes('presentation') ||
    mime.includes('spreadsheet') ||
    ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(ext)
  ) {
    return 'document';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return 'archive';
  }
  return 'other';
}

/**
 * Strictly verifies whether a file is a PDF
 */
export function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Triggers a direct download of a base64 Data URL or blob URL.
 */
export async function downloadDataUrl(dataUrl: string, fileName: string) {
  try {
    let href = dataUrl;
    let objectUrl: string | undefined;
    if (/^https?:\/\//i.test(dataUrl)) {
      try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error('File download failed');
        objectUrl = URL.createObjectURL(await response.blob());
        href = objectUrl;
      } catch {
        href = dataUrl;
      }
    }

    const link = document.createElement('a');
    link.href = href;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    console.error('Download error:', err);
  }
}

/**
 * Opens a data URL in a new window/tab safely if possible
 */
export function openDataUrlInNewTab(dataUrl: string) {
  try {
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    } else {
      downloadDataUrl(dataUrl, 'document.pdf');
    }
  } catch {
    downloadDataUrl(dataUrl, 'document.pdf');
  }
}
