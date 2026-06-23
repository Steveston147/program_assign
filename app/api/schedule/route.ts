import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieName, verifyAuthCookieValue } from '@/lib/auth';
import { loadScheduleWorkbook, readAppDataSheet, readStaffMaster } from '@/lib/excel';
import { uniq } from '@/lib/utils';
export const runtime = 'nodejs';
export async function GET() { try { const cookie=(await cookies()).get(getAuthCookieName())?.value; if(!verifyAuthCookieValue(cookie)) return NextResponse.json({ error:'未認証です' }, { status: 401, headers:{ 'Cache-Control':'no-store' } }); const wb=loadScheduleWorkbook(); const items=readAppDataSheet(wb); let staff=readStaffMaster(wb); if(!staff.length) staff=uniq(items.map(i=>i.staffName)).map((staffName,idx)=>({ staffName, displayOrder: idx+1 })); const body={ items, staff, dates: uniq(items.map(i=>i.date)).sort(), programs: uniq(items.map(i=>i.programName)).sort(), statuses: uniq(items.map(i=>i.status)).sort(), updatedAt: items.map(i=>i.updatedAt).filter(Boolean).sort().at(-1) }; return NextResponse.json(body, { headers:{ 'Cache-Control':'no-store' } }); } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'schedule error' }, { status: 500, headers:{ 'Cache-Control':'no-store' } }); } }
