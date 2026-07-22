import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieName, verifyAuthCookieValue } from '@/lib/auth';
import { loadScheduleWorkbook, readAppDataSheet, readStaffMaster } from '@/lib/excel';
import { readUploadedSchedule } from '@/lib/blobSchedule';
import { buildScheduleResponse } from '@/lib/schedule';
import type { ScheduleDataSource } from '@/lib/types';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function getBundledDataSource(): ScheduleDataSource {
  const workbookPath = path.join(process.cwd(), 'data', 'schedule.xlsx');

  try {
    fs.accessSync(workbookPath, fs.constants.R_OK);
    return 'repository';
  } catch {
    return 'seed';
  }
}

export async function GET() {
  try {
    const cookie = (await cookies()).get(getAuthCookieName())?.value;
    if (!verifyAuthCookieValue(cookie)) {
      return NextResponse.json({ error: '未認証です' }, { status: 401, headers: noStore });
    }

    const uploaded = await readUploadedSchedule();
    if (uploaded) {
      return NextResponse.json({ ...uploaded, source: 'uploaded' }, { headers: noStore });
    }

    const source = getBundledDataSource();
    const wb = loadScheduleWorkbook();
    const items = readAppDataSheet(wb);
    const staff = readStaffMaster(wb);
    return NextResponse.json({ ...buildScheduleResponse(items, staff), source }, { headers: noStore });
  } catch (e) {
    console.error('schedule api error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'schedule error' },
      { status: 500, headers: noStore },
    );
  }
}
