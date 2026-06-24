import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieName, verifyAuthCookieValue } from '@/lib/auth';
import { loadScheduleWorkbook, readAppDataSheet, readStaffMaster } from '@/lib/excel';
import { readUploadedSchedule } from '@/lib/blobSchedule';
import { buildScheduleResponse } from '@/lib/schedule';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET() {
  try {
    const cookie = (await cookies()).get(getAuthCookieName())?.value;
    if (!verifyAuthCookieValue(cookie)) {
      return NextResponse.json({ error: '未認証です' }, { status: 401, headers: noStore });
    }

    const uploaded = await readUploadedSchedule();
    if (uploaded) {
      return NextResponse.json(uploaded, { headers: noStore });
    }

    const wb = loadScheduleWorkbook();
    const items = readAppDataSheet(wb);
    const staff = readStaffMaster(wb);
    return NextResponse.json(buildScheduleResponse(items, staff), { headers: noStore });
  } catch (e) {
    console.error('schedule api error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'schedule error' },
      { status: 500, headers: noStore },
    );
  }
}
