import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuthCookieName, verifyAdminAuthCookieValue } from '@/lib/auth';

export async function GET() {
  const cookie = (await cookies()).get(getAdminAuthCookieName())?.value;
  return NextResponse.json(
    { isAdmin: verifyAdminAuthCookieValue(cookie) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
