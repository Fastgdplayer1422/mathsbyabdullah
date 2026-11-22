export type RoleMode = 'student' | 'teacher';

export type StudentTab = 'dashboard' | 'schedule' | 'assignments' | 'photo-to-pdf';
export type TeacherTab =
  | 'live-controller'
  | 'schedule-manager'
  | 'content-manager'
  | 'courses-manager'
  | 'students-enrollments';

export type StudentStatus = 'pending' | 'approved' | 'rejected';
export type SessionStatus = 'Live' | 'Upcoming' | 'Completed';
export type AssignmentStatus = 'Pending' | 'Submitted' | 'Graded';
export type MaterialType = 'recording' | 'notes';

export interface UploadedFileMeta {
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // MIME type or extension
  fileData: string; // Base64 data URL
  uploadedAt?: string;
  storagePath?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  status: StudentStatus;
  gradeLevel: string; // e.g., "Year 11 / IGCSE", "AS Level", "Grade 10"
  notes?: string;
  requestNote?: string; // Note from student during registration
  enrolledCourseIds: string[];
  createdAt: string;
}

export interface StudentActivityLog {
  id: string;
  studentId: string;
  action: string;
  details?: string;
  timestamp: string; // ISO string
}

export interface StudentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  status: AssignmentStatus;
  submissionUrl?: string;
  submissionNote?: string;
  submittedAt?: string;
  grade?: string;
  teacherFeedback?: string;
  attachment?: UploadedFileMeta;
  reviewAttachment?: UploadedFileMeta;
}

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface WeeklyScheduleSlot {
  day: DayOfWeek;
  startTime: string; // e.g. "5:00 PM"
  duration: string;  // e.g. "1 hour", "1.5 hours", "45 mins", "2 hours"
  durationMinutes?: number;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  batchName: string;
  instructor: string;
  accentColor: 'indigo' | 'orange' | 'teal';
  description?: string;
  scheduleCadence?: string;
  classesPerWeek?: number; // 1 to 5
  weeklySlots?: WeeklyScheduleSlot[];
}

export interface LiveSessionHero {
  sessionId?: string;
  courseId?: string; // Links hero to a specific course for strict student filtering
  status: 'live' | 'upcoming';
  badgeLabel: string;
  classTitle: string;
  batchName: string;
  dateLabel: string;
  timeLabel: string;
  timezone: string;
  meetingUrl: string;
  updatedAt: string;
}

export interface ScheduleSession {
  id: string;
  courseId: string;
  topic: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  status: SessionStatus;
  meetingUrl: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  description: string;
  resourceUrl: string;
  resourceLabel?: string;
  attachment?: UploadedFileMeta;
}

export interface StudyMaterial {
  id: string;
  courseId: string;
  title: string;
  type: MaterialType;
  date: string; // YYYY-MM-DD
  metaInfo: string;
  url: string;
  attachment?: UploadedFileMeta;
}

export interface TeacherAccount {
  email: string;
  name: string;
}

export interface PortalState {
  teacherAccount: TeacherAccount;
  meetingUrl: string; // Permanent Zoom / Google Meet classroom link
  courses: Course[];
  students: Student[];
  activityLogs: StudentActivityLog[];
  submissions: StudentSubmission[];
  liveHero: LiveSessionHero | null;
  sessions: ScheduleSession[];
  assignments: Assignment[];
  materials: StudyMaterial[];
}

export type UserSession =
  | { role: 'teacher' }
  | { role: 'student'; studentId: string }
  | null;
