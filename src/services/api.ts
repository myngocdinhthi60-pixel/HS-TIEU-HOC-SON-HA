import type {
  ArenaMode,
  ArenaRoom,
  ArenaScope,
  Assignment,
  AttemptDraft,
  AttemptRecord,
  BranchSelection,
  ClassRoom,
  ImportPreviewResult,
  LeaderboardEntry,
  LessonCatalogItem,
  ProgressRecord,
  PublicQuizQuestion,
  QuizQuestion,
  QuizQuestionResult,
  RankTier,
  StudentAnalyticsSummary,
} from '../shared/types';
import type { SampleLessonBundle } from '../shared/lessonContent';

export interface ClientUser {
  uid: string;
  role: 'student' | 'teacher' | 'admin';
  fullName: string;
  nickname: string;
  avatarId: string;
  email?: string;
  studentCode?: string;
  classId?: string;
  classCode?: string;
  assignedClassIds?: string[];
  totalXp: number;
  unlockedBadges: string[];
  rank: RankTier;
}

export interface LeaderboardSnapshot {
  enabled: boolean;
  weekKey: string;
  top: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
}

export interface StudentDashboardData {
  user: ClientUser;
  classInfo: ClassRoom;
  lessons: LessonCatalogItem[];
  commonLessons: LessonCatalogItem[];
  upcomingGradeLessons: LessonCatalogItem[];
  assignments: Assignment[];
  progress: ProgressRecord[];
  attempts: Array<{
    id: string;
    lessonId: string;
    status: string;
    practicePassed: boolean;
    minigamePassed: boolean;
    quizScorePercent: number | null;
    quizPassed: boolean;
    updatedAt: string;
  }>;
  analytics: StudentAnalyticsSummary;
  leaderboard: LeaderboardSnapshot;
  arenaRooms: ArenaRoom[];
  serverNow: string;
}

export interface LessonWorkspaceData {
  lesson: LessonCatalogItem;
  assignment: Assignment | null;
  bundle: Omit<SampleLessonBundle, 'questions'> | null;
  questions: PublicQuizQuestion[];
  attempt: AttemptRecord;
  canRevealSolutions: boolean;
}

export interface TeacherOverviewData {
  teacher: ClientUser;
  classes: ClassRoom[];
  students: Array<{
    uid: string;
    studentCode?: string;
    fullName: string;
    nickname: string;
    avatarId: string;
    gender?: string;
    classId?: string;
    classCode?: string;
    totalXp: number;
    unlockedBadges: string[];
    locked: boolean;
  }>;
  lessons: LessonCatalogItem[];
  questionBank: Record<string, QuizQuestion[]>;
  assignments: Assignment[];
  progress: ProgressRecord[];
  leaderboards: Record<string, LeaderboardSnapshot>;
  arenaRooms: ArenaRoom[];
  serverNow: string;
  auditLogs: Array<{ id: string; actorUid: string; action: string; summary: string; createdAt: string }>;
}

export class ApiError extends Error {
  status: number;
  data?: Record<string, unknown>;
  constructor(status: number, message: string, data?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }
  if (!res.ok) {
    const fallbackMsg =
      res.status === 404
        ? 'Không tìm thấy máy chủ xử lý (/api). Vui lòng tải lại trang hoặc khởi động lại server.'
        : res.status === 403
          ? 'Yêu cầu bị từ chối bởi bảo mật phiên (HTTP 403). Vui lòng tải lại trang.'
          : `Lỗi máy chủ (HTTP ${res.status}). Vui lòng thử lại sau giây lát.`;
    throw new ApiError(res.status, String(parsed.error || fallbackMsg), parsed);
  }
  return parsed as T;
}

export const api = {
  getSession: () =>
    requestJson<{
      authenticated: boolean;
      user: ClientUser | null;
      classInfo: ClassRoom | null;
      expiresAt: string | null;
    }>('/api/auth/session'),

  getMe: () =>
    requestJson<{ user: ClientUser; classInfo: ClassRoom | null; expiresAt: string }>('/api/auth/me'),

  studentLogin: (payload: { classCode: string; studentCode: string; pin: string; personalDevice: boolean }) =>
    requestJson<{ user: ClientUser; expiresAt: string; deviceType: string }>('/api/auth/student-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  teacherLogin: (payload: { email: string; password: string }) =>
    requestJson<{ user: ClientUser; expiresAt: string }>('/api/auth/teacher-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () => requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  getStudentDashboard: () => requestJson<StudentDashboardData>('/api/student/dashboard'),

  getStudentLesson: (lessonId: string) => requestJson<LessonWorkspaceData>(`/api/student/lessons/${lessonId}`),

  autosaveAttempt: (lessonId: string, revision: number, draft: AttemptDraft) =>
    requestJson<{ ok: boolean; revision: number; updatedAt: string }>(`/api/student/attempts/${lessonId}/autosave`, {
      method: 'POST',
      body: JSON.stringify({ revision, draft }),
    }),

  submitPractice: (lessonId: string, draft: AttemptDraft) =>
    requestJson<{
      passed: boolean;
      feedback: string;
      checks: Array<{ id: string; label: string; ok: boolean; hint: string }>;
      revision?: number;
      awardedXp: number;
      alreadyAwarded: boolean;
      unlockedBadge: { id: string; name: string } | null;
      user: ClientUser;
    }>(`/api/student/attempts/${lessonId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ stage: 'practice', draft }),
    }),

  submitMinigame: (lessonId: string, roundsCompleted: number, score: number) =>
    requestJson<{
      passed: boolean;
      feedback: string;
      revision?: number;
      awardedXp: number;
      alreadyAwarded: boolean;
      user: ClientUser;
    }>(`/api/student/attempts/${lessonId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ stage: 'minigame', roundsCompleted, score }),
    }),

  submitQuiz: (lessonId: string, answers: Record<string, unknown>) =>
    requestJson<{
      scorePercent: number;
      correctCount: number;
      totalCount: number;
      passed: boolean;
      results: QuizQuestionResult[];
      solutionsVisible: boolean;
      revision?: number;
      awardedXp: number;
      alreadyAwarded: boolean;
      user: ClientUser;
    }>(`/api/student/attempts/${lessonId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ stage: 'quiz', answers }),
    }),

  getTeacherOverview: () => requestJson<TeacherOverviewData>('/api/teacher/overview'),

  updateClassSettings: (
    classId: string,
    payload: { leaderboardEnabled?: boolean; branchSelection?: BranchSelection },
  ) =>
    requestJson<{ classInfo: ClassRoom }>(`/api/teacher/classes/${classId}/settings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetStudentPin: (uid: string, newPin?: string) =>
    requestJson<{ ok: boolean; uid: string; studentCode: string; classCode: string; oneTimePin: string }>(
      `/api/teacher/students/${uid}/reset-pin`,
      {
        method: 'POST',
        body: JSON.stringify(newPin ? { newPin } : {}),
      },
    ),

  toggleStudentLock: (uid: string, locked: boolean) =>
    requestJson<{ ok: boolean; uid: string; locked: boolean }>(`/api/teacher/students/${uid}/toggle-lock`, {
      method: 'POST',
      body: JSON.stringify({ locked }),
    }),

  updateStudentProfile: (uid: string, payload: { fullName: string; gender: string; classId: string }) =>
    requestJson<{ ok: boolean }>(`/api/teacher/students/${uid}/update`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  previewImport: (fileName: string, base64Content: string) =>
    requestJson<ImportPreviewResult>('/api/teacher/students/import/preview', {
      method: 'POST',
      body: JSON.stringify({ fileName, base64Content }),
    }),

  confirmImport: (batchId: string) =>
    requestJson<{
      ok: boolean;
      idempotentReplay: boolean;
      batchId: string;
      createdCount: number;
      updatedCount: number;
      provisionedPins: Array<{ studentCode: string; fullName: string; classCode: string; pin: string }>;
    }>('/api/teacher/students/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ batchId }),
    }),

  createAssignment: (payload: {
    classId: string;
    lessonId: string;
    title: string;
    mode: 'practice' | 'test';
    revealAnswersPolicy: 'immediate' | 'after_submit' | 'after_due';
    dueAt: string | null;
  }) =>
    requestJson<{ assignment: Assignment }>('/api/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  publishLesson: (lessonId: string, publishStatus: 'draft' | 'approved' | 'published') =>
    requestJson<{ lesson: LessonCatalogItem }>(`/api/teacher/lessons/${lessonId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ publishStatus }),
    }),

  addQuestion: (
    lessonId: string,
    payload: { prompt: string; options: string[]; correctIndex: number; explanation: string },
  ) =>
    requestJson<{ question: QuizQuestion }>(`/api/teacher/lessons/${lessonId}/questions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reconcileLeaderboard: (classId: string) =>
    requestJson<{ ok: boolean; top: LeaderboardEntry[] }>('/api/teacher/leaderboard/reconcile', {
      method: 'POST',
      body: JSON.stringify({ classId }),
    }),

  getStudentArenaRooms: () =>
    requestJson<{ rooms: ArenaRoom[]; serverNow: string }>('/api/student/arena/rooms'),

  getStudentArenaRoomDetail: (roomId: string) =>
    requestJson<{
      room: ArenaRoom;
      serverNow: string;
      questions: PublicQuizQuestion[];
      gameTasks: Array<{ id: string; prompt: string; options: string[]; hint: string }>;
    }>(`/api/student/arena/rooms/${roomId}`),

  joinArenaRoomByCode: (roomCode: string) =>
    requestJson<{ room: ArenaRoom; serverNow: string }>('/api/student/arena/rooms/join-by-code', {
      method: 'POST',
      body: JSON.stringify({ roomCode }),
    }),

  joinArenaRoom: (roomId: string) =>
    requestJson<{ room: ArenaRoom; serverNow: string }>(`/api/student/arena/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  setArenaReady: (roomId: string, ready: boolean) =>
    requestJson<{ room: ArenaRoom; serverNow: string }>(`/api/student/arena/rooms/${roomId}/ready`, {
      method: 'POST',
      body: JSON.stringify({ ready }),
    }),

  submitArenaResult: (
    roomId: string,
    payload: { answers?: Record<string, unknown>; gameAnswers?: Record<string, number>; gameScore?: number },
  ) =>
    requestJson<{
      score: number;
      total: number;
      scorePercent: number;
      results?: QuizQuestionResult[];
      room: ArenaRoom;
      serverNow: string;
    }>(`/api/student/arena/rooms/${roomId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  leaveArenaRoom: (roomId: string) =>
    requestJson<{ ok: boolean }>(`/api/student/arena/rooms/${roomId}/leave`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  createArenaRoom: (payload: {
    scope: ArenaScope;
    classId?: string;
    lessonId: string;
    title?: string;
    mode?: ArenaMode;
    itemCount?: number;
    maxParticipants?: number;
  }) =>
    requestJson<{ room: ArenaRoom; serverNow: string }>('/api/teacher/arena/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  startArenaRoom: (roomId: string) =>
    requestJson<{ room: ArenaRoom; serverNow: string }>(`/api/teacher/arena/rooms/${roomId}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  closeArenaRoom: (roomId: string) =>
    requestJson<{ room: ArenaRoom; serverNow: string }>(`/api/teacher/arena/rooms/${roomId}/close`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};
