import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieName, verifyAuthCookieValue } from '@/lib/auth';
import { loadScheduleWorkbook, readAppDataSheet, readSeedScheduleData, readStaffMaster } from '@/lib/excel';
import type { ScheduleItem, Staff } from '@/lib/types';
import { uniq } from '@/lib/utils';

export const runtime = 'nodejs';

function buildScheduleResponse(items: ScheduleItem[], staff: Staff[]) {
  const orderedStaff = staff.length
    ? staff
    : uniq(items.map((i) => i.staffName)).map((staffName, idx) => ({ staffName, displayOrder: idx + 1 }));

  return {
    items,
    staff: orderedStaff,
    dates: uniq(items.map((i) => i.date)).sort(),
    programs: uniq(items.map((i) => i.programName)).sort(),
    statuses: uniq(items.map((i) => i.status)).sort(),
    updatedAt: items.map((i) => i.updatedAt).filter(Boolean).sort().at(-1),
  };
}

function readScheduleData() {
  try {
    const wb = loadScheduleWorkbook();
    const items = readAppDataSheet(wb);
    const staff = readStaffMaster(wb);
    return { items, staff, source: 'xlsx' };
  } catch (xlsxError) {
    console.error('schedule xlsx read failed; falling back to seed json', xlsxError);
    const seed = readSeedScheduleData();
    return { ...seed, source: 'seed' };
  }
}

export async function GET() {
  try {
    const cookie = (await cookies()).get(getAuthCookieName())?.value;
    if (!verifyAuthCookieValue(cookie)) {
      return NextResponse.json({ error: '未認証です' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const { items, staff } = readScheduleData();
    return NextResponse.json(buildScheduleResponse(items, staff), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('schedule api error', error);
    return NextResponse.json({ error: 'スケジュールを読み込めませんでした' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
