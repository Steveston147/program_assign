import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuthCookieName, verifyAdminAuthCookieValue } from '@/lib/auth';
import { listScheduleBackups, restoreScheduleBackup } from '@/lib/blobSchedule';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

async function isAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get(getAdminAuthCookieName())?.value;
  return verifyAdminAuthCookieValue(cookie);
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '管理者認証が必要です。' }, { status: 401, headers: noStore });
  }

  try {
    const backups = await listScheduleBackups();
    return NextResponse.json({ backups }, { headers: noStore });
  } catch (error) {
    console.error('schedule backup list failed', error);
    return NextResponse.json(
      { error: 'バックアップ一覧を読み込めませんでした。時間をおいて再度お試しください。' },
      { status: 500, headers: noStore },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '管理者認証が必要です。' }, { status: 401, headers: noStore });
  }

  try {
    const body = await request.json();
    const pathname = typeof body.pathname === 'string' ? body.pathname : '';
    if (!pathname) {
      return NextResponse.json({ error: '復元するバックアップを指定してください。' }, { status: 400, headers: noStore });
    }

    const restored = await restoreScheduleBackup(pathname);
    return NextResponse.json({ ok: true, restored }, { headers: noStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'バックアップの復元に失敗しました。';
    console.error('schedule backup restore failed', error);
    return NextResponse.json({ error: message }, { status: 500, headers: noStore });
  }
}
