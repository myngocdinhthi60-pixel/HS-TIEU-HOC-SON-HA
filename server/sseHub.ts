import type { Response } from 'express';
import { isArenaVisibleToStudent, sanitizeArenaRoomForStudent } from '../src/shared/arenaLogic';
import { getHoChiMinhWeekKey } from '../src/shared/grading';
import { getLeaderboardSnapshot, loadStore, verifyActiveDeviceSession } from './store';

interface SseClient {
  id: string;
  uid: string;
  role: string;
  sessionId: string;
  rawDeviceToken: string;
  classId: string;
  channel: 'leaderboard' | 'teacher_progress' | 'arena';
  res: Response;
  expiresAtMs: number;
}

const clients = new Map<string, SseClient>();

function sendSseEvent(res: Response, eventName: string, data: unknown): void {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function registerSseClient(params: {
  uid: string;
  role: string;
  sessionId: string;
  rawDeviceToken: string;
  classId: string;
  channel: 'leaderboard' | 'teacher_progress' | 'arena';
  expiresAtMs: number;
  res: Response;
}): Promise<string> {
  const id = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const client: SseClient = { id, ...params };
  clients.set(id, client);

  params.res.on('close', () => {
    clients.delete(id);
  });

  // Push immediate snapshot
  await pushSnapshotToClient(client);
  return id;
}

async function isClientStillAuthorized(client: SseClient): Promise<boolean> {
  if (Date.now() > client.expiresAtMs) return false;
  const session = await verifyActiveDeviceSession(client.sessionId, client.uid, client.rawDeviceToken);
  if (!session) return false;
  const db = await loadStore();
  const user = db.users[client.uid];
  if (!user || user.locked) return false;

  if (client.channel === 'arena') {
    return true;
  }
  if (client.channel === 'teacher_progress') {
    if (user.role !== 'teacher' && user.role !== 'admin') return false;
    return Boolean(user.assignedClassIds?.includes(client.classId));
  }
  if (user.role === 'teacher' || user.role === 'admin') {
    return Boolean(user.assignedClassIds?.includes(client.classId));
  }
  return user.classId === client.classId;
}

export async function buildArenaRoomsForUser(uid: string) {
  const db = await loadStore();
  const user = db.users[uid];
  if (!user) return [];
  const allRooms = Object.values(db.arenaRooms ?? {}).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  if (user.role === 'student') {
    return allRooms
      .filter((r) =>
        isArenaVisibleToStudent(
          r,
          user.classId,
          db.users[r.teacherUid]?.assignedClassIds,
        ),
      )
      .map(sanitizeArenaRoomForStudent);
  }
  if (user.role === 'admin') {
    return allRooms;
  }
  return allRooms.filter((r) => r.teacherUid === user.uid);
}

async function pushSnapshotToClient(client: SseClient): Promise<void> {
  const ok = await isClientStillAuthorized(client);
  if (!ok) {
    try {
      sendSseEvent(client.res, 'session_revoked', { reason: 'Phiên đăng nhập đã hết hạn hoặc bị thu hồi.' });
      client.res.end();
    } catch {
      // ignore closed socket
    }
    clients.delete(client.id);
    return;
  }

  if (client.channel === 'arena') {
    const rooms = await buildArenaRoomsForUser(client.uid);
    sendSseEvent(client.res, 'arena_snapshot', {
      rooms,
      serverNow: new Date().toISOString(),
    });
  } else if (client.channel === 'leaderboard') {
    const snap = await getLeaderboardSnapshot(client.classId, getHoChiMinhWeekKey(), client.uid);
    sendSseEvent(client.res, 'leaderboard_snapshot', snap);
  } else {
    const payload = await buildTeacherProgressPayload(client.classId);
    sendSseEvent(client.res, 'progress_snapshot', payload);
  }
}

export async function buildTeacherProgressPayload(classId: string) {
  const db = await loadStore();
  const students = Object.values(db.users)
    .filter((u) => u.role === 'student' && u.classId === classId)
    .sort((a, b) => (a.studentCode ?? '').localeCompare(b.studentCode ?? ''));

  const progressList = Object.values(db.progress).filter((p) => p.classId === classId);
  const attemptsList = Object.values(db.attempts)
    .filter((a) => a.classId === classId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    classId,
    updatedAt: new Date().toISOString(),
    students: students.map((s) => ({
      uid: s.uid,
      studentCode: s.studentCode,
      fullName: s.fullName,
      nickname: s.nickname,
      totalXp: s.totalXp,
      locked: s.locked,
    })),
    progress: progressList,
    recentAttempts: attemptsList.slice(0, 30).map((a) => ({
      id: a.id,
      uid: a.uid,
      lessonId: a.lessonId,
      status: a.status,
      practicePassed: a.practicePassed,
      minigamePassed: a.minigamePassed,
      quizScorePercent: a.quizScorePercent,
      xpAwardedTotal: a.xpAwardedTotal,
      updatedAt: a.updatedAt,
    })),
  };
}

export async function broadcastClassUpdate(classId: string): Promise<void> {
  const targets = Array.from(clients.values()).filter(
    (c) => c.channel !== 'arena' && c.classId === classId,
  );
  await Promise.all(targets.map((c) => pushSnapshotToClient(c)));
}

export async function broadcastArenaUpdate(): Promise<void> {
  const targets = Array.from(clients.values()).filter((c) => c.channel === 'arena');
  await Promise.all(targets.map((c) => pushSnapshotToClient(c)));
}

export async function disconnectUserSseStreams(uid: string): Promise<void> {
  const targets = Array.from(clients.values()).filter((c) => c.uid === uid);
  for (const client of targets) {
    try {
      sendSseEvent(client.res, 'session_revoked', { reason: 'Tài khoản đã đăng xuất hoặc thay đổi bảo mật.' });
      client.res.end();
    } catch {
      // ignore
    }
    clients.delete(client.id);
  }
}

// 15s heartbeat that also enforces session revocation & expiry
setInterval(() => {
  void (async () => {
    for (const client of Array.from(clients.values())) {
      const ok = await isClientStillAuthorized(client);
      if (!ok) {
        try {
          sendSseEvent(client.res, 'session_revoked', { reason: 'Phiên đăng nhập đã hết hạn hoặc bị thu hồi.' });
          client.res.end();
        } catch {
          // ignore
        }
        clients.delete(client.id);
      } else {
        try {
          client.res.write(': heartbeat\n\n');
        } catch {
          clients.delete(client.id);
        }
      }
    }
  })();
}, 15_000).unref();
