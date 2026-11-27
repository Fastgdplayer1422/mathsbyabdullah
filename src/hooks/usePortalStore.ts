import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_PORTAL_DATA, DEFAULT_TEACHER_CREDENTIALS } from '../data/defaultPortalData';
import { Assignment, Course, LiveSessionHero, PortalState, ScheduleSession, Student, StudentActivityLog, StudentStatus, StudyMaterial, UploadedFileMeta } from '../types/portal';
import { normalizeExternalUrl } from '../utils/formatters';
import { createIsolatedAuthClient, supabase } from '../lib/supabase';
import { selectWithOptionalColumns, writeWithOptionalColumns } from '../lib/supabase-schema';

const sortSessions = (items: ScheduleSession[]) => [...items].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
const id = () => crypto.randomUUID();
const databaseUuid = (value: string | null | undefined) =>
  value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isoDate = (value?: string) => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const SUBMISSIONS_CACHE_KEY = 'mathsbyabdullah_submissions_cache_v1';

function getCachedSubmissions(userId?: string): any[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${SUBMISSIONS_CACHE_KEY}:${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => String(item?.studentId || '').toLowerCase() === userId.toLowerCase())
      : [];
  } catch {
    return [];
  }
}

function saveCachedSubmissions(submissions: any[], userId?: string) {
  if (!userId) return;
  try {
    const userSubmissions = submissions.filter((item) => String(item?.studentId || '').toLowerCase() === userId.toLowerCase());
    localStorage.setItem(`${SUBMISSIONS_CACHE_KEY}:${userId}`, JSON.stringify(userSubmissions));
  } catch {
    // ignore
  }
}

export interface UploadFileResult {
  fileUrl: string;
  fileName: string;
  storagePath: string;
  bucket: string;
}

export async function uploadAssignmentFileToStorage(
  assignmentId: string,
  attachment: UploadedFileMeta
): Promise<UploadFileResult> {
  const fileName = attachment.fileName || 'assignment.pdf';
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${assignmentId}/${safeFileName}`;

  // If already a remote URL (not data:), return as is
  if (!attachment.fileData?.startsWith('data:')) {
    const existingUrl = attachment.fileData || '';
    return {
      fileUrl: existingUrl,
      fileName,
      storagePath: attachment.storagePath || filePath,
      bucket: 'assignments',
    };
  }

  // Convert data URL to Blob
  const response = await fetch(attachment.fileData);
  const blob = await response.blob();
  const contentType = attachment.fileType || blob.type || 'application/pdf';

  // Discover candidate buckets (e.g. assignments, materials, course-materials)
  let candidateBuckets = ['assignments', 'materials', 'course-materials'];
  try {
    const { data: listedBuckets, error: listError } = await supabase.storage.listBuckets();
    if (!listError && Array.isArray(listedBuckets) && listedBuckets.length > 0) {
      const existingNames = listedBuckets.map((b) => b.name);
      const matched = ['assignments', 'materials', 'course-materials'].filter((name) =>
        existingNames.includes(name)
      );
      if (matched.length > 0) {
        candidateBuckets = matched;
      }
    }
  } catch {
    // Keep default candidate list
  }

  let uploadSuccess = false;
  let successfulBucket = candidateBuckets[0];
  let successfulPath = filePath;
  let lastError: any = null;

  for (const bucket of candidateBuckets) {
    try {
      const testPaths = [filePath, `assignments/${filePath}`];
      for (const p of testPaths) {
        const { error: uploadError } = await supabase.storage.from(bucket).upload(p, blob, {
          contentType,
          upsert: true,
        });
        if (!uploadError) {
          uploadSuccess = true;
          successfulBucket = bucket;
          successfulPath = p;
          break;
        } else {
          lastError = uploadError;
        }
      }
      if (uploadSuccess) break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!uploadSuccess) {
    const errMsg = lastError?.message || lastError?.error_description || String(lastError || 'Storage upload failed');
    throw new Error(`Storage upload failed: ${errMsg}`);
  }

  // Retrieve public URL or signed URL
  let fileUrl = '';
  try {
    const { data: pubData } = supabase.storage.from(successfulBucket).getPublicUrl(successfulPath);
    if (pubData?.publicUrl) {
      fileUrl = pubData.publicUrl;
    }
  } catch {
    // fallback
  }

  if (!fileUrl) {
    try {
      const { data: signedData, error: signError } = await supabase.storage.from(successfulBucket).createSignedUrl(successfulPath, 60 * 60 * 24 * 365);
      if (!signError && signedData?.signedUrl) {
        fileUrl = signedData.signedUrl;
      }
    } catch {
      // fallback
    }
  }

  const finalFileUrl = fileUrl || successfulPath;
  const storagePath = `${successfulBucket}/${successfulPath}`;

  return {
    fileUrl: finalFileUrl,
    fileName,
    storagePath,
    bucket: successfulBucket,
  };
}

async function uploadAttachment(bucket: string, path: string, attachment?: UploadedFileMeta) {
  if (!attachment?.fileData?.startsWith('data:')) return path;
  const response = await fetch(attachment.fileData);
  const blob = await response.blob();
  const buckets = [bucket, 'materials', 'course-materials', 'assignments'].filter((v, i, a) => a.indexOf(v) === i);
  let lastErr: any = null;
  for (const b of buckets) {
    const { error } = await supabase.storage.from(b).upload(path, blob, {
      contentType: attachment.fileType || blob.type,
      upsert: true,
    });
    if (!error) return path;
    lastErr = error;
  }
  if (lastErr) throw lastErr;
  return path;
}

async function signedAttachment(bucket: string, path: string | null, fileName: string | null, fileSize: number | null, fileType: string | null) {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return { fileName: fileName || 'document.pdf', fileSize: fileSize || 0, fileType: fileType || 'application/pdf', fileData: path, storagePath: path };
  }
  const cleanPath = path.replace(/^(course-materials|assignments|materials|student-submissions)\//, '');
  const bucketsToTry = [bucket, 'assignments', 'materials', 'course-materials', 'student-submissions'].filter((v, i, a) => a.indexOf(v) === i);
  for (const b of bucketsToTry) {
    try {
      const { data, error } = await supabase.storage.from(b).createSignedUrl(cleanPath, 60 * 60);
      if (!error && data?.signedUrl) {
        return { fileName: fileName || 'document.pdf', fileSize: fileSize || 0, fileType: fileType || 'application/pdf', fileData: data.signedUrl, storagePath: path };
      }
      const { data: pubData } = supabase.storage.from(b).getPublicUrl(cleanPath);
      if (pubData?.publicUrl) {
        return { fileName: fileName || 'document.pdf', fileSize: fileSize || 0, fileType: fileType || 'application/pdf', fileData: pubData.publicUrl, storagePath: path };
      }
    } catch {
      // try next bucket
    }
  }
  return undefined;
}

function getPortalErrorMessage(error: unknown) {
  const errorRecord = error && typeof error === 'object' ? error as { message?: unknown; code?: unknown } : undefined;
  const message = typeof errorRecord?.message === 'string' && errorRecord.message.trim()
    ? errorRecord.message
    : String(error || 'Unknown error');
  const code = typeof errorRecord?.code === 'string' && errorRecord.code.trim() ? ` (code: ${errorRecord.code})` : '';
  return `${message}${code}`;
}

async function loadQuery(label: string, query: PromiseLike<any>, fallback: any) {
  try {
    const { data, error } = await query;
    return {
      data: error ? fallback : data ?? fallback,
      error: error ? `${label}: ${getPortalErrorMessage(error)}` : undefined,
    };
  } catch (error) {
    return { data: fallback, error: `${label}: ${getPortalErrorMessage(error)}` };
  }
}

const normalizeValue = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';

export interface ProfileQueryDebug {
  rowCount: number | null;
  sample: Array<{ role: unknown; status: unknown }>;
  errors: Array<{ message: string; code: string | null; details: string | null }>;
}

async function loadProfilesQuery() {
  try {
    const { data, error } = await selectWithOptionalColumns(
      'profiles',
      'id,full_name,email,role,status,grade_level,notes,request_note,created_at',
      (projection) => supabase.from('profiles').select(projection),
    );
    const rows = error ? [] : data ?? [];
    const queryErrors: ProfileQueryDebug['errors'] = error ? [{
      message: error.message,
      code: error.code ?? null,
      details: error.details ?? null,
    }] : [];
    return {
      data: rows,
      error: error ? `profiles: ${getPortalErrorMessage(error)}` : undefined,
      debug: {
        rowCount: error ? null : rows.length,
        sample: rows.slice(0, 3).map((row: any) => ({ role: row.role ?? null, status: row.status ?? null })),
        errors: queryErrors,
      } satisfies ProfileQueryDebug,
    };
  } catch (error) {
    const record = error && typeof error === 'object' ? error as { message?: unknown; code?: unknown; details?: unknown } : undefined;
    const queryError = {
      message: typeof record?.message === 'string' ? record.message : String(error || 'Unknown error'),
      code: typeof record?.code === 'string' ? record.code : null,
      details: typeof record?.details === 'string' ? record.details : null,
    };
    return {
      data: [],
      error: `profiles: ${getPortalErrorMessage(error)}`,
      debug: { rowCount: null, sample: [], errors: [queryError] } satisfies ProfileQueryDebug,
    };
  }
}

async function loadPortalState(): Promise<{ state: PortalState; errors: string[]; profileDebug: ProfileQueryDebug }> {
  let authUserId: string | undefined;
  const errors: string[] = [];
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    authUserId = sessionData?.session?.user?.id;
    if (!authUserId) {
      const { data, error } = await supabase.auth.getUser();
      if (error) errors.push(`auth: ${getPortalErrorMessage(error)}`);
      authUserId = data?.user?.id;
    }
  } catch (error) {
    errors.push(`auth: ${getPortalErrorMessage(error)}`);
  }
  const authenticated = Boolean(authUserId);

  const [profiles, courses, enrollments, settings, sessions, assignments, materials, submissions, logs] = await Promise.all([
    authenticated ? loadProfilesQuery() : Promise.resolve({ data: [], error: undefined, debug: { rowCount: null, sample: [], errors: [] } satisfies ProfileQueryDebug }),
    loadQuery('courses', supabase.from('courses').select('*'), []),
    authenticated ? loadQuery('enrollments', supabase.from('enrollments').select('student_id,course_id'), []) : Promise.resolve({ data: [], error: undefined }),
    authenticated ? loadQuery('app_settings', selectWithOptionalColumns(
      'app_settings',
      'meeting_link,live_hero',
      (projection) => supabase.from('app_settings').select(projection).eq('id', 1).maybeSingle(),
    ), null) : Promise.resolve({ data: null, error: undefined }),
    authenticated ? loadQuery('class_sessions', supabase.from('class_sessions').select('*'), []) : Promise.resolve({ data: [], error: undefined }),
    authenticated ? loadQuery('assignments', supabase.from('assignments').select('*'), []) : Promise.resolve({ data: [], error: undefined }),
    authenticated ? loadQuery('materials', supabase.from('materials').select('*'), []) : Promise.resolve({ data: [], error: undefined }),
    authenticated ? loadQuery('submissions', supabase.from('submissions').select('*'), []) : Promise.resolve({ data: [], error: undefined }),
    authenticated ? loadQuery('activity_logs', supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(300), []) : Promise.resolve({ data: [], error: undefined }),
  ]);

  for (const result of [profiles, courses, enrollments, settings, sessions, assignments, materials, submissions, logs]) {
    if (result.error) errors.push(result.error);
  }

  const enrollmentRows = enrollments.data || [];
  const students: Student[] = (profiles.data || [])
    .filter((row: any) => normalizeValue(row.role) !== 'teacher' && normalizeValue(row.email) !== 'aa6993248@gmail.com')
    .map((row: any) => ({
      id: row.id,
      name: row.full_name || (row.email ? row.email.split('@')[0] : 'Student'),
      email: row.email || '',
      status: (['approved', 'rejected'].includes(normalizeValue(row.status)) ? normalizeValue(row.status) : 'pending') as StudentStatus,
      gradeLevel: row.grade_level || '',
      notes: row.notes || undefined,
      requestNote: row.request_note || undefined,
      enrolledCourseIds: enrollmentRows.filter((entry: any) => entry.student_id === row.id).map((entry: any) => entry.course_id),
      createdAt: row.created_at || new Date().toISOString(),
    }));
  const mappedCourses: Course[] = (courses.data || []).map((row: any) => ({
    id: row.id, code: row.code, title: row.title, batchName: row.batch_name, instructor: row.instructor,
    accentColor: row.accent_color, description: row.description || undefined, scheduleCadence: row.schedule_cadence || undefined,
    classesPerWeek: row.classes_per_week || undefined, weeklySlots: row.weekly_slots || [],
  }));
  const mappedSessions: ScheduleSession[] = (sessions.data || []).map((row: any) => ({
    id: row.id, courseId: row.course_id, topic: row.topic, date: row.session_date, startTime: row.start_time,
    endTime: row.end_time, status: row.status, meetingUrl: row.meeting_url,
  }));
  const mappedAssignments: Assignment[] = await Promise.all((assignments.data || []).map(async (row: any) => {
    const rawFileUrl =
      row.file_url ||
      row.attachment_url ||
      row.pdf_url ||
      row.material_url ||
      row.storage_path ||
      row.attachment_path ||
      row.file_path ||
      (typeof row.attachment === 'string' ? row.attachment : row.attachment?.fileData || row.attachment?.storagePath) ||
      (row.resource_url && (/\.pdf($|\?)/i.test(row.resource_url) || row.resource_url.includes('/storage/v1/')) ? row.resource_url : null);

    const rawFileName =
      row.file_name ||
      row.attachment_name ||
      row.pdf_name ||
      row.material_name ||
      row.name ||
      row.attachment?.fileName ||
      row.resource_label ||
      (rawFileUrl && typeof rawFileUrl === 'string' ? rawFileUrl.split('/').pop()?.split('?')[0] : null) ||
      `${row.title || 'Assignment'}.pdf`;

    const rawFileSize = row.file_size || row.attachment_size || row.size || row.attachment?.fileSize || null;
    const rawFileType = row.file_type || row.attachment_type || row.mime_type || row.attachment?.fileType || 'application/pdf';

    const attachment = await signedAttachment('assignments', rawFileUrl, rawFileName, rawFileSize, rawFileType);
    const resolvedUrl = attachment?.fileData || (rawFileUrl && (typeof rawFileUrl === 'string' && (rawFileUrl.startsWith('http://') || rawFileUrl.startsWith('https://') || rawFileUrl.startsWith('data:'))) ? rawFileUrl : undefined);

    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      dueDate: row.due_date,
      description: row.description,
      resourceUrl: row.resource_url || (resolvedUrl && resolvedUrl.startsWith('http') ? resolvedUrl : ''),
      resourceLabel: row.resource_label || undefined,
      attachment: attachment || (resolvedUrl ? {
        fileName: rawFileName,
        fileSize: rawFileSize || 0,
        fileType: rawFileType,
        fileData: resolvedUrl,
        storagePath: rawFileUrl,
      } : undefined),
      fileUrl: resolvedUrl || rawFileUrl || undefined,
      fileName: attachment?.fileName || rawFileName || undefined,
      attachmentUrl: row.attachment_url || undefined,
      pdfUrl: row.pdf_url || undefined,
      materialUrl: row.material_url || undefined,
      storagePath: row.storage_path || row.attachment_path || undefined,
      rawRow: row,
    };
  }));
  const mappedMaterials: StudyMaterial[] = await Promise.all((materials.data || []).map(async (row: any) => {
    const rawFileUrl = row.file_url || row.storage_path;
    const rawFileName = row.file_name;
    const attachment = await signedAttachment('course-materials', rawFileUrl, rawFileName, row.file_size, row.file_type);
    return {
      id: row.id, courseId: row.course_id, title: row.title, type: row.type, date: row.material_date,
      metaInfo: row.meta_info, url: row.url,
      attachment,
      fileUrl: attachment?.fileData || rawFileUrl || undefined,
      fileName: attachment?.fileName || rawFileName || undefined,
    };
  }));
  const rawSubmissions = submissions.data || [];
  const mappedSubmissions = await Promise.all(rawSubmissions.map(async (row: any) => {
    const studentId = row.student_id || row.user_id || '';
    const rawStatus = (row.status || '').trim().toLowerCase();
    const normalizedStatus = rawStatus === 'graded' ? 'Graded' : 'Submitted';
    const rawFileUrl = row.file_url || row.storage_path || row.pdf_url;
    const rawFileName = row.file_name;
    const rawGradedFileUrl = row.graded_file_url || row.review_storage_path;
    const rawGradedFileName = row.graded_file_name || row.review_file_name;

    const attachment = (rawFileUrl || rawFileName) && rawFileName !== 'No student attachment'
      ? await signedAttachment('student-submissions', rawFileUrl, rawFileName || 'submission.pdf', row.file_size, row.file_type)
      : undefined;

    const reviewAttachment = rawGradedFileUrl
      ? await signedAttachment(
          'student-submissions',
          rawGradedFileUrl,
          rawGradedFileName || 'graded-review.pdf',
          row.review_file_size,
          row.review_file_type || 'application/pdf',
        )
      : undefined;

    return {
      id: String(row.id),
      assignmentId: String(row.assignment_id || ''),
      studentId: String(studentId),
      status: normalizedStatus as 'Submitted' | 'Graded',
      submissionUrl: row.submission_url || undefined,
      submissionNote: row.submission_note || undefined,
      submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
      grade: row.grade || undefined,
      teacherFeedback: row.teacher_feedback || undefined,
      attachment,
      reviewAttachment,
      fileUrl: attachment?.fileData || rawFileUrl || undefined,
      fileName: attachment?.fileName || rawFileName || undefined,
      gradedFileUrl: reviewAttachment?.fileData || rawGradedFileUrl || undefined,
      gradedFileName: reviewAttachment?.fileName || rawGradedFileName || undefined,
    };
  }));

  const cachedSubmissions = getCachedSubmissions(authUserId);
  const resolvedSubmissions = submissions.error ? cachedSubmissions : mappedSubmissions;
  saveCachedSubmissions(resolvedSubmissions, authUserId);

  return {
    state: {
      ...EMPTY_PORTAL_DATA,
      teacherAccount: DEFAULT_TEACHER_CREDENTIALS,
      meetingUrl: settings.data?.meeting_link || '',
      liveHero: settings.data?.live_hero || null,
      courses: mappedCourses,
      students,
      sessions: sortSessions(mappedSessions),
      assignments: mappedAssignments,
      materials: mappedMaterials,
      submissions: resolvedSubmissions,
      activityLogs: (logs.data || []).map((row: any) => ({ id: row.id, studentId: row.student_id, action: row.action, details: row.details || undefined, timestamp: row.created_at })),
    },
    errors,
    profileDebug: profiles.debug,
  };
}

async function syncChanges(previous: PortalState, next: PortalState) {
  const changed = async (before: any[], after: any[], toRow: (item: any) => Promise<any> | any, table: string) => {
    const oldById = new Map(before.map((item) => [item.id, item]));
    const newById = new Map(after.map((item) => [item.id, item]));
    const removed = [...oldById.keys()].filter((key) => !newById.has(key));
    const updates = after.filter((item) => !oldById.has(item.id) || !same(oldById.get(item.id), item));
    if (removed.length) {
      if (table === 'profiles') {
        const { error } = await supabase.from(table).delete().in('id', removed);
        if (error) {
          console.warn('[syncChanges] Profiles delete notice (often handled by RPC):', error.message);
        }
      } else {
        const { error } = await supabase.from(table).delete().in('id', removed);
        if (error) throw error;
      }
    }
    if (updates.length) {
      const rows = await Promise.all(updates.map(toRow));
      const { error } = await writeWithOptionalColumns(table, rows, (candidate) => supabase.from(table).upsert(candidate));
      if (error) throw error;
    }
  };
  await changed(previous.students, next.students, (s: Student) => ({
    id: s.id, full_name: s.name, email: s.email, role: 'student', status: s.status,
    grade_level: s.gradeLevel, notes: s.notes || null, request_note: s.requestNote || null,
  }), 'profiles');
  const previousEnrollmentKeys = new Set(previous.students.flatMap((student) => student.enrolledCourseIds.map((courseId) => `${student.id}:${courseId}`)));
  const nextEnrollmentKeys = new Set(next.students.flatMap((student) => student.enrolledCourseIds.map((courseId) => `${student.id}:${courseId}`)));
  for (const key of previousEnrollmentKeys) {
    if (!nextEnrollmentKeys.has(key)) {
      const [studentId, courseId] = key.split(':');
      const { error } = await supabase.from('enrollments').delete().eq('student_id', studentId).eq('course_id', courseId);
      if (error) throw error;
    }
  }
  const enrollmentRows = next.students.flatMap((student) => student.enrolledCourseIds
    .filter((courseId) => !previousEnrollmentKeys.has(`${student.id}:${courseId}`))
    .map((courseId) => ({ student_id: databaseUuid(student.id), course_id: databaseUuid(courseId) })));
  if (enrollmentRows.length) {
    const { error } = await writeWithOptionalColumns('enrollments', enrollmentRows, (candidate) => supabase.from('enrollments').upsert(candidate));
    if (error) throw error;
  }
  await changed(previous.courses, next.courses, (c: Course) => ({
    id: c.id, code: c.code, title: c.title, batch_name: c.batchName, instructor: c.instructor,
    accent_color: c.accentColor, description: c.description || null, schedule_cadence: c.scheduleCadence || null,
    classes_per_week: c.classesPerWeek || null, weekly_slots: c.weeklySlots || [],
  }), 'courses');
  await changed(previous.sessions, next.sessions, (s: ScheduleSession) => ({
    id: s.id, course_id: databaseUuid(s.courseId), topic: s.topic, session_date: s.date, start_time: s.startTime,
    end_time: s.endTime, status: s.status, meeting_url: s.meetingUrl,
  }), 'class_sessions');
  await changed(previous.assignments, next.assignments, async (a: Assignment) => {
    const attachmentPath = a.attachment?.fileData?.startsWith('data:') ? await uploadAttachment('course-materials', `assignments/${a.id}/${a.attachment.fileName}`, a.attachment) : a.attachment?.storagePath || null;
    return {
      id: a.id, course_id: databaseUuid(a.courseId), title: a.title, due_date: a.dueDate, description: a.description,
      resource_url: a.resourceUrl, resource_label: a.resourceLabel || null, attachment_path: attachmentPath,
      attachment_name: a.attachment?.fileName || null, attachment_size: a.attachment?.fileSize || null, attachment_type: a.attachment?.fileType || null,
    };
  }, 'assignments');
  await changed(previous.materials, next.materials, async (m: StudyMaterial) => {
    const storagePath = m.attachment?.fileData?.startsWith('data:') ? await uploadAttachment('course-materials', `materials/${m.courseId}/${m.id}/${m.attachment.fileName}`, m.attachment) : m.attachment?.storagePath || null;
    return {
      id: m.id, course_id: databaseUuid(m.courseId), title: m.title, type: m.type, material_date: m.date,
      meta_info: m.metaInfo, url: m.url, storage_path: storagePath, file_name: m.attachment?.fileName || null,
      file_size: m.attachment?.fileSize || null, file_type: m.attachment?.fileType || null,
    };
  }, 'materials');
  await changed(previous.submissions, next.submissions, async (s: any) => {
    const storagePath = s.attachment?.fileData?.startsWith('data:') ? await uploadAttachment('student-submissions', `${s.studentId}/${s.id}.pdf`, s.attachment) : s.attachment?.storagePath || null;
    const reviewStoragePath = s.reviewAttachment?.fileData?.startsWith('data:')
      ? await uploadAttachment('student-submissions', `${s.reviewAttachment.storagePath || s.id + '/review.pdf'}`, s.reviewAttachment)
      : s.reviewAttachment?.storagePath || null;
    const studentUuid = databaseUuid(s.studentId) || s.studentId;
    const assignmentUuid = databaseUuid(s.assignmentId) || s.assignmentId;
    return {
      id: s.id, assignment_id: assignmentUuid, student_id: studentUuid, user_id: studentUuid, status: s.status,
      submission_url: s.submissionUrl || null, submission_note: s.submissionNote || null,
      submitted_at: isoDate(s.submittedAt), grade: s.grade || null, teacher_feedback: s.teacherFeedback || null,
      storage_path: storagePath || 'no-student-file', file_name: s.attachment?.fileName || 'No student attachment', file_size: s.attachment?.fileSize || 0,
      file_type: s.attachment?.fileType || 'application/pdf',
      review_storage_path: reviewStoragePath,
      review_file_name: s.reviewAttachment?.fileName || null,
      review_file_size: s.reviewAttachment?.fileSize || null,
      review_file_type: s.reviewAttachment?.fileType || null,
      graded_file_url: reviewStoragePath,
      graded_file_name: s.reviewAttachment?.fileName || null,
      graded_at: s.status === 'Graded' ? isoDate(s.submittedAt) : null,
    };
  }, 'submissions');
  await changed(previous.activityLogs, next.activityLogs, (l: StudentActivityLog) => ({
    id: l.id, student_id: databaseUuid(l.studentId), action: l.action, details: l.details || null, created_at: isoDate(l.timestamp),
  }), 'activity_logs');
  if (previous.meetingUrl !== next.meetingUrl || !same(previous.liveHero, next.liveHero)) {
    const settingsPayload = {
      id: 1, meeting_link: next.meetingUrl, live_hero: next.liveHero,
      updated_at: new Date().toISOString(),
    };
    const { error } = await writeWithOptionalColumns('app_settings', settingsPayload, (candidate) => supabase.from('app_settings').upsert(candidate));
    if (error) throw error;
  }
}

export function usePortalStore() {
  const [state, setState] = useState<PortalState>(() => {
    const cached = getCachedSubmissions();
    return {
      ...EMPTY_PORTAL_DATA,
      submissions: cached,
    };
  });
  const stateRef = useRef(state);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileDebug, setProfileDebug] = useState<ProfileQueryDebug>({ rowCount: null, sample: [], errors: [] });
  const [loading, setLoading] = useState(true);
  const refreshSequence = useRef(0);
  const refreshPortalData = useCallback(async () => {
    const requestId = ++refreshSequence.current;
    setLoading(true);
    try {
      const { state: next, errors, profileDebug: nextProfileDebug } = await loadPortalState();
      if (requestId !== refreshSequence.current) return;
      stateRef.current = next;
      setState(next);
      setProfileDebug(nextProfileDebug);
      setLoadError(errors.length ? errors.join(' · ') : null);
    } catch (error) {
      if (requestId === refreshSequence.current) setLoadError(`portal data: ${getPortalErrorMessage(error)}`);
    } finally {
      if (requestId === refreshSequence.current) setLoading(false);
    }
  }, []);
  const persistState = useCallback((updater: (prev: PortalState) => PortalState) => {
    const previous = stateRef.current;
    const next = updater(previous);
    stateRef.current = next;
    setState(next);
    void syncChanges(previous, next).catch((error) => setLoadError(`save changes: ${getPortalErrorMessage(error)}`));
  }, []);
  const persistAndRefresh = useCallback(async (updater: (prev: PortalState) => PortalState) => {
    const previous = stateRef.current;
    const next = updater(previous);
    stateRef.current = next;
    setState(next);
    let saveError: string | null = null;
    try {
      await syncChanges(previous, next);
    } catch (error) {
      saveError = `save changes: ${getPortalErrorMessage(error)}`;
    }
    await refreshPortalData();
    if (saveError) setLoadError((current) => [current, saveError].filter(Boolean).join(' · '));
  }, [refreshPortalData]);
  const reportTeacherSaveFailure = useCallback((table: string, payload: unknown, error: unknown) => {
    const details = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : undefined;
    const code = typeof details?.code === 'string' && details.code ? details.code : 'UNKNOWN';
    const message = typeof details?.message === 'string' && details.message ? details.message : String(error || 'Unknown error');
    console.error(`[Supabase] ${table} save failed`, { payload, error });
    setLoadError(`${table} save failed (${code}): ${message}`);
  }, []);
  const refreshAfterTeacherSave = useCallback(async (table: string, payload: unknown, data: unknown[] | null, error: unknown) => {
    if (error) {
      reportTeacherSaveFailure(table, payload, error);
      return false;
    }
    if (!data?.length) {
      reportTeacherSaveFailure(table, payload, { code: 'NO_ROWS_RETURNED', message: 'Supabase returned no saved rows.' });
      return false;
    }
    await refreshPortalData();
    return true;
  }, [refreshPortalData, reportTeacherSaveFailure]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshPortalData(), 0);
    });
    void refreshPortalData();
    return () => listener.subscription.unsubscribe();
  }, [refreshPortalData]);

  const logActivity = useCallback((studentId: string, action: string, details?: string) => {
    if (!studentId) return;
    const entry: StudentActivityLog = { id: id(), studentId, action, details, timestamp: new Date().toISOString() };
    persistState((prev) => ({ ...prev, activityLogs: [entry, ...prev.activityLogs].slice(0, 300) }));
  }, [persistState]);
  const registerStudent = useCallback(async (data: { name: string; email: string; password: string; gradeLevel: string; requestNote?: string }) => {
    const fullName = data.name.trim();
    const email = data.email.trim().toLowerCase();

    try {
      let userId: string | undefined;
      let sessionCreated = false;

      // Check if current authenticated user matches this email
      const { data: currentAuth } = await supabase.auth.getUser();
      if (currentAuth?.user && currentAuth.user.email?.trim().toLowerCase() === email) {
        userId = currentAuth.user.id;
        sessionCreated = true;
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password: data.password,
          options: {
            emailRedirectTo: import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/`,
            data: { full_name: fullName, grade_level: data.gradeLevel.trim(), request_note: data.requestNote?.trim() || '' },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            // User exists in Supabase auth; authenticate with password to get userId and complete their profile row
            const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
              email,
              password: data.password,
            });
            if (!signInErr && signInData?.user) {
              userId = signInData.user.id;
              sessionCreated = Boolean(signInData.session);
            } else {
              return {
                success: false,
                error: 'An account with this email already exists. Please verify your password or sign in with your account.',
              };
            }
          } else if (error.message.toLowerCase().includes('password')) {
            return { success: false, error: 'Choose a stronger password that meets the account security requirements.' };
          } else {
            return { success: false, error: 'Registration could not be completed. Check your details and try again.' };
          }
        } else {
          userId = signUpData.user?.id ?? signUpData.session?.user?.id;
          sessionCreated = Boolean(signUpData.session);
        }
      }

      if (!userId) {
        return { success: false, error: 'We could not finish setting up your account. Please try again or contact the teacher.' };
      }

      const gradeLevel = data.gradeLevel.trim();
      const requestNote = data.requestNote?.trim();
      const profile = {
        id: userId,
        full_name: fullName,
        email,
        role: 'student' as const,
        status: 'pending' as const,
        ...(gradeLevel ? { grade_level: gradeLevel } : {}),
        ...(requestNote ? { request_note: requestNote } : {}),
      };
      const { error: profileError } = await writeWithOptionalColumns('profiles', profile, (candidate) => supabase.from('profiles').upsert(candidate, { onConflict: 'id' }));

      if (profileError) {
        console.error('[auth] Student profile upsert failed', {
          code: profileError.code,
          message: profileError.message,
        });
        return {
          success: false,
          error: `Your account was created, but we could not save your student profile. Database error (code: ${profileError.code || 'unknown'}): ${profileError.message}`,
        };
      }

      await refreshPortalData();

      return { success: true, confirmationRequired: !sessionCreated };
    } catch (registrationError) {
      console.error('[auth] Student registration failed', registrationError);
      return { success: false, error: 'Registration could not be completed. Please try again or contact the teacher.' };
    }
  }, [refreshPortalData]);
  const approveStudent = useCallback((studentId: string, enrolledCourseIds: string[] = []) => persistAndRefresh((prev) => ({
    ...prev, students: prev.students.map((s) => s.id === studentId ? { ...s, status: 'approved', enrolledCourseIds } : s),
    activityLogs: [{ id: id(), studentId, action: 'Account approved by Teacher', details: `Enrolled in ${enrolledCourseIds.length} course batch(es)`, timestamp: new Date().toISOString() }, ...prev.activityLogs],
  })), [persistAndRefresh]);
  const rejectStudent = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase.rpc('decline_and_delete_user', {
        target_user_id: studentId,
      });

      const errorMessage = error?.message
        || (data && typeof data === 'object' && ('error' in data) ? String((data as any).error) : null)
        || (data && typeof data === 'object' && ('success' in data) && !(data as any).success ? String((data as any).message || 'Decline operation failed.') : null)
        || (data === false ? 'Unable to decline and remove student.' : null);

      if (errorMessage) {
        console.error('[Supabase RPC] decline_and_delete_user error:', error || data);
        return { success: false, error: errorMessage };
      }
      setState((prev) => {
        const next = {
          ...prev,
          students: prev.students.filter((s) => s.id !== studentId),
          activityLogs: prev.activityLogs.filter((l) => l.studentId !== studentId),
          submissions: prev.submissions.filter((s) => s.studentId !== studentId),
        };
        stateRef.current = next;
        return next;
      });
      return { success: true };
    } catch (err: any) {
      console.error('[Supabase RPC] decline_and_delete_user error:', err);
      return { success: false, error: err?.message || getPortalErrorMessage(err) };
    }
  }, []);
  const changeStudentStatus = useCallback((studentId: string, status: StudentStatus) => persistAndRefresh((prev) => ({ ...prev, students: prev.students.map((s) => s.id === studentId ? { ...s, status } : s) })), [persistAndRefresh]);
  const addStudent = useCallback(async (studentData: Omit<Student, 'id' | 'createdAt'>, initialPassword: string) => {
    const authClient = createIsolatedAuthClient();
    const { data, error } = await authClient.auth.signUp({
      email: studentData.email.trim().toLowerCase(),
      password: initialPassword,
      options: {
        emailRedirectTo: import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/`,
        data: { full_name: studentData.name.trim(), grade_level: studentData.gradeLevel, request_note: studentData.notes || '' },
      },
    });
    if (error || !data.user) throw new Error('Unable to create this account. Verify the email is not already registered and the password meets the security requirements.');
    const created: Student = {
      id: data.user.id, name: studentData.name.trim(), email: studentData.email.trim().toLowerCase(),
      status: 'pending', gradeLevel: studentData.gradeLevel, notes: studentData.notes,
      requestNote: studentData.requestNote, enrolledCourseIds: [], createdAt: new Date().toISOString(),
    };
    const next = { ...stateRef.current, students: [created, ...stateRef.current.students] };
    stateRef.current = next;
    setState(next);
    return created;
  }, []);
  const updateStudent = useCallback((studentId: string, updates: Partial<Omit<Student, 'id' | 'createdAt'>>) => persistState((prev) => ({ ...prev, students: prev.students.map((s) => s.id === studentId ? { ...s, ...updates } : s) })), [persistState]);
  const deleteStudent = useCallback((studentId: string) => persistState((prev) => ({ ...prev, students: prev.students.filter((s) => s.id !== studentId), activityLogs: prev.activityLogs.filter((l) => l.studentId !== studentId), submissions: prev.submissions.filter((s) => s.studentId !== studentId) })), [persistState]);
  const toggleStudentEnrollment = useCallback((studentId: string, courseId: string) => persistAndRefresh((prev) => ({
    ...prev, students: prev.students.map((s) => s.id === studentId ? { ...s, enrolledCourseIds: s.enrolledCourseIds.includes(courseId) ? s.enrolledCourseIds.filter((id) => id !== courseId) : [...s.enrolledCourseIds, courseId] } : s),
  })), [persistAndRefresh]);
  const publishLiveHero = useCallback(async (hero: Omit<LiveSessionHero, 'updatedAt'> | null) => {
    const current = stateRef.current;
    const nextHero = hero ? { ...hero, meetingUrl: normalizeExternalUrl(hero.meetingUrl), updatedAt: new Date().toISOString() } : null;
    const session = hero?.sessionId ? current.sessions.find((item) => item.id === hero.sessionId) : undefined;
    if (session && hero) {
      const sessionPayload = {
        course_id: databaseUuid(session.courseId), topic: session.topic, session_date: session.date, start_time: session.startTime,
        end_time: session.endTime, status: hero.status === 'live' ? 'Live' : session.status, meeting_url: nextHero?.meetingUrl || '',
      };
      const { data, error } = await writeWithOptionalColumns('class_sessions', sessionPayload, (candidate) => supabase.from('class_sessions').update(candidate).eq('id', session.id).select());
      if (!(await refreshAfterTeacherSave('class_sessions', { id: session.id, ...sessionPayload }, data, error))) return false;
    }
    const settingsPayload = { id: 1, meeting_link: current.meetingUrl, live_hero: nextHero, updated_at: new Date().toISOString() };
    const { data, error } = await writeWithOptionalColumns('app_settings', [settingsPayload], (candidate) => supabase.from('app_settings').upsert(candidate).select());
    return refreshAfterTeacherSave('app_settings', settingsPayload, data, error);
  }, [refreshAfterTeacherSave]);
  const addCourse = useCallback(async (course: Omit<Course, 'id'>) => {
    const courseId = id();
    const payload = {
      id: courseId, code: course.code, title: course.title, batch_name: course.batchName, instructor: course.instructor,
      accent_color: course.accentColor, description: course.description || null, schedule_cadence: course.scheduleCadence || null,
      classes_per_week: course.classesPerWeek || null, weekly_slots: course.weeklySlots || [],
    };
    const { data, error } = await writeWithOptionalColumns('courses', [payload], (candidate) => supabase.from('courses').insert(candidate).select());
    return refreshAfterTeacherSave('courses', payload, data, error);
  }, [refreshAfterTeacherSave]);
  const updateCourse = useCallback(async (courseId: string, updates: Partial<Omit<Course, 'id'>>) => {
    const current = stateRef.current.courses.find((course) => course.id === courseId);
    if (!current) return false;
    const course = { ...current, ...updates };
    const payload = {
      code: course.code, title: course.title, batch_name: course.batchName, instructor: course.instructor,
      accent_color: course.accentColor, description: course.description || null, schedule_cadence: course.scheduleCadence || null,
      classes_per_week: course.classesPerWeek || null, weekly_slots: course.weeklySlots || [],
    };
    const { data, error } = await writeWithOptionalColumns('courses', payload, (candidate) => supabase.from('courses').update(candidate).eq('id', courseId).select());
    return refreshAfterTeacherSave('courses', { id: courseId, ...payload }, data, error);
  }, [refreshAfterTeacherSave]);
  const deleteCourse = useCallback((courseId: string) => persistAndRefresh((prev) => ({
    ...prev, courses: prev.courses.filter((c) => c.id !== courseId), students: prev.students.map((s) => ({ ...s, enrolledCourseIds: s.enrolledCourseIds.filter((id) => id !== courseId) })),
    sessions: prev.sessions.filter((s) => s.courseId !== courseId), assignments: prev.assignments.filter((a) => a.courseId !== courseId), materials: prev.materials.filter((m) => m.courseId !== courseId),
    liveHero: prev.liveHero?.courseId === courseId ? null : prev.liveHero,
  })), [persistAndRefresh]);
  const addSession = useCallback(async (session: Omit<ScheduleSession, 'id'>) => {
    const payload = {
      id: id(), course_id: databaseUuid(session.courseId), topic: session.topic, session_date: session.date,
      start_time: session.startTime, end_time: session.endTime, status: session.status,
      meeting_url: normalizeExternalUrl(session.meetingUrl),
    };
    const { data, error } = await writeWithOptionalColumns('class_sessions', [payload], (candidate) => supabase.from('class_sessions').insert(candidate).select());
    return refreshAfterTeacherSave('class_sessions', payload, data, error);
  }, [refreshAfterTeacherSave]);
  const updateSession = useCallback(async (sessionId: string, updates: Partial<Omit<ScheduleSession, 'id'>>) => {
    const current = stateRef.current.sessions.find((session) => session.id === sessionId);
    if (!current) return false;
    const session = { ...current, ...updates };
    const payload = {
      course_id: databaseUuid(session.courseId), topic: session.topic, session_date: session.date, start_time: session.startTime,
      end_time: session.endTime, status: session.status, meeting_url: normalizeExternalUrl(session.meetingUrl),
    };
    const { data, error } = await writeWithOptionalColumns('class_sessions', payload, (candidate) => supabase.from('class_sessions').update(candidate).eq('id', sessionId).select());
    return refreshAfterTeacherSave('class_sessions', { id: sessionId, ...payload }, data, error);
  }, [refreshAfterTeacherSave]);
  const deleteSession = useCallback((sessionId: string) => persistAndRefresh((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.id !== sessionId) })), [persistAndRefresh]);
  const addAssignment = useCallback(async (assignment: Omit<Assignment, 'id'>): Promise<{ success: boolean; error?: string }> => {
    const assignmentId = id();

    // 1. Upload selected file to Supabase Storage
    // If the upload returns an error, stop immediately without saving the assignment with file_url: null
    let uploadResult: UploadFileResult | null = null;
    if (assignment.attachment) {
      try {
        uploadResult = await uploadAssignmentFileToStorage(assignmentId, assignment.attachment);
      } catch (uploadError) {
        const errorMsg = uploadError instanceof Error ? uploadError.message : String(uploadError || 'Storage upload failed');
        console.error('[Supabase Storage] Assignment upload error:', errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    try {
      const fileUrl = uploadResult?.fileUrl || assignment.fileUrl || null;
      const fileName = uploadResult?.fileName || assignment.fileName || assignment.attachment?.fileName || null;
      const storagePath = uploadResult?.storagePath || assignment.storagePath || null;

      const payload = {
        id: assignmentId,
        course_id: databaseUuid(assignment.courseId),
        title: assignment.title,
        due_date: assignment.dueDate,
        description: assignment.description,
        resource_url: fileUrl || normalizeExternalUrl(assignment.resourceUrl) || '',
        resource_label: assignment.resourceLabel || fileName || 'Worksheet PDF',
        file_url: fileUrl,
        file_name: fileName,
        storage_path: storagePath,
        attachment_path: storagePath,
        attachment_name: fileName,
        attachment_size: assignment.attachment?.fileSize || null,
        attachment_type: assignment.attachment?.fileType || 'application/pdf',
      };

      const { data, error } = await writeWithOptionalColumns('assignments', [payload], (candidate) =>
        supabase.from('assignments').insert(candidate).select()
      );

      if (error) {
        reportTeacherSaveFailure('assignments', { id: assignmentId, ...assignment }, error);
        return { success: false, error: getPortalErrorMessage(error) };
      }

      // Verify that the newly created row has a non-null file_url
      const insertedRow = Array.isArray(data) ? data[0] : data;
      if (fileUrl && insertedRow && !insertedRow.file_url) {
        try {
          await supabase.from('assignments').update({ file_url: fileUrl }).eq('id', assignmentId);
        } catch {
          // ignore optional retry
        }
      }

      await refreshPortalData();
      return { success: true };
    } catch (error) {
      reportTeacherSaveFailure('assignments', { id: assignmentId, ...assignment }, error);
      return { success: false, error: getPortalErrorMessage(error) };
    }
  }, [refreshPortalData, reportTeacherSaveFailure]);
  const updateAssignment = useCallback(async (assignmentId: string, updates: Partial<Omit<Assignment, 'id'>>): Promise<{ success: boolean; error?: string }> => {
    const current = stateRef.current.assignments.find((assignment) => assignment.id === assignmentId);
    if (!current) return { success: false, error: 'Assignment not found' };
    const assignment = { ...current, ...updates };

    let uploadResult: UploadFileResult | null = null;
    if (updates.attachment && updates.attachment.fileData?.startsWith('data:')) {
      try {
        uploadResult = await uploadAssignmentFileToStorage(assignmentId, updates.attachment);
      } catch (uploadError) {
        const errorMsg = uploadError instanceof Error ? uploadError.message : String(uploadError || 'Storage upload failed');
        console.error('[Supabase Storage] Assignment update upload error:', errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    try {
      const fileUrl = uploadResult?.fileUrl || assignment.fileUrl || null;
      const fileName = uploadResult?.fileName || assignment.fileName || assignment.attachment?.fileName || null;
      const storagePath = uploadResult?.storagePath || assignment.storagePath || null;

      const payload = {
        course_id: databaseUuid(assignment.courseId),
        title: assignment.title,
        due_date: assignment.dueDate,
        description: assignment.description,
        resource_url: fileUrl || normalizeExternalUrl(assignment.resourceUrl) || '',
        resource_label: assignment.resourceLabel || fileName || null,
        file_url: fileUrl,
        file_name: fileName,
        storage_path: storagePath,
        attachment_path: storagePath,
        attachment_name: fileName,
        attachment_size: assignment.attachment?.fileSize || null,
        attachment_type: assignment.attachment?.fileType || null,
      };

      const { data, error } = await writeWithOptionalColumns('assignments', payload, (candidate) =>
        supabase.from('assignments').update(candidate).eq('id', assignmentId).select()
      );

      if (error) {
        reportTeacherSaveFailure('assignments', assignment, error);
        return { success: false, error: getPortalErrorMessage(error) };
      }

      await refreshPortalData();
      return { success: true };
    } catch (error) {
      reportTeacherSaveFailure('assignments', assignment, error);
      return { success: false, error: getPortalErrorMessage(error) };
    }
  }, [refreshPortalData, reportTeacherSaveFailure]);
  const deleteAssignment = useCallback((assignmentId: string) => persistAndRefresh((prev) => ({ ...prev, assignments: prev.assignments.filter((a) => a.id !== assignmentId), submissions: prev.submissions.filter((s) => s.assignmentId !== assignmentId) })), [persistAndRefresh]);
  const submitAssignment = useCallback(async (
    assignmentId: string,
    studentId: string,
    submissionUrl: string,
    submissionNote: string,
    attachment?: UploadedFileMeta
  ) => {
    const existingSubmission = stateRef.current.submissions.find(
      (item) => item.assignmentId.toLowerCase() === assignmentId.toLowerCase() && item.studentId.toLowerCase() === studentId.toLowerCase()
    );
    const subId = existingSubmission?.id || id();
    const submittedAt = new Date().toISOString();
    const normalizedUrl = normalizeExternalUrl(submissionUrl);
    const cleanNote = submissionNote.trim();
    const previousSubmission = existingSubmission;
    const newSubmission = {
      id: subId,
      assignmentId,
      studentId,
      status: 'Submitted' as const,
      submissionUrl: normalizedUrl || undefined,
      submissionNote: cleanNote || undefined,
      submittedAt,
      attachment,
    };

    setState((prev) => {
      const filtered = prev.submissions.filter(
        (item) => !(item.assignmentId.toLowerCase() === assignmentId.toLowerCase() && item.studentId.toLowerCase() === studentId.toLowerCase())
      );
      const nextSubmissions = [newSubmission, ...filtered];
      saveCachedSubmissions(nextSubmissions, studentId);
      const asgTitle = prev.assignments.find((item) => item.id.toLowerCase() === assignmentId.toLowerCase())?.title || 'Coursework';
      const logEntry: StudentActivityLog = {
        id: id(),
        studentId,
        action: 'Marked Assignment as Submitted',
        details: asgTitle,
        timestamp: submittedAt,
      };
      const nextState = { ...prev, submissions: nextSubmissions, activityLogs: [logEntry, ...prev.activityLogs].slice(0, 300) };
      stateRef.current = nextState;
      return nextState;
    });

    try {
      let storagePath: string | null = null;
      if (attachment?.fileData?.startsWith('data:')) {
        storagePath = await uploadAttachment('student-submissions', `${studentId}/${assignmentId}_${subId}.pdf`, attachment);
      } else if (attachment?.storagePath) {
        storagePath = attachment.storagePath;
      }

      const validAssignmentUuid = databaseUuid(assignmentId) || assignmentId;
      const validStudentUuid = databaseUuid(studentId) || studentId;
      const payload = {
        id: subId,
        assignment_id: validAssignmentUuid,
        student_id: validStudentUuid,
        user_id: validStudentUuid,
        status: 'Submitted',
        file_url: storagePath || normalizedUrl || '',
        submission_url: normalizedUrl || null,
        submission_note: cleanNote || null,
        submitted_at: submittedAt,
        storage_path: storagePath,
        file_name: attachment?.fileName || null,
        file_size: attachment?.fileSize || null,
        file_type: attachment?.fileType || 'application/pdf',
      };
      const { data, error } = await writeWithOptionalColumns('submissions', [payload], (candidate) =>
        supabase.from('submissions').upsert(candidate, { onConflict: 'id' }).select('id')
      );
      if (error) throw error;
      if (!data?.length) throw new Error('Supabase did not confirm that the submission was saved.');

      const current = stateRef.current.submissions.filter(
        (item) => !(item.assignmentId.toLowerCase() === assignmentId.toLowerCase() && item.studentId.toLowerCase() === studentId.toLowerCase())
      );
      const savedSubmission = { ...newSubmission, attachment: attachment ? { ...attachment, storagePath: storagePath || attachment.storagePath } : undefined };
      const nextSubmissions = [savedSubmission, ...current];
      saveCachedSubmissions(nextSubmissions, studentId);
      stateRef.current = { ...stateRef.current, submissions: nextSubmissions };
      setState(stateRef.current);
      await refreshPortalData();
      return { success: true };
    } catch (error) {
      const current = stateRef.current.submissions.filter(
        (item) => !(item.assignmentId.toLowerCase() === assignmentId.toLowerCase() && item.studentId.toLowerCase() === studentId.toLowerCase())
      );
      const nextSubmissions = previousSubmission ? [previousSubmission, ...current] : current;
      saveCachedSubmissions(nextSubmissions, studentId);
      stateRef.current = { ...stateRef.current, submissions: nextSubmissions };
      setState(stateRef.current);
      return { success: false, error: getPortalErrorMessage(error) };
    }
  }, [refreshPortalData]);

  const retractSubmission = useCallback(async (assignmentId: string, studentId: string) => {
    setState((prev) => {
      const nextSubmissions = prev.submissions.filter(
        (s) => !(s.assignmentId.toLowerCase() === assignmentId.toLowerCase() && s.studentId.toLowerCase() === studentId.toLowerCase())
      );
      saveCachedSubmissions(nextSubmissions, studentId);
      const nextState = { ...prev, submissions: nextSubmissions };
      stateRef.current = nextState;
      return nextState;
    });

    try {
      const validAssignmentUuid = databaseUuid(assignmentId) || assignmentId;
      const validStudentUuid = databaseUuid(studentId) || studentId;
      await supabase
        .from('submissions')
        .delete()
        .eq('assignment_id', validAssignmentUuid)
        .eq('student_id', validStudentUuid);
    } catch (err) {
      console.warn('[Supabase] Retract submission notice', err);
    }
  }, []);

  const gradeAssignment = useCallback(async (assignmentId: string, studentId: string, grade: string, teacherFeedback: string, reviewAttachment?: UploadedFileMeta) => {
    const cleanGrade = grade.trim();
    const cleanFeedback = teacherFeedback.trim();
    const now = new Date().toISOString();

    let updatedSubmission: any = null;
    setState((prev) => {
      const existing = prev.submissions.find(
        (s) => s.assignmentId.toLowerCase() === assignmentId.toLowerCase() && s.studentId.toLowerCase() === studentId.toLowerCase()
      );
      const next = {
        id: existing?.id || id(),
        assignmentId,
        studentId,
        status: 'Graded' as const,
        ...existing,
        grade: cleanGrade,
        teacherFeedback: cleanFeedback,
        reviewAttachment: reviewAttachment || existing?.reviewAttachment,
        submittedAt: existing?.submittedAt || now,
      };
      updatedSubmission = next;
      const filtered = prev.submissions.filter((s) => s.id !== existing?.id);
      const nextSubmissions = [next, ...filtered];
      saveCachedSubmissions(nextSubmissions, studentId);
      const asgTitle = prev.assignments.find((a) => a.id.toLowerCase() === assignmentId.toLowerCase())?.title || 'Coursework';
      const logEntry: StudentActivityLog = {
        id: id(),
        studentId,
        action: `Graded Assignment: ${asgTitle}`,
        details: `Score: ${cleanGrade}`,
        timestamp: now,
      };
      const nextState = {
        ...prev,
        submissions: nextSubmissions,
        activityLogs: [logEntry, ...prev.activityLogs].slice(0, 300),
      };
      stateRef.current = nextState;
      return nextState;
    });

    try {
      if (updatedSubmission) {
        const { data: authData } = await supabase.auth.getUser();
        const teacherId = authData.user?.id;
        const reviewStoragePath = reviewAttachment?.fileData?.startsWith('data:')
          ? `${teacherId || studentId}/reviews/${studentId}/${updatedSubmission.id}.pdf`
          : reviewAttachment?.storagePath || updatedSubmission.reviewAttachment?.storagePath || null;
        if (reviewAttachment?.fileData?.startsWith('data:')) {
          await uploadAttachment('student-submissions', reviewStoragePath!, reviewAttachment);
        }
        const payload = {
          id: updatedSubmission.id,
          assignment_id: databaseUuid(assignmentId) || assignmentId,
          student_id: databaseUuid(studentId) || studentId,
          user_id: databaseUuid(studentId) || studentId,
          status: 'Graded',
          submission_url: updatedSubmission.submissionUrl || '',
          submission_note: updatedSubmission.submissionNote || null,
          submitted_at: isoDate(updatedSubmission.submittedAt),
          grade: cleanGrade,
          teacher_feedback: cleanFeedback,
          storage_path: updatedSubmission.attachment?.storagePath || (updatedSubmission.attachment ? `${studentId}/${updatedSubmission.id}.pdf` : 'no-student-file'),
          file_name: updatedSubmission.attachment?.fileName || 'No student attachment',
          file_size: updatedSubmission.attachment?.fileSize || 0,
          file_type: updatedSubmission.attachment?.fileType || 'application/pdf',
          review_storage_path: reviewStoragePath,
          review_file_name: reviewAttachment?.fileName || updatedSubmission.reviewAttachment?.fileName || null,
          review_file_size: reviewAttachment?.fileSize || updatedSubmission.reviewAttachment?.fileSize || null,
          review_file_type: reviewAttachment?.fileType || updatedSubmission.reviewAttachment?.fileType || null,
          graded_file_url: reviewStoragePath,
          graded_file_name: reviewAttachment?.fileName || updatedSubmission.reviewAttachment?.fileName || null,
          graded_at: now,
        };
        const { error } = await writeWithOptionalColumns('submissions', [payload], (candidate) =>
          supabase.from('submissions').upsert(candidate, { onConflict: 'id' })
        );
        if (error) throw error;
        await refreshPortalData();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[Supabase] Grade assignment write notice', err);
      setLoadError(`save grade: ${getPortalErrorMessage(err)}`);
      return false;
    }
  }, [refreshPortalData]);
  const addMaterial = useCallback(async (material: Omit<StudyMaterial, 'id'>) => {
    const materialId = id();
    try {
      const payload = {
        id: materialId, course_id: databaseUuid(material.courseId), title: material.title, type: material.type,
        material_date: material.date, meta_info: material.metaInfo, url: normalizeExternalUrl(material.url),
        storage_path: await uploadAttachment('course-materials', `materials/${material.courseId}/${materialId}/${material.attachment?.fileName || 'attachment'}`, material.attachment),
        file_name: material.attachment?.fileName || null, file_size: material.attachment?.fileSize || null,
        file_type: material.attachment?.fileType || null,
      };
      const { data, error } = await writeWithOptionalColumns('materials', [payload], (candidate) => supabase.from('materials').insert(candidate).select());
      return refreshAfterTeacherSave('materials', payload, data, error);
    } catch (error) {
      reportTeacherSaveFailure('materials', { id: materialId, ...material }, error);
      return false;
    }
  }, [refreshAfterTeacherSave, reportTeacherSaveFailure]);
  const deleteMaterial = useCallback((materialId: string) => persistAndRefresh((prev) => ({ ...prev, materials: prev.materials.filter((m) => m.id !== materialId) })), [persistAndRefresh]);
  const saveMeetingLink = useCallback(async (rawUrl: string) => {
    const current = stateRef.current;
    const meetingLink = normalizeExternalUrl(rawUrl);
    const liveHero = current.liveHero ? { ...current.liveHero, meetingUrl: meetingLink } : null;
    const payload = { id: 1, meeting_link: meetingLink, live_hero: liveHero, updated_at: new Date().toISOString() };
    const { data, error } = await writeWithOptionalColumns('app_settings', [payload], (candidate) => supabase.from('app_settings').upsert(candidate).select());
    return refreshAfterTeacherSave('app_settings', payload, data, error);
  }, [refreshAfterTeacherSave]);
  const resetAllData = useCallback(() => persistState(() => EMPTY_PORTAL_DATA), [persistState]);

  return { state, loading, loadError, profileDebug, refreshPortalData, logActivity, registerStudent, approveStudent, rejectStudent, changeStudentStatus, addStudent, updateStudent, deleteStudent, toggleStudentEnrollment, publishLiveHero, addCourse, updateCourse, deleteCourse, addSession, updateSession, deleteSession, addAssignment, updateAssignment, deleteAssignment, submitAssignment, retractSubmission, gradeAssignment, addMaterial, deleteMaterial, saveMeetingLink, resetAllData };
}
