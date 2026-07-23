import * as XLSX from 'xlsx';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuthCookieName, verifyAdminAuthCookieValue } from '@/lib/auth';
import { ExcelValidationError, readAppDataSheet, readStaffMaster } from '@/lib/excel';
import { buildScheduleResponse } from '@/lib/schedule';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const cookie = (await cookies()).get(getAdminAuthCookieName())?.value;
    if (!verifyAdminAuthCookieValue(cookie)) {
      return NextResponse.json({ error: '管理者認証が必要です。' }, { status: 401, headers: noStore });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Excelファイルを選択してください。' }, { status: 400, headers: noStore });
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: '.xlsx形式のExcelファイルを選択してください。' }, { status: 400, headers: noStore });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'ファイルサイズは5MB以下にしてください。' }, { status: 400, headers: noStore });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { cellDates: true });
    const items = readAppDataSheet(workbook);
    const staff = readStaffMaster(workbook);
    const schedule = buildScheduleResponse(items, staff);

    return NextResponse.json(
      {
        ok: true,
        fileName: file.name,
        itemCount: schedule.items.length,
        staffCount: schedule.staff.length,
        dateFrom: schedule.dates[0] || null,
        dateTo: schedule.dates[schedule.dates.length - 1] || null,
        programCount: schedule.programs.length,
        programs: schedule.programs,
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

    console.error('schedule preview unexpected error', error);
    return NextResponse.json(
      { error: 'Excelの内容確認に失敗しました。時間をおいて再度お試しください。' },
      { status: 500, headers: noStore },
    );
  }
}
