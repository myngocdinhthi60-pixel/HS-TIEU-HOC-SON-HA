import crypto from 'node:crypto';
import express, { type Request, type Response, type NextFunction } from 'express';
import * as XLSX from 'xlsx';
import {
  DEFAULT_ARENA_COUNTDOWN_SEC,
  DEFAULT_ARENA_MAX_PARTICIPANTS,
  DEFAULT_ARENA_WAITING_SEC,
  generateNumericRoomCode,
  isArenaRoomFull,
  isArenaVisibleToStudent,
  matchesArenaRoomCode,
  normalizeArenaRoomDefaults,
  removeArenaParticipant,
  sanitizeArenaRoomForStudent,
  setArenaParticipantReady,
  submitArenaParticipantResult,
  upsertArenaParticipant,
} from '../src/shared/arenaLogic';
import { canPublishLesson, CURRICULUM_51, isLessonVisibleToBranch } from '../src/shared/curriculum51';
import { sanitizeExportCell, validateImportRows, type RawImportRow } from '../src/shared/excelRules';
import { getHoChiMinhWeekKey, getRankForXp, QUIZ_PASS_PERCENT } from '../src/shared/grading';
import { gradeL3B5Practice } from '../src/shared/keyboardLogic';
import { gradePracticeTasks, gradeQuizAnswers, SAMPLE_LESSONS, toPublicQuestions } from '../src/shared/lessonContent';
import { buildStudentAnalytics } from '../src/shared/studentAnalytics';
import type { ArenaMode, ArenaRoom, ArenaScope, AttemptDraft, BranchSelection, PracticeTaskItem, QuizQuestion, UserProfile } from '../src/shared/types';
import {
  getInitialL4B5PracticeFs,
  getInitialL5B4PracticeFs,
  gradeL4B5Practice,
  gradeL5B4Practice,
} from '../src/shared/virtualFs';
import {
  checkLoginRateLimit,
  clearLoginFailure,
  generateSecurePin6,
  hashPinArgon2id,
  recordLoginFailure,
  signLocalSessionCookie,
  verifyLocalSessionCookie,
  verifyPassword,
  verifyPinArgon2id,
} from './crypto';
import { pickNicknameAndAvatar } from './seedData';
import {
  broadcastArenaUpdate,
  broadcastClassUpdate,
  buildArenaRoomsForUser,
  buildTeacherProgressPayload,
  disconnectUserSseStreams,
  registerSseClient,
} from './sseHub';
import {
  appendAuditLog,
  awardXpIdempotent,
  createDeviceSession,
  getFirebaseBridge,
  getLeaderboardSnapshot,
  loadStore,
  reconcileClassLeaderboard,
  revokeAllUserSessions,
  revokeDeviceSession,
  runStoreTransaction,
  verifyActiveDeviceSession,
} from './store';

const SESSION_COOKIE = 'ph_session';
const DEVICE_COOKIE = 'ph_device';

interface AuthedRequest extends Request {
  authUser?: UserProfile;
  authSessionId?: string;
  authRawDeviceToken?: string;
  authExpiresAtMs?: number;
}

function setNoStore(res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function checkSameOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin navigation / curl / server-side fetch without Origin
  try {
    const parsed = new URL(origin);
    const originHost = parsed.host.toLowerCase();
    const allowedHosts = new Set<string>();
    if (req.headers.host) {
      allowedHosts.add(req.headers.host.toLowerCase());
    }
    const xfHost = req.headers['x-forwarded-host'];
    if (typeof xfHost === 'string') {
      xfHost.split(',').forEach((h) => {
        const trimmed = h.trim().toLowerCase();
        if (trimmed) allowedHosts.add(trimmed);
      });
    }
    if (process.env.APP_URL) {
      try {
        allowedHosts.add(new URL(process.env.APP_URL).host.toLowerCase());
      } catch {
        // ignore invalid APP_URL
      }
    }
    return allowedHosts.has(originHost);
  } catch {
    return false;
  }
}

function isSecureRequest(req: Request): boolean {
  if (req.secure) return true;
  const xfProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  if (xfProto === 'https') return true;
  if (String(req.headers.origin || '').startsWith('https://')) return true;
  return false;
}

function setSessionCookies(
  req: Request,
  res: Response,
  sessionCookieVal: string,
  rawDeviceToken: string,
  expiresAtIso: string,
) {
  const isSecure = isSecureRequest(req);
  const maxAgeMs = Math.max(1000, new Date(expiresAtIso).getTime() - Date.now());
  const baseOpts = {
    httpOnly: true,
    sameSite: (isSecure ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    secure: isSecure,
    maxAge: maxAgeMs,
  };
  res.cookie(SESSION_COOKIE, sessionCookieVal, baseOpts);
  res.cookie(DEVICE_COOKIE, rawDeviceToken, baseOpts);
}

function clearSessionCookies(req: Request, res: Response) {
  const isSecure = isSecureRequest(req);
  const opts = {
    httpOnly: true,
    sameSite: (isSecure ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    secure: isSecure,
  };
  res.clearCookie(SESSION_COOKIE, opts);
  res.clearCookie(DEVICE_COOKIE, opts);
}

async function resolveSessionFromRequest(req: Request): Promise<{
  user: UserProfile;
  sessionId: string;
  rawDeviceToken: string;
  expiresAtMs: number;
} | null> {
  const sessionCookie = req.cookies?.[SESSION_COOKIE];
  const deviceCookie = req.cookies?.[DEVICE_COOKIE];
  if (!sessionCookie || !deviceCookie) return null;

  const bridge = getFirebaseBridge();
  let uid: string | null = null;
  let sessionId: string | null = null;
  let expMs = 0;

  // Try local HMAC cookie first, or Firebase session cookie if bridge is firebase
  const localPayload = verifyLocalSessionCookie(sessionCookie);
  if (localPayload) {
    uid = localPayload.uid;
    sessionId = localPayload.sessionId;
    expMs = localPayload.exp;
  } else if (bridge.mode === 'firebase' && bridge.auth) {
    try {
      const decoded = await bridge.auth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
      sessionId = (decoded.deviceSessionId as string) || '';
      expMs = (decoded.exp || 0) * 1000;
    } catch {
      return null;
    }
  }

  if (!uid || !sessionId) return null;
  const activeSession = await verifyActiveDeviceSession(sessionId, uid, deviceCookie);
  if (!activeSession) return null;

  const db = await loadStore();
  const user = db.users[uid];
  if (!user || user.locked) return null;

  return {
    user,
    sessionId,
    rawDeviceToken: deviceCookie,
    expiresAtMs: Math.min(expMs || Infinity, new Date(activeSession.expiresAt).getTime()),
  };
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  setNoStore(res);
  const resolved = await resolveSessionFromRequest(req);
  if (!resolved) {
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập.' });
  }
  req.authUser = resolved.user;
  req.authSessionId = resolved.sessionId;
  req.authRawDeviceToken = resolved.rawDeviceToken;
  req.authExpiresAtMs = resolved.expiresAtMs;
  next();
}

function requireRole(...roles: UserProfile['role'][]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này.' });
    }
    next();
  };
}

function sanitizeUserForClient(user: UserProfile) {
  return {
    uid: user.uid,
    role: user.role,
    fullName: user.fullName,
    nickname: user.nickname,
    avatarId: user.avatarId,
    email: user.email,
    studentCode: user.studentCode,
    classId: user.classId,
    classCode: user.classCode,
    assignedClassIds: user.assignedClassIds,
    totalXp: user.totalXp,
    unlockedBadges: user.unlockedBadges,
    rank: getRankForXp(user.totalXp),
  };
}

export function createApiRouter() {
  const router = express.Router();

  // ==================== AUTH ENDPOINTS ====================

  router.post('/auth/student-login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      setNoStore(res);
      if (!checkSameOrigin(req)) {
        return res.status(403).json({ error: 'Yêu cầu không hợp lệ (Origin mismatch).' });
      }

      const classCode = String(req.body?.classCode ?? '').trim().toUpperCase();
      const studentCode = String(req.body?.studentCode ?? '').trim().toUpperCase();
      const pin = String(req.body?.pin ?? '').trim();
      const personalDevice = Boolean(req.body?.personalDevice);

      if (!classCode || !studentCode || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ error: 'Vui lòng nhập đúng Mã lớp, Mã học sinh và mã PIN gồm 6 chữ số.' });
      }

      const ip = getClientIp(req);
      const rateKey = `${classCode}__${studentCode}`;
      const rate = checkLoginRateLimit(rateKey, ip);
      if (!rate.allowed) {
        return res.status(429).json({
          error: `Bạn đã nhập sai nhiều lần. Hãy nghỉ một chút và thử lại sau ${rate.retryAfterSec} giây nhé.`,
        });
      }

      const db = await loadStore();
      const cred = Object.values(db.studentCredentials).find(
        (c) => c.classCode.toUpperCase() === classCode && c.studentCode.toUpperCase() === studentCode,
      );

      if (!cred) {
        recordLoginFailure(rateKey, ip);
        return res.status(401).json({ error: 'Mã lớp, Mã học sinh hoặc mã PIN chưa đúng.' });
      }

      const user = db.users[cred.uid];
      if (!user || user.locked) {
        return res.status(403).json({ error: 'Tài khoản học sinh này đang bị tạm khóa. Hãy báo với thầy/cô giáo.' });
      }

      const pinOk = await verifyPinArgon2id(pin, cred.pinHash);
      if (!pinOk) {
        recordLoginFailure(rateKey, ip);
        return res.status(401).json({ error: 'Mã lớp, Mã học sinh hoặc mã PIN chưa đúng.' });
      }

      clearLoginFailure(rateKey);

      const deviceType = personalDevice ? 'personal' : 'shared';
      const { session, rawToken } = await createDeviceSession(user.uid, deviceType);
      const expMs = new Date(session.expiresAt).getTime();

      const cookieVal = signLocalSessionCookie({
        uid: user.uid,
        role: user.role,
        sessionId: session.id,
        exp: expMs,
      });
      setSessionCookies(req, res, cookieVal, rawToken, session.expiresAt);

      // Optional custom token if Firebase Auth emulator is running
      const bridge = getFirebaseBridge();
      let customToken: string | undefined;
      if (bridge.mode === 'firebase' && bridge.auth) {
        try {
          customToken = await bridge.auth.createCustomToken(user.uid, { role: 'student', classId: user.classId });
        } catch {
          // fallback cleanly to local session cookie
        }
      }

      return res.json({
        user: sanitizeUserForClient(user),
        expiresAt: session.expiresAt,
        deviceType,
        customToken,
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/auth/teacher-login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      setNoStore(res);
      if (!checkSameOrigin(req)) {
        return res.status(403).json({ error: 'Yêu cầu không hợp lệ (Origin mismatch).' });
      }

      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      if (!email || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Email và Mật khẩu giáo viên.' });
      }

      const db = await loadStore();
      const tCred = Object.values(db.teacherCredentials).find((t) => t.email.toLowerCase() === email);
      if (!tCred || !verifyPassword(password, tCred.passwordHash)) {
        return res.status(401).json({ error: 'Email hoặc mật khẩu giáo viên chưa chính xác.' });
      }

      const user = db.users[tCred.uid];
      if (!user || user.locked || (user.role !== 'teacher' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Tài khoản không có quyền giáo viên.' });
      }

      const { session, rawToken } = await createDeviceSession(user.uid, 'teacher');
      const expMs = new Date(session.expiresAt).getTime();
      const cookieVal = signLocalSessionCookie({
        uid: user.uid,
        role: user.role,
        sessionId: session.id,
        exp: expMs,
      });
      setSessionCookies(req, res, cookieVal, rawToken, session.expiresAt);

      return res.json({
        user: sanitizeUserForClient(user),
        expiresAt: session.expiresAt,
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/auth/exchange-session', async (req: Request, res: Response) => {
    setNoStore(res);
    if (!checkSameOrigin(req)) {
      return res.status(403).json({ error: 'Yêu cầu không hợp lệ.' });
    }
    const idToken = String(req.body?.idToken ?? '');
    const bridge = getFirebaseBridge();
    if (!idToken || bridge.mode !== 'firebase' || !bridge.auth) {
      return res.status(400).json({ error: 'Firebase Auth chưa được kích hoạt hoặc thiếu idToken.' });
    }
    try {
      const decoded = await bridge.auth.verifyIdToken(idToken, true);
      const db = await loadStore();
      const user = db.users[decoded.uid] || Object.values(db.users).find((u) => u.email === decoded.email);
      if (!user || user.locked) {
        return res.status(403).json({ error: 'Tài khoản chưa được cấp quyền trên hệ thống.' });
      }
      const deviceType = user.role === 'teacher' ? 'teacher' : req.body?.personalDevice ? 'personal' : 'shared';
      const { session, rawToken } = await createDeviceSession(user.uid, deviceType);
      const expiresIn = Math.max(5 * 60 * 1000, new Date(session.expiresAt).getTime() - Date.now());
      const fbSessionCookie = await bridge.auth.createSessionCookie(idToken, { expiresIn });
      setSessionCookies(req, res, fbSessionCookie, rawToken, session.expiresAt);
      return res.json({ user: sanitizeUserForClient(user), expiresAt: session.expiresAt });
    } catch {
      return res.status(401).json({ error: 'Token xác thực không hợp lệ.' });
    }
  });

  router.get('/auth/session', async (req: Request, res: Response) => {
    setNoStore(res);
    const resolved = await resolveSessionFromRequest(req);
    if (!resolved) {
      return res.json({ authenticated: false, user: null, classInfo: null, expiresAt: null });
    }
    const db = await loadStore();
    const cls = resolved.user.classId ? db.classes[resolved.user.classId] : undefined;
    return res.json({
      authenticated: true,
      user: sanitizeUserForClient(resolved.user),
      classInfo: cls ?? null,
      expiresAt: new Date(resolved.expiresAtMs).toISOString(),
    });
  });

  router.get('/auth/me', requireAuth, async (req: AuthedRequest, res: Response) => {
    const db = await loadStore();
    const user = req.authUser!;
    const cls = user.classId ? db.classes[user.classId] : undefined;
    return res.json({
      user: sanitizeUserForClient(user),
      classInfo: cls ?? null,
      expiresAt: new Date(req.authExpiresAtMs!).toISOString(),
    });
  });

  router.post('/auth/logout', async (req: Request, res: Response) => {
    setNoStore(res);
    const resolved = await resolveSessionFromRequest(req);
    if (resolved) {
      await revokeDeviceSession(resolved.sessionId);
      await disconnectUserSseStreams(resolved.user.uid);
    }
    clearSessionCookies(req, res);
    return res.json({ ok: true });
  });

  // ==================== STUDENT ENDPOINTS ====================

  router.get('/student/dashboard', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const db = await loadStore();
    const cls = user.classId ? db.classes[user.classId] : undefined;
    if (!cls) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin lớp học của em.' });
    }

    // Only published lessons matching class grade & branch selection!
    const availableLessons = Object.values(db.lessons)
      .filter(
        (l) =>
          l.scope !== 'common' &&
          l.publishStatus === 'published' &&
          l.sourceStatus === 'complete' &&
          isLessonVisibleToBranch(l, cls.grade, cls.branchSelection),
      )
      .sort((a, b) => Number(a.lessonNumber) - Number(b.lessonNumber));

    const commonLessons = Object.values(db.lessons)
      .filter(
        (l) =>
          l.scope === 'common' &&
          l.publishStatus === 'published' &&
          l.sourceStatus === 'complete',
      )
      .sort((a, b) => a.startPage - b.startPage);

    const upcomingGradeLessons = Object.values(db.lessons)
      .filter(
        (l) =>
          l.scope !== 'common' &&
          l.grade === cls.grade &&
          l.publishStatus !== 'published' &&
          isLessonVisibleToBranch(l, cls.grade, cls.branchSelection),
      )
      .sort((a, b) => a.startPage - b.startPage);

    const assignments = Object.values(db.assignments).filter((a) => a.classId === cls.id);
    const myProgress = Object.values(db.progress).filter((p) => p.uid === user.uid);
    const myAttempts = Object.values(db.attempts).filter((a) => a.uid === user.uid);
    const myXpLedger = Object.values(db.xpLedger).filter((x) => x.uid === user.uid);
    const totalLessonsInGradeCatalog = CURRICULUM_51.filter(
      (l) => l.grade === cls.grade && isLessonVisibleToBranch(l, cls.grade, cls.branchSelection),
    ).length;

    const analytics = buildStudentAnalytics({
      lessons: availableLessons,
      commonLessons,
      allCatalogLessons: Object.values(db.lessons),
      currentGrade: cls.grade,
      totalLessonsInGradeCatalog,
      progress: myProgress,
      attempts: myAttempts,
      xpLedger: myXpLedger,
      userTotalXp: user.totalXp,
    });

    const weekKey = getHoChiMinhWeekKey();
    const leaderboard = await getLeaderboardSnapshot(cls.id, weekKey, user.uid);
    const arenaRooms = await buildArenaRoomsForUser(user.uid);

    return res.json({
      user: sanitizeUserForClient(user),
      classInfo: cls,
      lessons: availableLessons,
      commonLessons,
      upcomingGradeLessons,
      assignments,
      progress: myProgress,
      attempts: myAttempts.map((a) => ({
        id: a.id,
        lessonId: a.lessonId,
        status: a.status,
        practicePassed: a.practicePassed,
        minigamePassed: a.minigamePassed,
        quizScorePercent: a.quizScorePercent,
        quizPassed: a.quizPassed,
        updatedAt: a.updatedAt,
      })),
      analytics,
      leaderboard,
      arenaRooms,
      serverNow: new Date().toISOString(),
    });
  });

  function resolvePracticeKind(lessonId: string, lesson?: { practiceKind?: string }) {
    if (lesson?.practiceKind === 'keyboard' || lesson?.practiceKind === 'folder' || lesson?.practiceKind === 'tasks') {
      return lesson.practiceKind;
    }
    if (lessonId === 'L3-B5' || lessonId === 'L4-B2' || lessonId === 'CHUNG-BAN-PHIM') return 'keyboard';
    if (lessonId === 'L4-B5' || lessonId === 'L5-B4' || lessonId === 'CHUNG-TEP-THU-MUC') return 'folder';
    return 'tasks';
  }

  router.get('/student/lessons/:lessonId', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const { lessonId } = req.params;
    const db = await loadStore();
    const cls = user.classId ? db.classes[user.classId] : undefined;
    const lesson = db.lessons[lessonId];

    if (!cls || !lesson) {
      return res.status(404).json({ error: 'Không tìm thấy bài học.' });
    }
    if (
      lesson.publishStatus !== 'published' ||
      lesson.sourceStatus !== 'complete' ||
      !isLessonVisibleToBranch(lesson, cls.grade, cls.branchSelection)
    ) {
      return res.status(403).json({ error: 'Bài học này chưa được mở cho lớp của em.' });
    }

    const bundle = SAMPLE_LESSONS[lessonId];
    const rawQuestions = db.questionKeys[lessonId] ?? bundle?.questions ?? [];
    const assignment = Object.values(db.assignments).find(
      (a) => a.classId === cls.id && a.lessonId === lessonId,
    );

    const practiceKind = resolvePracticeKind(lessonId, lesson);
    const attemptId = `${user.uid}__${lessonId}__${lesson.versionId}`;
    let attempt = db.attempts[attemptId];
    if (!attempt) {
      const initialDraft: AttemptDraft = {
        guidedStepIndex: 0,
        guidedCompleted: false,
        fsState:
          practiceKind === 'folder'
            ? lessonId === 'L5-B4'
              ? getInitialL5B4PracticeFs()
              : getInitialL4B5PracticeFs()
            : undefined,
        typingStats:
          practiceKind === 'keyboard'
            ? { completedSequences: [], accuracy: 100, wpm: 0, selfCheckFingers: false }
            : undefined,
        taskAnswers: practiceKind === 'tasks' ? {} : undefined,
        quizAnswers: {},
      };
      attempt = {
        id: attemptId,
        uid: user.uid,
        classId: cls.id,
        lessonId,
        versionId: lesson.versionId,
        assignmentId: assignment?.id,
        revision: 1,
        status: 'in_progress',
        draft: initialDraft,
        practicePassed: false,
        minigamePassed: false,
        quizScorePercent: null,
        quizPassed: false,
        xpAwardedTotal: 0,
        updatedAt: new Date().toISOString(),
        submittedAt: null,
      };
      await runStoreTransaction((d) => {
        d.attempts[attemptId] = attempt;
        const progId = `${user.uid}__${lessonId}`;
        if (!d.progress[progId]) {
          d.progress[progId] = {
            id: progId,
            uid: user.uid,
            classId: cls.id,
            lessonId,
            started: true,
            practiceCompleted: false,
            minigameCompleted: false,
            quizBestPercent: null,
            weakTopics: [],
            lastActivityAt: new Date().toISOString(),
          };
        }
      });
    }

    const canRevealSolutions =
      !assignment ||
      assignment.revealAnswersPolicy === 'immediate' ||
      (assignment.revealAnswersPolicy === 'after_submit' && attempt.quizScorePercent !== null) ||
      (assignment.revealAnswersPolicy === 'after_due' &&
        assignment.dueAt !== null &&
        Date.now() > new Date(assignment.dueAt).getTime());

    return res.json({
      lesson,
      assignment: assignment ?? null,
      bundle: bundle
        ? {
            badgeId: bundle.badgeId,
            badgeName: bundle.badgeName,
            watchSteps: bundle.watchSteps,
            guidedSteps: bundle.guidedSteps,
            practiceMissionTitle: bundle.practiceMissionTitle,
            practiceMissionSteps: bundle.practiceMissionSteps,
            practiceExampleNote: bundle.practiceExampleNote,
            practiceHint: bundle.practiceHint,
            practiceTasks: bundle.practiceTasks,
            gameTitle: bundle.gameTitle,
            gameDescription: bundle.gameDescription,
          }
        : null,
      questions: toPublicQuestions(rawQuestions),
      attempt: {
        ...attempt,
        quizResults: canRevealSolutions
          ? attempt.quizResults
          : attempt.quizResults?.map(({ correctAnswer: _c, explanation: _e, ...rest }) => rest),
      },
      canRevealSolutions,
    });
  });

  router.post('/student/attempts/:lessonId/autosave', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const { lessonId } = req.params;
    const clientRevision = Number(req.body?.revision ?? 0);
    const draftPatch = (req.body?.draft ?? {}) as AttemptDraft;

    const db = await loadStore();
    const lesson = db.lessons[lessonId];
    if (!lesson || lesson.publishStatus !== 'published') {
      return res.status(404).json({ error: 'Bài học không khả dụng.' });
    }

    const attemptId = `${user.uid}__${lessonId}__${lesson.versionId}`;
    const result = await runStoreTransaction((d) => {
      const existing = d.attempts[attemptId];
      if (!existing) {
        return { conflict: false, notFound: true, revision: 0, updatedAt: '' };
      }
      if (clientRevision > 0 && clientRevision < existing.revision) {
        return {
          conflict: true,
          notFound: false,
          revision: existing.revision,
          updatedAt: existing.updatedAt,
          serverDraft: existing.draft,
        };
      }
      existing.draft = {
        ...existing.draft,
        ...draftPatch,
      };
      existing.revision += 1;
      existing.updatedAt = new Date().toISOString();

      const progId = `${user.uid}__${lessonId}`;
      if (d.progress[progId]) {
        d.progress[progId].started = true;
        d.progress[progId].lastActivityAt = existing.updatedAt;
      }

      return { conflict: false, notFound: false, revision: existing.revision, updatedAt: existing.updatedAt };
    });

    if (result.notFound) {
      return res.status(404).json({ error: 'Chưa khởi tạo lượt làm bài.' });
    }
    if (result.conflict) {
      return res.status(409).json({
        error: 'Có bản lưu mới hơn ở tab khác.',
        revision: result.revision,
        draft: result.serverDraft,
      });
    }

    return res.json({ ok: true, revision: result.revision, updatedAt: result.updatedAt });
  });

  router.post('/student/attempts/:lessonId/submit', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const { lessonId } = req.params;
    const stage = String(req.body?.stage ?? '') as 'practice' | 'minigame' | 'quiz';
    const payload = req.body ?? {};

    const db = await loadStore();
    const cls = user.classId ? db.classes[user.classId] : undefined;
    const lesson = db.lessons[lessonId];
    if (!cls || !lesson || lesson.publishStatus !== 'published') {
      return res.status(404).json({ error: 'Không tìm thấy bài học hợp lệ để chấm.' });
    }

    const assignment = Object.values(db.assignments).find(
      (a) => a.classId === cls.id && a.lessonId === lessonId,
    );
    if (assignment?.dueAt && Date.now() > new Date(assignment.dueAt).getTime()) {
      return res.status(403).json({ error: 'Bài giao đã quá hạn nộp.' });
    }

    const attemptId = `${user.uid}__${lessonId}__${lesson.versionId}`;
    const bundle = SAMPLE_LESSONS[lessonId];
    const now = new Date().toISOString();

    if (stage === 'practice') {
      const draft: AttemptDraft = payload.draft ?? db.attempts[attemptId]?.draft ?? {};
      let passed = false;
      let feedback = '';
      let checks: Array<{ id: string; label: string; ok: boolean; hint: string }> = [];
      const practiceKind = resolvePracticeKind(lessonId, lesson);

      if (practiceKind === 'folder') {
        if (!draft.fsState) {
          return res.status(400).json({ error: 'Thiếu dữ liệu cây thư mục để chấm bài.' });
        }
        const g = lessonId === 'L5-B4' ? gradeL5B4Practice(draft.fsState) : gradeL4B5Practice(draft.fsState);
        passed = g.passed;
        feedback = g.feedback;
        checks = g.checks;
      } else if (practiceKind === 'keyboard') {
        if (!draft.typingStats) {
          return res.status(400).json({ error: 'Thiếu dữ liệu luyện gõ phím để chấm bài.' });
        }
        const g = gradeL3B5Practice(draft.typingStats);
        passed = g.passed;
        feedback = g.feedback;
      } else {
        const g = gradePracticeTasks(bundle?.practiceTasks ?? [], draft.taskAnswers ?? {});
        passed = g.passed;
        feedback = g.feedback;
        checks = g.checks;
      }

      let awardInfo = { awardedXp: 0, alreadyAwarded: false, totalXp: user.totalXp, weekKey: getHoChiMinhWeekKey() };
      if (passed) {
        awardInfo = await awardXpIdempotent({
          uid: user.uid,
          classId: cls.id,
          lessonId,
          awardType: 'practice',
          badgeId: bundle?.badgeId,
        });
      }

      let nextRevision = 1;
      await runStoreTransaction((d) => {
        const att = d.attempts[attemptId];
        if (att) {
          att.draft = { ...att.draft, ...draft };
          att.practicePassed = att.practicePassed || passed;
          att.revision += 1;
          nextRevision = att.revision;
          att.updatedAt = now;
          if (passed) {
            att.status = 'submitted';
            att.submittedAt = att.submittedAt ?? now;
            att.xpAwardedTotal += awardInfo.awardedXp;
          }
        }
        const progId = `${user.uid}__${lessonId}`;
        if (d.progress[progId]) {
          d.progress[progId].practiceCompleted = d.progress[progId].practiceCompleted || passed;
          d.progress[progId].lastActivityAt = now;
        }
      });

      await broadcastClassUpdate(cls.id);
      const updatedUser = (await loadStore()).users[user.uid];

      return res.json({
        passed,
        feedback,
        checks,
        revision: nextRevision,
        awardedXp: awardInfo.awardedXp,
        alreadyAwarded: awardInfo.alreadyAwarded,
        unlockedBadge: passed ? { id: bundle?.badgeId, name: bundle?.badgeName } : null,
        user: sanitizeUserForClient(updatedUser),
      });
    }

    if (stage === 'minigame') {
      const roundsCompleted = Number(payload.roundsCompleted ?? 0);
      const score = Number(payload.score ?? 0);
      const won = roundsCompleted >= 3 && score >= 3;

      let awardInfo = { awardedXp: 0, alreadyAwarded: false, totalXp: user.totalXp, weekKey: getHoChiMinhWeekKey() };
      if (won) {
        awardInfo = await awardXpIdempotent({
          uid: user.uid,
          classId: cls.id,
          lessonId,
          awardType: 'minigame',
        });
      }

      let nextRevision = 1;
      await runStoreTransaction((d) => {
        const att = d.attempts[attemptId];
        if (att) {
          att.minigamePassed = att.minigamePassed || won;
          att.draft.minigameState = { score, roundsCompleted, won };
          att.revision += 1;
          nextRevision = att.revision;
          att.xpAwardedTotal += awardInfo.awardedXp;
          att.updatedAt = now;
        }
        const progId = `${user.uid}__${lessonId}`;
        if (d.progress[progId]) {
          d.progress[progId].minigameCompleted = d.progress[progId].minigameCompleted || won;
          d.progress[progId].lastActivityAt = now;
        }
      });

      await broadcastClassUpdate(cls.id);
      const updatedUser = (await loadStore()).users[user.uid];

      return res.json({
        passed: won,
        feedback: won
          ? `Xuất sắc! Em đã hoàn thành trò chơi (${score}/${roundsCompleted} lượt đúng).`
          : 'Em hãy hoàn thành ít nhất 3 lượt đúng trong trò chơi để nhận điểm nhé!',
        revision: nextRevision,
        awardedXp: awardInfo.awardedXp,
        alreadyAwarded: awardInfo.alreadyAwarded,
        user: sanitizeUserForClient(updatedUser),
      });
    }

    if (stage === 'quiz') {
      const answers = (payload.answers ?? {}) as Record<string, unknown>;
      const questions = db.questionKeys[lessonId] ?? bundle?.questions ?? [];
      const includeSolutions =
        !assignment ||
        assignment.revealAnswersPolicy === 'immediate' ||
        assignment.revealAnswersPolicy === 'after_submit' ||
        (assignment.revealAnswersPolicy === 'after_due' &&
          assignment.dueAt !== null &&
          Date.now() > new Date(assignment.dueAt).getTime());

      const graded = gradeQuizAnswers(questions, answers, includeSolutions);
      const quizPassed = graded.scorePercent >= QUIZ_PASS_PERCENT;

      let awardInfo = { awardedXp: 0, alreadyAwarded: false, totalXp: user.totalXp, weekKey: getHoChiMinhWeekKey() };
      if (quizPassed) {
        awardInfo = await awardXpIdempotent({
          uid: user.uid,
          classId: cls.id,
          lessonId,
          awardType: 'quiz',
        });
      }

      const weakTopics = graded.results
        .filter((r) => !r.correct)
        .map((r) => {
          const q = questions.find((item) => item.id === r.questionId);
          return q ? q.prompt.slice(0, 60) : r.questionId;
        });

      let nextRevision = 1;
      await runStoreTransaction((d) => {
        const att = d.attempts[attemptId];
        if (att) {
          att.draft.quizAnswers = answers;
          att.quizScorePercent = graded.scorePercent;
          att.quizPassed = att.quizPassed || quizPassed;
          att.quizResults = graded.results;
          att.status = 'submitted';
          att.submittedAt = att.submittedAt ?? now;
          att.revision += 1;
          nextRevision = att.revision;
          att.xpAwardedTotal += awardInfo.awardedXp;
          att.updatedAt = now;
        }
        const progId = `${user.uid}__${lessonId}`;
        if (d.progress[progId]) {
          d.progress[progId].quizBestPercent = Math.max(
            d.progress[progId].quizBestPercent ?? 0,
            graded.scorePercent,
          );
          d.progress[progId].weakTopics = weakTopics;
          d.progress[progId].lastActivityAt = now;
        }
      });

      await broadcastClassUpdate(cls.id);
      const updatedUser = (await loadStore()).users[user.uid];

      return res.json({
        scorePercent: graded.scorePercent,
        correctCount: graded.correctCount,
        totalCount: graded.totalCount,
        passed: quizPassed,
        results: graded.results,
        solutionsVisible: includeSolutions,
        revision: nextRevision,
        awardedXp: awardInfo.awardedXp,
        alreadyAwarded: awardInfo.alreadyAwarded,
        user: sanitizeUserForClient(updatedUser),
      });
    }

    return res.status(400).json({ error: 'Loại bài nộp không hợp lệ.' });
  });

  // ==================== TEACHER ENDPOINTS ====================

  function assertTeacherClassAccess(teacher: UserProfile, classId: string): boolean {
    if (teacher.role === 'admin') return true;
    return Boolean(teacher.assignedClassIds?.includes(classId));
  }

  router.get('/teacher/overview', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const db = await loadStore();
    const myClasses = Object.values(db.classes).filter((c) => assertTeacherClassAccess(teacher, c.id));
    const myClassIds = new Set(myClasses.map((c) => c.id));

    const students = Object.values(db.users)
      .filter((u) => u.role === 'student' && u.classId && myClassIds.has(u.classId))
      .map((s) => ({
        uid: s.uid,
        studentCode: s.studentCode,
        fullName: s.fullName,
        nickname: s.nickname,
        avatarId: s.avatarId,
        gender: s.gender,
        classId: s.classId,
        classCode: s.classCode,
        totalXp: s.totalXp,
        unlockedBadges: s.unlockedBadges,
        locked: s.locked,
      }))
      .sort((a, b) => (a.studentCode ?? '').localeCompare(b.studentCode ?? ''));

    const lessons = Object.values(db.lessons).sort((a, b) => {
      const aScope = a.scope === 'common' ? 99 : a.grade;
      const bScope = b.scope === 'common' ? 99 : b.grade;
      if (aScope !== bScope) return aScope - bScope;
      return a.startPage - b.startPage;
    });

    const assignments = Object.values(db.assignments).filter((a) => myClassIds.has(a.classId));
    const progress = Object.values(db.progress).filter((p) => myClassIds.has(p.classId));

    const weekKey = getHoChiMinhWeekKey();
    const leaderboards: Record<string, Awaited<ReturnType<typeof getLeaderboardSnapshot>>> = {};
    for (const c of myClasses) {
      leaderboards[c.id] = await getLeaderboardSnapshot(c.id, weekKey);
    }
    const arenaRooms = await buildArenaRoomsForUser(teacher.uid);

    return res.json({
      teacher: sanitizeUserForClient(teacher),
      classes: myClasses,
      students,
      lessons,
      questionBank: db.questionKeys,
      assignments,
      progress,
      leaderboards,
      arenaRooms,
      serverNow: new Date().toISOString(),
      auditLogs: db.auditLogs.slice(0, 20),
    });
  });

  router.get('/teacher/classes/:classId/progress', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { classId } = req.params;
    if (!assertTeacherClassAccess(teacher, classId)) {
      return res.status(403).json({ error: 'Bạn không được phân công quản lí lớp này.' });
    }
    const payload = await buildTeacherProgressPayload(classId);
    return res.json(payload);
  });

  router.post('/teacher/classes/:classId/settings', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { classId } = req.params;
    if (!assertTeacherClassAccess(teacher, classId)) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa lớp này.' });
    }

    const updated = await runStoreTransaction((db) => {
      const cls = db.classes[classId];
      if (!cls) return null;
      if (typeof req.body?.leaderboardEnabled === 'boolean') {
        cls.leaderboardEnabled = req.body.leaderboardEnabled;
      }
      if (req.body?.branchSelection) {
        cls.branchSelection = req.body.branchSelection as BranchSelection;
      }
      cls.updatedAt = new Date().toISOString();
      return { ...cls };
    });

    if (!updated) return res.status(404).json({ error: 'Không tìm thấy lớp học.' });

    await appendAuditLog({
      actorUid: teacher.uid,
      action: 'UPDATE_CLASS_SETTINGS',
      targetType: 'class',
      targetId: classId,
      summary: `Cập nhật lớp ${updated.code}: Bảng hạng=${updated.leaderboardEnabled ? 'Bật' : 'Tắt'}, Nhánh=${updated.branchSelection}`,
    });
    await broadcastClassUpdate(classId);
    return res.json({ classInfo: updated });
  });

  router.post('/teacher/students/:uid/reset-pin', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { uid } = req.params;
    const db = await loadStore();
    const student = db.users[uid];
    if (!student || student.role !== 'student' || !student.classId || !assertTeacherClassAccess(teacher, student.classId)) {
      return res.status(403).json({ error: 'Không có quyền cấp lại PIN cho học sinh này.' });
    }

    const requestedPin = req.body?.newPin ? String(req.body.newPin).trim() : '';
    const newPin = requestedPin ? requestedPin : generateSecurePin6();
    if (!/^\d{6}$/.test(newPin)) {
      return res.status(400).json({ error: 'Mã PIN mới phải gồm đúng 6 chữ số (giữ số 0 ở đầu).' });
    }

    const pinHash = await hashPinArgon2id(newPin);
    await runStoreTransaction((d) => {
      if (d.studentCredentials[uid]) {
        d.studentCredentials[uid].pinHash = pinHash;
        d.studentCredentials[uid].updatedAt = new Date().toISOString();
      }
    });

    await revokeAllUserSessions(uid);
    await disconnectUserSseStreams(uid);
    await appendAuditLog({
      actorUid: teacher.uid,
      action: 'RESET_PIN',
      targetType: 'student',
      targetId: uid,
      summary: `Cấp lại PIN cho ${student.studentCode} (${student.fullName}) và thu hồi toàn bộ phiên cũ.`,
    });

    return res.json({
      ok: true,
      uid,
      studentCode: student.studentCode,
      classCode: student.classCode,
      oneTimePin: newPin,
    });
  });

  router.post('/teacher/students/:uid/toggle-lock', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { uid } = req.params;
    const db = await loadStore();
    const student = db.users[uid];
    if (!student || student.role !== 'student' || !student.classId || !assertTeacherClassAccess(teacher, student.classId)) {
      return res.status(403).json({ error: 'Không có quyền khóa/mở tài khoản học sinh này.' });
    }

    const nextLocked = typeof req.body?.locked === 'boolean' ? req.body.locked : !student.locked;
    await runStoreTransaction((d) => {
      if (d.users[uid]) {
        d.users[uid].locked = nextLocked;
        d.users[uid].updatedAt = new Date().toISOString();
      }
    });

    if (nextLocked) {
      await revokeAllUserSessions(uid);
      await disconnectUserSseStreams(uid);
    }
    await broadcastClassUpdate(student.classId);
    await appendAuditLog({
      actorUid: teacher.uid,
      action: nextLocked ? 'LOCK_STUDENT' : 'UNLOCK_STUDENT',
      targetType: 'student',
      targetId: uid,
      summary: `${nextLocked ? 'Khóa' : 'Mở khóa'} tài khoản ${student.studentCode} (${student.fullName}).`,
    });

    return res.json({ ok: true, uid, locked: nextLocked });
  });

  router.post('/teacher/students/:uid/update', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { uid } = req.params;
    const db = await loadStore();
    const student = db.users[uid];
    if (!student || student.role !== 'student' || !student.classId || !assertTeacherClassAccess(teacher, student.classId)) {
      return res.status(403).json({ error: 'Không có quyền sửa hồ sơ học sinh này.' });
    }

    const fullName = String(req.body?.fullName ?? student.fullName).trim();
    const gender = String(req.body?.gender ?? student.gender ?? '').trim();
    const targetClassId = String(req.body?.classId ?? student.classId).trim();

    if (!fullName) {
      return res.status(400).json({ error: 'Họ và tên không được để trống.' });
    }
    if (!assertTeacherClassAccess(teacher, targetClassId) || !db.classes[targetClassId]) {
      return res.status(403).json({ error: 'Lớp chuyển đến không thuộc phạm vi phân công.' });
    }

    const oldClassId = student.classId;
    await runStoreTransaction((d) => {
      const u = d.users[uid];
      const newCls = d.classes[targetClassId];
      u.fullName = fullName;
      u.gender = gender;
      u.classId = targetClassId;
      u.classCode = newCls.code;
      u.updatedAt = new Date().toISOString();
      if (d.studentCredentials[uid]) {
        d.studentCredentials[uid].classId = targetClassId;
        d.studentCredentials[uid].classCode = newCls.code;
      }
    });

    await broadcastClassUpdate(oldClassId);
    if (targetClassId !== oldClassId) {
      await broadcastClassUpdate(targetClassId);
    }
    return res.json({ ok: true });
  });

  // Pending import preview cache in memory keyed by batchId + teacherUid
  const pendingImports = new Map<
    string,
    {
      teacherUid: string;
      fileName: string;
      validRows: Array<{ studentCode: string; fullName: string; gender: string; classCode: string; pin: string }>;
    }
  >();

  function parseUploadedSpreadsheet(base64Content: string, fileName: string): RawImportRow[] {
    const buf = Buffer.from(base64Content, 'base64');
    const isCsv = fileName.toLowerCase().endsWith('.csv');
    const wb = isCsv
      ? XLSX.read(buf.toString('utf8'), { type: 'string', raw: true })
      : XLSX.read(buf, { type: 'buffer', raw: false });

    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName];
    const ref = sheet['!ref'];
    if (!ref) return [];
    const range = XLSX.utils.decode_range(ref);

    // Header mapping
    const headers: Record<number, string> = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
      const val = String(cell?.v ?? '').trim().toLowerCase();
      headers[c] = val;
    }

    const findCol = (keywords: string[]) => {
      for (const [colIdx, h] of Object.entries(headers)) {
        if (keywords.some((k) => h.includes(k))) return Number(colIdx);
      }
      return -1;
    };

    const colCode = findCol(['mã học sinh', 'ma hoc sinh', 'studentcode']);
    const colName = findCol(['họ và tên', 'ho va ten', 'fullname']);
    const colGender = findCol(['giới tính', 'gioi tinh', 'gender']);
    const colClass = findCol(['lớp', 'lop', 'class']);
    const colPin = findCol(['pin', 'mã pin', 'ma pin']);

    const rows: RawImportRow[] = [];
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const getCell = (c: number) => (c >= 0 ? sheet[XLSX.utils.encode_cell({ r, c })] : undefined);
      const cCode = getCell(colCode);
      const cName = getCell(colName);
      const cGender = getCell(colGender);
      const cClass = getCell(colClass);
      const cPin = getCell(colPin);

      const rawCode = cCode ? String(cCode.w ?? cCode.v ?? '').trim() : '';
      const rawName = cName ? String(cName.w ?? cName.v ?? '').trim() : '';
      const rawClass = cClass ? String(cClass.w ?? cClass.v ?? '').trim() : '';
      if (!rawCode && !rawName && !rawClass) continue;

      // Detect if Excel converted PIN cell into numeric type (stripping leading zero)
      const pinWasNumericCell = !isCsv && Boolean(cPin && cPin.t === 'n');
      const pinVal = cPin ? String(cPin.w ?? cPin.v ?? '').trim() : '';

      rows.push({
        rowNumber: r + 1,
        studentCode: rawCode,
        fullName: rawName,
        gender: cGender ? String(cGender.w ?? cGender.v ?? '').trim() : '',
        classCode: rawClass,
        pin: pinVal,
        pinWasNumericCell,
      });
    }
    return rows;
  }

  router.post('/teacher/students/import/preview', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const fileName = String(req.body?.fileName ?? 'danh-sach.xlsx');
    const base64Content = String(req.body?.base64Content ?? '');
    if (!base64Content) {
      return res.status(400).json({ error: 'Vui lòng chọn tệp Excel (.xlsx) hoặc CSV UTF-8 hợp lệ.' });
    }

    let rawRows: RawImportRow[] = [];
    try {
      rawRows = parseUploadedSpreadsheet(base64Content, fileName);
    } catch {
      return res.status(400).json({ error: 'Không thể đọc tệp Excel/CSV. Hãy kiểm tra đúng định dạng .xlsx hoặc .csv UTF-8.' });
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ error: 'Tệp chưa có dữ liệu học sinh nào (hoặc sai tên cột tiêu đề).' });
    }

    const db = await loadStore();
    const myClasses = Object.values(db.classes).filter((c) => assertTeacherClassAccess(teacher, c.id));
    const allowedClassCodes = myClasses.map((c) => c.code);

    const existingMap = new Map<string, { uid: string; fullName: string }>();
    for (const u of Object.values(db.users)) {
      if (u.role === 'student' && u.classCode && u.studentCode) {
        existingMap.set(`${u.classCode.toUpperCase()}__${u.studentCode.toUpperCase()}`, {
          uid: u.uid,
          fullName: u.fullName,
        });
      }
    }

    const validation = validateImportRows(rawRows, allowedClassCodes, existingMap);
    const batchId = `imp-${crypto.randomUUID()}`;

    const validRows = validation.rows
      .filter((r) => r.action !== 'error')
      .map((r) => {
        const rawMatch = rawRows.find((rr) => rr.rowNumber === r.rowNumber)!;
        return {
          studentCode: r.studentCode,
          fullName: r.fullName,
          gender: r.gender,
          classCode: r.classCode,
          pin: String(rawMatch.pin ?? '').trim(),
        };
      });

    pendingImports.set(batchId, {
      teacherUid: teacher.uid,
      fileName,
      validRows,
    });

    return res.json({
      batchId,
      fileName,
      totalRows: validation.rows.length,
      validCount: validation.validCount,
      errorCount: validation.errorCount,
      duplicateCount: validation.duplicateCount,
      createCount: validation.createCount,
      updateCount: validation.updateCount,
      rows: validation.rows,
      canConfirm: validation.validCount > 0 && validation.errorCount === 0,
    });
  });

  router.post('/teacher/students/import/confirm', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const batchId = String(req.body?.batchId ?? '');
    if (!batchId) {
      return res.status(400).json({ error: 'Thiếu mã lô nhập (batchId).' });
    }

    const dbSnapshot = await loadStore();
    if (dbSnapshot.imports[batchId]) {
      // Idempotent retry: return summary without duplicating accounts or changing PINs!
      const prev = dbSnapshot.imports[batchId];
      return res.json({
        ok: true,
        idempotentReplay: true,
        batchId,
        createdCount: prev.createdCount,
        updatedCount: prev.updatedCount,
        provisionedPins: [],
      });
    }

    const pending = pendingImports.get(batchId);
    if (!pending || pending.teacherUid !== teacher.uid) {
      return res.status(404).json({ error: 'Phiên xem trước lô nhập đã hết hạn. Vui lòng tải lên lại tệp.' });
    }

    const provisionedPins: Array<{ studentCode: string; fullName: string; classCode: string; pin: string }> = [];
    const preparedHashes: Array<{ row: (typeof pending.validRows)[number]; pinHash: string | null; plainPin: string | null }> = [];

    for (const row of pending.validRows) {
      const existing = Object.values(dbSnapshot.studentCredentials).find(
        (c) => c.classCode.toUpperCase() === row.classCode.toUpperCase() && c.studentCode.toUpperCase() === row.studentCode.toUpperCase(),
      );
      if (existing) {
        // Existing student: keep existing PIN (never overwrite existing PIN during bulk import!)
        preparedHashes.push({ row, pinHash: null, plainPin: null });
      } else {
        const pin = row.pin || generateSecurePin6();
        const pinHash = await hashPinArgon2id(pin);
        preparedHashes.push({ row, pinHash, plainPin: pin });
      }
    }

    let createdCount = 0;
    let updatedCount = 0;
    const touchedClasses = new Set<string>();
    const now = new Date().toISOString();

    await runStoreTransaction((db) => {
      if (db.imports[batchId]) return;

      let nickCounter = Object.keys(db.users).length;
      for (const item of preparedHashes) {
        const { row, pinHash, plainPin } = item;
        const cls = Object.values(db.classes).find((c) => c.code.toUpperCase() === row.classCode.toUpperCase());
        if (!cls || !assertTeacherClassAccess(teacher, cls.id)) continue;
        touchedClasses.add(cls.id);

        const existingCred = Object.values(db.studentCredentials).find(
          (c) => c.classId === cls.id && c.studentCode.toUpperCase() === row.studentCode.toUpperCase(),
        );

        if (existingCred) {
          const u = db.users[existingCred.uid];
          if (u) {
            u.fullName = row.fullName;
            u.gender = row.gender;
            u.updatedAt = now;
            updatedCount++;
          }
        } else {
          nickCounter++;
          const uid = `stu-${cls.code.toLowerCase()}-${row.studentCode.toLowerCase()}-${crypto.randomUUID().slice(0, 4)}`;
          const { nickname, avatarId } = pickNicknameAndAvatar(nickCounter);
          db.users[uid] = {
            uid,
            role: 'student',
            fullName: row.fullName,
            nickname,
            avatarId,
            gender: row.gender,
            studentCode: row.studentCode,
            classId: cls.id,
            classCode: cls.code,
            locked: false,
            totalXp: 0,
            unlockedBadges: [],
            createdAt: now,
            updatedAt: now,
          };
          db.classMemberships[`${cls.id}_${uid}`] = {
            id: `${cls.id}_${uid}`,
            classId: cls.id,
            uid,
            role: 'student',
            studentCode: row.studentCode,
            active: true,
            createdAt: now,
          };
          db.studentCredentials[uid] = {
            uid,
            classId: cls.id,
            classCode: cls.code,
            studentCode: row.studentCode,
            pinHash: pinHash!,
            updatedAt: now,
          };
          createdCount++;
          if (plainPin) {
            provisionedPins.push({
              studentCode: row.studentCode,
              fullName: row.fullName,
              classCode: cls.code,
              pin: plainPin,
            });
          }
        }
      }

      db.imports[batchId] = {
        batchId,
        teacherUid: teacher.uid,
        fileName: pending.fileName,
        createdCount,
        updatedCount,
        createdAt: now,
      };
    });

    pendingImports.delete(batchId);
    for (const cId of touchedClasses) {
      await broadcastClassUpdate(cId);
    }

    await appendAuditLog({
      actorUid: teacher.uid,
      action: 'IMPORT_STUDENTS',
      targetType: 'import',
      targetId: batchId,
      summary: `Nhập danh sách ${pending.fileName}: tạo mới ${createdCount}, cập nhật ${updatedCount}.`,
    });

    return res.json({
      ok: true,
      idempotentReplay: false,
      batchId,
      createdCount,
      updatedCount,
      provisionedPins,
    });
  });

  router.get('/teacher/students/sample-xlsx', requireAuth, requireRole('teacher', 'admin'), (_req: AuthedRequest, res: Response) => {
    const rows = [
      ['Mã học sinh', 'Họ và tên', 'Giới tính', 'Lớp', 'Mã PIN'],
      ['HS011', 'Nguyễn Bảo An', 'Nữ', '4A2', '012345'],
      ['HS012', 'Nguyễn Bảo An', 'Nam', '4A2', '007890'],
      ['HS013', 'Trần Hoàng Minh', 'Nam', '4A2', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Explicitly enforce Text cell format '@' on Mã học sinh & Mã PIN so leading zeros stay intact!
    for (let r = 1; r < rows.length; r++) {
      for (const c of [0, 4]) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) {
          ws[ref].t = 's';
          ws[ref].z = '@';
        }
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="mau-nhap-hoc-sinh.xlsx"');
    res.send(buf);
  });

  router.get('/teacher/students/sample-csv', requireAuth, requireRole('teacher', 'admin'), (_req: AuthedRequest, res: Response) => {
    const csvLines = [
      'Mã học sinh,Họ và tên,Giới tính,Lớp,Mã PIN',
      'HS011,Nguyễn Bảo An,Nữ,4A2,012345',
      'HS012,Nguyễn Bảo An,Nam,4A2,007890',
      'HS013,Trần Hoàng Minh,Nam,4A2,',
    ].join('\n');
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mau-nhap-hoc-sinh.csv"');
    res.send(bom + csvLines);
  });

  router.get('/teacher/reports/export.xlsx', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const classId = String(req.query.classId ?? '');
    if (!classId || !assertTeacherClassAccess(teacher, classId)) {
      return res.status(403).json({ error: 'Không có quyền xuất báo cáo cho lớp này.' });
    }
    const db = await loadStore();
    const cls = db.classes[classId];
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy lớp.' });

    const students = Object.values(db.users)
      .filter((u) => u.role === 'student' && u.classId === classId)
      .sort((a, b) => (a.studentCode ?? '').localeCompare(b.studentCode ?? ''));

    const header = [
      'Mã học sinh',
      'Họ và tên',
      'Biệt danh',
      'Lớp',
      'Tổng XP',
      'Hạng',
      'Bài đã thực hành',
      'Điểm Đố vui cao nhất (%)',
      'Trạng thái tài khoản',
    ];
    const dataRows = students.map((s) => {
      const progs = Object.values(db.progress).filter((p) => p.uid === s.uid);
      const completedCount = progs.filter((p) => p.practiceCompleted).length;
      const bestQuiz = progs.reduce((max, p) => Math.max(max, p.quizBestPercent ?? 0), 0);
      return [
        sanitizeExportCell(s.studentCode ?? ''),
        sanitizeExportCell(s.fullName),
        sanitizeExportCell(s.nickname),
        sanitizeExportCell(cls.code),
        s.totalXp,
        sanitizeExportCell(getRankForXp(s.totalXp).name),
        completedCount,
        bestQuiz,
        s.locked ? 'Đã khóa' : 'Hoạt động',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `BaoCao_${cls.code}`);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bao-cao-tien-do-${cls.code}.xlsx"`);
    res.send(buf);
  });

  router.post('/teacher/assignments', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const classId = String(req.body?.classId ?? '');
    const lessonId = String(req.body?.lessonId ?? '');
    const mode = req.body?.mode === 'test' ? 'test' : 'practice';
    const revealAnswersPolicy =
      req.body?.revealAnswersPolicy === 'after_due' || req.body?.revealAnswersPolicy === 'after_submit'
        ? req.body.revealAnswersPolicy
        : 'immediate';
    const dueAt = req.body?.dueAt ? String(req.body.dueAt) : null;

    if (!assertTeacherClassAccess(teacher, classId)) {
      return res.status(403).json({ error: 'Không có quyền giao bài cho lớp này.' });
    }

    const db = await loadStore();
    const lesson = db.lessons[lessonId];
    if (!lesson || lesson.publishStatus !== 'published' || lesson.sourceStatus !== 'complete') {
      return res.status(400).json({ error: 'Chỉ được giao những bài học đã đủ trang SGK và đã xuất bản.' });
    }

    const id = `asg-${classId}-${lessonId}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const assignment = {
      id,
      classId,
      lessonId,
      versionId: lesson.versionId,
      title: String(req.body?.title || `Bài ${lesson.lessonNumber}: ${lesson.title}`),
      mode,
      openAt: String(req.body?.openAt || now),
      dueAt,
      revealAnswersPolicy,
      createdBy: teacher.uid,
      createdAt: now,
    } as const;

    await runStoreTransaction((d) => {
      d.assignments[id] = assignment;
    });
    await broadcastClassUpdate(classId);

    return res.json({ assignment });
  });

  router.post('/teacher/lessons/:lessonId/publish', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { lessonId } = req.params;
    const nextStatus = req.body?.publishStatus as 'draft' | 'approved' | 'published';
    const db = await loadStore();
    const lesson = db.lessons[lessonId];
    if (!lesson) return res.status(404).json({ error: 'Không tìm thấy bài học.' });

    if (nextStatus === 'published' || nextStatus === 'approved') {
      const check = canPublishLesson(lesson);
      if (!check.allowed) {
        return res.status(400).json({ error: check.reason });
      }
    }

    await runStoreTransaction((d) => {
      d.lessons[lessonId].publishStatus = nextStatus;
    });
    await appendAuditLog({
      actorUid: teacher.uid,
      action: 'PUBLISH_LESSON',
      targetType: 'lesson',
      targetId: lessonId,
      summary: `Chuyển trạng thái ${lessonId} sang ${nextStatus}.`,
    });
    return res.json({ lesson: (await loadStore()).lessons[lessonId] });
  });

  router.post('/teacher/lessons/:lessonId/questions', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { lessonId } = req.params;
    const prompt = String(req.body?.prompt ?? '').trim();
    const options = Array.isArray(req.body?.options) ? req.body.options.map(String) : [];
    const correctIndex = Number(req.body?.correctIndex ?? 0);
    const explanation = String(req.body?.explanation ?? '').trim();

    if (!prompt || options.length < 2 || !explanation) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ câu hỏi, các lựa chọn và lời giải.' });
    }

    const newQuestion: QuizQuestion = {
      id: `${lessonId}-Q-${Date.now().toString(36)}`,
      lessonId,
      type: 'single_choice',
      prompt,
      options,
      correctAnswer: correctIndex,
      explanation,
    };

    await runStoreTransaction((d) => {
      d.questionKeys[lessonId] ??= [];
      d.questionKeys[lessonId].push(newQuestion);
    });
    await appendAuditLog({
      actorUid: teacher.uid,
      action: 'ADD_QUESTION',
      targetType: 'lesson',
      targetId: lessonId,
      summary: `Thêm câu hỏi mới cho bài ${lessonId}.`,
    });
    return res.json({ question: newQuestion });
  });

  router.post('/teacher/leaderboard/reconcile', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const classId = String(req.body?.classId ?? '');
    if (!assertTeacherClassAccess(teacher, classId)) {
      return res.status(403).json({ error: 'Không có quyền đối soát lớp này.' });
    }
    const top = await reconcileClassLeaderboard(classId);
    await broadcastClassUpdate(classId);
    return res.json({ ok: true, top });
  });

  // ==================== ARENA WAITING ROOM & MATCH ENDPOINTS ====================

  function collectArenaQuizQuestions(db: Awaited<ReturnType<typeof loadStore>>, room: ArenaRoom): QuizQuestion[] {
    const targetCount = Math.max(1, Math.min(20, room.itemCount || 10));
    const primary = db.questionKeys[room.lessonId] ?? SAMPLE_LESSONS[room.lessonId]?.questions ?? [];
    const seen = new Set(primary.map((q) => q.id));
    const combined: QuizQuestion[] = [...primary];

    if (combined.length < targetCount) {
      const primaryLesson = db.lessons[room.lessonId];
      const allLessonIds = Object.keys(db.questionKeys).sort((a, b) => {
        const la = db.lessons[a];
        const lb = db.lessons[b];
        const aSameGrade = la && primaryLesson && la.grade === primaryLesson.grade ? 0 : 1;
        const bSameGrade = lb && primaryLesson && lb.grade === primaryLesson.grade ? 0 : 1;
        if (aSameGrade !== bSameGrade) return aSameGrade - bSameGrade;
        return a.localeCompare(b);
      });
      for (const lid of allLessonIds) {
        if (lid === room.lessonId) continue;
        for (const q of db.questionKeys[lid] ?? []) {
          if (!seen.has(q.id)) {
            seen.add(q.id);
            combined.push(q);
            if (combined.length >= targetCount) break;
          }
        }
        if (combined.length >= targetCount) break;
      }
    }
    return combined.slice(0, targetCount);
  }

  function collectArenaGameTasks(db: Awaited<ReturnType<typeof loadStore>>, room: ArenaRoom): PracticeTaskItem[] {
    const targetCount = Math.max(1, Math.min(12, room.itemCount || 5));
    const primaryBundle = SAMPLE_LESSONS[room.lessonId];
    const fromTasks = primaryBundle?.practiceTasks ?? [];
    const items: PracticeTaskItem[] = [...fromTasks];
    const seenIds = new Set(items.map((t) => t.id));

    // Supplement from single-choice quiz questions or other practice tasks so game always has rich interactive rounds
    const qList = collectArenaQuizQuestions(db, room);
    for (const q of qList) {
      if (q.type === 'single_choice' && q.options && q.options.length >= 2) {
        const tid = `arena-game-${q.id}`;
        if (!seenIds.has(tid)) {
          seenIds.add(tid);
          items.push({
            id: tid,
            prompt: q.prompt,
            options: q.options,
            correctIndex: Number(q.correctAnswer),
            hint: q.hint || 'Hãy suy nghĩ nhanh và chọn đáp án đúng nhất nhé!',
          });
        }
      }
      if (items.length >= targetCount) break;
    }

    if (items.length < targetCount) {
      for (const bundle of Object.values(SAMPLE_LESSONS)) {
        for (const t of bundle.practiceTasks ?? []) {
          if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            items.push(t);
            if (items.length >= targetCount) break;
          }
        }
        if (items.length >= targetCount) break;
      }
    }
    return items.slice(0, targetCount);
  }

  router.get('/student/arena/rooms', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const rooms = await buildArenaRoomsForUser(req.authUser!.uid);
    return res.json({ rooms, serverNow: new Date().toISOString() });
  });

  router.get('/student/arena/rooms/:roomId', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const { roomId } = req.params;
    const db = await loadStore();
    const rawRoom = db.arenaRooms?.[roomId];
    if (!rawRoom) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }
    const room = normalizeArenaRoomDefaults(rawRoom);
    const teacherAssigned = db.users[room.teacherUid]?.assignedClassIds;
    if (!isArenaVisibleToStudent(room, user.classId, teacherAssigned) && !room.participants.some((p) => p.uid === user.uid)) {
      return res.status(403).json({ error: 'Phòng đấu trường này không dành cho lớp của em.' });
    }

    const questions = room.mode === 'quiz' ? toPublicQuestions(collectArenaQuizQuestions(db, room)) : [];
    const gameTasks =
      room.mode === 'game'
        ? collectArenaGameTasks(db, room).map(({ id, prompt, options, hint }) => ({
            id,
            prompt,
            options,
            hint,
          }))
        : [];

    return res.json({
      room: sanitizeArenaRoomForStudent(room),
      serverNow: new Date().toISOString(),
      questions,
      gameTasks,
    });
  });

  router.post('/student/arena/rooms/join-by-code', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const inputCode = String(req.body?.roomCode ?? '').trim();
    if (!inputCode) {
      return res.status(400).json({ error: 'Em hãy nhập mã phòng trước khi vào nhé.' });
    }

    const db = await loadStore();
    const matchedRaw = Object.values(db.arenaRooms ?? {})
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find((r) => matchesArenaRoomCode(r.roomCode, inputCode));

    if (!matchedRaw) {
      return res.status(404).json({ error: 'Không tìm thấy phòng thi đấu với mã này. Em kiểm tra lại mã phòng nhé!' });
    }

    const room = normalizeArenaRoomDefaults(matchedRaw);
    if (room.status === 'closed') {
      return res.status(400).json({ error: 'Phòng đấu trường này đã kết thúc.' });
    }
    const teacherAssigned = db.users[room.teacherUid]?.assignedClassIds;
    if (!isArenaVisibleToStudent(room, user.classId, teacherAssigned)) {
      return res.status(403).json({ error: 'Phòng đấu trường này không dành cho lớp của em.' });
    }

    const alreadyJoined = room.participants.some((p) => p.uid === user.uid);
    if (!alreadyJoined && room.status === 'started') {
      return res.status(409).json({ error: 'Trận đấu đã bắt đầu rồi, em không thể vào muộn.' });
    }
    if (isArenaRoomFull(room, user.uid)) {
      return res.status(409).json({ error: 'Phòng thi đấu đã đủ sĩ số rồi.' });
    }

    const now = new Date().toISOString();
    const updated = await runStoreTransaction((d) => {
      const target = d.arenaRooms[room.id];
      if (!target) return null;
      const normalized = normalizeArenaRoomDefaults(target);
      if (isArenaRoomFull(normalized, user.uid)) return 'FULL' as const;
      normalized.participants = upsertArenaParticipant(normalized.participants, {
        uid: user.uid,
        studentCode: user.studentCode ?? '',
        fullName: user.fullName,
        nickname: user.nickname,
        avatarId: user.avatarId,
        classId: user.classId ?? '',
        classCode: user.classCode ?? '',
        joinedAt: now,
      });
      d.arenaRooms[room.id] = normalized;
      return { ...normalized };
    });

    if (updated === 'FULL') {
      return res.status(409).json({ error: 'Phòng thi đấu đã đủ sĩ số rồi.' });
    }
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }

    await broadcastArenaUpdate();
    return res.json({
      room: sanitizeArenaRoomForStudent(updated),
      serverNow: now,
    });
  });

  router.post('/student/arena/rooms/:roomId/join', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const { roomId } = req.params;
    const db = await loadStore();
    const rawRoom = db.arenaRooms?.[roomId];
    if (!rawRoom) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }
    const room = normalizeArenaRoomDefaults(rawRoom);
    if (room.status === 'closed') {
      return res.status(400).json({ error: 'Phòng đấu trường này đã kết thúc.' });
    }
    const teacherAssigned = db.users[room.teacherUid]?.assignedClassIds;
    if (!isArenaVisibleToStudent(room, user.classId, teacherAssigned)) {
      return res.status(403).json({ error: 'Phòng đấu trường này không dành cho lớp của em.' });
    }
    const alreadyJoined = room.participants.some((p) => p.uid === user.uid);
    if (!alreadyJoined && room.status === 'started') {
      return res.status(409).json({ error: 'Trận đấu đã bắt đầu rồi, em không thể vào muộn.' });
    }
    if (isArenaRoomFull(room, user.uid)) {
      return res.status(409).json({ error: 'Phòng thi đấu đã đủ sĩ số rồi.' });
    }

    const now = new Date().toISOString();
    const updated = await runStoreTransaction((d) => {
      const target = d.arenaRooms[roomId];
      if (!target) return null;
      const normalized = normalizeArenaRoomDefaults(target);
      if (isArenaRoomFull(normalized, user.uid)) return 'FULL' as const;
      normalized.participants = upsertArenaParticipant(normalized.participants, {
        uid: user.uid,
        studentCode: user.studentCode ?? '',
        fullName: user.fullName,
        nickname: user.nickname,
        avatarId: user.avatarId,
        classId: user.classId ?? '',
        classCode: user.classCode ?? '',
        joinedAt: now,
      });
      d.arenaRooms[roomId] = normalized;
      return { ...normalized };
    });

    if (updated === 'FULL') {
      return res.status(409).json({ error: 'Phòng thi đấu đã đủ sĩ số rồi.' });
    }
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }

    await broadcastArenaUpdate();
    return res.json({
      room: sanitizeArenaRoomForStudent(updated),
      serverNow: now,
    });
  });

  router.post('/student/arena/rooms/:roomId/ready', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const { roomId } = req.params;
    const ready = Boolean(req.body?.ready);
    const db = await loadStore();
    const rawRoom = db.arenaRooms?.[roomId];
    if (!rawRoom) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }
    const room = normalizeArenaRoomDefaults(rawRoom);
    if (room.status === 'closed') {
      return res.status(400).json({ error: 'Phòng đấu trường này đã kết thúc.' });
    }
    if (room.status === 'started') {
      return res.status(409).json({ error: 'Giáo viên đã bấm bắt đầu trận đấu rồi!' });
    }
    const teacherAssigned = db.users[room.teacherUid]?.assignedClassIds;
    if (!isArenaVisibleToStudent(room, user.classId, teacherAssigned)) {
      return res.status(403).json({ error: 'Phòng đấu trường này không dành cho lớp của em.' });
    }
    if (!room.participants.some((p) => p.uid === user.uid)) {
      return res.status(409).json({ error: 'Em cần vào phòng chờ trước khi bấm sẵn sàng.' });
    }

    const now = new Date().toISOString();
    const updated = await runStoreTransaction((d) => {
      const target = d.arenaRooms[roomId];
      if (!target) return null;
      const normalized = normalizeArenaRoomDefaults(target);
      normalized.participants = setArenaParticipantReady(normalized.participants, user.uid, ready, now);
      d.arenaRooms[roomId] = normalized;
      return { ...normalized };
    });

    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }

    await broadcastArenaUpdate();
    return res.json({
      room: sanitizeArenaRoomForStudent(updated),
      serverNow: now,
    });
  });

  router.post('/student/arena/rooms/:roomId/submit', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const { roomId } = req.params;
    const db = await loadStore();
    const rawRoom = db.arenaRooms?.[roomId];
    if (!rawRoom) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }
    const room = normalizeArenaRoomDefaults(rawRoom);
    if (room.status !== 'started') {
      return res.status(409).json({ error: 'Trận đấu chưa bắt đầu hoặc đã đóng.' });
    }
    if (!room.participants.some((p) => p.uid === user.uid)) {
      return res.status(403).json({ error: 'Em chưa tham gia phòng đấu trường này.' });
    }

    const nowIso = new Date().toISOString();
    let score = 0;
    let total = room.itemCount;
    let scorePercent = 0;
    let results: ReturnType<typeof gradeQuizAnswers>['results'] | undefined;

    if (room.mode === 'quiz') {
      const answers = (req.body?.answers ?? {}) as Record<string, unknown>;
      const questions = collectArenaQuizQuestions(db, room);
      const graded = gradeQuizAnswers(questions, answers, true);
      score = graded.correctCount;
      total = graded.totalCount;
      scorePercent = graded.scorePercent;
      results = graded.results;
    } else {
      const gameAnswers = req.body?.gameAnswers as Record<string, number> | undefined;
      const tasks = collectArenaGameTasks(db, room);
      total = tasks.length;
      if (gameAnswers && typeof gameAnswers === 'object') {
        score = tasks.reduce((acc, t) => (Number(gameAnswers[t.id]) === t.correctIndex ? acc + 1 : acc), 0);
      } else {
        score = Math.max(0, Math.min(total, Number(req.body?.gameScore ?? 0)));
      }
      scorePercent = total > 0 ? Math.round((score / total) * 100) : 0;
    }

    const updated = await runStoreTransaction((d) => {
      const target = d.arenaRooms[roomId];
      if (!target) return null;
      const normalized = normalizeArenaRoomDefaults(target);
      normalized.participants = submitArenaParticipantResult(normalized.participants, user.uid, score, total, nowIso);
      d.arenaRooms[roomId] = normalized;
      return { ...normalized };
    });

    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }

    await broadcastArenaUpdate();
    return res.json({
      score,
      total,
      scorePercent,
      results,
      room: sanitizeArenaRoomForStudent(updated),
      serverNow: nowIso,
    });
  });

  router.post('/student/arena/rooms/:roomId/leave', requireAuth, requireRole('student'), async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const { roomId } = req.params;
    const db = await loadStore();
    if (!db.arenaRooms?.[roomId]) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }

    await runStoreTransaction((d) => {
      const target = d.arenaRooms[roomId];
      if (target) {
        target.participants = removeArenaParticipant(target.participants, user.uid);
      }
    });

    await broadcastArenaUpdate();
    return res.json({ ok: true });
  });

  router.post('/teacher/arena/rooms', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const scope: ArenaScope = req.body?.scope === 'shared' ? 'shared' : 'class';
    const mode: ArenaMode = req.body?.mode === 'game' ? 'game' : 'quiz';
    const classId = String(req.body?.classId ?? '').trim();
    const lessonId = String(req.body?.lessonId ?? '').trim();
    const customTitle = String(req.body?.title ?? '').trim();
    const rawItemCount = Number(req.body?.itemCount ?? (mode === 'game' ? 5 : 10));
    const itemCount = Number.isFinite(rawItemCount) ? Math.max(1, Math.min(20, Math.round(rawItemCount))) : mode === 'game' ? 5 : 10;
    const rawMaxParticipants = Number(req.body?.maxParticipants ?? DEFAULT_ARENA_MAX_PARTICIPANTS);
    const maxParticipants = Number.isFinite(rawMaxParticipants)
      ? Math.max(2, Math.min(50, Math.round(rawMaxParticipants)))
      : DEFAULT_ARENA_MAX_PARTICIPANTS;

    const db = await loadStore();
    const lesson = db.lessons[lessonId];
    if (!lesson || lesson.publishStatus !== 'published' || lesson.sourceStatus !== 'complete') {
      return res.status(400).json({ error: 'Vui lòng chọn bài học đã xuất bản để mở phòng thi đấu.' });
    }

    let resolvedClassId = 'shared';
    let resolvedClassCode = 'Chung khối 3–4–5';
    if (scope === 'class') {
      const cls = db.classes[classId];
      if (!cls || !assertTeacherClassAccess(teacher, classId)) {
        return res.status(403).json({ error: 'Không có quyền mở phòng thi đấu cho lớp này.' });
      }
      resolvedClassId = cls.id;
      resolvedClassCode = cls.code;
    } else {
      const myClasses = Object.values(db.classes).filter((c) => assertTeacherClassAccess(teacher, c.id));
      if (myClasses.length === 0) {
        return res.status(400).json({ error: 'Giáo viên chưa được phân công lớp nào.' });
      }
      resolvedClassCode = `Chung (${myClasses.map((c) => c.code).join(' · ')})`;
    }

    const nowMs = Date.now();
    const waitingDurationSec = DEFAULT_ARENA_WAITING_SEC;
    const countdownSec = DEFAULT_ARENA_COUNTDOWN_SEC;
    const nowIso = new Date(nowMs).toISOString();
    const waitingEndsAt = new Date(nowMs + waitingDurationSec * 1000).toISOString();
    const roomId = `arena-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const existingCodes = Object.values(db.arenaRooms ?? {}).map((r) => r.roomCode);
    const roomCode = generateNumericRoomCode(existingCodes);

    const newRoom: ArenaRoom = {
      id: roomId,
      roomCode,
      title: customTitle || `Đấu trường: ${lesson.title}`,
      lessonId: lesson.id,
      lessonTitle:
        lesson.scope === 'common'
          ? `${lesson.lessonNumber}: ${lesson.title}`
          : `Lớp ${lesson.grade} · Bài ${lesson.lessonNumber}: ${lesson.title}`,
      classId: resolvedClassId,
      classCode: resolvedClassCode,
      scope,
      mode,
      itemCount,
      maxParticipants,
      teacherUid: teacher.uid,
      teacherName: teacher.fullName,
      status: 'waiting',
      waitingDurationSec,
      countdownSec,
      createdAt: nowIso,
      waitingEndsAt,
      countdownEndsAt: null,
      startedAt: null,
      closedAt: null,
      participants: [],
    };

    await runStoreTransaction((d) => {
      d.arenaRooms ??= {};
      d.arenaRooms[roomId] = newRoom;
    });

    await appendAuditLog({
      actorUid: teacher.uid,
      action: 'OPEN_ARENA_ROOM',
      targetType: 'arena',
      targetId: roomId,
      summary: `Mở phòng đấu trường "${newRoom.title}" (${resolvedClassCode}) · Mã ${roomCode}.`,
    });
    await broadcastArenaUpdate();

    return res.json({ room: newRoom, serverNow: nowIso });
  });

  router.post('/teacher/arena/rooms/:roomId/start', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { roomId } = req.params;
    const db = await loadStore();
    const existing = db.arenaRooms?.[roomId];
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }
    if (teacher.role !== 'admin' && existing.teacherUid !== teacher.uid) {
      return res.status(403).json({ error: 'Chỉ giáo viên mở phòng mới được bắt đầu trận đấu này.' });
    }
    if (existing.status === 'closed') {
      return res.status(400).json({ error: 'Phòng đấu trường đã đóng.' });
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const countdownSec = existing.countdownSec || DEFAULT_ARENA_COUNTDOWN_SEC;
    const countdownEndsIso = new Date(nowMs + countdownSec * 1000).toISOString();

    const updated = await runStoreTransaction((d) => {
      const target = d.arenaRooms[roomId];
      if (!target) return null;
      const normalized = normalizeArenaRoomDefaults(target);
      normalized.status = 'started';
      normalized.startedAt = normalized.startedAt ?? nowIso;
      normalized.countdownSec = countdownSec;
      normalized.countdownEndsAt = normalized.countdownEndsAt ?? countdownEndsIso;
      d.arenaRooms[roomId] = normalized;
      return { ...normalized };
    });

    await appendAuditLog({
      actorUid: teacher.uid,
      action: 'START_ARENA_ROOM',
      targetType: 'arena',
      targetId: roomId,
      summary: `Bấm Bắt đầu thi đấu phòng ${existing.roomCode} (${existing.participants.length} HS).`,
    });
    await broadcastArenaUpdate();

    return res.json({ room: updated, serverNow: nowIso });
  });

  router.post('/teacher/arena/rooms/:roomId/close', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { roomId } = req.params;
    const db = await loadStore();
    const existing = db.arenaRooms?.[roomId];
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy phòng đấu trường.' });
    }
    if (teacher.role !== 'admin' && existing.teacherUid !== teacher.uid) {
      return res.status(403).json({ error: 'Chỉ giáo viên mở phòng mới được đóng phòng này.' });
    }

    const nowIso = new Date().toISOString();
    const updated = await runStoreTransaction((d) => {
      const target = d.arenaRooms[roomId];
      if (!target) return null;
      const normalized = normalizeArenaRoomDefaults(target);
      normalized.status = 'closed';
      normalized.closedAt = nowIso;
      d.arenaRooms[roomId] = normalized;
      return { ...normalized };
    });

    await appendAuditLog({
      actorUid: teacher.uid,
      action: 'CLOSE_ARENA_ROOM',
      targetType: 'arena',
      targetId: roomId,
      summary: `Đóng phòng đấu trường ${existing.roomCode}.`,
    });
    await broadcastArenaUpdate();

    return res.json({ room: updated, serverNow: nowIso });
  });

  // ==================== SAME-ORIGIN SSE STREAMS ====================

  router.get('/sse/arena', requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await registerSseClient({
      uid: user.uid,
      role: user.role,
      sessionId: req.authSessionId!,
      rawDeviceToken: req.authRawDeviceToken!,
      classId: user.classId ?? '',
      channel: 'arena',
      expiresAtMs: req.authExpiresAtMs!,
      res,
    });
  });

  router.get('/sse/leaderboard', requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const classId = String(req.query.classId ?? user.classId ?? '');
    const allowed =
      user.role === 'student' ? user.classId === classId : assertTeacherClassAccess(user, classId);
    if (!classId || !allowed) {
      return res.status(403).json({ error: 'Không có quyền xem bảng xếp hạng lớp này.' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await registerSseClient({
      uid: user.uid,
      role: user.role,
      sessionId: req.authSessionId!,
      rawDeviceToken: req.authRawDeviceToken!,
      classId,
      channel: 'leaderboard',
      expiresAtMs: req.authExpiresAtMs!,
      res,
    });
  });

  router.get('/sse/teacher-progress', requireAuth, requireRole('teacher', 'admin'), async (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const classId = String(req.query.classId ?? '');
    if (!classId || !assertTeacherClassAccess(teacher, classId)) {
      return res.status(403).json({ error: 'Không có quyền theo dõi tiến độ lớp này.' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await registerSseClient({
      uid: teacher.uid,
      role: teacher.role,
      sessionId: req.authSessionId!,
      rawDeviceToken: req.authRawDeviceToken!,
      classId,
      channel: 'teacher_progress',
      expiresAtMs: req.authExpiresAtMs!,
      res,
    });
  });

  return router;
}
