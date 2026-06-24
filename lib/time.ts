import type { ScheduleItem } from './types';

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseTimeToMinutes(time: string): number {
  const m = String(time || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sortByStartTime(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort(
    (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime) || a.staffName.localeCompare(b.staffName, 'ja'),
  );
}

export function generateTimeSlots(start: string, end: string, intervalMinutes: number): string[] {
  const slots: string[] = [];
  for (let t = parseTimeToMinutes(start), e = parseTimeToMinutes(end); t <= e; t += intervalMinutes) {
    slots.push(formatMinutesToTime(t));
  }
  return slots;
}

export function isCurrentEvent(item: ScheduleItem, now: Date): boolean {
  const d = formatLocalDate(now);
  if (item.date !== d) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= parseTimeToMinutes(item.startTime) && mins <= parseTimeToMinutes(item.endTime);
}
