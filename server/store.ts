import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { normalizeArenaRoomDefaults } from '../src/shared/arenaLogic';
import { COMMON_LESSONS, CURRICULUM_51 } from '../src/shared/curriculum51';
import { getHoChiMinhWeekKey, makeAwardId, rankLeaderboardEntries, XP_VALUES } from '../src/shared/grading';
import { SAMPLE_LESSONS } from '../src/shared/lessonContent';
import type { AwardType, LeaderboardEntry, LeaderboardOutboxEvent } from '../src/shared/types';
import { generateDeviceToken, getPinPepperFingerprint, hashDeviceToken, hashPinArgon2id, verifyPinArgon2id } from './crypto';
import { createSeedDatabase, DEMO_STUDENTS_SEED, type DeviceSessionRecord, type StoreDatabase } from './seedData';

const DATA_DIR = path.resolve(process.cwd(), '.local-emulator-data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

export interface FirebaseBridge {
  mode: 'firebase' | 'local-emulator-fallback';
  auth?: ReturnType<typeof getAuth>;
  firestore?: ReturnType<typeof getFirestore>;
  rtdb?: ReturnType<typeof getDatabase>;
}

let bridge: FirebaseBridge = { mode: 'local-emulator-fallback' };

export function initFirebaseBridge(): FirebaseBridge {
  const hasEmulator =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
  const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  if (!hasEmulator && !hasServiceAccount) {
    bridge = { mode: 'local-emulator-fallback' };
    return bridge;
  }

  try {
    if (getApps().length === 0) {
      if (hasServiceAccount) {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
        initializeApp({
          credential: cert(sa),
          projectId: process.env.FIREBASE_PROJECT_ID || sa.project_id,
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
      } else {
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'phong-thuc-hanh-tin-hoc-dev',
          databaseURL:
            process.env.FIREBASE_DATABASE_URL ||
            'http://127.0.0.1:9000/?ns=phong-thuc-hanh-tin-hoc-dev-default-rtdb',
        });
      }
    }
    bridge = {
      mode: 'firebase',
      auth: process.env.FIREBASE_AUTH_EMULATOR_HOST || hasServiceAccount ? getAuth() : undefined,
      firestore: process.env.FIRESTORE_EMULATOR_HOST || hasServiceAccount ? getFirestore() : undefined,
      rtdb: process.env.FIREBASE_DATABASE_EMULATOR_HOST || (hasServiceAccount && process.env.FIREBASE_DATABASE_URL) ? getDatabase() : undefined,
    };
  } catch (err) {
    console.warn('[Store] Firebase Admin init failed, using local emulator fallback:', err);
    bridge = { mode: 'local-emulator-fallback' };
  }
  return bridge;
}

export function getFirebaseBridge(): FirebaseBridge {
  return bridge;
}

let dbCache: StoreDatabase | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let mutationMutex: Promise<unknown> = Promise.resolve();

export async function loadStore(): Promise<StoreDatabase> {
  if (dbCache) return dbCache;
  initFirebaseBridge();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    dbCache = JSON.parse(raw) as StoreDatabase;
    let updated = false;

    if (!dbCache.arenaRooms) {
      dbCache.arenaRooms = {};
      updated = true;
    } else {
      for (const [roomId, room] of Object.entries(dbCache.arenaRooms)) {
        const normalized = normalizeArenaRoomDefaults(room);
        if (JSON.stringify(normalized) !== JSON.stringify(room)) {
          dbCache.arenaRooms[roomId] = normalized;
          updated = true;
        }
      }
    }

    for (const item of [...CURRICULUM_51, ...COMMON_LESSONS]) {
      const existing = dbCache.lessons?.[item.id];
      if (!existing) {
        dbCache.lessons[item.id] = { ...item };
        updated = true;
      } else if (item.sourceStatus === 'complete' && !existing.practiceKind) {
        dbCache.lessons[item.id] = {
          ...item,
        };
        updated = true;
      }
    }

    for (const [lessonId, bundle] of Object.entries(SAMPLE_LESSONS)) {
      if (!dbCache.questionKeys[lessonId] || dbCache.questionKeys[lessonId].length === 0) {
        dbCache.questionKeys[lessonId] = bundle.questions.map((q) => ({ ...q }));
        updated = true;
      }
    }

    const currentPepperFp = getPinPepperFingerprint();
    if (dbCache.seedPepperFingerprint !== currentPepperFp) {
      for (const s of DEMO_STUDENTS_SEED) {
        const cred = dbCache.studentCredentials?.[s.uid];
        if (!cred) continue;
        // Only re-hash untouched seed credentials (never overwrite teacher-reset PINs)
        const isUntouchedSeed = !dbCache.seedTimestamp || cred.updatedAt === dbCache.seedTimestamp;
        if (isUntouchedSeed && !(await verifyPinArgon2id(s.pin, cred.pinHash))) {
          cred.pinHash = await hashPinArgon2id(s.pin);
          updated = true;
        }
      }
      dbCache.seedPepperFingerprint = currentPepperFp;
      updated = true;
    }

    if (updated) {
      await persistStore();
    }
    return dbCache;
  } catch {
    dbCache = await createSeedDatabase();
    await persistStore();
    return dbCache;
  }
}

export async function resetStoreWithSeed(): Promise<StoreDatabase> {
  dbCache = await createSeedDatabase();
  await persistStore();
  return dbCache;
}

export async function persistStore(): Promise<void> {
  if (!dbCache) return;
  const snapshot = JSON.stringify(dbCache, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmp, snapshot, 'utf8');
    await fs.rename(tmp, DATA_FILE);
  });
  await writeQueue;
}

/**
 * Serializes mutating store transactions cleanly.
 */
export async function runStoreTransaction<T>(fn: (db: StoreDatabase) => Promise<T> | T): Promise<T> {
  const prev = mutationMutex;
  let release!: () => void;
  mutationMutex = new Promise<void>((res) => {
    release = res;
  });
  await prev;
  try {
    const db = await loadStore();
    const result = await fn(db);
    await persistStore();
    return result;
  } finally {
    release();
  }
}

export async function createDeviceSession(
  uid: string,
  deviceType: 'shared' | 'personal' | 'teacher',
): Promise<{ session: DeviceSessionRecord; rawToken: string }> {
  const rawToken = generateDeviceToken();
  const tokenHash = hashDeviceToken(rawToken);
  const ttlMs =
    deviceType === 'teacher'
      ? 8 * 60 * 60 * 1000
      : deviceType === 'personal'
        ? 7 * 24 * 60 * 60 * 1000
        : 2 * 60 * 60 * 1000;
  const now = new Date();
  const session: DeviceSessionRecord = {
    id: `ds-${crypto.randomUUID()}`,
    uid,
    tokenHash,
    deviceType,
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    revoked: false,
    createdAt: now.toISOString(),
  };

  await runStoreTransaction((db) => {
    db.deviceSessions[session.id] = session;
  });

  return { session, rawToken };
}

export async function verifyActiveDeviceSession(
  sessionId: string,
  uid: string,
  rawDeviceToken: string,
): Promise<DeviceSessionRecord | null> {
  if (!sessionId || !uid || !rawDeviceToken) return null;
  const db = await loadStore();
  const session = db.deviceSessions[sessionId];
  if (!session) return null;
  if (session.revoked || session.uid !== uid) return null;
  if (Date.now() > new Date(session.expiresAt).getTime()) return null;
  const candidateHash = hashDeviceToken(rawDeviceToken);
  const a = Buffer.from(candidateHash);
  const b = Buffer.from(session.tokenHash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const user = db.users[uid];
  if (!user || user.locked) return null;
  return session;
}

export async function revokeDeviceSession(sessionId: string): Promise<void> {
  await runStoreTransaction((db) => {
    if (db.deviceSessions[sessionId]) {
      db.deviceSessions[sessionId].revoked = true;
    }
  });
}

export async function revokeAllUserSessions(uid: string): Promise<void> {
  await runStoreTransaction((db) => {
    for (const s of Object.values(db.deviceSessions)) {
      if (s.uid === uid) {
        s.revoked = true;
      }
    }
  });
  if (bridge.mode === 'firebase' && bridge.auth) {
    try {
      await bridge.auth.revokeRefreshTokens(uid);
    } catch {
      // User may not exist in Firebase Auth emulator if seeded locally
    }
  }
}

/**
 * Atomic transaction-protected XP awarding + weekly score + RTDB outbox write.
 * Idempotent by stable awardId so duplicate submissions or retries never double-award XP!
 */
export async function awardXpIdempotent(params: {
  uid: string;
  classId: string;
  lessonId: string;
  awardType: AwardType;
  badgeId?: string;
}): Promise<{ awardedXp: number; alreadyAwarded: boolean; totalXp: number; weekKey: string }> {
  const { uid, classId, lessonId, awardType, badgeId } = params;
  const awardId = makeAwardId(uid, lessonId, awardType);
  const xpAmount = XP_VALUES[awardType];
  const weekKey = getHoChiMinhWeekKey();
  const now = new Date().toISOString();

  const txResult = await runStoreTransaction((db) => {
    const user = db.users[uid];
    if (!user) throw new Error('Không tìm thấy tài khoản học sinh.');

    if (db.xpLedger[awardId]) {
      return {
        awardedXp: 0,
        alreadyAwarded: true,
        totalXp: user.totalXp,
        weekKey,
        outboxEvent: null as LeaderboardOutboxEvent | null,
      };
    }

    db.xpLedger[awardId] = {
      awardId,
      uid,
      classId,
      lessonId,
      awardType,
      xp: xpAmount,
      weekKey,
      createdAt: now,
    };

    user.totalXp += xpAmount;
    if (badgeId && !user.unlockedBadges.includes(badgeId)) {
      user.unlockedBadges.push(badgeId);
    }
    user.updatedAt = now;

    const weeklyId = `${classId}_${weekKey}_${uid}`;
    const existingWeekly = db.weeklyScores[weeklyId];
    db.outboxCounter = (db.outboxCounter || 0) + 1;
    const nextSyncVersion = Math.max((existingWeekly?.syncVersion ?? 0) + 1, db.outboxCounter);
    const nextWeeklyXp = (existingWeekly?.weeklyXp ?? 0) + xpAmount;

    db.weeklyScores[weeklyId] = {
      id: weeklyId,
      classId,
      weekKey,
      uid,
      weeklyXp: nextWeeklyXp,
      syncVersion: nextSyncVersion,
      updatedAt: now,
    };

    const outboxEvent: LeaderboardOutboxEvent = {
      id: `evt-${db.outboxCounter}-${crypto.randomUUID().slice(0, 6)}`,
      classId,
      weekKey,
      uid,
      nickname: user.nickname,
      avatarId: user.avatarId,
      weeklyXp: nextWeeklyXp,
      syncVersion: nextSyncVersion,
      synced: false,
      attempts: 0,
      createdAt: now,
    };
    db.leaderboardOutbox[outboxEvent.id] = outboxEvent;

    return {
      awardedXp: xpAmount,
      alreadyAwarded: false,
      totalXp: user.totalXp,
      weekKey,
      outboxEvent,
    };
  });

  if (txResult.outboxEvent) {
    await processOutboxEvents([txResult.outboxEvent.id]);
  }

  return {
    awardedXp: txResult.awardedXp,
    alreadyAwarded: txResult.alreadyAwarded,
    totalXp: txResult.totalXp,
    weekKey: txResult.weekKey,
  };
}

/**
 * Processes pending outbox events into RTDB projection with strict monotonic syncVersion guard.
 * Older or duplicate events are ignored so displayed scores never regress.
 */
export async function processOutboxEvents(eventIds?: string[]): Promise<{ processed: number; ignoredStale: number }> {
  let processed = 0;
  let ignoredStale = 0;

  await runStoreTransaction((db) => {
    const events = Object.values(db.leaderboardOutbox)
      .filter((e) => !e.synced && (!eventIds || eventIds.includes(e.id)))
      .sort((a, b) => a.syncVersion - b.syncVersion);

    for (const evt of events) {
      evt.attempts += 1;
      db.rtdbLeaderboards[evt.classId] ??= {};
      db.rtdbLeaderboards[evt.classId][evt.weekKey] ??= {};

      const current = db.rtdbLeaderboards[evt.classId][evt.weekKey][evt.uid];
      if (current && current.syncVersion >= evt.syncVersion) {
        ignoredStale++;
        evt.synced = true;
        evt.syncedAt = new Date().toISOString();
        continue;
      }

      db.rtdbLeaderboards[evt.classId][evt.weekKey][evt.uid] = {
        uid: evt.uid,
        nickname: evt.nickname,
        avatarId: evt.avatarId,
        weeklyXp: evt.weeklyXp,
        rank: 0,
        syncVersion: evt.syncVersion,
      };
      evt.synced = true;
      evt.syncedAt = new Date().toISOString();
      processed++;
    }
  });

  // Also push to real Firebase RTDB if Emulator/Prod RTDB is active
  if (bridge.mode === 'firebase' && bridge.rtdb) {
    const db = await loadStore();
    const targetEvents = Object.values(db.leaderboardOutbox).filter((e) => !eventIds || eventIds.includes(e.id));
    for (const evt of targetEvents) {
      try {
        const ref = bridge.rtdb.ref(`leaderboards/${evt.classId}/${evt.weekKey}/${evt.uid}`);
        await ref.transaction((curr: LeaderboardEntry | null) => {
          if (curr && curr.syncVersion >= evt.syncVersion) return curr;
          return {
            uid: evt.uid,
            nickname: evt.nickname,
            avatarId: evt.avatarId,
            weeklyXp: evt.weeklyXp,
            rank: 0,
            syncVersion: evt.syncVersion,
          };
        });
      } catch (err) {
        console.warn('[Store] RTDB transaction error:', err);
      }
    }
  }

  return { processed, ignoredStale };
}

/**
 * Rebuilds/reconciles RTDB projection from authoritative Firestore weeklyScores.
 */
export async function reconcileClassLeaderboard(classId: string, weekKey = getHoChiMinhWeekKey()): Promise<LeaderboardEntry[]> {
  await runStoreTransaction((db) => {
    db.rtdbLeaderboards[classId] ??= {};
    db.rtdbLeaderboards[classId][weekKey] = {};

    for (const ws of Object.values(db.weeklyScores)) {
      if (ws.classId === classId && ws.weekKey === weekKey) {
        const user = db.users[ws.uid];
        if (!user) continue;
        db.rtdbLeaderboards[classId][weekKey][ws.uid] = {
          uid: ws.uid,
          nickname: user.nickname,
          avatarId: user.avatarId,
          weeklyXp: ws.weeklyXp,
          rank: 0,
          syncVersion: ws.syncVersion,
        };
      }
    }
  });

  const snap = await getLeaderboardSnapshot(classId, weekKey);
  return snap.top;
}

export async function getLeaderboardSnapshot(
  classId: string,
  weekKey = getHoChiMinhWeekKey(),
  forUid?: string,
): Promise<{
  enabled: boolean;
  weekKey: string;
  top: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
}> {
  const db = await loadStore();
  const cls = db.classes[classId];
  const enabled = Boolean(cls?.leaderboardEnabled);

  const rawMap = db.rtdbLeaderboards[classId]?.[weekKey] ?? {};
  const rawList = Object.values(rawMap);
  const { top, allRanked } = rankLeaderboardEntries(rawList, 10);

  let myEntry: LeaderboardEntry | null = null;
  if (forUid) {
    myEntry = allRanked.find((e) => e.uid === forUid) ?? null;
    if (!myEntry && db.users[forUid]) {
      myEntry = {
        uid: forUid,
        nickname: db.users[forUid].nickname,
        avatarId: db.users[forUid].avatarId,
        weeklyXp: 0,
        rank: allRanked.length + 1,
        syncVersion: 0,
      };
    }
  }

  return {
    enabled,
    weekKey,
    top: enabled ? top : [],
    myEntry,
  };
}

export async function appendAuditLog(params: {
  actorUid: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
}): Promise<void> {
  await runStoreTransaction((db) => {
    db.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...params,
      createdAt: new Date().toISOString(),
    });
    if (db.auditLogs.length > 300) {
      db.auditLogs = db.auditLogs.slice(0, 300);
    }
  });
}
