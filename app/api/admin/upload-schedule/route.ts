import * as XLSX from 'xlsx';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieName, verifyAuthCookieValue } from '@/lib/auth';
import { readAppDataSheet, readStaffMaster } from '@/lib/excel';
import { buildScheduleResponse } from '@/lib/schedule';
import { writeUploadedSchedule } from '@/lib/blobSchedule';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const cookie = (await cookies()).get(getAuthCookieName())?.value;
    if (!verifyAuthCookieValue(cookie)) {
      return NextResponse.json({ error: '未認証です。先にトップ画面でログインしてください。' }, { status: 401, headers: noStore });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Excelファイルを選択してください。' }, { status: 400, headers: noStore });
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: '.xlsx形式のExcelファイルをアップロードしてください。' }, { status: 400, headers: noStore });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'ファイルサイズは5MB以下にしてください。' }, { status: 400, headers: noStore });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { cellDates: true });
    const items = readAppDataSheet(workbook);
    const staff = readStaffMaster(workbook);
    const schedule = buildScheduleResponse(items, staff);
    schedule.updatedAt = schedule.updatedAt || new Date().toISOString();

    await writeUploadedSchedule(schedule);

    return NextResponse.json(
      {
        ok: true,
        itemCount: schedule.items.length,
        staffCount: schedule.staff.length,
        dates: schedule.dates,
        updatedAt: schedule.updatedAt,
      },
      { headers: noStore },
    );
  } catch (error) {
    console.error('schedule upload error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Excelアップロードに失敗しました。' },
      { status: 500, headers: noStore },
    );
  }
}
