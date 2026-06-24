import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import type { ScheduleItem, Staff } from './types';
import { formatLocalDate, sortByStartTime } from './time';

const REQUIRED = ['Date', 'StaffName', 'StartTime', 'EndTime', 'ProgramName', 'GatheringPlace', 'EventName', 'Status'];

type RawRow = Record<string, unknown>;

type SeedScheduleData = {
  App_Data?: RawRow[];
  Master_Staff?: RawRow[];
};

export function loadScheduleWorkbook(): XLSX.WorkBook {
  const file = path.join(process.cwd(), 'data', 'schedule.xlsx');
  if (!fs.existsSync(file)) throw new Error('/data/schedule.xlsx が存在しません');
  return XLSX.readFile(file, { cellDates: true });
}

function rows(sheet: XLSX.WorkSheet): RawRow[] {
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
}

export function validateRequiredColumns(headers: string[]): void {
  const missing = REQUIRED.filter((h) => !headers.includes(h));
  if (missing.length) throw new Error(`必須列が不足しています: ${missing.join(', ')}`);
}

export function normalizeExcelDate(value: unknown): string {
  if (value instanceof Date) return formatLocalDate(value);
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) throw new Error(`Dateを読み取れません: ${value}`);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(value || '').trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  throw new Error(`Dateを読み取れません: ${s}`);
}

export function normalizeExcelTime(value: unknown): string {
  if (value instanceof Date) return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  if (typeof value === 'number') {
    const total = Math.round((value % 1) * 24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  const s = String(value || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  if (!s) return '';
  throw new Error(`時刻を読み取れません: ${s}`);
}

function toScheduleItems(data: RawRow[]): ScheduleItem[] {
  const nonEmpty = data.filter((r) => Object.values(r).some((v) => String(v).trim() !== ''));
  validateRequiredColumns(Object.keys(nonEmpty[0] || {}));
  const items = nonEmpty.map((r) => ({
    date: normalizeExcelDate(r.Date),
    staffName: String(r.StaffName).trim(),
    startTime: normalizeExcelTime(r.StartTime),
    endTime: normalizeExcelTime(r.EndTime),
    programName: String(r.ProgramName).trim(),
    role: String(r.Role || '').trim() || undefined,
    gatheringTime: r.GatheringTime ? normalizeExcelTime(r.GatheringTime) : undefined,
    gatheringPlace: String(r.GatheringPlace).trim(),
    eventName: String(r.EventName).trim(),
    destination: String(r.Destination || '').trim() || undefined,
    status: String(r.Status).trim(),
    notes: String(r.Notes || '').trim() || undefined,
    updatedAt: String(r.UpdatedAt || '').trim() || undefined,
  }));
  if (!items.length) throw new Error('読み込める行がありません');
  return sortByStartTime(items);
}

function toStaff(data: RawRow[]): Staff[] {
  return data
    .map((r) => ({
      staffId: String(r.StaffId || r.StaffID || '').trim() || undefined,
      staffName: String(r.StaffName || '').trim(),
      displayOrder: Number(r.DisplayOrder || 999),
      active: String(r.Active ?? 'true').toLowerCase() !== 'false',
      notes: String(r.Notes || '').trim() || undefined,
    }))
    .filter((s) => s.staffName && s.active)
    .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
}

export function readAppDataSheet(workbook = loadScheduleWorkbook()): ScheduleItem[] {
  const sheet = workbook.Sheets.App_Data;
  if (!sheet) throw new Error('App_Data シートが存在しません');
  return toScheduleItems(rows(sheet));
}

export function readStaffMaster(workbook = loadScheduleWorkbook()): Staff[] {
  const sheet = workbook.Sheets.Master_Staff;
  if (!sheet) return [];
  return toStaff(rows(sheet));
}

export function readSeedScheduleData(): { items: ScheduleItem[]; staff: Staff[] } {
  const file = path.join(process.cwd(), 'data', 'schedule.seed.json');
  if (!fs.existsSync(file)) throw new Error('/data/schedule.seed.json が存在しません');
  const seed = JSON.parse(fs.readFileSync(file, 'utf8')) as SeedScheduleData;
  const items = toScheduleItems(seed.App_Data || []);
  const staff = toStaff(seed.Master_Staff || []);
  return { items, staff };
}
