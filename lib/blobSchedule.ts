import { get, list, put } from '@vercel/blob';
import type { ScheduleData } from './types';

const CURRENT_SCHEDULE_PATH = 'schedule/current-schedule.json';
const BACKUP_PREFIX = 'schedule/backups/';
const BACKUP_LIST_LIMIT = 10;

export type ScheduleBackupSummary = {
  pathname: string;
  createdAt: string;
  itemCount: number;
  staffCount: number;
  dateFrom: string;
  dateTo: string;
  programCount: number;
  programs: string[];
};

function getBlobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

function blobOptions(): { access: 'private'; token?: string } {
  const token = getBlobToken();
  return token ? { access: 'private', token } : { access: 'private' };
}

function listOptions(): { token?: string } {
  const token = getBlobToken();
  return token ? { token } : {};
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
}

async function readScheduleAtPath(pathname: string): Promise<ScheduleData | null> {
  try {
    const blob = await get(pathname, blobOptions());
    const stream = (blob as { stream?: ReadableStream<Uint8Array> | null } | null)?.stream;
    if (!stream) return null;
    return JSON.parse(await streamToText(stream)) as ScheduleData;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|404|No store found|BLOB_STORE_ID/i.test(message)) return null;
    throw error;
  }
}

function backupPath(date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  return `${BACKUP_PREFIX}${timestamp}.json`;
}

function toBackupSummary(pathname: string, schedule: ScheduleData, fallbackCreatedAt?: string): ScheduleBackupSummary {
  const dates = [...(schedule.dates || schedule.items.map((item) => item.date).filter(Boolean))].sort();
  const sourcePrograms = schedule.programs?.length
    ? schedule.programs
    : schedule.items.map((item) => item.programName).filter(Boolean);
  const programs = [...new Set(sourcePrograms)].sort((a, b) => a.localeCompare(b, 'ja'));
  const pathTimestamp = pathname.slice(BACKUP_PREFIX.length).replace(/\.json$/, '').replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/,
    '$1:$2:$3.$4Z',
  );

  return {
    pathname,
    createdAt: Number.isNaN(new Date(pathTimestamp).getTime()) ? fallbackCreatedAt || schedule.updatedAt || '' : pathTimestamp,
    itemCount: schedule.items.length,
    staffCount: schedule.staff.length,
    dateFrom: dates[0] || '',
    dateTo: dates[dates.length - 1] || '',
    programCount: programs.length,
    programs,
  };
}

export async function readUploadedSchedule(): Promise<ScheduleData | null> {
  try {
    return await readScheduleAtPath(CURRENT_SCHEDULE_PATH);
  } catch (error) {
    console.error('uploaded schedule read failed', error);
    return null;
  }
}

export async function createCurrentScheduleBackup(): Promise<string | null> {
  const current = await readScheduleAtPath(CURRENT_SCHEDULE_PATH);
  if (!current) return null;

  const pathname = backupPath();
  await put(pathname, JSON.stringify(current, null, 2), {
    ...blobOptions(),
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  });
  return pathname;
}

export async function listScheduleBackups(): Promise<ScheduleBackupSummary[]> {
  const result = await list({
    ...listOptions(),
    prefix: BACKUP_PREFIX,
    limit: 100,
  });

  const recent = [...result.blobs]
    .sort((a, b) => new Date(String(b.uploadedAt)).getTime() - new Date(String(a.uploadedAt)).getTime())
    .slice(0, BACKUP_LIST_LIMIT);

  const summaries = await Promise.all(
    recent.map(async (blob) => {
      const schedule = await readScheduleAtPath(blob.pathname);
      const uploadedAt = new Date(String(blob.uploadedAt));
      const fallback = Number.isNaN(uploadedAt.getTime()) ? '' : uploadedAt.toISOString();
      return schedule ? toBackupSummary(blob.pathname, schedule, fallback) : null;
    }),
  );

  return summaries.filter((backup): backup is ScheduleBackupSummary => Boolean(backup));
}

export async function restoreScheduleBackup(pathname: string): Promise<ScheduleBackupSummary> {
  if (!pathname.startsWith(BACKUP_PREFIX) || !pathname.endsWith('.json')) {
    throw new Error('指定されたバックアップを復元できません。');
  }

  const backup = await readScheduleAtPath(pathname);
  if (!backup) throw new Error('指定されたバックアップが見つかりません。');

  await createCurrentScheduleBackup();
  const restored = { ...backup, updatedAt: new Date().toISOString() };
  await put(CURRENT_SCHEDULE_PATH, JSON.stringify(restored, null, 2), {
    ...blobOptions(),
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  });

  return toBackupSummary(pathname, restored);
}

export async function writeUploadedSchedule(schedule: ScheduleData): Promise<void> {
  try {
    await createCurrentScheduleBackup();
    await put(CURRENT_SCHEDULE_PATH, JSON.stringify(schedule, null, 2), {
      ...blobOptions(),
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/No store found|BLOB_STORE_ID|BLOB_READ_WRITE_TOKEN|token|store/i.test(message)) {
      throw new Error('Vercel Blob Store がこのプロジェクトに接続されていません。Storageでprogram-assignに接続し、Redeployしてから再度アップロードしてください。');
    }
    throw error;
  }
}
