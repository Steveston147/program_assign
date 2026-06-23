import crypto from 'crypto';
import { cookies } from 'next/headers';
const MAX_AGE_SECONDS = 60 * 60 * 12;
function requireSecret() { const s=process.env.AUTH_COOKIE_SECRET; if(!s) throw new Error('AUTH_COOKIE_SECRET is not set'); return s; }
export function verifyPassword(password: string): boolean { const app=process.env.APP_PASSWORD; if(!app) throw new Error('APP_PASSWORD is not set'); const a=crypto.createHash('sha256').update(password).digest(); const b=crypto.createHash('sha256').update(app).digest(); return crypto.timingSafeEqual(a,b); }
export function getAuthCookieName(): string { return process.env.AUTH_COOKIE_NAME || 'staff_schedule_auth'; }
export function createAuthCookieValue(): string { const exp=Date.now()+MAX_AGE_SECONDS*1000; const payload=`staff:${exp}`; const sig=crypto.createHmac('sha256', requireSecret()).update(payload).digest('hex'); return `${payload}.${sig}`; }
export function verifyAuthCookieValue(value?: string): boolean { if(!value) return false; const idx=value.lastIndexOf('.'); if(idx<0) return false; const payload=value.slice(0,idx); const sig=value.slice(idx+1); const expected=crypto.createHmac('sha256', requireSecret()).update(payload).digest('hex'); const [, exp]=payload.split(':'); if (sig.length !== expected.length) return false; return Number(exp)>Date.now() && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
export async function clearAuthCookie(): Promise<void> { (await cookies()).delete(getAuthCookieName()); }
export const authCookieOptions = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production', maxAge: MAX_AGE_SECONDS };
