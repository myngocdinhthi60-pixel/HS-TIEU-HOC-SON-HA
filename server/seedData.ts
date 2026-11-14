import { COMMON_LESSONS, CURRICULUM_51 } from '../src/shared/curriculum51';
import { getHoChiMinhWeekKey, makeAwardId, XP_VALUES } from '../src/shared/grading';
import { SAMPLE_LESSONS } from '../src/shared/lessonContent';
import type {
  ArenaRoom,
  Assignment,
  AttemptRecord,
  ClassMembership,
  ClassRoom,
  LeaderboardEntry,
  LeaderboardOutboxEvent,
  LessonCatalogItem,
  ProgressRecord,
  QuizQuestion,
  UserProfile,
  WeeklyScore,
  XpLedgerEntry,
} from '../src/shared/types';
import { getPinPepperFingerprint, hashPassword, hashPinArgon2id } from './crypto';

export interface StudentCredentialRecord {
  uid: string;
  classId: string;
  classCode: string;
  studentCode: string;
  pinHash: string;
  updatedAt: string;
}

export interface DeviceSessionRecord {
  id: string;
  uid: string;
  tokenHash: string;
  deviceType: 'shared' | 'personal' | 'teacher';
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
}

export interface TeacherCredentialRecord {
  uid: string;
  email: string;
  passwordHash: string;
}

export interface ImportBatchRecord {
  batchId: string;
  teacherUid: string;
  fileName: string;
  createdCount: number;
  updatedCount: number;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}

export interface StoreDatabase {
  users: Record<string, UserProfile>;
  classes: Record<string, ClassRoom>;
  classMemberships: Record<string, ClassMembership>;
  studentCredentials: Record<string, StudentCredentialRecord>;
  teacherCredentials: Record<string, TeacherCredentialRecord>;
  deviceSessions: Record<string, DeviceSessionRecord>;
  lessons: Record<string, LessonCatalogItem>;
  questionKeys: Record<string, QuizQuestion[]>;
  assignments: Record<string, Assignment>;
  attempts: Record<string, AttemptRecord>;
  progress: Record<string, ProgressRecord>;
  xpLedger: Record<string, XpLedgerEntry>;
  weeklyScores: Record<string, WeeklyScore>;
  leaderboardOutbox: Record<string, LeaderboardOutboxEvent>;
  rtdbLeaderboards: Record<string, Record<string, Record<string, LeaderboardEntry>>>;
  imports: Record<string, ImportBatchRecord>;
  arenaRooms: Record<string, ArenaRoom>;
  auditLogs: AuditLogEntry[];
  outboxCounter: number;
  seedTimestamp?: string;
  seedPepperFingerprint?: string;
}

const NICKNAME_POOL = [
  'Sóc Nhanh Nhẹn',
  'Cáo Thông Thái',
  'Gấu Chăm Chỉ',
  'Thỏ Tinh Anh',
  'Mèo Ham Học',
  'Voi Cẩn Thận',
  'Hươu Sáng Tạo',
  'Chim Én Nhỏ',
  'Rùa Kiên Trì',
  'Ong Cần Mẫn',
  'Cú Mèo Tinh Mắt',
  'Cá Heo Vui Vẻ',
];

const AVATAR_POOL = ['squirrel', 'fox', 'panda', 'rabbit', 'cat', 'elephant', 'deer', 'bird', 'turtle', 'bee', 'owl', 'dolphin'];

export function pickNicknameAndAvatar(indexSeed: number): { nickname: string; avatarId: string } {
  const idx = Math.abs(indexSeed) % NICKNAME_POOL.length;
  return { nickname: NICKNAME_POOL[idx], avatarId: AVATAR_POOL[idx] };
}

export const DEMO_STUDENTS_SEED = [
  // Lớp 4A2 (Cô Lan Hương · Trọng tâm L4-B5)
  { uid: 'stu-4a2-01', classId: 'class-4a2', classCode: '4A2', studentCode: 'HS001', fullName: 'Nguyễn Thu An', gender: 'Nữ', pin: '012345', nickname: 'Sóc Nhanh Nhẹn', avatarId: 'squirrel' },
  { uid: 'stu-4a2-02', classId: 'class-4a2', classCode: '4A2', studentCode: 'HS002', fullName: 'Lê Đăng Khoa', gender: 'Nam', pin: '004567', nickname: 'Cáo Thông Thái', avatarId: 'fox' },
  { uid: 'stu-4a2-03', classId: 'class-4a2', classCode: '4A2', studentCode: 'HS003', fullName: 'Trần Gia Minh', gender: 'Nam', pin: '089123', nickname: 'Gấu Chăm Chỉ', avatarId: 'panda' },
  { uid: 'stu-4a2-04', classId: 'class-4a2', classCode: '4A2', studentCode: 'HS004', fullName: 'Đỗ Hà My', gender: 'Nữ', pin: '004404', nickname: 'Cú Mèo Tinh Mắt', avatarId: 'owl' },
  { uid: 'stu-4a2-05', classId: 'class-4a2', classCode: '4A2', studentCode: 'HS005', fullName: 'Bùi Gia Huy', gender: 'Nam', pin: '050505', nickname: 'Cá Heo Vui Vẻ', avatarId: 'dolphin' },

  // Lớp 3A1 (Cô Lan Hương · Trọng tâm L3-B5)
  { uid: 'stu-3a1-01', classId: 'class-3a1', classCode: '3A1', studentCode: 'HS301', fullName: 'Phạm Bảo Ngọc', gender: 'Nữ', pin: '024680', nickname: 'Thỏ Tinh Anh', avatarId: 'rabbit' },
  { uid: 'stu-3a1-02', classId: 'class-3a1', classCode: '3A1', studentCode: 'HS302', fullName: 'Nguyễn Minh Khang', gender: 'Nam', pin: '011223', nickname: 'Mèo Ham Học', avatarId: 'cat' },
  { uid: 'stu-3a1-03', classId: 'class-3a1', classCode: '3A1', studentCode: 'HS303', fullName: 'Bùi Khánh Linh', gender: 'Nữ', pin: '033303', nickname: 'Ong Cần Mẫn', avatarId: 'bee' },
  { uid: 'stu-3a1-04', classId: 'class-3a1', classCode: '3A1', studentCode: 'HS304', fullName: 'Ngô Tuấn Kiệt', gender: 'Nam', pin: '003304', nickname: 'Rùa Kiên Trì', avatarId: 'turtle' },

  // Lớp 5A1 (Cô Lan Hương · Nhánh A · Trọng tâm L5-B4)
  { uid: 'stu-5a1-01', classId: 'class-5a1', classCode: '5A1', studentCode: 'HS501', fullName: 'Vũ Hải Anh', gender: 'Nữ', pin: '055667', nickname: 'Voi Cẩn Thận', avatarId: 'elephant' },
  { uid: 'stu-5a1-02', classId: 'class-5a1', classCode: '5A1', studentCode: 'HS502', fullName: 'Hoàng Đức Duy', gender: 'Nam', pin: '099001', nickname: 'Hươu Sáng Tạo', avatarId: 'deer' },
  { uid: 'stu-5a1-03', classId: 'class-5a1', classCode: '5A1', studentCode: 'HS503', fullName: 'Trịnh Ngọc Diệp', gender: 'Nữ', pin: '055303', nickname: 'Ong Cần Mẫn', avatarId: 'bee' },
  { uid: 'stu-5a1-04', classId: 'class-5a1', classCode: '5A1', studentCode: 'HS504', fullName: 'Phan Quốc Bảo', gender: 'Nam', pin: '005504', nickname: 'Rùa Kiên Trì', avatarId: 'turtle' },

  // Lớp 3B2 (Thầy Bình · Lớp riêng biệt kiểm tra phân quyền)
  { uid: 'stu-3b2-01', classId: 'class-3b2', classCode: '3B2', studentCode: 'HS901', fullName: 'Đặng Thảo Vy', gender: 'Nữ', pin: '033445', nickname: 'Chim Én Nhỏ', avatarId: 'bird' },
  { uid: 'stu-3b2-02', classId: 'class-3b2', classCode: '3B2', studentCode: 'HS902', fullName: 'Lý Minh Châu', gender: 'Nữ', pin: '090202', nickname: 'Cá Heo Vui Vẻ', avatarId: 'dolphin' },

  // Lớp 5B1 (Cô Thanh Mai · Nhánh B)
  { uid: 'stu-5b1-01', classId: 'class-5b1', classCode: '5B1', studentCode: 'HS511', fullName: 'Tạ Quang Vinh', gender: 'Nam', pin: '051100', nickname: 'Cáo Thông Thái', avatarId: 'fox' },
  { uid: 'stu-5b1-02', classId: 'class-5b1', classCode: '5B1', studentCode: 'HS512', fullName: 'Võ Minh Thư', gender: 'Nữ', pin: '051200', nickname: 'Thỏ Tinh Anh', avatarId: 'rabbit' },
];

export async function createSeedDatabase(): Promise<StoreDatabase> {
  const now = new Date().toISOString();
  const weekKey = getHoChiMinhWeekKey();

  const classes: Record<string, ClassRoom> = {
    'class-3a1': {
      id: 'class-3a1',
      code: '3A1',
      name: 'Lớp 3A1',
      grade: 3,
      branchSelection: '12A',
      leaderboardEnabled: false,
      teacherUid: 'teacher-main',
      createdAt: now,
      updatedAt: now,
    },
    'class-4a2': {
      id: 'class-4a2',
      code: '4A2',
      name: 'Lớp 4A2',
      grade: 4,
      branchSelection: '12A',
      leaderboardEnabled: false,
      teacherUid: 'teacher-main',
      createdAt: now,
      updatedAt: now,
    },
    'class-5a1': {
      id: 'class-5a1',
      code: '5A1',
      name: 'Lớp 5A1',
      grade: 5,
      branchSelection: 'branchA',
      leaderboardEnabled: false,
      teacherUid: 'teacher-main',
      createdAt: now,
      updatedAt: now,
    },
    'class-3b2': {
      id: 'class-3b2',
      code: '3B2',
      name: 'Lớp 3B2 (GV khác)',
      grade: 3,
      branchSelection: '12A',
      leaderboardEnabled: false,
      teacherUid: 'teacher-other',
      createdAt: now,
      updatedAt: now,
    },
    'class-5b1': {
      id: 'class-5b1',
      code: '5B1',
      name: 'Lớp 5B1 (Nhánh B)',
      grade: 5,
      branchSelection: 'branchB',
      leaderboardEnabled: true,
      teacherUid: 'teacher-grade5',
      createdAt: now,
      updatedAt: now,
    },
  };

  const users: Record<string, UserProfile> = {
    'teacher-main': {
      uid: 'teacher-main',
      role: 'teacher',
      fullName: 'Cô Nguyễn Lan Hương',
      nickname: 'Cô Lan Hương',
      avatarId: 'teacher',
      email: 'giaovien@truongtieuhoc.edu.vn',
      assignedClassIds: ['class-3a1', 'class-4a2', 'class-5a1'],
      locked: false,
      totalXp: 0,
      unlockedBadges: [],
      createdAt: now,
      updatedAt: now,
    },
    'teacher-other': {
      uid: 'teacher-other',
      role: 'teacher',
      fullName: 'Thầy Trần Văn Bình',
      nickname: 'Thầy Bình',
      avatarId: 'teacher',
      email: 'gv_lopkhac@truongtieuhoc.edu.vn',
      assignedClassIds: ['class-3b2'],
      locked: false,
      totalXp: 0,
      unlockedBadges: [],
      createdAt: now,
      updatedAt: now,
    },
    'teacher-grade5': {
      uid: 'teacher-grade5',
      role: 'teacher',
      fullName: 'Cô Phạm Thanh Mai',
      nickname: 'Cô Thanh Mai',
      avatarId: 'teacher',
      email: 'gv_khoi5@truongtieuhoc.edu.vn',
      assignedClassIds: ['class-5b1'],
      locked: false,
      totalXp: 0,
      unlockedBadges: [],
      createdAt: now,
      updatedAt: now,
    },
  };

  const teacherPasswordHash = hashPassword('GiaoVien@2026');
  const teacherCredentials: Record<string, TeacherCredentialRecord> = {
    'teacher-main': {
      uid: 'teacher-main',
      email: 'giaovien@truongtieuhoc.edu.vn',
      passwordHash: teacherPasswordHash,
    },
    'teacher-other': {
      uid: 'teacher-other',
      email: 'gv_lopkhac@truongtieuhoc.edu.vn',
      passwordHash: teacherPasswordHash,
    },
    'teacher-grade5': {
      uid: 'teacher-grade5',
      email: 'gv_khoi5@truongtieuhoc.edu.vn',
      passwordHash: teacherPasswordHash,
    },
  };

  const classMemberships: Record<string, ClassMembership> = {};
  const studentCredentials: Record<string, StudentCredentialRecord> = {};

  for (const s of DEMO_STUDENTS_SEED) {
    const pinHash = await hashPinArgon2id(s.pin);
    users[s.uid] = {
      uid: s.uid,
      role: 'student',
      fullName: s.fullName,
      nickname: s.nickname,
      avatarId: s.avatarId,
      gender: s.gender,
      studentCode: s.studentCode,
      classId: s.classId,
      classCode: s.classCode,
      locked: false,
      totalXp: 0,
      unlockedBadges: [],
      createdAt: now,
      updatedAt: now,
    };
    classMemberships[`${s.classId}_${s.uid}`] = {
      id: `${s.classId}_${s.uid}`,
      classId: s.classId,
      uid: s.uid,
      role: 'student',
      studentCode: s.studentCode,
      active: true,
      createdAt: now,
    };
    studentCredentials[s.uid] = {
      uid: s.uid,
      classId: s.classId,
      classCode: s.classCode,
      studentCode: s.studentCode,
      pinHash,
      updatedAt: now,
    };
  }

  // Seed one completed demo award for stu-4a2-02 (Lê Đăng Khoa) so leaderboard/progress has realistic baseline
  const xpLedger: Record<string, XpLedgerEntry> = {};
  const weeklyScores: Record<string, WeeklyScore> = {};
  const leaderboardOutbox: Record<string, LeaderboardOutboxEvent> = {};
  const rtdbLeaderboards: Record<string, Record<string, Record<string, LeaderboardEntry>>> = {};
  const progress: Record<string, ProgressRecord> = {};

  const demoAwardId = makeAwardId('stu-4a2-02', 'L4-B5', 'practice');
  xpLedger[demoAwardId] = {
    awardId: demoAwardId,
    uid: 'stu-4a2-02',
    classId: 'class-4a2',
    lessonId: 'L4-B5',
    awardType: 'practice',
    xp: XP_VALUES.practice,
    weekKey,
    createdAt: now,
  };
  users['stu-4a2-02'].totalXp = 20;
  users['stu-4a2-02'].unlockedBadges = ['BADGE_L4_B5'];
  progress['stu-4a2-02__L4-B5'] = {
    id: 'stu-4a2-02__L4-B5',
    uid: 'stu-4a2-02',
    classId: 'class-4a2',
    lessonId: 'L4-B5',
    started: true,
    practiceCompleted: true,
    minigameCompleted: false,
    quizBestPercent: null,
    weakTopics: [],
    lastActivityAt: now,
  };
  weeklyScores[`class-4a2_${weekKey}_stu-4a2-02`] = {
    id: `class-4a2_${weekKey}_stu-4a2-02`,
    classId: 'class-4a2',
    weekKey,
    uid: 'stu-4a2-02',
    weeklyXp: 20,
    syncVersion: 1,
    updatedAt: now,
  };
  rtdbLeaderboards['class-4a2'] = {
    [weekKey]: {
      'stu-4a2-04': {
        uid: 'stu-4a2-04',
        nickname: users['stu-4a2-04'].nickname,
        avatarId: users['stu-4a2-04'].avatarId,
        weeklyXp: 85,
        rank: 1,
        syncVersion: 1,
      },
      'stu-4a2-02': {
        uid: 'stu-4a2-02',
        nickname: users['stu-4a2-02'].nickname,
        avatarId: users['stu-4a2-02'].avatarId,
        weeklyXp: 20,
        rank: 2,
        syncVersion: 1,
      },
    },
  };

  // Seed multi-lesson completed progress for stu-4a2-04 (Đỗ Hà My, 85 XP across L4-B1, L4-B2, L4-B5)
  const haMyAwards: Array<{ lessonId: string; awardType: 'practice' | 'quiz' | 'minigame'; xp: number }> = [
    { lessonId: 'L4-B1', awardType: 'practice', xp: XP_VALUES.practice },
    { lessonId: 'L4-B2', awardType: 'practice', xp: XP_VALUES.practice },
    { lessonId: 'L4-B2', awardType: 'quiz', xp: XP_VALUES.quiz },
    { lessonId: 'L4-B2', awardType: 'minigame', xp: XP_VALUES.minigame },
    { lessonId: 'L4-B5', awardType: 'practice', xp: XP_VALUES.practice },
    { lessonId: 'L4-B5', awardType: 'quiz', xp: XP_VALUES.quiz },
  ];
  for (const aw of haMyAwards) {
    const id = makeAwardId('stu-4a2-04', aw.lessonId, aw.awardType);
    xpLedger[id] = {
      awardId: id,
      uid: 'stu-4a2-04',
      classId: 'class-4a2',
      lessonId: aw.lessonId,
      awardType: aw.awardType,
      xp: aw.xp,
      weekKey,
      createdAt: now,
    };
  }
  users['stu-4a2-04'].totalXp = 85;
  users['stu-4a2-04'].unlockedBadges = ['BADGE_L4_B1', 'BADGE_L4_B2', 'BADGE_L4_B5'];
  progress['stu-4a2-04__L4-B1'] = {
    id: 'stu-4a2-04__L4-B1',
    uid: 'stu-4a2-04',
    classId: 'class-4a2',
    lessonId: 'L4-B1',
    started: true,
    practiceCompleted: true,
    minigameCompleted: false,
    quizBestPercent: 60,
    weakTopics: [],
    lastActivityAt: now,
  };
  progress['stu-4a2-04__L4-B2'] = {
    id: 'stu-4a2-04__L4-B2',
    uid: 'stu-4a2-04',
    classId: 'class-4a2',
    lessonId: 'L4-B2',
    started: true,
    practiceCompleted: true,
    minigameCompleted: true,
    quizBestPercent: 100,
    weakTopics: [],
    lastActivityAt: now,
  };
  progress['stu-4a2-04__L4-B5'] = {
    id: 'stu-4a2-04__L4-B5',
    uid: 'stu-4a2-04',
    classId: 'class-4a2',
    lessonId: 'L4-B5',
    started: true,
    practiceCompleted: true,
    minigameCompleted: false,
    quizBestPercent: 83,
    weakTopics: [],
    lastActivityAt: now,
  };
  weeklyScores[`class-4a2_${weekKey}_stu-4a2-04`] = {
    id: `class-4a2_${weekKey}_stu-4a2-04`,
    classId: 'class-4a2',
    weekKey,
    uid: 'stu-4a2-04',
    weeklyXp: 85,
    syncVersion: 1,
    updatedAt: now,
  };

  const lessons: Record<string, LessonCatalogItem> = {};
  for (const item of [...CURRICULUM_51, ...COMMON_LESSONS]) {
    lessons[item.id] = { ...item };
  }

  const questionKeys: Record<string, QuizQuestion[]> = {};
  for (const [lessonId, bundle] of Object.entries(SAMPLE_LESSONS)) {
    questionKeys[lessonId] = bundle.questions.map((q) => ({ ...q }));
  }

  const assignments: Record<string, Assignment> = {
    'asg-3a1-l3b5': {
      id: 'asg-3a1-l3b5',
      classId: 'class-3a1',
      lessonId: 'L3-B5',
      versionId: 'v1',
      title: 'Bài 5: Sử dụng bàn phím (Luyện tập)',
      mode: 'practice',
      openAt: now,
      dueAt: null,
      revealAnswersPolicy: 'immediate',
      createdBy: 'teacher-main',
      createdAt: now,
    },
    'asg-4a2-l4b5': {
      id: 'asg-4a2-l4b5',
      classId: 'class-4a2',
      lessonId: 'L4-B5',
      versionId: 'v1',
      title: 'Bài 5: Thao tác với tệp và thư mục',
      mode: 'practice',
      openAt: now,
      dueAt: null,
      revealAnswersPolicy: 'immediate',
      createdBy: 'teacher-main',
      createdAt: now,
    },
    'asg-5a1-l5b4': {
      id: 'asg-5a1-l5b4',
      classId: 'class-5a1',
      lessonId: 'L5-B4',
      versionId: 'v1',
      title: 'Bài 4: Cây thư mục',
      mode: 'practice',
      openAt: now,
      dueAt: null,
      revealAnswersPolicy: 'immediate',
      createdBy: 'teacher-main',
      createdAt: now,
    },
    'asg-3b2-l3b5': {
      id: 'asg-3b2-l3b5',
      classId: 'class-3b2',
      lessonId: 'L3-B5',
      versionId: 'v1',
      title: 'Bài 5: Sử dụng bàn phím (Luyện tập)',
      mode: 'practice',
      openAt: now,
      dueAt: null,
      revealAnswersPolicy: 'immediate',
      createdBy: 'teacher-other',
      createdAt: now,
    },
    'asg-5b1-l5b4': {
      id: 'asg-5b1-l5b4',
      classId: 'class-5b1',
      lessonId: 'L5-B4',
      versionId: 'v1',
      title: 'Bài 4: Cây thư mục',
      mode: 'practice',
      openAt: now,
      dueAt: null,
      revealAnswersPolicy: 'immediate',
      createdBy: 'teacher-grade5',
      createdAt: now,
    },
  };

  const attempts: Record<string, AttemptRecord> = {};

  return {
    users,
    classes,
    classMemberships,
    studentCredentials,
    teacherCredentials,
    deviceSessions: {},
    lessons,
    questionKeys,
    assignments,
    attempts,
    progress,
    xpLedger,
    weeklyScores,
    leaderboardOutbox,
    rtdbLeaderboards,
    imports: {},
    arenaRooms: {},
    auditLogs: [
      {
        id: 'audit-seed-1',
        actorUid: 'system',
        action: 'SEED_INIT',
        targetType: 'system',
        targetId: 'seed',
        summary: 'Khởi tạo dữ liệu giả mẫu cho 4 lớp và 3 bài học hoàn chỉnh.',
        createdAt: now,
      },
    ],
    outboxCounter: 1,
    seedTimestamp: now,
    seedPepperFingerprint: getPinPepperFingerprint(),
  };
}
