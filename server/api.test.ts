import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as XLSX from 'xlsx';
import { createExpressApp } from './app';
import { getHoChiMinhWeekKey } from '../src/shared/grading';
import { getInitialL4B5PracticeFs } from '../src/shared/virtualFs';
import { processOutboxEvents, reconcileClassLeaderboard, resetStoreWithSeed, runStoreTransaction } from './store';

class CookieJar {
  private cookies = new Map<string, string>();

  updateFromHeaders(headers: Headers) {
    const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) {
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        if (value === '' || raw.includes('Max-Age=0')) {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, value);
        }
      }
    }
  }

  toHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

async function apiFetch(baseUrl: string, jar: CookieJar, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const cookieHeader = jar.toHeader();
  if (cookieHeader) headers.set('cookie', cookieHeader);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  jar.updateFromHeaders(res.headers);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, headers: res.headers, body };
}

let server: http.Server;
let baseUrl = '';

test.before(async () => {
  await resetStoreWithSeed();
  const app = await createExpressApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

test.after(async () => {
  await resetStoreWithSeed();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('Student login preserves leading zero PIN, maintains session across requests, and revokes on logout', async () => {
  const jar = new CookieJar();
  const loginRes = await apiFetch(baseUrl, jar, '/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ classCode: '4A2', studentCode: 'HS001', pin: '012345', personalDevice: true }),
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.user.studentCode, 'HS001');
  assert.equal(loginRes.body.deviceType, 'personal');

  // Verify Cache-Control: no-store
  assert.match(loginRes.headers.get('cache-control') || '', /no-store/);

  // Simulate F5 / tab reopen using stored cookies
  const meRes = await apiFetch(baseUrl, jar, '/api/auth/me');
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.uid, 'stu-4a2-01');

  // Save old cookie header before logout
  const oldCookieHeader = jar.toHeader();
  const logoutRes = await apiFetch(baseUrl, jar, '/api/auth/logout', { method: 'POST' });
  assert.equal(logoutRes.status, 200);

  // Old session cookie must be rejected even if replayed manually
  const replay = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: oldCookieHeader } });
  assert.equal(replay.status, 401);
});

test('Student login enforces rate limit on repeated wrong PINs', async () => {
  const jar = new CookieJar();
  for (let i = 0; i < 5; i++) {
    const res = await apiFetch(baseUrl, jar, '/api/auth/student-login', {
      method: 'POST',
      body: JSON.stringify({ classCode: '4A2', studentCode: 'HS003', pin: '999999' }),
    });
    assert.equal(res.status, 401);
  }
  const lockedRes = await apiFetch(baseUrl, jar, '/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ classCode: '4A2', studentCode: 'HS003', pin: '089123' }),
  });
  assert.equal(lockedRes.status, 429);
});

test('L4-B5 end-to-end grading awards XP once per stage (idempotent against duplicate submits) and hides partial/draft lessons', async () => {
  const jar = new CookieJar();
  const login = await apiFetch(baseUrl, jar, '/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ classCode: '4A2', studentCode: 'HS001', pin: '012345' }),
  });
  assert.equal(login.status, 200);

  // Dashboard only returns published complete lessons
  const dash = await apiFetch(baseUrl, jar, '/api/student/dashboard');
  assert.equal(dash.status, 200);
  const lessonIds = (dash.body.lessons as Array<{ id: string }>).map((l) => l.id);
  assert.ok(lessonIds.includes('L4-B5'));
  assert.ok(!lessonIds.includes('L4-B8'));

  // Partial lesson returns 403
  const forbiddenLesson = await apiFetch(baseUrl, jar, '/api/student/lessons/L4-B8');
  assert.equal(forbiddenLesson.status, 403);

  // Open L4-B5
  const openL4 = await apiFetch(baseUrl, jar, '/api/student/lessons/L4-B5');
  assert.equal(openL4.status, 200);
  assert.equal(openL4.body.questions.length, 6);
  // Solutions must NOT be stripped onto public questions
  assert.equal(openL4.body.questions[0].correctAnswer, undefined);

  // Build valid L4-B5 solution virtual FS
  const fsState = getInitialL4B5PracticeFs();
  fsState.nodes.push(
    { id: 'folder-baitap', name: 'Bai tap', type: 'folder', parentId: 'nhom-2' },
    { id: 'file-copy-bai', name: 'Bai tap nhom.pptx', type: 'file', fileKind: 'pptx', parentId: 'folder-baitap' },
  );

  const autosave = await apiFetch(baseUrl, jar, '/api/student/attempts/L4-B5/autosave', {
    method: 'POST',
    body: JSON.stringify({ revision: 1, draft: { fsState } }),
  });
  assert.equal(autosave.status, 200);

  // Submit practice twice to simulate duplicate tabs/retries
  const sub1 = await apiFetch(baseUrl, jar, '/api/student/attempts/L4-B5/submit', {
    method: 'POST',
    body: JSON.stringify({ stage: 'practice', draft: { fsState } }),
  });
  assert.equal(sub1.status, 200);
  assert.equal(sub1.body.passed, true);
  assert.equal(sub1.body.awardedXp, 20);
  assert.equal(sub1.body.user.totalXp, 20);

  const sub2 = await apiFetch(baseUrl, jar, '/api/student/attempts/L4-B5/submit', {
    method: 'POST',
    body: JSON.stringify({ stage: 'practice', draft: { fsState } }),
  });
  assert.equal(sub2.status, 200);
  assert.equal(sub2.body.alreadyAwarded, true);
  assert.equal(sub2.body.awardedXp, 0);
  assert.equal(sub2.body.user.totalXp, 20);

  // Submit quiz with 100% correct answers (+10 XP)
  const quizSub = await apiFetch(baseUrl, jar, '/api/student/attempts/L4-B5/submit', {
    method: 'POST',
    body: JSON.stringify({
      stage: 'quiz',
      answers: {
        'L4B5-Q1': 0,
        'L4B5-Q2': 1,
        'L4B5-Q3': 2,
        'L4B5-Q4': 0,
        'L4B5-Q5': {
          'Sao chép (Copy → Paste)': 'Tệp có ở cả thư mục cũ và mới',
          'Di chuyển (Move to)': 'Tệp chỉ còn ở thư mục mới',
          'Đổi tên (Rename)': 'Giữ nguyên vị trí, chỉ thay tên gọi',
        },
        'L4B5-Q6': [
          'Mở ổ đĩa D: và nháy chọn tệp "Gioi thieu"',
          'Bấm lệnh Sao chép (Copy)',
          'Mở thư mục "Thu An"',
          'Bấm lệnh Dán (Paste)',
        ],
      },
    }),
  });
  assert.equal(quizSub.status, 200);
  assert.equal(quizSub.body.scorePercent, 100);
  assert.equal(quizSub.body.awardedXp, 10);
  assert.equal(quizSub.body.user.totalXp, 30);

  // Submit minigame (+5 XP)
  const gameSub = await apiFetch(baseUrl, jar, '/api/student/attempts/L4-B5/submit', {
    method: 'POST',
    body: JSON.stringify({ stage: 'minigame', roundsCompleted: 3, score: 3 }),
  });
  assert.equal(gameSub.status, 200);
  assert.equal(gameSub.body.awardedXp, 5);
  assert.equal(gameSub.body.user.totalXp, 35);
});

test('Teacher class-scope isolation, publish guard, Excel import validation/idempotency, and outbox monotonic guard', async () => {
  const tJar = new CookieJar();
  const login = await apiFetch(baseUrl, tJar, '/api/auth/teacher-login', {
    method: 'POST',
    body: JSON.stringify({ email: 'giaovien@truongtieuhoc.edu.vn', password: 'GiaoVien@2026' }),
  });
  assert.equal(login.status, 200);

  // Cross-class isolation: teacher-main must get 403 on class-3b2 and stu-3b2-01
  const crossProgress = await apiFetch(baseUrl, tJar, '/api/teacher/classes/class-3b2/progress');
  assert.equal(crossProgress.status, 403);

  const crossPinReset = await apiFetch(baseUrl, tJar, '/api/teacher/students/stu-3b2-01/reset-pin', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert.equal(crossPinReset.status, 403);

  // Publish guard: partial lesson L4-B8 cannot be published
  const pubBad = await apiFetch(baseUrl, tJar, '/api/teacher/lessons/L4-B8/publish', {
    method: 'POST',
    body: JSON.stringify({ publishStatus: 'published' }),
  });
  assert.equal(pubBad.status, 400);

  // Excel import preview catches errors and creates valid students idempotently
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Mã học sinh', 'Họ và tên', 'Giới tính', 'Lớp', 'Mã PIN'],
    ['HS099', 'Nguyễn Minh Nhật', 'Nam', '4A2', '008899'],
    ['HS098', '=SUM(1,1)', 'Nữ', '4A2', '012345'],
  ]);
  ws['E2'].t = 's';
  ws['E2'].z = '@';
  XLSX.utils.book_append_sheet(wb, ws, 'DS');
  const xlsxBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const prev = await apiFetch(baseUrl, tJar, '/api/teacher/students/import/preview', {
    method: 'POST',
    body: JSON.stringify({ fileName: 'test.xlsx', base64Content: xlsxBase64 }),
  });
  assert.equal(prev.status, 200);
  assert.equal(prev.body.validCount, 1);
  assert.equal(prev.body.errorCount, 1);

  const confirm1 = await apiFetch(baseUrl, tJar, '/api/teacher/students/import/confirm', {
    method: 'POST',
    body: JSON.stringify({ batchId: prev.body.batchId }),
  });
  assert.equal(confirm1.status, 200);
  assert.equal(confirm1.body.createdCount, 1);

  const confirmReplay = await apiFetch(baseUrl, tJar, '/api/teacher/students/import/confirm', {
    method: 'POST',
    body: JSON.stringify({ batchId: prev.body.batchId }),
  });
  assert.equal(confirmReplay.status, 200);
  assert.equal(confirmReplay.body.idempotentReplay, true);

  // Outbox monotonic syncVersion guard
  const weekKey = getHoChiMinhWeekKey();
  await runStoreTransaction((db) => {
    db.leaderboardOutbox['evt-stale'] = {
      id: 'evt-stale',
      classId: 'class-4a2',
      weekKey,
      uid: 'stu-4a2-01',
      nickname: 'Sóc Nhanh Nhẹn',
      avatarId: 'squirrel',
      weeklyXp: 5,
      syncVersion: 1, // stale lower version!
      synced: false,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
  });
  const outRes = await processOutboxEvents(['evt-stale']);
  assert.equal(outRes.ignoredStale, 1);

  // Teacher enables leaderboard for class-4a2
  const toggleRes = await apiFetch(baseUrl, tJar, '/api/teacher/classes/class-4a2/settings', {
    method: 'POST',
    body: JSON.stringify({ leaderboardEnabled: true }),
  });
  assert.equal(toggleRes.status, 200);
  assert.equal(toggleRes.body.classInfo.leaderboardEnabled, true);

  const top = await reconcileClassLeaderboard('class-4a2', weekKey);
  const hs001 = top.find((e) => e.uid === 'stu-4a2-01');
  assert.equal(hs001?.weeklyXp, 35);
});

test('Grade-scoped lessons, common 3-4-5 lessons, and task-based practice grading work end-to-end', async () => {
  // Grade 3 student HS301
  const jar3 = new CookieJar();
  const login3 = await apiFetch(baseUrl, jar3, '/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ classCode: '3A1', studentCode: 'HS301', pin: '024680' }),
  });
  assert.equal(login3.status, 200);
  const dash3 = await apiFetch(baseUrl, jar3, '/api/student/dashboard');
  assert.equal(dash3.status, 200);
  const l3Ids = (dash3.body.lessons as Array<{ id: string }>).map((l) => l.id);
  const common3Ids = (dash3.body.commonLessons as Array<{ id: string }>).map((l) => l.id);
  assert.ok(l3Ids.includes('L3-B1') && l3Ids.includes('L3-B5'));
  assert.ok(!l3Ids.some((id) => id.startsWith('L4-') || id.startsWith('L5-')));
  assert.deepEqual(common3Ids.sort(), ['CHUNG-AN-TOAN-SO', 'CHUNG-BAN-PHIM', 'CHUNG-TEP-THU-MUC']);

  // Grade 5 student HS501
  const jar5 = new CookieJar();
  const login5 = await apiFetch(baseUrl, jar5, '/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ classCode: '5A1', studentCode: 'HS501', pin: '055667' }),
  });
  assert.equal(login5.status, 200);
  const dash5 = await apiFetch(baseUrl, jar5, '/api/student/dashboard');
  assert.equal(dash5.status, 200);
  const l5Ids = (dash5.body.lessons as Array<{ id: string }>).map((l) => l.id);
  const common5Ids = (dash5.body.commonLessons as Array<{ id: string }>).map((l) => l.id);
  assert.ok(l5Ids.includes('L5-B1') && l5Ids.includes('L5-B4'));
  assert.ok(!l5Ids.some((id) => id.startsWith('L3-') || id.startsWith('L4-')));
  assert.deepEqual(common5Ids.sort(), ['CHUNG-AN-TOAN-SO', 'CHUNG-BAN-PHIM', 'CHUNG-TEP-THU-MUC']);

  // Grade 4 student HS001 accesses task-based L4-B1 & common CHUNG-AN-TOAN-SO
  const jar4 = new CookieJar();
  await apiFetch(baseUrl, jar4, '/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ classCode: '4A2', studentCode: 'HS001', pin: '012345' }),
  });
  const openL4B1 = await apiFetch(baseUrl, jar4, '/api/student/lessons/L4-B1');
  assert.equal(openL4B1.status, 200);
  assert.equal(openL4B1.body.lesson.practiceKind, 'tasks');
  assert.equal(openL4B1.body.bundle.practiceTasks.length, 3);

  const subL4B1 = await apiFetch(baseUrl, jar4, '/api/student/attempts/L4-B1/submit', {
    method: 'POST',
    body: JSON.stringify({
      stage: 'practice',
      draft: { taskAnswers: { 'L4B1-T1': 0, 'L4B1-T2': 1, 'L4B1-T3': 1 } },
    }),
  });
  assert.equal(subL4B1.status, 200);
  assert.equal(subL4B1.body.passed, true);
  assert.equal(subL4B1.body.awardedXp, 20);

  const subCommon = await apiFetch(baseUrl, jar3, '/api/student/attempts/CHUNG-AN-TOAN-SO/submit', {
    method: 'POST',
    body: JSON.stringify({
      stage: 'practice',
      draft: { taskAnswers: { 'CHUNGAT-T1': 0, 'CHUNGAT-T2': 0, 'CHUNGAT-T3': 0, 'CHUNGAT-T4': 0 } },
    }),
  });
  assert.equal(subCommon.status, 200);
  assert.equal(subCommon.body.passed, true);
  assert.equal(subCommon.body.awardedXp, 20);
});

test('Arena lifecycle: teacher opens 5-minute waiting room, students join by scope, owner teacher starts and closes room', async () => {
  const tMainJar = new CookieJar();
  const tOtherJar = new CookieJar();
  const s4Jar = new CookieJar();
  const s3Jar = new CookieJar();

  assert.equal(
    (
      await apiFetch(baseUrl, tMainJar, '/api/auth/teacher-login', {
        method: 'POST',
        body: JSON.stringify({ email: 'giaovien@truongtieuhoc.edu.vn', password: 'GiaoVien@2026' }),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await apiFetch(baseUrl, tOtherJar, '/api/auth/teacher-login', {
        method: 'POST',
        body: JSON.stringify({ email: 'gv_lopkhac@truongtieuhoc.edu.vn', password: 'GiaoVien@2026' }),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await apiFetch(baseUrl, s4Jar, '/api/auth/student-login', {
        method: 'POST',
        body: JSON.stringify({ classCode: '4A2', studentCode: 'HS001', pin: '012345' }),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await apiFetch(baseUrl, s3Jar, '/api/auth/student-login', {
        method: 'POST',
        body: JSON.stringify({ classCode: '3A1', studentCode: 'HS301', pin: '024680' }),
      })
    ).status,
    200,
  );

  // Teacher opens 5-minute Arena room for class-4a2
  const createClassRoom = await apiFetch(baseUrl, tMainJar, '/api/teacher/arena/rooms', {
    method: 'POST',
    body: JSON.stringify({ lessonId: 'L4-B5', scope: 'class', classId: 'class-4a2', title: 'Thi thử 4A2' }),
  });
  assert.equal(createClassRoom.status, 200);
  const classRoom = createClassRoom.body.room;
  assert.equal(classRoom.status, 'waiting');
  assert.equal(classRoom.waitingDurationSec, 300);

  // Student 4A2 joins -> participant sanitized to nickname
  const join4 = await apiFetch(baseUrl, s4Jar, `/api/student/arena/rooms/${classRoom.id}/join`, { method: 'POST' });
  assert.equal(join4.status, 200);
  assert.equal(join4.body.room.participants.length, 1);
  assert.equal(join4.body.room.participants[0].nickname, 'Sóc Nhanh Nhẹn');
  assert.equal(join4.body.room.participants[0].fullName, 'Sóc Nhanh Nhẹn');

  // Student 3A1 cannot join class-4a2 room
  const join3Denied = await apiFetch(baseUrl, s3Jar, `/api/student/arena/rooms/${classRoom.id}/join`, { method: 'POST' });
  assert.equal(join3Denied.status, 403);

  // Teacher opens a shared room across assigned classes (3A1, 4A2, 5A1)
  const createSharedRoom = await apiFetch(baseUrl, tMainJar, '/api/teacher/arena/rooms', {
    method: 'POST',
    body: JSON.stringify({ lessonId: 'CHUNG-AN-TOAN-SO', scope: 'shared', title: 'Đấu trường 3 khối' }),
  });
  assert.equal(createSharedRoom.status, 200);
  const sharedRoom = createSharedRoom.body.room;
  const join3Shared = await apiFetch(baseUrl, s3Jar, `/api/student/arena/rooms/${sharedRoom.id}/join`, { method: 'POST' });
  assert.equal(join3Shared.status, 200);
  assert.equal(join3Shared.body.room.participants.length, 1);

  // Other teacher cannot start teacher-main's room
  const startForbidden = await apiFetch(baseUrl, tOtherJar, `/api/teacher/arena/rooms/${classRoom.id}/start`, {
    method: 'POST',
  });
  assert.equal(startForbidden.status, 403);

  // Owner teacher starts room -> status becomes 'started'
  const startOk = await apiFetch(baseUrl, tMainJar, `/api/teacher/arena/rooms/${classRoom.id}/start`, {
    method: 'POST',
  });
  assert.equal(startOk.status, 200);
  assert.equal(startOk.body.room.status, 'started');
  assert.ok(startOk.body.room.startedAt);

  // Owner teacher closes room -> status becomes 'closed'
  const closeOk = await apiFetch(baseUrl, tMainJar, `/api/teacher/arena/rooms/${classRoom.id}/close`, {
    method: 'POST',
  });
  assert.equal(closeOk.status, 200);
  assert.equal(closeOk.body.room.status, 'closed');
});

test('Arena Waiting Room flow: join-by-code, ready/unready toggle, capacity limit, 3-2-1 start, and submit', async () => {
  const tJar = new CookieJar();
  const s1Jar = new CookieJar();
  const s2Jar = new CookieJar();
  const s3Jar = new CookieJar();

  await apiFetch(baseUrl, tJar, '/api/auth/teacher-login', {
    method: 'POST',
    body: JSON.stringify({ email: 'giaovien@truongtieuhoc.edu.vn', password: 'GiaoVien@2026' }),
  });
  await apiFetch(baseUrl, s1Jar, '/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ classCode: '4A2', studentCode: 'HS001', pin: '012345' }),
  });
  await apiFetch(baseUrl, s2Jar, '/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ classCode: '4A2', studentCode: 'HS002', pin: '004567' }),
  });
  await apiFetch(baseUrl, s3Jar, '/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ classCode: '4A2', studentCode: 'HS004', pin: '004404' }),
  });

  // Teacher creates a 2-slot quiz arena room
  const createRes = await apiFetch(baseUrl, tJar, '/api/teacher/arena/rooms', {
    method: 'POST',
    body: JSON.stringify({
      lessonId: 'L4-B5',
      scope: 'class',
      classId: 'class-4a2',
      mode: 'quiz',
      itemCount: 4,
      maxParticipants: 2,
      title: 'Phòng chờ test 2 bạn',
    }),
  });
  assert.equal(createRes.status, 200);
  const room = createRes.body.room;
  assert.equal(room.mode, 'quiz');
  assert.equal(room.itemCount, 4);
  assert.equal(room.maxParticipants, 2);
  assert.match(room.roomCode, /^\d{4}$/);

  // Wrong room code returns 404
  const wrongCode = await apiFetch(baseUrl, s1Jar, '/api/student/arena/rooms/join-by-code', {
    method: 'POST',
    body: JSON.stringify({ roomCode: '0000' }),
  });
  assert.equal(wrongCode.status, 404);

  // Student 1 joins by numeric code
  const s1Join = await apiFetch(baseUrl, s1Jar, '/api/student/arena/rooms/join-by-code', {
    method: 'POST',
    body: JSON.stringify({ roomCode: room.roomCode }),
  });
  assert.equal(s1Join.status, 200);
  assert.equal(s1Join.body.room.participants[0].ready, false);

  // Student 1 toggles Ready = true then false then true
  const s1Ready = await apiFetch(baseUrl, s1Jar, `/api/student/arena/rooms/${room.id}/ready`, {
    method: 'POST',
    body: JSON.stringify({ ready: true }),
  });
  assert.equal(s1Ready.status, 200);
  assert.equal(s1Ready.body.room.participants[0].ready, true);

  const s1Unready = await apiFetch(baseUrl, s1Jar, `/api/student/arena/rooms/${room.id}/ready`, {
    method: 'POST',
    body: JSON.stringify({ ready: false }),
  });
  assert.equal(s1Unready.status, 200);
  assert.equal(s1Unready.body.room.participants[0].ready, false);

  await apiFetch(baseUrl, s1Jar, `/api/student/arena/rooms/${room.id}/ready`, {
    method: 'POST',
    body: JSON.stringify({ ready: true }),
  });

  // Student 2 joins -> room now at 2/2 capacity
  const s2Join = await apiFetch(baseUrl, s2Jar, '/api/student/arena/rooms/join-by-code', {
    method: 'POST',
    body: JSON.stringify({ roomCode: room.roomCode }),
  });
  assert.equal(s2Join.status, 200);
  assert.equal(s2Join.body.room.participants.length, 2);

  // Student 3 rejected because room is full (409)
  const s3Full = await apiFetch(baseUrl, s3Jar, '/api/student/arena/rooms/join-by-code', {
    method: 'POST',
    body: JSON.stringify({ roomCode: room.roomCode }),
  });
  assert.equal(s3Full.status, 409);

  // Student 2 explicitly leaves -> Student 3 can now join
  const s2Leave = await apiFetch(baseUrl, s2Jar, `/api/student/arena/rooms/${room.id}/leave`, { method: 'POST' });
  assert.equal(s2Leave.status, 200);

  const s3Join = await apiFetch(baseUrl, s3Jar, `/api/student/arena/rooms/${room.id}/join`, { method: 'POST' });
  assert.equal(s3Join.status, 200);

  // Teacher starts match -> server sets 3-second countdownEndsAt
  const startRes = await apiFetch(baseUrl, tJar, `/api/teacher/arena/rooms/${room.id}/start`, { method: 'POST' });
  assert.equal(startRes.status, 200);
  assert.equal(startRes.body.room.status, 'started');
  assert.ok(startRes.body.room.countdownEndsAt);

  // Student 1 cannot toggle ready once started (409)
  const readyAfterStart = await apiFetch(baseUrl, s1Jar, `/api/student/arena/rooms/${room.id}/ready`, {
    method: 'POST',
    body: JSON.stringify({ ready: false }),
  });
  assert.equal(readyAfterStart.status, 409);

  // Student 1 fetches room detail -> gets public questions without solutions
  const detailRes = await apiFetch(baseUrl, s1Jar, `/api/student/arena/rooms/${room.id}`);
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.body.questions.length, 4);
  assert.equal((detailRes.body.questions[0] as Record<string, unknown>).correctAnswer, undefined);

  // Student 1 submits answers
  const submitRes = await apiFetch(baseUrl, s1Jar, `/api/student/arena/rooms/${room.id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers: {} }),
  });
  assert.equal(submitRes.status, 200);
  assert.equal(submitRes.body.total, 4);
  assert.equal(typeof submitRes.body.score, 'number');
});


