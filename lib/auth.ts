import crypto from 'crypto';
import { cookies } from 'next/headers';

const MAX_AGE_SECONDS = 60 * 60 * 12;

type AuthRole = 'viewer' | 'admin';

function requireSecret(): string {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) throw new Error('AUTH_COOKIE_SECRET is not set');
  return secret;
}

function verifyConfiguredPassword(password: string, environmentName: 'APP_PASSWORD' | 'ADMIN_PASSWORD'): boolean {
  const configured = process.env[environmentName];
  if (!configured) throw new Error(`${environmentName} is not set`);
  const inputHash = crypto.createHash('sha256').update(password).digest();
  const configuredHash = crypto.createHash('sha256').update(configured).digest();
  return crypto.timingSafeEqual(inputHash, configuredHash);
}

export function verifyPassword(password: string): boolean {
  return verifyConfiguredPassword(password, 'APP_PASSWORD');
}

export function verifyAdminPassword(password: string): boolean {
  return verifyConfiguredPassword(password, 'ADMIN_PASSWORD');
}

export function getAuthCookieName(): string {
  return process.env.AUTH_COOKIE_NAME || 'staff_schedule_auth';
}

export function getAdminAuthCookieName(): string {
  return process.env.ADMIN_AUTH_COOKIE_NAME || 'staff_schedule_admin_auth';
}

function createRoleCookieValue(role: AuthRole): string {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${role}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', requireSecret()).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyRoleCookieValue(value: string | undefined, role: AuthRole): boolean {
  if (!value) return false;
  const separator = value.lastIndexOf('.');
  if (separator < 0) return false;

  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = crypto.createHmac('sha256', requireSecret()).update(payload).digest('hex');
  const [cookieRole, expiresAt] = payload.split(':');

  if (cookieRole !== role || signature.length !== expected.length) return false;
  return Number(expiresAt) > Date.now() && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function createAuthCookieValue(): string {
  return createRoleCookieValue('viewer');
}

export function createAdminAuthCookieValue(): string {
  return createRoleCookieValue('admin');
}

export function verifyAuthCookieValue(value?: string): boolean {
  return verifyRoleCookieValue(value, 'viewer');
}

export function verifyAdminAuthCookieValue(value?: string): boolean {
  return verifyRoleCookieValue(value, 'admin');
}

export async function clearAdminAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getAdminAuthCookieName());
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getAuthCookieName());
  cookieStore.delete(getAdminAuthCookieName());
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: MAX_AGE_SECONDS,
};
