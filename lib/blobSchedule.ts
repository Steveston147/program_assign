import { get, put } from '@vercel/blob';
import type { ScheduleData } from './types';

const CURRENT_SCHEDULE_PATH = 'schedule/current-schedule.json';

function getBlobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

function blobOptions(): { access: 'private'; token?: string } {
  const token = getBlobToken();
  return token ? { access: 'private', token } : { access: 'private' };
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

export async function readUploadedSchedule(): Promise<ScheduleData | null> {
  try {
    const blob = await get(CURRENT_SCHEDULE_PATH, blobOptions());
    const stream = (blob as { stream?: ReadableStream<Uint8Array> | null }).stream;
    if (!stream) return null;
    return JSON.parse(await streamToText(stream)) as ScheduleData;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|404|No store found|BLOB_STORE_ID/i.test(message)) return null;
    console.error('uploaded schedule read failed', error);
    return null;
  }
}

export async function writeUploadedSchedule(schedule: ScheduleData): Promise<void> {
  try {
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
