import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeArenaCountdown,
  computeArenaStartCountdown,
  countReadyParticipants,
  DEFAULT_ARENA_COUNTDOWN_SEC,
  DEFAULT_ARENA_MAX_PARTICIPANTS,
  DEFAULT_ARENA_WAITING_SEC,
  isArenaRoomFull,
  isArenaVisibleToStudent,
  matchesArenaRoomCode,
  removeArenaParticipant,
  sanitizeArenaRoomForStudent,
  setArenaParticipantReady,
  upsertArenaParticipant,
} from './arenaLogic';
import type { ArenaParticipant, ArenaRoom } from './types';

function makeRoom(overrides: Partial<ArenaRoom> = {}): ArenaRoom {
  const created = new Date('2026-11-12T10:00:00Z');
  const ends = new Date(created.getTime() + DEFAULT_ARENA_WAITING_SEC * 1000);
  return {
    id: 'arena-1',
    roomCode: '4826',
    title: 'Đấu trường Bài 5',
    lessonId: 'L4-B5',
    lessonTitle: 'Thao tác với tệp và thư mục',
    classId: 'class-4a2',
    classCode: '4A2',
    scope: 'class',
    mode: 'quiz',
    itemCount: 10,
    maxParticipants: DEFAULT_ARENA_MAX_PARTICIPANTS,
    teacherUid: 'teacher-main',
    teacherName: 'Cô Lan Hương',
    status: 'waiting',
    waitingDurationSec: DEFAULT_ARENA_WAITING_SEC,
    countdownSec: DEFAULT_ARENA_COUNTDOWN_SEC,
    createdAt: created.toISOString(),
    waitingEndsAt: ends.toISOString(),
    countdownEndsAt: null,
    startedAt: null,
    closedAt: null,
    participants: [],
    ...overrides,
  };
}

test('computeArenaCountdown formats 5-minute waiting timer accurately and clamps at 00:00', () => {
  const createdMs = new Date('2026-11-12T10:00:00Z').getTime();
  const endsIso = new Date(createdMs + 300_000).toISOString();

  const atStart = computeArenaCountdown(endsIso, createdMs);
  assert.equal(atStart.remainingSec, 300);
  assert.equal(atStart.formattedMMSS, '05:00');
  assert.equal(atStart.isExpired, false);

  const after65s = computeArenaCountdown(endsIso, createdMs + 65_000);
  assert.equal(after65s.remainingSec, 235);
  assert.equal(after65s.formattedMMSS, '03:55');

  const after5m = computeArenaCountdown(endsIso, createdMs + 320_000);
  assert.equal(after5m.remainingSec, 0);
  assert.equal(after5m.formattedMMSS, '00:00');
  assert.equal(after5m.isExpired, true);
  assert.equal(after5m.progressPercent, 100);
});

test('computeArenaStartCountdown handles 3-2-1 synchronized countdown and transitions cleanly', () => {
  const startMs = new Date('2026-11-12T10:05:00Z').getTime();
  const countdownEndsAt = new Date(startMs + 3000).toISOString();

  assert.deepEqual(
    computeArenaStartCountdown(makeRoom({ status: 'waiting' }), startMs),
    { phase: 'waiting', countNumber: 0, remainingMs: 0 },
  );

  const startedRoom = makeRoom({ status: 'started', countdownEndsAt });
  assert.equal(computeArenaStartCountdown(startedRoom, startMs + 100).countNumber, 3);
  assert.equal(computeArenaStartCountdown(startedRoom, startMs + 1200).countNumber, 2);
  assert.equal(computeArenaStartCountdown(startedRoom, startMs + 2500).countNumber, 1);

  const finished = computeArenaStartCountdown(startedRoom, startMs + 3000);
  assert.equal(finished.phase, 'active');
  assert.equal(finished.countNumber, 0);
});

test('matchesArenaRoomCode handles 4-digit numeric codes and DT- prefixed codes', () => {
  assert.equal(matchesArenaRoomCode('4826', '4826'), true);
  assert.equal(matchesArenaRoomCode('4826', ' 4826 '), true);
  assert.equal(matchesArenaRoomCode('DT-4826', '4826'), true);
  assert.equal(matchesArenaRoomCode('4826', 'dt-4826'), true);
  assert.equal(matchesArenaRoomCode('4826', '9999'), false);
});

test('isArenaVisibleToStudent enforces class scope, shared scope, and closed status', () => {
  const classRoom = makeRoom({ classId: 'class-4a2', scope: 'class' });
  assert.equal(isArenaVisibleToStudent(classRoom, 'class-4a2'), true);
  assert.equal(isArenaVisibleToStudent(classRoom, 'class-3a1'), false);

  const sharedRoom = makeRoom({ classId: 'all', scope: 'shared' });
  assert.equal(isArenaVisibleToStudent(sharedRoom, 'class-3a1', ['class-3a1', 'class-4a2']), true);
  assert.equal(isArenaVisibleToStudent(sharedRoom, 'class-3b2', ['class-3a1', 'class-4a2']), false);

  const closedRoom = makeRoom({ status: 'closed' });
  assert.equal(isArenaVisibleToStudent(closedRoom, 'class-4a2'), false);
});

test('participant ready toggles, room capacity check, idempotent upsert, and privacy sanitization', () => {
  const p1: ArenaParticipant = {
    uid: 'stu-4a2-02',
    studentCode: 'HS002',
    fullName: 'Lê Đăng Khoa',
    nickname: 'Cáo Thông Thái',
    avatarId: 'fox',
    classId: 'class-4a2',
    classCode: '4A2',
    joinedAt: '2026-11-12T10:00:10Z',
    ready: false,
    readyAt: null,
  };

  let list = upsertArenaParticipant([], p1);
  list = setArenaParticipantReady(list, 'stu-4a2-02', true, '2026-11-12T10:00:15Z');
  list = upsertArenaParticipant(list, p1);
  assert.equal(list.length, 1);
  assert.equal(list[0].ready, true);
  assert.equal(countReadyParticipants(list), 1);

  const fullRoom = makeRoom({ maxParticipants: 1, participants: list });
  assert.equal(isArenaRoomFull(fullRoom, 'stu-4a2-02'), false);
  assert.equal(isArenaRoomFull(fullRoom, 'stu-4a2-03'), true);

  const sanitized = sanitizeArenaRoomForStudent(fullRoom);
  assert.equal(sanitized.participants[0].fullName, 'Cáo Thông Thái');
  assert.equal(sanitized.participants[0].nickname, 'Cáo Thông Thái');

  const removed = removeArenaParticipant(list, 'stu-4a2-02');
  assert.equal(removed.length, 0);
});
