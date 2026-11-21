import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_PORTAL_DATA, DEFAULT_TEACHER_CREDENTIALS } from '../data/defaultPortalData';
import { Assignment, Course, LiveSessionHero, PortalState, ScheduleSession, Student, StudentActivityLog, StudentStatus, StudyMaterial, UploadedFileMeta } from '../types/portal';
import { normalizeExternalUrl } from '../utils/formatters';
import { createIsolatedAuthClient, supabase } from '../lib/supabase';

const sortSessions = (items: ScheduleSession[]) => [...items].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isoDate = (value?: string) => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

async function uploadAttachment(bucket: string, path: string, attachment?: UploadedFileMeta) {
  if (!attachment?.fileData?.startsWith('data:')) return path;
  const response = await fetch(attachment.fileData);
  const blob = await response.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: attachment.fileType || blob.type,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function signedAttachment(bucket: string, path: string | null, fileName: string | null, fileSize: number | null, fileType: string | null) {
  if (!path) return undefined;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30);
    if (error) return undefined;
    return { fileName: fileName || 'download', fileSize: fileSize || 0, fileType: fileType || 'application/octet-stream', fileData: data.signedUrl, storagePath: path };
  } catch {
    return undefined;
  }
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
  const projections = [
    'id,full_name,email,role,status,grade_level,notes,request_note,created_at',
    'id,full_name,email,role,status',
  ];
  const queryErrors: ProfileQueryDebug['errors'] = [];

  for (const projection of projections) {
    try {
      const { data, error } = await supabase.from('profiles').select(projection);
      if (!error) {
        const rows = data ?? [];
        return {
          data: rows,
          error: undefined,
          debug: {
            rowCount: rows.length,
            sample: rows.slice(0, 3).map((row: any) => ({ role: row.role ?? null, status: row.status ?? null })),
            errors: queryErrors,
          } satisfies ProfileQueryDebug,
        };
      }
      queryErrors.push({ message: error.message, code: error.code ?? null, details: error.details ?? null });
    } catch (error) {
      const record = error && typeof error === 'object' ? error as { message?: unknown; code?: unknown; details?: unknown } : undefined;
      queryErrors.push({
        message: typeof record?.message === 'string' ? record.message : String(error || 'Unknown error'),
        code: typeof record?.code === 'string' ? record.code : null,
        details: typeof record?.details === 'string' ? record.details : null,
      });
    }
  }

  return {
    data: [],
    error: `profiles: ${queryErrors.map((error) => `${error.message}${error.code ? ` (code: ${error.code})` : ''}`).join(' · ')}`,
    debug: { rowCount: null, sample: [], errors: queryErrors } satisfies ProfileQueryDebug,
  };
}

async function loadPortalState(): Promise<{ state: PortalState; errors: string[]; profileDebug: ProfileQueryDebug }> {
  let authenticated = false;
  const errors: string[] = [];
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) errors.push(`auth: ${getPortalErrorMessage(error)}`);
    authenticated = Boolean(data.user);
  } catch (error) {
    errors.push(`auth: ${getPortalErrorMessage(error)}`);
  }

  const [profiles, courses, enrollments, settings, sessions, assignments, materials, submissions, logs] = await Promise.all([
    authenticated ? loadProfilesQuery() : Promise.resolve({ data: [], error: undefined, debug: { rowCount: null, sample: [], errors: [] } satisfies ProfileQueryDebug }),
    loadQuery('courses', supabase.from('courses').select('*'), []),
    authenticated ? loadQuery('enrollments', supabase.from('enrollments').select('student_id,course_id'), []) : Promise.resolve({ data: [], error: undefined }),
    authenticated ? loadQuery('app_settings', supabase.from('app_settings').select('meeting_link,live_hero').eq('id', 1).maybeSingle(), null) : Promise.resolve({ data: null, error: undefined }),
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
  const students: Student[] = (profiles.data || []).filter((row: any) => normalizeValue(row.role) === 'student').map((row: any) => ({
    id: row.id,
    name: row.full_name || '',
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
  const mappedAssignments: Assignment[] = await Promise.all((assignments.data || []).map(async (row: any) => ({
    id: row.id, courseId: row.course_id, title: row.title, dueDate: row.due_date, description: row.description,
    resourceUrl: row.resource_url, resourceLabel: row.resource_label || undefined,
    attachment: await signedAttachment('course-materials', row.attachment_path, row.attachment_name, row.attachment_size, row.attachment_type),
  })));
  const mappedMaterials: StudyMaterial[] = await Promise.all((materials.data || []).map(async (row: any) => ({
    id: row.id, courseId: row.course_id, title: row.title, type: row.type, date: row.material_date,
    metaInfo: row.meta_info, url: row.url,
    attachment: await signedAttachment('course-materials', row.storage_path, row.file_name, row.file_size, row.file_type),
  })));
  const mappedSubmissions = await Promise.all((submissions.data || []).map(async (row: any) => ({
    id: row.id, assignmentId: row.assignment_id || '', studentId: row.student_id, status: row.status,
    submissionUrl: row.submission_url || undefined, submissionNote: row.submission_note || undefined,
    submittedAt: row.submitted_at, grade: row.grade || undefined, teacherFeedback: row.teacher_feedback || undefined,
    attachment: await signedAttachment('student-submissions', row.storage_path, row.file_name, row.file_size, row.file_type),
  })));
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
      submissions: mappedSubmissions,
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
      const { error } = await supabase.from(table).delete().in('id', removed);
      if (error) throw error;
    }
    if (updates.length) {
      const rows = await Promise.all(updates.map(toRow));
      const { error } = await supabase.from(table).upsert(rows);
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
    .map((courseId) => ({ student_id: student.id, course_id: courseId })));
  if (enrollmentRows.length) {
    const { error } = await supabase.from('enrollments').upsert(enrollmentRows);
    if (error) throw error;
  }
  await changed(previous.courses, next.courses, (c: Course) => ({
    id: c.id, code: c.code, title: c.title, batch_name: c.batchName, instructor: c.instructor,
    accent_color: c.accentColor, description: c.description || null, schedule_cadence: c.scheduleCadence || null,
    classes_per_week: c.classesPerWeek || null, weekly_slots: c.weeklySlots || [],
  }), 'courses');
  await changed(previous.sessions, next.sessions, (s: ScheduleSession) => ({
    id: s.id, course_id: s.courseId, topic: s.topic, session_date: s.date, start_time: s.startTime,
    end_time: s.endTime, status: s.status, meeting_url: s.meetingUrl,
  }), 'class_sessions');
  await changed(previous.assignments, next.assignments, async (a: Assignment) => {
    const attachmentPath = a.attachment?.fileData?.startsWith('data:') ? await uploadAttachment('course-materials', `assignments/${a.id}/${a.attachment.fileName}`, a.attachment) : a.attachment?.storagePath || null;
    return {
      id: a.id, course_id: a.courseId, title: a.title, due_date: a.dueDate, description: a.description,
      resource_url: a.resourceUrl, resource_label: a.resourceLabel || null, attachment_path: attachmentPath,
      attachment_name: a.attachment?.fileName || null, attachment_size: a.attachment?.fileSize || null, attachment_type: a.attachment?.fileType || null,
    };
  }, 'assignments');
  await changed(previous.materials, next.materials, async (m: StudyMaterial) => {
    const storagePath = m.attachment?.fileData?.startsWith('data:') ? await uploadAttachment('course-materials', `materials/${m.courseId}/${m.id}/${m.attachment.fileName}`, m.attachment) : m.attachment?.storagePath || null;
    return {
      id: m.id, course_id: m.courseId, title: m.title, type: m.type, material_date: m.date,
      meta_info: m.metaInfo, url: m.url, storage_path: storagePath, file_name: m.attachment?.fileName || null,
      file_size: m.attachment?.fileSize || null, file_type: m.attachment?.fileType || null,
    };
  }, 'materials');
  await changed(previous.submissions, next.submissions, async (s: any) => {
    const storagePath = s.attachment?.fileData?.startsWith('data:') ? await uploadAttachment('student-submissions', `${s.studentId}/${s.id}.pdf`, s.attachment) : s.attachment?.storagePath || null;
    return {
      id: s.id, assignment_id: s.assignmentId || null, student_id: s.studentId, status: s.status,
      submission_url: s.submissionUrl || null, submission_note: s.submissionNote || null,
      submitted_at: isoDate(s.submittedAt), grade: s.grade || null, teacher_feedback: s.teacherFeedback || null,
      storage_path: storagePath, file_name: s.attachment?.fileName || null, file_size: s.attachment?.fileSize || null,
      file_type: 'application/pdf',
    };
  }, 'submissions');
  await changed(previous.activityLogs, next.activityLogs, (l: StudentActivityLog) => ({
    id: l.id, student_id: l.studentId, action: l.action, details: l.details || null, created_at: isoDate(l.timestamp),
  }), 'activity_logs');
  if (previous.meetingUrl !== next.meetingUrl || !same(previous.liveHero, next.liveHero)) {
    const { error } = await supabase.from('app_settings').upsert({
      id: 1, meeting_link: next.meetingUrl, live_hero: next.liveHero,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
}

export function usePortalStore() {
  const [state, setState] = useState<PortalState>(EMPTY_PORTAL_DATA);
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
    const entry: StudentActivityLog = { id: id('log'), studentId, action, details, timestamp: new Date().toISOString() };
    persistState((prev) => ({ ...prev, activityLogs: [entry, ...prev.activityLogs].slice(0, 300) }));
  }, [persistState]);
  const registerStudent = useCallback(async (data: { name: string; email: string; password: string; gradeLevel: string; requestNote?: string }) => {
    const fullName = data.name.trim();
    const email = data.email.trim().toLowerCase();

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          emailRedirectTo: import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/`,
          data: { full_name: fullName, grade_level: data.gradeLevel.trim(), request_note: data.requestNote?.trim() || '' },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes('already registered')) return { success: false, error: 'Unable to register with these details. If you already have an account, try signing in.' };
        if (error.message.toLowerCase().includes('password')) return { success: false, error: 'Choose a stronger password that meets the account security requirements.' };
        return { success: false, error: 'Registration could not be completed. Check your details and try again.' };
      }

      const userId = signUpData.user?.id ?? signUpData.session?.user?.id;
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
      const { error: profileError } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });

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

      return { success: true, confirmationRequired: !signUpData.session };
    } catch (registrationError) {
      console.error('[auth] Student registration failed', registrationError);
      return { success: false, error: 'Registration could not be completed. Please try again or contact the teacher.' };
    }
  }, []);
  const approveStudent = useCallback((studentId: string, enrolledCourseIds: string[] = []) => persistAndRefresh((prev) => ({
    ...prev, students: prev.students.map((s) => s.id === studentId ? { ...s, status: 'approved', enrolledCourseIds } : s),
    activityLogs: [{ id: id('log'), studentId, action: 'Account approved by Teacher', details: `Enrolled in ${enrolledCourseIds.length} course batch(es)`, timestamp: new Date().toISOString() }, ...prev.activityLogs],
  })), [persistAndRefresh]);
  const rejectStudent = useCallback((studentId: string) => persistAndRefresh((prev) => ({
    ...prev, students: prev.students.map((s) => s.id === studentId ? { ...s, status: 'rejected' } : s),
    activityLogs: [{ id: id('log'), studentId, action: 'Registration declined', details: 'Reviewed by tutor', timestamp: new Date().toISOString() }, ...prev.activityLogs],
  })), [persistAndRefresh]);
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
        course_id: session.courseId, topic: session.topic, session_date: session.date, start_time: session.startTime,
        end_time: session.endTime, status: hero.status === 'live' ? 'Live' : session.status, meeting_url: nextHero?.meetingUrl || '',
      };
      const { data, error } = await supabase.from('class_sessions').update(sessionPayload).eq('id', session.id).select();
      if (!(await refreshAfterTeacherSave('class_sessions', { id: session.id, ...sessionPayload }, data, error))) return false;
    }
    const settingsPayload = { id: 1, meeting_link: current.meetingUrl, live_hero: nextHero, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('app_settings').upsert([settingsPayload]).select();
    return refreshAfterTeacherSave('app_settings', settingsPayload, data, error);
  }, [refreshAfterTeacherSave]);
  const addCourse = useCallback(async (course: Omit<Course, 'id'>) => {
    const courseId = id('course');
    const payload = {
      id: courseId, code: course.code, title: course.title, batch_name: course.batchName, instructor: course.instructor,
      accent_color: course.accentColor, description: course.description || null, schedule_cadence: course.scheduleCadence || null,
      classes_per_week: course.classesPerWeek || null, weekly_slots: course.weeklySlots || [],
    };
    const { data, error } = await supabase.from('courses').insert([payload]).select();
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
    const { data, error } = await supabase.from('courses').update(payload).eq('id', courseId).select();
    return refreshAfterTeacherSave('courses', { id: courseId, ...payload }, data, error);
  }, [refreshAfterTeacherSave]);
  const deleteCourse = useCallback((courseId: string) => persistAndRefresh((prev) => ({
    ...prev, courses: prev.courses.filter((c) => c.id !== courseId), students: prev.students.map((s) => ({ ...s, enrolledCourseIds: s.enrolledCourseIds.filter((id) => id !== courseId) })),
    sessions: prev.sessions.filter((s) => s.courseId !== courseId), assignments: prev.assignments.filter((a) => a.courseId !== courseId), materials: prev.materials.filter((m) => m.courseId !== courseId),
    liveHero: prev.liveHero?.courseId === courseId ? null : prev.liveHero,
  })), [persistAndRefresh]);
  const addSession = useCallback(async (session: Omit<ScheduleSession, 'id'>) => {
    const payload = {
      id: id('session'), course_id: session.courseId, topic: session.topic, session_date: session.date,
      start_time: session.startTime, end_time: session.endTime, status: session.status,
      meeting_url: normalizeExternalUrl(session.meetingUrl),
    };
    const { data, error } = await supabase.from('class_sessions').insert([payload]).select();
    return refreshAfterTeacherSave('class_sessions', payload, data, error);
  }, [refreshAfterTeacherSave]);
  const updateSession = useCallback(async (sessionId: string, updates: Partial<Omit<ScheduleSession, 'id'>>) => {
    const current = stateRef.current.sessions.find((session) => session.id === sessionId);
    if (!current) return false;
    const session = { ...current, ...updates };
    const payload = {
      course_id: session.courseId, topic: session.topic, session_date: session.date, start_time: session.startTime,
      end_time: session.endTime, status: session.status, meeting_url: normalizeExternalUrl(session.meetingUrl),
    };
    const { data, error } = await supabase.from('class_sessions').update(payload).eq('id', sessionId).select();
    return refreshAfterTeacherSave('class_sessions', { id: sessionId, ...payload }, data, error);
  }, [refreshAfterTeacherSave]);
  const deleteSession = useCallback((sessionId: string) => persistAndRefresh((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.id !== sessionId) })), [persistAndRefresh]);
  const addAssignment = useCallback(async (assignment: Omit<Assignment, 'id'>) => {
    const assignmentId = id('assignment');
    try {
      const payload = {
        id: assignmentId, course_id: assignment.courseId, title: assignment.title, due_date: assignment.dueDate,
        description: assignment.description, resource_url: normalizeExternalUrl(assignment.resourceUrl),
        resource_label: assignment.resourceLabel || null,
        attachment_path: await uploadAttachment('course-materials', `assignments/${assignmentId}/${assignment.attachment?.fileName || 'attachment'}`, assignment.attachment),
        attachment_name: assignment.attachment?.fileName || null, attachment_size: assignment.attachment?.fileSize || null,
        attachment_type: assignment.attachment?.fileType || null,
      };
      const { data, error } = await supabase.from('assignments').insert([payload]).select();
      return refreshAfterTeacherSave('assignments', payload, data, error);
    } catch (error) {
      reportTeacherSaveFailure('assignments', { id: assignmentId, ...assignment }, error);
      return false;
    }
  }, [refreshAfterTeacherSave, reportTeacherSaveFailure]);
  const updateAssignment = useCallback(async (assignmentId: string, updates: Partial<Omit<Assignment, 'id'>>) => {
    const current = stateRef.current.assignments.find((assignment) => assignment.id === assignmentId);
    if (!current) return false;
    const assignment = { ...current, ...updates };
    try {
      const payload = {
        course_id: assignment.courseId, title: assignment.title, due_date: assignment.dueDate,
        description: assignment.description, resource_url: normalizeExternalUrl(assignment.resourceUrl),
        resource_label: assignment.resourceLabel || null,
        attachment_path: await uploadAttachment('course-materials', `assignments/${assignmentId}/${assignment.attachment?.fileName || 'attachment'}`, assignment.attachment),
        attachment_name: assignment.attachment?.fileName || null, attachment_size: assignment.attachment?.fileSize || null,
        attachment_type: assignment.attachment?.fileType || null,
      };
      const { data, error } = await supabase.from('assignments').update(payload).eq('id', assignmentId).select();
      return refreshAfterTeacherSave('assignments', { id: assignmentId, ...payload }, data, error);
    } catch (error) {
      reportTeacherSaveFailure('assignments', assignment, error);
      return false;
    }
  }, [refreshAfterTeacherSave, reportTeacherSaveFailure]);
  const deleteAssignment = useCallback((assignmentId: string) => persistAndRefresh((prev) => ({ ...prev, assignments: prev.assignments.filter((a) => a.id !== assignmentId), submissions: prev.submissions.filter((s) => s.assignmentId !== assignmentId) })), [persistAndRefresh]);
  const submitAssignment = useCallback((assignmentId: string, studentId: string, submissionUrl: string, submissionNote: string, attachment?: UploadedFileMeta) => persistState((prev) => {
    const existing = prev.submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
    const next = { id: existing?.id || id('submission'), assignmentId, studentId, status: 'Submitted' as const, submissionUrl: normalizeExternalUrl(submissionUrl), submissionNote: submissionNote.trim(), submittedAt: new Date().toISOString(), attachment: attachment || existing?.attachment };
    return { ...prev, submissions: [next, ...prev.submissions.filter((s) => s.id !== existing?.id)], activityLogs: [{ id: id('log'), studentId, action: 'Marked Assignment as Submitted', details: prev.assignments.find((a) => a.id === assignmentId)?.title || 'Coursework', timestamp: new Date().toISOString() }, ...prev.activityLogs] };
  }), [persistState]);
  const retractSubmission = useCallback((assignmentId: string, studentId: string) => persistState((prev) => ({ ...prev, submissions: prev.submissions.filter((s) => !(s.assignmentId === assignmentId && s.studentId === studentId)) })), [persistState]);
  const gradeAssignment = useCallback((assignmentId: string, studentId: string, grade: string, teacherFeedback: string) => persistState((prev) => {
    const existing = prev.submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
    const next = { id: existing?.id || id('submission'), assignmentId, studentId, status: 'Graded' as const, ...existing, grade: grade.trim(), teacherFeedback: teacherFeedback.trim(), submittedAt: existing?.submittedAt || new Date().toISOString() };
    return { ...prev, submissions: [next, ...prev.submissions.filter((s) => s.id !== existing?.id)], activityLogs: [{ id: id('log'), studentId, action: `Graded Assignment: ${prev.assignments.find((a) => a.id === assignmentId)?.title || 'Coursework'}`, details: `Score: ${grade.trim()}`, timestamp: new Date().toISOString() }, ...prev.activityLogs] };
  }), [persistState]);
  const addMaterial = useCallback(async (material: Omit<StudyMaterial, 'id'>) => {
    const materialId = id('material');
    try {
      const payload = {
        id: materialId, course_id: material.courseId, title: material.title, type: material.type,
        material_date: material.date, meta_info: material.metaInfo, url: normalizeExternalUrl(material.url),
        storage_path: await uploadAttachment('course-materials', `materials/${material.courseId}/${materialId}/${material.attachment?.fileName || 'attachment'}`, material.attachment),
        file_name: material.attachment?.fileName || null, file_size: material.attachment?.fileSize || null,
        file_type: material.attachment?.fileType || null,
      };
      const { data, error } = await supabase.from('materials').insert([payload]).select();
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
    const { data, error } = await supabase.from('app_settings').upsert([payload]).select();
    return refreshAfterTeacherSave('app_settings', payload, data, error);
  }, [refreshAfterTeacherSave]);
  const resetAllData = useCallback(() => persistState(() => EMPTY_PORTAL_DATA), [persistState]);

  return { state, loading, loadError, profileDebug, refreshPortalData, logActivity, registerStudent, approveStudent, rejectStudent, changeStudentStatus, addStudent, updateStudent, deleteStudent, toggleStudentEnrollment, publishLiveHero, addCourse, updateCourse, deleteCourse, addSession, updateSession, deleteSession, addAssignment, updateAssignment, deleteAssignment, submitAssignment, retractSubmission, gradeAssignment, addMaterial, deleteMaterial, saveMeetingLink, resetAllData };
}
