import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Loader2,
  Pencil,
  Plus,
  Radio,
  Trash2,
  X,
} from 'lucide-react';
import {
  Course,
  LiveSessionHero,
  PortalState,
  ScheduleSession,
  SessionStatus,
} from '../../types/portal';
import { formatReadableDate } from '../../utils/formatters';

interface ScheduleManagerProps {
  state: PortalState;
  onAddSession: (session: Omit<ScheduleSession, 'id'>) => Promise<boolean>;
  onUpdateSession: (id: string, updates: Partial<Omit<ScheduleSession, 'id'>>) => Promise<boolean>;
  onDeleteSession: (id: string) => void;
  onPromoteToLiveHero: (hero: Omit<LiveSessionHero, 'updatedAt'>) => Promise<boolean>;
  onNotify: (msg: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  state,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onPromoteToLiveHero,
  onNotify,
}) => {
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? '');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('2026-11-20');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:15');
  const [status, setStatus] = useState<SessionStatus>('Upcoming');
  const [meetingUrl, setMeetingUrl] = useState('');

  const [editingSession, setEditingSession] = useState<ScheduleSession | null>(null);
  const [savingAction, setSavingAction] = useState<'create' | 'edit' | null>(null);

  const saveWithFeedback = async (action: 'create' | 'edit', save: () => Promise<boolean>) => {
    setSavingAction(action);
    try {
      return await save();
    } finally {
      setSavingAction(null);
    }
  };

  const courseLookup = useMemo(() => {
    const map: Record<string, Course> = {};
    for (const c of state.courses) map[c.id] = c;
    return map;
  }, [state.courses]);

  const effectiveCourseId = courseId || state.courses[0]?.id || '';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !date || !startTime || !endTime || !effectiveCourseId) return;
    const saved = await saveWithFeedback('create', () => onAddSession({
      courseId: effectiveCourseId,
      topic: topic.trim(),
      date,
      startTime,
      endTime,
      status,
      meetingUrl: meetingUrl.trim(),
    }));
    if (!saved) return;
    setTopic('');
    setMeetingUrl('');
    onNotify('Added new class session to schedule');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    const saved = await saveWithFeedback('edit', () => onUpdateSession(editingSession.id, {
      courseId: editingSession.courseId,
      topic: editingSession.topic.trim(),
      date: editingSession.date,
      startTime: editingSession.startTime,
      endTime: editingSession.endTime,
      status: editingSession.status,
      meetingUrl: editingSession.meetingUrl.trim(),
    }));
    if (!saved) return;
    onNotify(`Updated session "${editingSession.topic}"`);
    setEditingSession(null);
  };

  const handlePromote = async (session: ScheduleSession) => {
    const course = courseLookup[session.courseId];
    const saved = await onPromoteToLiveHero({
      sessionId: session.id,
      courseId: session.courseId,
      status: session.status === 'Live' ? 'live' : 'upcoming',
      badgeLabel: session.status === 'Live' ? 'ROOM OPEN' : 'NEXT CLASS',
      classTitle: session.topic,
      batchName: course ? `${course.title} · ${course.batchName}` : 'General',
      dateLabel: formatReadableDate(session.date, true),
      timeLabel: `${session.startTime} – ${session.endTime}`,
      timezone: 'GMT+4 (Dubai)',
      meetingUrl: session.meetingUrl,
    });
    if (saved) onNotify(`Promoted "${session.topic}" to Student Live Hero`);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
      {/* Add Session Form */}
      <form
        onSubmit={handleAdd}
        className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:col-span-5"
      >
        <div className="space-y-1 border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Add Class Session
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Schedule a new lecture across any active tutoring batch.
          </p>
        </div>

        {state.courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-500 dark:text-slate-400">
            No courses created yet. Please create a course batch first in the &ldquo;Courses&rdquo; tab before scheduling sessions.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="sched-course" className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                Course &amp; Batch
              </label>
              <select
                id="sched-course"
                value={effectiveCourseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#4338CA] focus:bg-white focus:outline-none"
              >
                {state.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} · {c.batchName} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sched-topic" className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                Lesson Topic
              </label>
              <input
                id="sched-topic"
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Trigonometry: 3D Bearings & Sine Rule"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#4338CA] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="sched-date" className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Date
                </label>
                <input
                  id="sched-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sched-status" className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Status
                </label>
                <select
                  id="sched-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SessionStatus)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-[#4338CA] focus:bg-white focus:outline-none"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Live">Live</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="sched-start" className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Start Time
                </label>
                <input
                  id="sched-start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sched-end" className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  End Time
                </label>
                <input
                  id="sched-end"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:border-[#4338CA] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sched-url" className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                Meeting URL (Optional)
              </label>
              <input
                id="sched-url"
                type="text"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#4338CA] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingAction !== null}
              aria-busy={savingAction === 'create'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              {savingAction === 'create' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4 text-teal-400" aria-hidden="true" />}
              <span>{savingAction === 'create' ? 'Saving…' : 'Add Session to Schedule'}</span>
            </button>
          </>
        )}
      </form>

      {/* Existing Sessions List */}
      <div className="space-y-4 lg:col-span-7">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Scheduled Sessions ({state.sessions.length})
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {state.sessions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="mx-auto h-8 w-8 text-[#A1A1AA]" />
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">No scheduled classes yet</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Use the form on the left to schedule your first lecture or lab review.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E7E5E4]">
              {state.sessions.map((sess) => {
                const course = courseLookup[sess.courseId];
                const isActiveHero = state.liveHero?.sessionId === sess.id;

                return (
                  <li
                    key={sess.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {course ? `${course.code} · ${course.batchName}` : 'General'}
                        </span>
                        <span aria-hidden="true" className="text-[#D4D4D8]">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                          <Calendar className="h-3 w-3 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                          {sess.date} ({sess.startTime}–{sess.endTime})
                        </span>
                        {isActiveHero && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                            · Active Hero
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {sess.topic}
                      </p>

                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {sess.meetingUrl ? sess.meetingUrl : 'No meeting link assigned'}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <label htmlFor={`status-${sess.id}`} className="sr-only">
                        Session status
                      </label>
                      <select
                        id={`status-${sess.id}`}
                        value={sess.status}
                        onChange={async (e) => {
                          const nextStatus = e.target.value as SessionStatus;
                          const saved = await onUpdateSession(sess.id, { status: nextStatus });
                          if (saved) onNotify(`Marked "${sess.topic}" as ${nextStatus}`);
                        }}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100"
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Live">Live</option>
                        <option value="Completed">Completed</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handlePromote(sess)}
                        title="Push to Student Dashboard Hero Banner"
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-colors"
                      >
                        <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Set Hero</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingSession(sess)}
                        aria-label={`Edit ${sess.topic}`}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-slate-600 dark:text-slate-400 hover:border-[#18181B] hover:text-slate-900 dark:text-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDeleteSession(sess.id);
                          onNotify(`Deleted session "${sess.topic}"`);
                        }}
                        aria-label={`Delete ${sess.topic}`}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-slate-500 dark:text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Edit Session Modal */}
      {editingSession && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-session-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/45 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <h3 id="edit-session-title" className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Class Session
              </h3>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                aria-label="Close edit modal"
                className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-[#F4F4F5] hover:text-slate-900 dark:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100">Course</label>
                <select
                  value={editingSession.courseId}
                  onChange={(e) =>
                    setEditingSession({ ...editingSession, courseId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                >
                  {state.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} · {c.batchName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100">Topic</label>
                <input
                  type="text"
                  required
                  value={editingSession.topic}
                  onChange={(e) =>
                    setEditingSession({ ...editingSession, topic: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100">Date</label>
                  <input
                    type="date"
                    required
                    value={editingSession.date}
                    onChange={(e) =>
                      setEditingSession({ ...editingSession, date: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100">Start</label>
                  <input
                    type="time"
                    required
                    value={editingSession.startTime}
                    onChange={(e) =>
                      setEditingSession({ ...editingSession, startTime: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100">End</label>
                  <input
                    type="time"
                    required
                    value={editingSession.endTime}
                    onChange={(e) =>
                      setEditingSession({ ...editingSession, endTime: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100">Meeting URL</label>
                <input
                  type="text"
                  value={editingSession.meetingUrl}
                  onChange={(e) =>
                    setEditingSession({ ...editingSession, meetingUrl: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction !== null}
                  aria-busy={savingAction === 'edit'}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  {savingAction === 'edit' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  {savingAction === 'edit' ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
