import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Course,
  DayOfWeek,
  PortalState,
  Student,
  WeeklyScheduleSlot,
} from '../../types/portal';
import {
  DAY_OPTIONS,
  DURATION_OPTIONS,
  START_TIME_OPTIONS,
  formatWeeklySlots,
} from '../../utils/formatters';

interface CoursesManagerProps {
  state: PortalState;
  onAddCourse: (course: Omit<Course, 'id'>) => Promise<boolean>;
  onUpdateCourse: (id: string, updates: Partial<Omit<Course, 'id'>>) => Promise<boolean>;
  onDeleteCourse: (id: string) => void;
  onToggleEnrollment: (studentId: string, courseId: string) => void;
  onNotify: (msg: string) => void;
}

const DEFAULT_SLOTS: WeeklyScheduleSlot[] = [
  { day: 'Monday', startTime: '5:00 PM', duration: '1 hour' },
  { day: 'Wednesday', startTime: '5:00 PM', duration: '1 hour' },
  { day: 'Friday', startTime: '5:00 PM', duration: '1 hour' },
  { day: 'Saturday', startTime: '11:00 AM', duration: '1.5 hours' },
  { day: 'Sunday', startTime: '11:00 AM', duration: '1.5 hours' },
];

function buildSlotsForCount(
  count: number,
  existingSlots: WeeklyScheduleSlot[] = []
): WeeklyScheduleSlot[] {
  const result: WeeklyScheduleSlot[] = [];
  for (let i = 0; i < count; i++) {
    if (existingSlots[i]) {
      result.push({ ...existingSlots[i] });
    } else {
      result.push(
        DEFAULT_SLOTS[i] || {
          day: 'Monday',
          startTime: '5:00 PM',
          duration: '1 hour',
        }
      );
    }
  }
  return result;
}

export const CoursesManager: React.FC<CoursesManagerProps> = ({
  state,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onToggleEnrollment,
  onNotify,
}) => {
  // Create Course Form State
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [batchName, setBatchName] = useState('');
  const [instructor, setInstructor] = useState('Abdullah');
  const [accentColor, setAccentColor] = useState<Course['accentColor']>('indigo');
  const [description, setDescription] = useState('');
  const [classesPerWeek, setClassesPerWeek] = useState<number>(2);
  const [weeklySlots, setWeeklySlots] = useState<WeeklyScheduleSlot[]>(() =>
    buildSlotsForCount(2)
  );

  // Edit Course Modal State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editClassesPerWeek, setEditClassesPerWeek] = useState<number>(2);
  const [editWeeklySlots, setEditWeeklySlots] = useState<WeeklyScheduleSlot[]>([]);

  const studentsByCourse = useMemo(() => {
    const map: Record<string, Student[]> = {};
    for (const c of state.courses) {
      map[c.id] = [];
    }
    for (const s of state.students) {
      for (const cid of s.enrolledCourseIds) {
        if (map[cid]) {
          map[cid].push(s);
        }
      }
    }
    return map;
  }, [state.courses, state.students]);

  // Update a single slot in the creation form
  const handleUpdateSlot = (
    index: number,
    updates: Partial<WeeklyScheduleSlot>
  ) => {
    setWeeklySlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Change classes per week in creation form
  const handleClassesPerWeekChange = (count: number) => {
    setClassesPerWeek(count);
    setWeeklySlots((prev) => buildSlotsForCount(count, prev));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !batchName.trim()) return;

    const formattedCadence = formatWeeklySlots(weeklySlots);
    const saved = await onAddCourse({
      code: code.trim() || 'ACAD-01',
      title: title.trim(),
      batchName: batchName.trim(),
      instructor: instructor.trim() || 'Abdullah',
      accentColor,
      classesPerWeek,
      weeklySlots,
      scheduleCadence: formattedCadence,
      description: description.trim(),
    });
    if (!saved) return;

    setCode('');
    setTitle('');
    setBatchName('');
    setDescription('');
    setClassesPerWeek(2);
    setWeeklySlots(buildSlotsForCount(2));
    onNotify(`Created course "${title.trim()} · ${batchName.trim()}"`);
  };

  // Initialize edit modal state
  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    const count = course.classesPerWeek || course.weeklySlots?.length || 2;
    setEditClassesPerWeek(count);
    setEditWeeklySlots(buildSlotsForCount(count, course.weeklySlots || []));
  };

  // Update a single slot in the edit modal
  const handleUpdateEditSlot = (
    index: number,
    updates: Partial<WeeklyScheduleSlot>
  ) => {
    setEditWeeklySlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Change classes per week in edit modal
  const handleEditClassesPerWeekChange = (count: number) => {
    setEditClassesPerWeek(count);
    setEditWeeklySlots((prev) => buildSlotsForCount(count, prev));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    const formattedCadence = formatWeeklySlots(editWeeklySlots);
    const saved = await onUpdateCourse(editingCourse.id, {
      code: editingCourse.code.trim(),
      title: editingCourse.title.trim(),
      batchName: editingCourse.batchName.trim(),
      instructor: editingCourse.instructor.trim() || 'Abdullah',
      accentColor: editingCourse.accentColor,
      classesPerWeek: editClassesPerWeek,
      weeklySlots: editWeeklySlots,
      scheduleCadence: formattedCadence,
      description: editingCourse.description?.trim(),
    });
    if (!saved) return;

    onNotify(`Updated course "${editingCourse.title}"`);
    setEditingCourse(null);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
      {/* Create Course Form */}
      <form
        onSubmit={handleCreate}
        className="space-y-4 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-sm lg:col-span-5"
      >
        <div className="space-y-1 border-b border-[#E7E5E4] pb-3.5">
          <h2 className="font-display text-lg font-bold text-[#18181B]">
            Create Course / Batch
          </h2>
          <p className="text-xs text-[#52525B]">
            Add a new subject cohort with structured weekly timetable for student enrollment.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="course-code" className="block text-xs font-semibold text-[#18181B]">
              Subject / Code Tag
            </label>
            <input
              id="course-code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. IGCSE 0580"
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="course-instructor" className="block text-xs font-semibold text-[#18181B]">
              Lead Instructor
            </label>
            <input
              id="course-instructor"
              type="text"
              required
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Abdullah"
              className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="course-title" className="block text-xs font-semibold text-[#18181B]">
            Course Name
          </label>
          <input
            id="course-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. IGCSE Mathematics"
            className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="course-batch" className="block text-xs font-semibold text-[#18181B]">
            Batch / Cohort Name
          </label>
          <input
            id="course-batch"
            type="text"
            required
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="e.g. Extended Group A"
            className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Accent Color Picker */}
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-[#18181B]">Accent Color</span>
          <div className="flex items-center gap-2 pt-0.5">
            {(
              [
                { id: 'indigo', label: 'Indigo', bg: 'bg-[#4338CA]' },
                { id: 'orange', label: 'Amber Orange', bg: 'bg-[#EA580C]' },
                { id: 'teal', label: 'Emerald Teal', bg: 'bg-[#0F766E]' },
              ] as const
            ).map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => setAccentColor(color.id)}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${color.bg} text-white transition-transform ${
                  accentColor === color.id
                    ? 'ring-2 ring-offset-2 ring-[#18181B] scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                title={color.label}
              >
                {accentColor === color.id && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* DROPDOWN-BASED WEEKLY TIMETABLE                      */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-3 rounded-2xl border border-[#E7E5E4] bg-[#F8F7F4] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E7E5E4] pb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#4338CA]" />
              <span className="text-xs font-bold text-[#18181B]">Recurring Weekly Timetable</span>
            </div>

            {/* 1. Classes per Week Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="create-classes-per-week" className="text-xs font-medium text-[#71717A] whitespace-nowrap">
                Frequency:
              </label>
              <select
                id="create-classes-per-week"
                value={classesPerWeek}
                onChange={(e) => handleClassesPerWeekChange(Number(e.target.value))}
                className="rounded-lg border border-[#E7E5E4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18181B] focus:border-[#4338CA] focus:outline-none"
              >
                <option value={1}>1 class / week</option>
                <option value={2}>2 classes / week</option>
                <option value={3}>3 classes / week</option>
                <option value={4}>4 classes / week</option>
                <option value={5}>5 classes / week</option>
              </select>
            </div>
          </div>

          {/* 2. Dynamic Day & Time Dropdown Rows */}
          <div className="space-y-2.5">
            {weeklySlots.map((slot, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#E7E5E4] bg-white p-2.5 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#71717A]">
                  <span className="flex items-center gap-1.5 text-[#18181B]">
                    <Clock className="h-3 w-3 text-[#EA580C]" />
                    <span>Slot #{idx + 1}</span>
                  </span>
                  <span className="font-mono text-[#4338CA]">
                    {slot.day} • {slot.startTime} ({slot.duration})
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {/* Day Dropdown */}
                  <div>
                    <label className="sr-only">Day for slot {idx + 1}</label>
                    <select
                      value={slot.day}
                      onChange={(e) =>
                        handleUpdateSlot(idx, { day: e.target.value as DayOfWeek })
                      }
                      className="w-full rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-2.5 py-1.5 text-xs font-medium text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Time Dropdown */}
                  <div>
                    <label className="sr-only">Start time for slot {idx + 1}</label>
                    <select
                      value={slot.startTime}
                      onChange={(e) =>
                        handleUpdateSlot(idx, { startTime: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-2.5 py-1.5 text-xs font-medium text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                    >
                      {START_TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration Dropdown */}
                  <div>
                    <label className="sr-only">Duration for slot {idx + 1}</label>
                    <select
                      value={slot.duration}
                      onChange={(e) =>
                        handleUpdateSlot(idx, { duration: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-2.5 py-1.5 text-xs font-medium text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
                    >
                      {DURATION_OPTIONS.map((dur) => (
                        <option key={dur} value={dur}>
                          {dur}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Formatted Schedule Summary */}
          <div className="flex items-center justify-between text-[11px] pt-1 text-[#71717A]">
            <span>Schedule Summary:</span>
            <span className="font-semibold text-[#18181B]">
              {formatWeeklySlots(weeklySlots)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="course-desc" className="block text-xs font-semibold text-[#18181B]">
            Description (Optional)
          </label>
          <textarea
            id="course-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key syllabus topics, exam boards (Cambridge / Edexcel)..."
            className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#18181B] focus:border-[#4338CA] focus:bg-white focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#18181B] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#27272A] shadow-sm"
        >
          <Plus className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
          <span>Create Course Batch</span>
        </button>
      </form>

      {/* Courses List */}
      <div className="space-y-4 lg:col-span-7">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[#18181B]">
            Active Courses ({state.courses.length})
          </h2>
        </div>

        {state.courses.length === 0 ? (
          <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] px-6 py-14 text-center shadow-sm">
            <BookOpen className="mx-auto h-8 w-8 text-[#A1A1AA]" />
            <p className="mt-3 text-sm font-semibold text-[#18181B]">No courses created yet</p>
            <p className="mt-1 text-xs text-[#71717A]">
              Create your first subject batch on the left with structured weekly timings to start enrolling students.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.courses.map((course) => {
              const enrolled = studentsByCourse[course.id] || [];
              const formattedSchedule =
                course.scheduleCadence || formatWeeklySlots(course.weeklySlots || []);

              return (
                <article
                  key={course.id}
                  className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm transition-colors hover:border-[#D4D4D8]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#4338CA]">
                          {course.code}
                        </span>
                        <span aria-hidden="true" className="text-[#D4D4D8]">
                          ·
                        </span>
                        <span className="text-xs font-medium text-[#71717A]">
                          {course.instructor}
                        </span>
                      </div>

                      <h3 className="font-display text-base sm:text-lg font-bold text-[#18181B]">
                        {course.title} · {course.batchName}
                      </h3>

                      {course.description && (
                        <p className="text-xs text-[#52525B] leading-relaxed">
                          {course.description}
                        </p>
                      )}

                      {/* Formatted Schedule Tag with Calendar icon */}
                      {formattedSchedule && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-[#FED7AA]/80 bg-[#FFF7ED] px-2.5 py-1 text-xs font-semibold text-[#C2410C] w-fit">
                          <Calendar className="h-3.5 w-3.5 text-[#EA580C]" />
                          <span>{formattedSchedule}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(course)}
                        aria-label={`Edit ${course.title}`}
                        title="Edit course and schedule"
                        className="rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] p-1.5 text-[#52525B] hover:border-[#18181B] hover:text-[#18181B] transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDeleteCourse(course.id);
                          onNotify(`Deleted course "${course.title}"`);
                        }}
                        aria-label={`Delete ${course.title}`}
                        className="rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] p-1.5 text-[#71717A] hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Enrolled Students Quick Toggles */}
                  <div className="mt-4 border-t border-[#F4F4F5] pt-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#18181B]">
                        <Users className="h-3.5 w-3.5 text-[#71717A]" />
                        <span>Enrolled Students ({enrolled.length})</span>
                      </span>
                    </div>

                    {state.students.length === 0 ? (
                      <p className="text-xs text-[#71717A]">
                        No students created yet. Add students in the Students &amp; Approvals tab.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {state.students.map((student) => {
                          const isEnrolled = student.enrolledCourseIds.includes(course.id);
                          return (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => {
                                onToggleEnrollment(student.id, course.id);
                                onNotify(
                                  `${isEnrolled ? 'Unenrolled' : 'Enrolled'} ${student.name}`
                                );
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                                isEnrolled
                                  ? 'border-[#4338CA]/30 bg-[#EEF2FF] text-[#4338CA]'
                                  : 'border-[#E7E5E4] bg-[#F8F7F4] text-[#71717A] hover:border-[#18181B] hover:text-[#18181B]'
                              }`}
                            >
                              <span
                                className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[10px] ${
                                  isEnrolled
                                    ? 'bg-[#4338CA] text-white'
                                    : 'border border-[#D4D4D8] bg-white'
                                }`}
                              >
                                {isEnrolled && '✓'}
                              </span>
                              <span>{student.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Course Modal */}
      {editingCourse && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-course-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/50 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-lg rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3.5">
              <h3 id="edit-course-modal-title" className="font-display text-base font-bold text-[#18181B]">
                Edit Course / Batch
              </h3>
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                aria-label="Close edit course modal"
                className="rounded-lg p-1 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#18181B]">Code Tag</label>
                  <input
                    type="text"
                    required
                    value={editingCourse.code}
                    onChange={(e) =>
                      setEditingCourse({ ...editingCourse, code: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#18181B]">Instructor</label>
                  <input
                    type="text"
                    required
                    value={editingCourse.instructor}
                    onChange={(e) =>
                      setEditingCourse({ ...editingCourse, instructor: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">Course Title</label>
                <input
                  type="text"
                  required
                  value={editingCourse.title}
                  onChange={(e) =>
                    setEditingCourse({ ...editingCourse, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">Batch Name</label>
                <input
                  type="text"
                  required
                  value={editingCourse.batchName}
                  onChange={(e) =>
                    setEditingCourse({ ...editingCourse, batchName: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                />
              </div>

              {/* Edit Recurring Weekly Timetable Dropdowns */}
              <div className="space-y-3 rounded-2xl border border-[#E7E5E4] bg-[#F8F7F4] p-3.5">
                <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-2">
                  <span className="text-xs font-bold text-[#18181B]">Weekly Timetable</span>
                  <div className="flex items-center gap-2">
                    <label htmlFor="edit-classes-per-week" className="text-xs text-[#71717A]">
                      Frequency:
                    </label>
                    <select
                      id="edit-classes-per-week"
                      value={editClassesPerWeek}
                      onChange={(e) =>
                        handleEditClassesPerWeekChange(Number(e.target.value))
                      }
                      className="rounded-lg border border-[#E7E5E4] bg-white px-2 py-1 text-xs font-semibold text-[#18181B]"
                    >
                      <option value={1}>1 class / week</option>
                      <option value={2}>2 classes / week</option>
                      <option value={3}>3 classes / week</option>
                      <option value={4}>4 classes / week</option>
                      <option value={5}>5 classes / week</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  {editWeeklySlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#E7E5E4] bg-white p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#71717A]">
                        <span>Slot #{idx + 1}</span>
                        <span className="font-mono text-[#4338CA]">
                          {slot.day} • {slot.startTime}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <select
                          value={slot.day}
                          onChange={(e) =>
                            handleUpdateEditSlot(idx, {
                              day: e.target.value as DayOfWeek,
                            })
                          }
                          className="rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-2 py-1.5 text-xs text-[#18181B]"
                        >
                          {DAY_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>

                        <select
                          value={slot.startTime}
                          onChange={(e) =>
                            handleUpdateEditSlot(idx, { startTime: e.target.value })
                          }
                          className="rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-2 py-1.5 text-xs text-[#18181B]"
                        >
                          {START_TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>

                        <select
                          value={slot.duration}
                          onChange={(e) =>
                            handleUpdateEditSlot(idx, { duration: e.target.value })
                          }
                          className="rounded-lg border border-[#E7E5E4] bg-[#F8F7F4] px-2 py-1.5 text-xs text-[#18181B]"
                        >
                          {DURATION_OPTIONS.map((dur) => (
                            <option key={dur} value={dur}>
                              {dur}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-[#71717A] pt-1 flex justify-between">
                  <span>Summary:</span>
                  <span className="font-semibold text-[#18181B]">
                    {formatWeeklySlots(editWeeklySlots)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181B]">Description</label>
                <textarea
                  rows={2}
                  value={editingCourse.description || ''}
                  onChange={(e) =>
                    setEditingCourse({ ...editingCourse, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#F8F7F4] px-3 py-2 text-sm text-[#18181B]"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E7E5E4] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="rounded-lg border border-[#E7E5E4] px-4 py-2 text-xs font-semibold text-[#52525B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#18181B] px-5 py-2 text-xs font-semibold text-white hover:bg-[#27272A]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
