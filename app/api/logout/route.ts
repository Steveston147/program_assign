import { NextResponse } from 'next/server';
import { getAdminAuthCookieName, getAuthCookieName } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAuthCookieName(), '', { path: '/', maxAge: 0 });
  response.cookies.set(getAdminAuthCookieName(), '', { path: '/', maxAge: 0 });
  return response;
}
