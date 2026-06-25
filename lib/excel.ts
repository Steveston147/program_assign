import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import type { ScheduleItem, Staff } from './types';
import { sortByStartTime } from './time';

const REQUIRED = ['Date','StaffName','StartTime','EndTime','ProgramName','GatheringPlace','EventName','Status'];

type ValidationDetail = {
  row: number;
  column: string;
  value: unknown;
  message: string;
};

export class ExcelValidationError extends Error {
  details: ValidationDetail[];

  constructor(details: ValidationDetail[]) {
    super(details[0]?.message || 'Excelの入力内容を確認してください。');
    this.name = 'ExcelValidationError';
    this.details = details;
  }
}

function isMissingOrInaccessibleWorkbookError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Cannot access file|ENOENT|EACCES|EPERM|no such file or directory/i.test(message);
}

function loadSeedWorkbook(): XLSX.WorkBook {
  const seedFile = path.join(process.cwd(), 'data', 'schedule.seed.json');
  if (!fs.existsSync(seedFile)) {
    throw new Error('/data/schedule.xlsx と /data/schedule.seed.json が存在しません');
  }

  console.error('using data/schedule.seed.json fallback');
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8')) as {
    App_Data?: Record<string, unknown>[];
    Master_Staff?: Record<string, unknown>[];
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(seed.App_Data ?? []), 'App_Data');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(seed.Master_Staff ?? []), 'Master_Staff');
  return wb;
}

export function loadScheduleWorkbook(): XLSX.WorkBook {
  const file = path.join(process.cwd(), 'data', 'schedule.xlsx');

  try {
    return XLSX.readFile(file, { cellDates: true });
  } catch (error) {
    if (!isMissingOrInaccessibleWorkbookError(error)) {
      throw error;
    }

    console.error('schedule.xlsx is missing or inaccessible; falling back to seed data', error);
    return loadSeedWorkbook();
  }
}

function rows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
}

function headers(sheet: XLSX.WorkSheet): string[] {
  const [headerRow = []] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' }) as unknown as unknown[][];
  return headerRow.map((h) => String(h).trim()).filter(Boolean);
}

export function validateRequiredColumns(headerValues: string[]): void {
  const missing = REQUIRED.filter((h) => !headerValues.includes(h));
  if (missing.length) {
    throw new ExcelValidationError(
      missing.map((column) => ({
        row: 1,
        column,
        value: '',
        message: `1行目の${column}列が不足しています。`,
      })),
    );
  }
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

function formatOriginalValue(value: unknown): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')} ${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }
  return String(value ?? '').trim();
}

function validationMessage(row: number, column: string, value: unknown, reason: 'missing' | 'parse'): string {
  if (reason === 'missing') return `${row}行目の${column}は必須です。`;
  return `${row}行目の${column}を読み取れません: ${formatOriginalValue(value)}`;
}

function validationDetail(row: number, column: string, value: unknown, reason: 'missing' | 'parse'): ValidationDetail {
  return { row, column, value, message: validationMessage(row, column, value, reason) };
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseExcelDate(value: unknown): string | null {
  if (isBlank(value)) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }

  const s = String(value).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!isValidDateParts(year, month, day)) return null;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

export function parseExcelTime(value: unknown): string | null {
  if (isBlank(value)) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const fraction = ((value % 1) + 1) % 1;
    const total = Math.round(fraction * 24 * 60) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  const s = String(value).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;

  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function normalizeExcelDate(value: unknown): string {
  const parsed = parseExcelDate(value);
  if (!parsed) throw new Error(`Dateを読み取れません: ${formatOriginalValue(value)}`);
  return parsed;
}

export function normalizeExcelTime(value: unknown): string {
  if (isBlank(value)) return '';
  const parsed = parseExcelTime(value);
  if (!parsed) throw new Error(`時刻を読み取れません: ${formatOriginalValue(value)}`);
  return parsed;
}

function rowNumber(row: Record<string, unknown>, index: number): number {
  const sourceRow = (row as { __rowNum__?: number }).__rowNum__;
  return typeof sourceRow === 'number' ? sourceRow + 1 : index + 2;
}

function rowIsCompletelyBlank(row: Record<string, unknown>): boolean {
  return Object.values(row).every(isBlank);
}

function addRequiredStringError(details: ValidationDetail[], row: Record<string, unknown>, column: string, rowNum: number): void {
  if (isBlank(row[column])) details.push(validationDetail(rowNum, column, row[column], 'missing'));
}

function addRequiredDateError(details: ValidationDetail[], row: Record<string, unknown>, rowNum: number): void {
  if (isBlank(row.Date)) {
    details.push(validationDetail(rowNum, 'Date', row.Date, 'missing'));
    return;
  }
  if (!parseExcelDate(row.Date)) details.push(validationDetail(rowNum, 'Date', row.Date, 'parse'));
}

function addRequiredTimeError(details: ValidationDetail[], row: Record<string, unknown>, column: 'StartTime' | 'EndTime', rowNum: number): void {
  if (isBlank(row[column])) {
    details.push(validationDetail(rowNum, column, row[column], 'missing'));
    return;
  }
  if (!parseExcelTime(row[column])) details.push(validationDetail(rowNum, column, row[column], 'parse'));
}

function addOptionalTimeError(details: ValidationDetail[], row: Record<string, unknown>, column: string, rowNum: number): void {
  if (!isBlank(row[column]) && !parseExcelTime(row[column])) details.push(validationDetail(rowNum, column, row[column], 'parse'));
}

function validateRow(row: Record<string, unknown>, rowNum: number): ValidationDetail[] {
  const details: ValidationDetail[] = [];
  addRequiredDateError(details, row, rowNum);
  addRequiredStringError(details, row, 'StaffName', rowNum);
  addRequiredTimeError(details, row, 'StartTime', rowNum);
  addRequiredTimeError(details, row, 'EndTime', rowNum);
  addRequiredStringError(details, row, 'ProgramName', rowNum);
  addRequiredStringError(details, row, 'GatheringPlace', rowNum);
  addRequiredStringError(details, row, 'EventName', rowNum);
  addRequiredStringError(details, row, 'Status', rowNum);
  addOptionalTimeError(details, row, 'GatheringTime', rowNum);
  return details;
}

export function readAppDataSheet(workbook = loadScheduleWorkbook()): ScheduleItem[] {
  const sheet = workbook.Sheets.App_Data;
  if (!sheet) throw new Error('App_Data シートが存在しません');

  validateRequiredColumns(headers(sheet));
  const data = rows(sheet).filter((r) => !rowIsCompletelyBlank(r));
  const validationDetails = data.flatMap((r, index) => validateRow(r, rowNumber(r, index)));
  if (validationDetails.length) throw new ExcelValidationError(validationDetails);

  const items = data.map((r) => ({
    date: parseExcelDate(r.Date) as string,
    staffName: String(r.StaffName).trim(),
    startTime: parseExcelTime(r.StartTime) as string,
    endTime: parseExcelTime(r.EndTime) as string,
    programName: String(r.ProgramName).trim(),
    role: String(r.Role || '').trim() || undefined,
    gatheringTime: isBlank(r.GatheringTime) ? undefined : parseExcelTime(r.GatheringTime) as string,
    gatheringPlace: String(r.GatheringPlace).trim(),
    eventName: String(r.EventName).trim(),
    destination: String(r.Destination || '').trim() || undefined,
    status: String(r.Status).trim(),
    notes: String(r.Notes || '').trim() || undefined,
    updatedAt: String(r.UpdatedAt || '').trim() || undefined,
  }));

  if (!items.length) {
    throw new ExcelValidationError([{ row: 2, column: 'App_Data', value: '', message: '読み込める行がありません。' }]);
  }
  return sortByStartTime(items);
}

export function readStaffMaster(workbook = loadScheduleWorkbook()): Staff[] {
  const sheet = workbook.Sheets.Master_Staff;
  if (!sheet) return [];

  return rows(sheet)
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
