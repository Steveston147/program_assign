import type { ScheduleItem, Staff } from './types';
import { formatLocalDate, sortByStartTime } from './time';
export const uniq = <T,>(xs:T[]) => Array.from(new Set(xs));
export function groupByStaff(items: ScheduleItem[], staff: Staff[]) { const map = new Map<string, ScheduleItem[]>(); staff.forEach(s=>map.set(s.staffName, [])); items.forEach(i=>map.set(i.staffName, [...(map.get(i.staffName)||[]), i])); return Array.from(map, ([staffName, schedules])=>({ staffName, schedules: sortByStartTime(schedules) })); }
export function nearestDate(dates: string[], today = formatLocalDate(new Date())) { if(!dates.length) return today; return [...dates].sort((a,b)=>Math.abs(new Date(a).getTime()-new Date(today).getTime())-Math.abs(new Date(b).getTime()-new Date(today).getTime()))[0]; }
