import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_TEACHER_CREDENTIALS,
  EMPTY_PORTAL_DATA,
} from '../data/defaultPortalData';
import {
  Assignment,
  Course,
  LiveSessionHero,
  PortalState,
  ScheduleSession,
  Student,
  StudentActivityLog,
  StudentStatus,
  StudyMaterial,
  UploadedFileMeta,
} from '../types/portal';
import { normalizeExternalUrl, validateStudentEmail } from '../utils/formatters';

const STORAGE_KEY = 'mathsbyabdullah_portal_data_v1';

function sanitizeAndLoadInitialState(): PortalState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(EMPTY_PORTAL_DATA));
      return EMPTY_PORTAL_DATA;
    }
    const parsed = JSON.parse(raw) as Partial<PortalState>;
    if (!parsed || typeof parsed !== 'object') {
      return EMPTY_PORTAL_DATA;
    }

    // Automatically purge any mock/demo accounts ending in @example.com or test.com
    const rawStudents = Array.isArray(parsed.students) ? parsed.students : [];
    const sanitizedStudents: Student[] = rawStudents.filter((s) => {
      if (!s || !s.email) return false;
      const em = s.email.toLowerCase();
      if (em.includes('@example.com') || em.includes('@test.com') || em.includes('fake.com')) {
        return false;
      }
      return true;
    });

    const validStudentIds = new Set(sanitizedStudents.map((s) => s.id));

    const rawLogs = Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [];
    const sanitizedLogs = rawLogs.filter((l) => validStudentIds.has(l.studentId));

    const rawSubmissions = Array.isArray(parsed.submissions) ? parsed.submissions : [];
    const sanitizedSubmissions = rawSubmissions.filter((sub) =>
      validStudentIds.has(sub.studentId)
    );

    // Ensure teacher email is migrated to aa6993248@gmail.com
    let teacherAccount = parsed.teacherAccount || DEFAULT_TEACHER_CREDENTIALS;
    if (
      !teacherAccount.email ||
      teacherAccount.email.toLowerCase() === 'teacher@portal.com'
    ) {
      teacherAccount = {
        ...teacherAccount,
        email: DEFAULT_TEACHER_CREDENTIALS.email,
        password: teacherAccount.password || DEFAULT_TEACHER_CREDENTIALS.password,
        name: teacherAccount.name || DEFAULT_TEACHER_CREDENTIALS.name,
      };
    }

    const meetingUrl = parsed.meetingUrl || parsed.liveHero?.meetingUrl || '';

    const cleanState: PortalState = {
      teacherAccount,
      meetingUrl,
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      students: sanitizedStudents,
      activityLogs: sanitizedLogs,
      submissions: sanitizedSubmissions,
      liveHero: parsed.liveHero ?? null,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
    };

    // Save cleaned state back to localStorage
    if (
      sanitizedStudents.length !== rawStudents.length ||
      parsed.meetingUrl !== meetingUrl ||
      parsed.teacherAccount?.email !== teacherAccount.email
    ) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
    }

    return cleanState;
  } catch {
    return EMPTY_PORTAL_DATA;
  }
}

export function usePortalStore() {
  const [state, setState] = useState<PortalState>(sanitizeAndLoadInitialState);

  const persistState = useCallback((updater: (prev: PortalState) => PortalState) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Safe fallback for quota limits
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as PortalState;
          if (parsed && typeof parsed === 'object') {
            const rawStudents = Array.isArray(parsed.students) ? parsed.students : [];
            const sanitizedStudents = rawStudents.filter((s) => {
              if (!s || !s.email) return false;
              const em = s.email.toLowerCase();
              return !em.includes('@example.com') && !em.includes('@test.com');
            });
            const validStudentIds = new Set(sanitizedStudents.map((s) => s.id));

            setState({
              teacherAccount: parsed.teacherAccount || DEFAULT_TEACHER_CREDENTIALS,
              meetingUrl: parsed.meetingUrl || parsed.liveHero?.meetingUrl || '',
              courses: Array.isArray(parsed.courses) ? parsed.courses : [],
              students: sanitizedStudents,
              activityLogs: (Array.isArray(parsed.activityLogs) ? parsed.activityLogs : []).filter(
                (l) => validStudentIds.has(l.studentId)
              ),
              submissions: (Array.isArray(parsed.submissions) ? parsed.submissions : []).filter(
                (sub) => validStudentIds.has(sub.studentId)
              ),
              liveHero: parsed.liveHero ?? null,
              sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
              assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
              materials: Array.isArray(parsed.materials) ? parsed.materials : [],
            });
          }
        } catch {
          // Ignore external malformed payloads
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ----------------------------------------------------
  // Activity Logging Helper
  // ----------------------------------------------------
  const logActivity = useCallback(
    (studentId: string, action: string, details?: string) => {
      if (!studentId) return;
      const newLog: StudentActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId,
        action,
        details,
        timestamp: new Date().toISOString(),
      };
      persistState((prev) => ({
        ...prev,
        activityLogs: [newLog, ...prev.activityLogs].slice(0, 300),
      }));
    },
    [persistState]
  );

  // ----------------------------------------------------
  // Teacher Credentials
  // ----------------------------------------------------
  const updateTeacherCredentials = useCallback(
    (email: string, password: string) => {
      persistState((prev) => ({
        ...prev,
        teacherAccount: {
          ...prev.teacherAccount,
          email: email.trim(),
          password: password.trim(),
        },
      }));
    },
    [persistState]
  );

  // ----------------------------------------------------
  // Student Registration & Strict Validation
  // ----------------------------------------------------
  const registerStudent = useCallback(
    (data: {
      name: string;
      email: string;
      password: string;
      gradeLevel: string;
      requestNote?: string;
    }): { success: boolean; error?: string; student?: Student } => {
      const emailValidation = validateStudentEmail(data.email);
      if (!emailValidation.valid) {
        return { success: false, error: emailValidation.error };
      }

      const normalizedEmail = data.email.trim().toLowerCase();
      let createdStudent: Student | null = null;
      let conflict = false;

      persistState((prev) => {
        if (prev.students.some((s) => s.email.toLowerCase() === normalizedEmail)) {
          conflict = true;
          return prev;
        }

        createdStudent = {
          id: `std-${Date.now()}`,
          name: data.name.trim(),
          email: normalizedEmail,
          password: data.password.trim(),
          status: 'pending',
          gradeLevel: data.gradeLevel.trim() || 'Student',
          requestNote: data.requestNote?.trim(),
          enrolledCourseIds: [],
          createdAt: new Date().toISOString(),
        };

        const initialLog: StudentActivityLog = {
          id: `log-${Date.now()}`,
          studentId: createdStudent.id,
          action: 'Account registration submitted',
          details: 'Awaiting teacher verification and course enrollment',
          timestamp: new Date().toISOString(),
        };

        return {
          ...prev,
          students: [createdStudent, ...prev.students],
          activityLogs: [initialLog, ...prev.activityLogs],
        };
      });

      if (conflict) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in instead.',
        };
      }
      return { success: true, student: createdStudent || undefined };
    },
    [persistState]
  );

  const approveStudent = useCallback(
    (studentId: string, enrolledCourseIds: string[] = []) => {
      persistState((prev) => {
        const student = prev.students.find((s) => s.id === studentId);
        if (!student) return prev;

        const updatedStudent: Student = {
          ...student,
          status: 'approved',
          enrolledCourseIds,
        };

        const approvalLog: StudentActivityLog = {
          id: `log-${Date.now()}`,
          studentId,
          action: 'Account approved by Teacher',
          details: `Enrolled in ${enrolledCourseIds.length} course batch(es)`,
          timestamp: new Date().toISOString(),
        };

        return {
          ...prev,
          students: prev.students.map((s) => (s.id === studentId ? updatedStudent : s)),
          activityLogs: [approvalLog, ...prev.activityLogs],
        };
      });
    },
    [persistState]
  );

  const rejectStudent = useCallback(
    (studentId: string) => {
      persistState((prev) => {
        const rejectionLog: StudentActivityLog = {
          id: `log-${Date.now()}`,
          studentId,
          action: 'Registration declined',
          details: 'Reviewed by tutor',
          timestamp: new Date().toISOString(),
        };

        return {
          ...prev,
          students: prev.students.map((s) =>
            s.id === studentId ? { ...s, status: 'rejected' } : s
          ),
          activityLogs: [rejectionLog, ...prev.activityLogs],
        };
      });
    },
    [persistState]
  );

  const changeStudentStatus = useCallback(
    (studentId: string, status: StudentStatus) => {
      persistState((prev) => ({
        ...prev,
        students: prev.students.map((s) => (s.id === studentId ? { ...s, status } : s)),
      }));
    },
    [persistState]
  );

  const addStudent = useCallback(
    (studentData: Omit<Student, 'id' | 'createdAt'>) => {
      const newStudent: Student = {
        ...studentData,
        id: `std-${Date.now()}`,
        status: studentData.status || 'approved',
        password: studentData.password || 'password123',
        enrolledCourseIds: studentData.enrolledCourseIds || [],
        createdAt: new Date().toISOString(),
      };

      const initialLog: StudentActivityLog = {
        id: `log-${Date.now()}`,
        studentId: newStudent.id,
        action: 'Account Created',
        details: `Student profile enrolled by tutor (${newStudent.gradeLevel})`,
        timestamp: new Date().toISOString(),
      };

      persistState((prev) => ({
        ...prev,
        students: [...prev.students, newStudent],
        activityLogs: [initialLog, ...prev.activityLogs],
      }));
      return newStudent;
    },
    [persistState]
  );

  const updateStudent = useCallback(
    (id: string, updates: Partial<Omit<Student, 'id' | 'createdAt'>>) => {
      persistState((prev) => ({
        ...prev,
        students: prev.students.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
    },
    [persistState]
  );

  const deleteStudent = useCallback(
    (id: string) => {
      persistState((prev) => ({
        ...prev,
        students: prev.students.filter((s) => s.id !== id),
        activityLogs: prev.activityLogs.filter((l) => l.studentId !== id),
        submissions: prev.submissions.filter((sub) => sub.studentId !== id),
      }));
    },
    [persistState]
  );

  const toggleStudentEnrollment = useCallback(
    (studentId: string, courseId: string) => {
      persistState((prev) => {
        const targetStudent = prev.students.find((s) => s.id === studentId);
        const course = prev.courses.find((c) => c.id === courseId);
        if (!targetStudent) return prev;

        const courseTitle = course ? course.title : 'Course';
        const isEnrolled = targetStudent.enrolledCourseIds.includes(courseId);
        const nextCourseIds = isEnrolled
          ? targetStudent.enrolledCourseIds.filter((cid) => cid !== courseId)
          : [...targetStudent.enrolledCourseIds, courseId];

        const actionLabel = isEnrolled
          ? `Unenrolled from ${courseTitle}`
          : `Enrolled in ${courseTitle}`;

        const newLog: StudentActivityLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentId,
          action: actionLabel,
          details: 'Updated by tutor',
          timestamp: new Date().toISOString(),
        };

        return {
          ...prev,
          students: prev.students.map((s) =>
            s.id === studentId ? { ...s, enrolledCourseIds: nextCourseIds } : s
          ),
          activityLogs: [newLog, ...prev.activityLogs],
        };
      });
    },
    [persistState]
  );

  // ----------------------------------------------------
  // Live Class & Hero Controller
  // ----------------------------------------------------
  const publishLiveHero = useCallback(
    (hero: Omit<LiveSessionHero, 'updatedAt'> | null) => {
      if (!hero) {
        persistState((prev) => ({
          ...prev,
          liveHero: null,
        }));
        return;
      }

      const normalizedUrl = normalizeExternalUrl(hero.meetingUrl);
      persistState((prev) => ({
        ...prev,
        liveHero: {
          ...hero,
          meetingUrl: normalizedUrl,
          updatedAt: new Date().toISOString(),
        },
        sessions: hero.sessionId
          ? prev.sessions.map((s) =>
              s.id === hero.sessionId
                ? {
                    ...s,
                    meetingUrl: normalizedUrl,
                    status: hero.status === 'live' ? 'Live' : s.status,
                  }
                : s
            )
          : prev.sessions,
      }));
    },
    [persistState]
  );

  // ----------------------------------------------------
  // Courses Management
  // ----------------------------------------------------
  const addCourse = useCallback(
    (courseData: Omit<Course, 'id'>) => {
      const newCourse: Course = {
        ...courseData,
        id: `course-${Date.now()}`,
      };
      persistState((prev) => ({
        ...prev,
        courses: [...prev.courses, newCourse],
      }));
      return newCourse;
    },
    [persistState]
  );

  const updateCourse = useCallback(
    (id: string, updates: Partial<Omit<Course, 'id'>>) => {
      persistState((prev) => ({
        ...prev,
        courses: prev.courses.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
    },
    [persistState]
  );

  const deleteCourse = useCallback(
    (id: string) => {
      persistState((prev) => ({
        ...prev,
        courses: prev.courses.filter((c) => c.id !== id),
        students: prev.students.map((s) => ({
          ...s,
          enrolledCourseIds: s.enrolledCourseIds.filter((cid) => cid !== id),
        })),
        sessions: prev.sessions.filter((sess) => sess.courseId !== id),
        assignments: prev.assignments.filter((asg) => asg.courseId !== id),
        materials: prev.materials.filter((mat) => mat.courseId !== id),
        liveHero: prev.liveHero?.courseId === id ? null : prev.liveHero,
      }));
    },
    [persistState]
  );

  // ----------------------------------------------------
  // Schedule Sessions
  // ----------------------------------------------------
  const addSession = useCallback(
    (session: Omit<ScheduleSession, 'id'>) => {
      const newSession: ScheduleSession = {
        ...session,
        meetingUrl: normalizeExternalUrl(session.meetingUrl),
        id: `sess-${Date.now()}`,
      };
      persistState((prev) => ({
        ...prev,
        sessions: [...prev.sessions, newSession].sort((a, b) =>
          `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)
        ),
      }));
      return newSession;
    },
    [persistState]
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<Omit<ScheduleSession, 'id'>>) => {
      persistState((prev) => ({
        ...prev,
        sessions: prev.sessions
          .map((s) =>
            s.id === id
              ? {
                  ...s,
                  ...updates,
                  meetingUrl:
                    updates.meetingUrl !== undefined
                      ? normalizeExternalUrl(updates.meetingUrl)
                      : s.meetingUrl,
                }
              : s
          )
          .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)),
      }));
    },
    [persistState]
  );

  const deleteSession = useCallback(
    (id: string) => {
      persistState((prev) => ({
        ...prev,
        sessions: prev.sessions.filter((s) => s.id !== id),
      }));
    },
    [persistState]
  );

  // ----------------------------------------------------
  // Assignments & Submissions
  // ----------------------------------------------------
  const addAssignment = useCallback(
    (assignment: Omit<Assignment, 'id'>) => {
      const newAssignment: Assignment = {
        ...assignment,
        resourceUrl: normalizeExternalUrl(assignment.resourceUrl),
        id: `asg-${Date.now()}`,
      };
      persistState((prev) => ({
        ...prev,
        assignments: [newAssignment, ...prev.assignments],
      }));
      return newAssignment;
    },
    [persistState]
  );

  const updateAssignment = useCallback(
    (id: string, updates: Partial<Omit<Assignment, 'id'>>) => {
      persistState((prev) => ({
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === id
            ? {
                ...a,
                ...updates,
                resourceUrl:
                  updates.resourceUrl !== undefined
                    ? normalizeExternalUrl(updates.resourceUrl)
                    : a.resourceUrl,
              }
            : a
        ),
      }));
    },
    [persistState]
  );

  const deleteAssignment = useCallback(
    (id: string) => {
      persistState((prev) => ({
        ...prev,
        assignments: prev.assignments.filter((a) => a.id !== id),
        submissions: prev.submissions.filter((sub) => sub.assignmentId !== id),
      }));
    },
    [persistState]
  );

  const submitAssignment = useCallback(
    (
      assignmentId: string,
      studentId: string,
      submissionUrl: string,
      submissionNote: string,
      attachment?: UploadedFileMeta
    ) => {
      const normalizedUrl = normalizeExternalUrl(submissionUrl);
      const submittedDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      persistState((prev) => {
        const assignment = prev.assignments.find((a) => a.id === assignmentId);
        const existingIdx = prev.submissions.findIndex(
          (sub) => sub.assignmentId === assignmentId && sub.studentId === studentId
        );

        let nextSubmissions = [...prev.submissions];
        if (existingIdx >= 0) {
          nextSubmissions[existingIdx] = {
            ...nextSubmissions[existingIdx],
            status: 'Submitted',
            submissionUrl: normalizedUrl,
            submissionNote: submissionNote.trim(),
            submittedAt: submittedDate,
            attachment: attachment || nextSubmissions[existingIdx].attachment,
          };
        } else {
          nextSubmissions.push({
            id: `sub-${Date.now()}`,
            assignmentId,
            studentId,
            status: 'Submitted',
            submissionUrl: normalizedUrl,
            submissionNote: submissionNote.trim(),
            submittedAt: submittedDate,
            attachment,
          });
        }

        const newLog: StudentActivityLog = {
          id: `log-${Date.now()}`,
          studentId,
          action: 'Marked Assignment as Submitted',
          details: assignment ? assignment.title : 'Coursework',
          timestamp: new Date().toISOString(),
        };

        return {
          ...prev,
          submissions: nextSubmissions,
          activityLogs: [newLog, ...prev.activityLogs],
        };
      });
    },
    [persistState]
  );

  const retractSubmission = useCallback(
    (assignmentId: string, studentId: string) => {
      persistState((prev) => {
        const assignment = prev.assignments.find((a) => a.id === assignmentId);
        const nextSubmissions = prev.submissions.filter(
          (sub) => !(sub.assignmentId === assignmentId && sub.studentId === studentId)
        );

        const newLog: StudentActivityLog = {
          id: `log-${Date.now()}`,
          studentId,
          action: 'Retracted Assignment Submission',
          details: assignment ? assignment.title : 'Coursework',
          timestamp: new Date().toISOString(),
        };

        return {
          ...prev,
          submissions: nextSubmissions,
          activityLogs: [newLog, ...prev.activityLogs],
        };
      });
    },
    [persistState]
  );

  const gradeAssignment = useCallback(
    (assignmentId: string, studentId: string, grade: string, teacherFeedback: string) => {
      persistState((prev) => {
        const assignment = prev.assignments.find((a) => a.id === assignmentId);
        const existingIdx = prev.submissions.findIndex(
          (sub) => sub.assignmentId === assignmentId && sub.studentId === studentId
        );

        let nextSubmissions = [...prev.submissions];
        if (existingIdx >= 0) {
          nextSubmissions[existingIdx] = {
            ...nextSubmissions[existingIdx],
            status: 'Graded',
            grade: grade.trim(),
            teacherFeedback: teacherFeedback.trim(),
          };
        } else {
          nextSubmissions.push({
            id: `sub-${Date.now()}`,
            assignmentId,
            studentId,
            status: 'Graded',
            grade: grade.trim(),
            teacherFeedback: teacherFeedback.trim(),
            submittedAt: 'Teacher Evaluated',
          });
        }

        const newLog: StudentActivityLog = {
          id: `log-${Date.now()}`,
          studentId,
          action: `Graded Assignment: ${assignment ? assignment.title : 'Coursework'}`,
          details: `Score: ${grade.trim()}`,
          timestamp: new Date().toISOString(),
        };

        return {
          ...prev,
          submissions: nextSubmissions,
          activityLogs: [newLog, ...prev.activityLogs],
        };
      });
    },
    [persistState]
  );

  // ----------------------------------------------------
  // Study Materials
  // ----------------------------------------------------
  const addMaterial = useCallback(
    (material: Omit<StudyMaterial, 'id'>) => {
      const newMaterial: StudyMaterial = {
        ...material,
        url: normalizeExternalUrl(material.url),
        id: `mat-${Date.now()}`,
      };
      persistState((prev) => ({
        ...prev,
        materials: [newMaterial, ...prev.materials],
      }));
      return newMaterial;
    },
    [persistState]
  );

  const deleteMaterial = useCallback(
    (id: string) => {
      persistState((prev) => ({
        ...prev,
        materials: prev.materials.filter((m) => m.id !== id),
      }));
    },
    [persistState]
  );

  // ----------------------------------------------------
  // Classroom Permanent Meeting Link
  // ----------------------------------------------------
  const saveMeetingLink = useCallback(
    (rawUrl: string) => {
      const normalized = normalizeExternalUrl(rawUrl);
      persistState((prev) => ({
        ...prev,
        meetingUrl: normalized,
        liveHero: prev.liveHero ? { ...prev.liveHero, meetingUrl: normalized } : null,
      }));
    },
    [persistState]
  );

  // ----------------------------------------------------
  // Wipe All Data
  // ----------------------------------------------------
  const resetAllData = useCallback(() => {
    persistState(() => EMPTY_PORTAL_DATA);
  }, [persistState]);

  return {
    state,
    logActivity,
    updateTeacherCredentials,
    saveMeetingLink,
    registerStudent,
    approveStudent,
    rejectStudent,
    changeStudentStatus,
    publishLiveHero,
    addStudent,
    updateStudent,
    deleteStudent,
    toggleStudentEnrollment,
    addCourse,
    updateCourse,
    deleteCourse,
    addSession,
    updateSession,
    deleteSession,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    submitAssignment,
    retractSubmission,
    gradeAssignment,
    addMaterial,
    deleteMaterial,
    resetAllData,
  };
}
