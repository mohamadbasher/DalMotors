import { TKey } from './i18n';

export interface DayHours {
  day: number; // 0 = Sunday .. 6 = Saturday (Israeli week starts Sunday)
  open: boolean;
  from: string; // "HH:mm"
  to: string; // "HH:mm"
}

/** i18n keys per weekday index, so labels follow the selected language. */
export const WEEKDAY_KEYS: TKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/** Half-hour slots, "00:00" … "23:30". */
export const TIME_SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

export function defaultHours(): DayHours[] {
  return Array.from({ length: 7 }, (_, day) => ({ day, open: true, from: '09:00', to: '19:00' }));
}

/** Normalises whatever came back from the DB into a full 7-day array. */
export function parseHours(raw: unknown): DayHours[] | null {
  if (!Array.isArray(raw) || raw.length !== 7) return null;
  const ok = raw.every(
    (d) =>
      d &&
      typeof d.day === 'number' &&
      typeof d.open === 'boolean' &&
      typeof d.from === 'string' &&
      typeof d.to === 'string'
  );
  return ok ? (raw as DayHours[]) : null;
}

/** The row for today, or null when hours aren't configured. */
export function todayHours(hours: DayHours[] | null): DayHours | null {
  if (!hours) return null;
  return hours.find((d) => d.day === new Date().getDay()) ?? null;
}

/**
 * Whether the store is open right this minute according to its schedule.
 * Only meaningful alongside the manual `is_open` switch — a dealer can close
 * early without editing the whole week.
 */
export function isOpenNow(hours: DayHours[] | null): boolean {
  const today = todayHours(hours);
  if (!today || !today.open) return false;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return hhmm >= today.from && hhmm <= today.to;
}

/** Client-side validation mirroring what the UI promises. Returns an i18n key. */
export function hoursError(hours: DayHours[]): TKey | null {
  if (!hours.some((d) => d.open)) return 'hoursNoOpenDay';
  if (hours.some((d) => d.open && d.from >= d.to)) return 'hoursInvalidOrder';
  return null;
}
