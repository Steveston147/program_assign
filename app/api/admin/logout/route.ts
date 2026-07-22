import { NextResponse } from 'next/server';
import { clearAdminAuthCookie } from '@/lib/auth';

export async function POST() {
  await clearAdminAuthCookie();
  return NextResponse.json({ ok: true });
}
