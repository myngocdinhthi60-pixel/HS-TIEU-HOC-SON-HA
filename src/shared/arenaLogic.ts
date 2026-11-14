import type { ArenaParticipant, ArenaRoom } from './types';

export const DEFAULT_ARENA_WAITING_SEC = 300; // 5 phút đếm ngược phòng chờ
export const DEFAULT_ARENA_COUNTDOWN_SEC = 3; // 3 giây đếm ngược đồng bộ 3-2-1
export const DEFAULT_ARENA_MAX_PARTICIPANTS = 30;

export interface ArenaCountdownInfo {
  remainingSec: number;
  formattedMMSS: string;
  isExpired: boolean;
  progressPercent: number;
}

export interface ArenaStartCountdownInfo {
  phase: 'waiting' | 'countdown' | 'active' | 'closed';
  countNumber: 3 | 2 | 1 | 0;
  remainingMs: number;
}

export function computeArenaCountdown(
  waitingEndsAtIso: string,
  nowMs: number = Date.now(),
  totalSec: number = DEFAULT_ARENA_WAITING_SEC,
): ArenaCountdownInfo {
  const endMs = new Date(waitingEndsAtIso).getTime();
  if (Number.isNaN(endMs)) {
    return { remainingSec: 0, formattedMMSS: '00:00', isExpired: true, progressPercent: 100 };
  }
  const diffMs = Math.max(0, endMs - nowMs);
  const remainingSec = Math.ceil(diffMs / 1000);
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const formattedMMSS = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const safeTotal = Math.max(1, totalSec);
  const elapsed = Math.max(0, safeTotal - remainingSec);
  const progressPercent = Math.min(100, Math.round((elapsed / safeTotal) * 100));

  return {
    remainingSec,
    formattedMMSS,
    isExpired: remainingSec === 0,
    progressPercent,
  };
}

export function computeArenaStartCountdown(
  room: Pick<ArenaRoom, 'status' | 'countdownEndsAt' | 'countdownSec'>,
  nowMs: number = Date.now(),
): ArenaStartCountdownInfo {
  if (room.status === 'closed') {
    return { phase: 'closed', countNumber: 0, remainingMs: 0 };
  }
  if (room.status === 'waiting') {
    return { phase: 'waiting', countNumber: 0, remainingMs: 0 };
  }
  if (!room.countdownEndsAt) {
    return { phase: 'active', countNumber: 0, remainingMs: 0 };
  }
  const endMs = new Date(room.countdownEndsAt).getTime();
  if (Number.isNaN(endMs)) {
    return { phase: 'active', countNumber: 0, remainingMs: 0 };
  }
  const remainingMs = Math.max(0, endMs - nowMs);
  if (remainingMs <= 0) {
    return { phase: 'active', countNumber: 0, remainingMs: 0 };
  }
  const maxStep = Math.max(1, Math.min(3, room.countdownSec || DEFAULT_ARENA_COUNTDOWN_SEC));
  const rawStep = Math.ceil(remainingMs / 1000);
  const countNumber = Math.min(maxStep, Math.max(1, rawStep)) as 3 | 2 | 1;
  return {
    phase: 'countdown',
    countNumber,
    remainingMs,
  };
}

export function normalizeRoomCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function matchesArenaRoomCode(roomCode: string, inputCode: string): boolean {
  const target = normalizeRoomCodeInput(roomCode);
  const query = normalizeRoomCodeInput(inputCode);
  if (!query) return false;
  if (target === query) return true;
  const targetDigits = target.replace(/^DT-?/, '');
  const queryDigits = query.replace(/^DT-?/, '');
  return targetDigits.length > 0 && targetDigits === queryDigits;
}

export function generateNumericRoomCode(existingCodes: Iterable<string>): string {
  const taken = new Set(Array.from(existingCodes).map((c) => normalizeRoomCodeInput(c).replace(/^DT-?/, '')));
  for (let i = 0; i < 40; i++) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000));
    if (!taken.has(candidate)) return candidate;
  }
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function isArenaVisibleToStudent(
  room: ArenaRoom,
  studentClassId: string | undefined,
  teacherAssignedClassIds?: string[],
): boolean {
  if (room.status === 'closed') return false;
  if (!studentClassId) return false;
  if (room.scope === 'class') {
    return room.classId === studentClassId;
  }
  if (teacherAssignedClassIds && teacherAssignedClassIds.length > 0) {
    return teacherAssignedClassIds.includes(studentClassId);
  }
  return true;
}

export function isArenaRoomFull(room: Pick<ArenaRoom, 'participants' | 'maxParticipants'>, candidateUid?: string): boolean {
  if (candidateUid && room.participants.some((p) => p.uid === candidateUid)) {
    return false;
  }
  const limit = room.maxParticipants > 0 ? room.maxParticipants : DEFAULT_ARENA_MAX_PARTICIPANTS;
  return room.participants.length >= limit;
}

export function countReadyParticipants(participants: ArenaParticipant[]): number {
  return participants.filter((p) => Boolean(p.ready)).length;
}

export function upsertArenaParticipant(
  participants: ArenaParticipant[],
  incoming: Omit<ArenaParticipant, 'ready' | 'readyAt'> & Partial<Pick<ArenaParticipant, 'ready' | 'readyAt'>>,
): ArenaParticipant[] {
  const idx = participants.findIndex((p) => p.uid === incoming.uid);
  if (idx === -1) {
    return [
      ...participants,
      {
        ...incoming,
        ready: incoming.ready ?? false,
        readyAt: incoming.readyAt ?? null,
      },
    ];
  }
  const copy = [...participants];
  copy[idx] = {
    ...copy[idx],
    nickname: incoming.nickname,
    avatarId: incoming.avatarId,
  };
  return copy;
}

export function setArenaParticipantReady(
  participants: ArenaParticipant[],
  uid: string,
  ready: boolean,
  nowIso: string,
): ArenaParticipant[] {
  return participants.map((p) =>
    p.uid === uid
      ? {
          ...p,
          ready,
          readyAt: ready ? nowIso : null,
        }
      : p,
  );
}

export function submitArenaParticipantResult(
  participants: ArenaParticipant[],
  uid: string,
  score: number,
  total: number,
  nowIso: string,
): ArenaParticipant[] {
  return participants.map((p) =>
    p.uid === uid
      ? {
          ...p,
          submittedScore: score,
          submittedTotal: total,
          submittedAt: nowIso,
        }
      : p,
  );
}

export function removeArenaParticipant(
  participants: ArenaParticipant[],
  uid: string,
): ArenaParticipant[] {
  return participants.filter((p) => p.uid !== uid);
}

export function normalizeArenaRoomDefaults(room: ArenaRoom): ArenaRoom {
  const mode = room.mode === 'game' ? 'game' : 'quiz';
  const itemCount =
    typeof room.itemCount === 'number' && room.itemCount > 0
      ? room.itemCount
      : mode === 'game'
        ? 5
        : 10;
  const maxParticipants =
    typeof room.maxParticipants === 'number' && room.maxParticipants > 0
      ? room.maxParticipants
      : DEFAULT_ARENA_MAX_PARTICIPANTS;
  const countdownSec =
    typeof room.countdownSec === 'number' && room.countdownSec > 0
      ? room.countdownSec
      : DEFAULT_ARENA_COUNTDOWN_SEC;

  return {
    ...room,
    mode,
    itemCount,
    maxParticipants,
    countdownSec,
    countdownEndsAt: room.countdownEndsAt ?? null,
    participants: (room.participants ?? []).map((p) => ({
      ...p,
      ready: Boolean(p.ready),
      readyAt: p.readyAt ?? null,
    })),
  };
}

/**
 * Hides fullName on student view (only shows nickname & avatarId) to keep classroom privacy.
 */
export function sanitizeArenaRoomForStudent(room: ArenaRoom): ArenaRoom {
  const normalized = normalizeArenaRoomDefaults(room);
  return {
    ...normalized,
    participants: normalized.participants.map((p) => ({
      ...p,
      fullName: p.nickname,
    })),
  };
}
