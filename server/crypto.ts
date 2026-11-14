import crypto from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-local-session-secret-change-in-production';
const PIN_PEPPER = process.env.PIN_PEPPER || 'dev-local-pin-pepper-change-in-production';

export function getPinPepperFingerprint(): string {
  return crypto.createHash('sha256').update(`pepper-fp:${PIN_PEPPER}`).digest('hex').slice(0, 16);
}

export async function hashPinArgon2id(pin: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const peppered = `${pin}:${PIN_PEPPER}`;
  return argon2id({
    password: peppered,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 8192,
    hashLength: 32,
    outputType: 'encoded',
  });
}

export async function verifyPinArgon2id(pin: string, encodedHash: string): Promise<boolean> {
  if (!pin || !encodedHash) return false;
  const peppered = `${pin}:${PIN_PEPPER}`;
  try {
    return await argon2Verify({
      password: peppered,
      hash: encodedHash,
    });
  } catch {
    return false;
  }
}

export function generateSecurePin6(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashDeviceToken(rawToken: string): string {
  return crypto.createHash('sha256').update(`${rawToken}:${SESSION_SECRET}`).digest('hex');
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export interface SignedSessionPayload {
  uid: string;
  role: string;
  sessionId: string;
  exp: number;
}

export function signLocalSessionCookie(payload: SignedSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyLocalSessionCookie(cookieValue: string): SignedSessionPayload | null {
  if (!cookieValue || !cookieValue.includes('.')) return null;
  const [data, sig] = cookieValue.split('.');
  if (!data || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SignedSessionPayload;
    if (!parsed.uid || !parsed.sessionId || typeof parsed.exp !== 'number') return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface RateBucket {
  failures: number;
  windowStart: number;
  blockedUntil: number;
}

const accountBuckets = new Map<string, RateBucket>();
const ipBuckets = new Map<string, RateBucket>();

export function checkLoginRateLimit(accountKey: string, ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const acc = accountBuckets.get(accountKey);
  if (acc && acc.blockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((acc.blockedUntil - now) / 1000) };
  }
  const ipb = ipBuckets.get(ip);
  if (ipb && ipb.blockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((ipb.blockedUntil - now) / 1000) };
  }
  return { allowed: true };
}

export function recordLoginFailure(accountKey: string, ip: string): void {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;

  const acc = accountBuckets.get(accountKey) ?? { failures: 0, windowStart: now, blockedUntil: 0 };
  if (now - acc.windowStart > windowMs) {
    acc.failures = 0;
    acc.windowStart = now;
  }
  acc.failures += 1;
  if (acc.failures >= 5) {
    acc.blockedUntil = now + 45 * 1000;
  }
  accountBuckets.set(accountKey, acc);

  // Higher IP threshold so a shared computer lab behind one IP isn't blocked by one student's typos
  const ipb = ipBuckets.get(ip) ?? { failures: 0, windowStart: now, blockedUntil: 0 };
  if (now - ipb.windowStart > windowMs) {
    ipb.failures = 0;
    ipb.windowStart = now;
  }
  ipb.failures += 1;
  if (ipb.failures >= 30) {
    ipb.blockedUntil = now + 60 * 1000;
  }
  ipBuckets.set(ip, ipb);
}

export function clearLoginFailure(accountKey: string): void {
  accountBuckets.delete(accountKey);
}
