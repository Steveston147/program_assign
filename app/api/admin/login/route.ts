import { NextResponse } from 'next/server';
import {
  authCookieOptions,
  createAdminAuthCookieValue,
  getAdminAuthCookieName,
  verifyAdminPassword,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!verifyAdminPassword(String(password || ''))) {
      return NextResponse.json({ error: '管理者パスワードが違います' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(getAdminAuthCookieName(), createAdminAuthCookieValue(), authCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'admin login error' },
      { status: 500 },
    );
  }
}
