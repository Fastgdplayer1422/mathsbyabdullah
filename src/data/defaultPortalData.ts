import { PortalState } from '../types/portal';

export const DEFAULT_TEACHER_CREDENTIALS = {
  email: 'aa6993248@gmail.com',
  password: 'admin1234',
  name: 'Abdullah',
};

/**
 * Clean slate state — 100% empty initial data with default teacher login.
 * No hardcoded demo courses, students, or mock records.
 */
export const EMPTY_PORTAL_DATA: PortalState = {
  teacherAccount: DEFAULT_TEACHER_CREDENTIALS,
  meetingUrl: '',
  courses: [],
  students: [],
  activityLogs: [],
  submissions: [],
  liveHero: null,
  sessions: [],
  assignments: [],
  materials: [],
};
