import { get, put } from '@vercel/blob';
import type { ScheduleResponse } from './types';

const CURRENT_SCHEDULE_PATH = 'schedule/current-schedule.json';

function getBlobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
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

export async function readUploadedSchedule(): Promise<ScheduleResponse | null> {
  const token = getBlobToken();
  if (!token) return null;

  try {
    const blob = await get(CURRENT_SCHEDULE_PATH, { token });
    const stream = (blob as { stream?: ReadableStream<Uint8Array> | null }).stream;
    if (!stream) return null;
    return JSON.parse(await streamToText(stream)) as ScheduleResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|404/i.test(message)) return null;
    console.error('uploaded schedule read failed', error);
    return null;
  }
}

export async function writeUploadedSchedule(schedule: ScheduleResponse): Promise<void> {
  const token = getBlobToken();
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN が設定されていません。VercelでBlob Storeを作成し、このプロジェクトに接続してください。');
  }

  await put(CURRENT_SCHEDULE_PATH, JSON.stringify(schedule, null, 2), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
    token,
  });
}
