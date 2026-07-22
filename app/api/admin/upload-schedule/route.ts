import * as XLSX from 'xlsx';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuthCookieName, verifyAdminAuthCookieValue } from '@/lib/auth';
import { ExcelValidationError, readAppDataSheet, readStaffMaster } from '@/lib/excel';
import { buildScheduleResponse } from '@/lib/schedule';
import { writeUploadedSchedule } from '@/lib/blobSchedule';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const cookie = (await cookies()).get(getAdminAuthCookieName())?.value;
    if (!verifyAdminAuthCookieValue(cookie)) {
      return NextResponse.json(
        { error: '管理者認証が必要です。' },
        { status: 401, headers: noStore },
      );
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
    if (error instanceof ExcelValidationError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400, headers: noStore },
      );
    }

    console.error('schedule upload unexpected error', error);
    return NextResponse.json(
      { error: 'Excelアップロードに失敗しました。時間をおいて再度お試しください。' },
      { status: 500, headers: noStore },
    );
  }
}
