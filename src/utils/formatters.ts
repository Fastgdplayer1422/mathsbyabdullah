export function parseLocalDate(isoDate: string): Date {
  const parts = isoDate.split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(isoDate);
}

export function formatReadableDate(isoDate: string, includeWeekday = true): string {
  const date = parseLocalDate(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-US', {
    weekday: includeWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDay(isoDate: string): { weekday: string; day: string; month: string } {
  const date = parseLocalDate(isoDate);
  if (Number.isNaN(date.getTime())) {
    return { weekday: '—', day: '—', month: '—' };
  }
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(date.getDate()),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
  };
}

export function normalizeExternalUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Strict email validation checking for valid RFC syntax and blocking placeholder / disposable domains.
 */
const DISPOSABLE_OR_PLACEHOLDER_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'test.org',
  'fake.com',
  'fakemail.com',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'throwaway.com',
  'guerrillamail.com',
  'sharklasers.com',
  'yopmail.com',
  'trashmail.com',
  'dispostable.com',
  'getairmail.com',
  'maildrop.cc',
  'inboxkitten.com',
  'mytemp.email',
  'discard.email',
]);

export function validateStudentEmail(rawEmail: string): { valid: boolean; error?: string } {
  const trimmed = rawEmail.trim().toLowerCase();
  if (!trimmed) {
    return { valid: false, error: 'Email address is required.' };
  }

  // RFC standard email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Please enter a valid email format (e.g., student@gmail.com or student@school.edu).',
    };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid email structure.' };
  }

  const domain = parts[1].toLowerCase();

  // Check against explicit blocked domains
  if (DISPOSABLE_OR_PLACEHOLDER_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: `Placeholder or disposable domain "@${domain}" is not permitted. Please use your personal or school email.`,
    };
  }

  // Check for suspicious disposable keywords
  if (
    domain.includes('tempmail') ||
    domain.includes('mailinator') ||
    domain.includes('disposable') ||
    domain.includes('fake') ||
    domain.includes('10minute')
  ) {
    return {
      valid: false,
      error: 'Disposable or temporary email services are not accepted.',
    };
  }

  // Must have a valid top-level domain of at least 2 chars
  const tldParts = domain.split('.');
  const tld = tldParts[tldParts.length - 1];
  if (!tld || tld.length < 2) {
    return { valid: false, error: 'Email must contain a valid domain extension.' };
  }

  return { valid: true };
}

// ----------------------------------------------------
// Weekly Timetable Constants & Helpers
// ----------------------------------------------------
export const DAY_OPTIONS: import('../types/portal').DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const START_TIME_OPTIONS: string[] = [
  '8:00 AM',
  '8:30 AM',
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
  '10:00 PM',
  '10:30 PM',
];

export const DURATION_OPTIONS: string[] = [
  '45 mins',
  '1 hour',
  '1.5 hours',
  '2 hours',
];

export const DAY_INDEX_MAP: Record<import('../types/portal').DayOfWeek, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export const SHORT_DAY_MAP: Record<import('../types/portal').DayOfWeek, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

export function parseTime12h(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return { hours: 17, minutes: 0 };
  }
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && h < 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return { hours: h, minutes: m };
}

export function parseDurationMinutes(durationStr: string): number {
  const lower = durationStr.toLowerCase().trim();
  if (lower.includes('45')) return 45;
  if (lower.includes('1.5') || lower.includes('90')) return 90;
  if (lower.includes('2')) return 120;
  return 60; // default 1 hour
}

export function formatEndTime(startTimeStr: string, durationMinutes: number): string {
  const { hours, minutes } = parseTime12h(startTimeStr);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  let endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  const meridiem = endH >= 12 ? 'PM' : 'AM';
  if (endH > 12) endH -= 12;
  if (endH === 0) endH = 12;
  return `${endH}:${String(endM).padStart(2, '0')} ${meridiem}`;
}

export function determineSessionStatus(
  isoDate: string,
  startTime: string,
  durationMinutes: number,
  refNow = new Date()
): import('../types/portal').SessionStatus {
  const { hours, minutes } = parseTime12h(startTime);
  const targetDate = parseLocalDate(isoDate);
  const startDt = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    hours,
    minutes,
    0
  );
  const endDt = new Date(startDt.getTime() + durationMinutes * 60000);

  if (refNow >= startDt && refNow <= endDt) {
    return 'Live';
  }
  if (refNow > endDt) {
    return 'Completed';
  }
  return 'Upcoming';
}

/**
 * Format structured weekly slots into an elegant short label (e.g., "Mon & Wed • 5:00 PM")
 */
export function formatWeeklySlots(slots: import('../types/portal').WeeklyScheduleSlot[]): string {
  if (!slots || slots.length === 0) return '';

  const shortDays = slots.map((s) => SHORT_DAY_MAP[s.day] || s.day.slice(0, 3));
  const times = slots.map((s) => s.startTime);
  const allSameTime = times.every((t) => t === times[0]);

  let daysLabel = '';
  if (shortDays.length === 1) {
    daysLabel = shortDays[0];
  } else if (shortDays.length === 2) {
    daysLabel = `${shortDays[0]} & ${shortDays[1]}`;
  } else {
    daysLabel = `${shortDays.slice(0, -1).join(', ')} & ${shortDays[shortDays.length - 1]}`;
  }

  if (allSameTime) {
    return `${daysLabel} • ${times[0]}`;
  }

  return slots
    .map((s) => `${SHORT_DAY_MAP[s.day] || s.day.slice(0, 3)} ${s.startTime}`)
    .join(', ');
}

export interface CalculatedNextClass {
  course: import('../types/portal').Course;
  slot: import('../types/portal').WeeklyScheduleSlot;
  isLiveNow: boolean;
  startDateTime: Date;
  endDateTime: Date;
  countdownLabel: string; // e.g. "LIVE NOW" or "Starts in 3h" or "Starts in 45m"
  displayDayTime: string; // e.g. "Monday, 5:00 PM" or "Today, 5:00 PM"
  durationLabel: string;
}

/**
 * Automatically calculates the student's very next upcoming or live class
 * based on their enrolled courses' weekly timetable slots.
 */
export function calculateNextLiveClass(
  enrolledCourses: import('../types/portal').Course[],
  referenceDate = new Date()
): CalculatedNextClass | null {
  if (!enrolledCourses || enrolledCourses.length === 0) return null;

  const candidates: CalculatedNextClass[] = [];

  for (const course of enrolledCourses) {
    const slots = course.weeklySlots || [];
    for (const slot of slots) {
      if (!slot.day || !slot.startTime) continue;

      const targetDayIndex = DAY_INDEX_MAP[slot.day];
      const { hours, minutes } = parseTime12h(slot.startTime);
      const durationMinutes = parseDurationMinutes(slot.duration || '1 hour');

      const currentDayIndex = referenceDate.getDay();
      let dayDiff = (targetDayIndex - currentDayIndex + 7) % 7;

      let slotStart = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        referenceDate.getDate() + dayDiff,
        hours,
        minutes,
        0,
        0
      );
      let slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      let isLiveNow = false;

      if (dayDiff === 0) {
        if (referenceDate >= slotStart && referenceDate <= slotEnd) {
          isLiveNow = true;
        } else if (referenceDate > slotEnd) {
          // Already ended today -> next occurrence is next week (+7 days)
          slotStart = new Date(slotStart.getTime() + 7 * 86400000);
          slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
          dayDiff = 7;
        }
      }

      // Calculate countdown label
      let countdownLabel = 'LIVE NOW';
      if (!isLiveNow) {
        const diffMs = slotStart.getTime() - referenceDate.getTime();
        const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
        if (diffMinutes < 60) {
          countdownLabel = `Starts in ${diffMinutes}m`;
        } else if (diffMinutes < 1440) {
          const h = Math.round(diffMinutes / 60);
          countdownLabel = `Starts in ${h}h`;
        } else {
          const d = Math.round(diffMinutes / 1440);
          countdownLabel = d === 1 ? 'Starts tomorrow' : `Starts in ${d} days`;
        }
      }

      // Display Day & Time
      let displayDayTime = `${slot.day}, ${slot.startTime}`;
      if (dayDiff === 0) {
        displayDayTime = `Today, ${slot.startTime}`;
      } else if (dayDiff === 1) {
        displayDayTime = `Tomorrow, ${slot.startTime}`;
      }

      candidates.push({
        course,
        slot,
        isLiveNow,
        startDateTime: slotStart,
        endDateTime: slotEnd,
        countdownLabel,
        displayDayTime,
        durationLabel: slot.duration || `${durationMinutes} mins`,
      });
    }
  }

  if (candidates.length === 0) return null;

  // 1. Any class currently LIVE NOW gets absolute top priority
  const liveCandidate = candidates.find((c) => c.isLiveNow);
  if (liveCandidate) return liveCandidate;

  // 2. Otherwise sort by closest upcoming start time
  candidates.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
  return candidates[0];
}

