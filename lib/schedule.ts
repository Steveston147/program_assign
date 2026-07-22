import type { ScheduleData, ScheduleItem, Staff } from './types';
import { uniq } from './utils';

export function buildScheduleResponse(items: ScheduleItem[], staff: Staff[]): ScheduleData {
  const displayStaff = staff.length
    ? staff
    : uniq(items.map((item) => item.staffName)).map((staffName, idx) => ({
        staffName,
        displayOrder: idx + 1,
      }));

  return {
    items,
    staff: displayStaff,
    dates: uniq(items.map((item) => item.date)).sort(),
    programs: uniq(items.map((item) => item.programName)).sort(),
    statuses: uniq(items.map((item) => item.status)).sort(),
    updatedAt: items.map((item) => item.updatedAt).filter(Boolean).sort().at(-1),
  };
}
