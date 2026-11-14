export type UserRole = 'student' | 'teacher' | 'admin';

export type GradeLevel = 3 | 4 | 5;

export type SourceStatus = 'complete' | 'partial' | 'toc_only';

export type PublishStatus = 'draft' | 'approved' | 'published';

export type BranchSelection = '12A' | '12B' | 'branchA' | 'branchB';

export type LessonStage = 'watch' | 'guided' | 'practice' | 'game' | 'quiz';

export interface UserProfile {
  uid: string;
  role: UserRole;
  fullName: string;
  nickname: string;
  avatarId: string;
  gender?: string;
  email?: string;
  studentCode?: string;
  classId?: string;
  classCode?: string;
  assignedClassIds?: string[];
  locked: boolean;
  totalXp: number;
  unlockedBadges: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassRoom {
  id: string;
  code: string;
  name: string;
  grade: GradeLevel;
  branchSelection: BranchSelection;
  leaderboardEnabled: boolean;
  teacherUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassMembership {
  id: string;
  classId: string;
  uid: string;
  role: UserRole;
  studentCode?: string;
  active: boolean;
  createdAt: string;
}

export type LessonScope = 'grade' | 'common';

export type PracticeKind = 'keyboard' | 'folder' | 'tasks';

export interface PracticeTaskItem {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  hint: string;
}

export interface LessonCatalogItem {
  id: string;
  grade: GradeLevel;
  scope?: LessonScope;
  practiceKind?: PracticeKind;
  lessonNumber: string;
  title: string;
  topic: string;
  startPage: number;
  pageRange: string;
  sourceStatus: SourceStatus;
  publishStatus: PublishStatus;
  branchGroup: BranchSelection | null;
  versionId: string;
  isSampleComplete: boolean;
  objectives: string[];
  summaryActivity: string;
  sgkNotes: string;
}

export type QuestionType = 'single_choice' | 'matching' | 'ordering' | 'hotspot';

export interface QuizQuestion {
  id: string;
  lessonId: string;
  type: QuestionType;
  prompt: string;
  hint?: string;
  // For single_choice
  options?: string[];
  // For matching
  leftItems?: string[];
  rightItems?: string[];
  // For ordering
  orderItems?: string[];
  // For hotspot / diagram click
  diagramTitle?: string;
  hotspots?: { id: string; label: string; description: string }[];
  // Solution (never exposed to student before submission/release)
  correctAnswer: string | number | Record<string, string> | string[];
  explanation: string;
}

export type PublicQuizQuestion = Omit<QuizQuestion, 'correctAnswer' | 'explanation'>;

export interface QuizQuestionResult {
  questionId: string;
  correct: boolean;
  studentAnswer: unknown;
  correctAnswer?: unknown;
  explanation?: string;
}

export interface Assignment {
  id: string;
  classId: string;
  lessonId: string;
  versionId: string;
  title: string;
  mode: 'practice' | 'test';
  openAt: string;
  dueAt: string | null;
  revealAnswersPolicy: 'immediate' | 'after_submit' | 'after_due';
  createdBy: string;
  createdAt: string;
}

export interface VirtualFsNode {
  id: string;
  name: string;
  type: 'drive' | 'folder' | 'file';
  fileKind?: 'pptx' | 'docx' | 'image' | 'text' | 'pdf';
  parentId: string | null;
  protected?: boolean;
  systemImportant?: boolean;
  sizeLabel?: string;
  modifiedAt?: string;
}

export interface VirtualFsAction {
  type:
    | 'create_folder'
    | 'copy'
    | 'cut'
    | 'paste'
    | 'move_to'
    | 'rename'
    | 'delete'
    | 'undo'
    | 'open_folder'
    | 'search'
    | 'open_file_location';
  targetId?: string;
  destinationId?: string;
  newName?: string;
  query?: string;
  timestamp: number;
}

export interface VirtualFsState {
  nodes: VirtualFsNode[];
  currentFolderId: string;
  selectedNodeId: string | null;
  clipboard: {
    mode: 'copy' | 'cut';
    nodeId: string;
    sourceParentId: string | null;
  } | null;
  searchQuery: string;
  searchScopeFolderId: string | null;
  actions: VirtualFsAction[];
  history: VirtualFsNode[][];
}

export interface AttemptDraft {
  guidedStepIndex?: number;
  guidedCompleted?: boolean;
  fsState?: VirtualFsState;
  typingStats?: {
    completedSequences: string[];
    accuracy: number;
    wpm: number;
    selfCheckFingers: boolean;
  };
  minigameState?: {
    score: number;
    roundsCompleted: number;
    won: boolean;
  };
  taskAnswers?: Record<string, number>;
  quizAnswers?: Record<string, unknown>;
}

export interface AttemptRecord {
  id: string;
  uid: string;
  classId: string;
  lessonId: string;
  versionId: string;
  assignmentId?: string;
  revision: number;
  status: 'in_progress' | 'submitted';
  draft: AttemptDraft;
  practicePassed: boolean;
  minigamePassed: boolean;
  quizScorePercent: number | null;
  quizPassed: boolean;
  quizResults?: QuizQuestionResult[];
  xpAwardedTotal: number;
  updatedAt: string;
  submittedAt: string | null;
}

export interface ProgressRecord {
  id: string;
  uid: string;
  classId: string;
  lessonId: string;
  started: boolean;
  practiceCompleted: boolean;
  minigameCompleted: boolean;
  quizBestPercent: number | null;
  weakTopics: string[];
  lastActivityAt: string;
}

export type AwardType = 'practice' | 'quiz' | 'minigame';

export interface XpLedgerEntry {
  awardId: string;
  uid: string;
  classId: string;
  lessonId: string;
  awardType: AwardType;
  xp: number;
  weekKey: string;
  createdAt: string;
}

export interface WeeklyScore {
  id: string;
  classId: string;
  weekKey: string;
  uid: string;
  weeklyXp: number;
  syncVersion: number;
  updatedAt: string;
}

export interface LeaderboardEntry {
  uid: string;
  nickname: string;
  avatarId: string;
  weeklyXp: number;
  rank: number;
  syncVersion: number;
}

export interface LeaderboardOutboxEvent {
  id: string;
  classId: string;
  weekKey: string;
  uid: string;
  nickname: string;
  avatarId: string;
  weeklyXp: number;
  syncVersion: number;
  synced: boolean;
  attempts: number;
  createdAt: string;
  syncedAt?: string;
}

export interface RankTier {
  id: string;
  name: string;
  minXp: number;
  nextMinXp: number | null;
  badgeCode: string;
}

export interface ImportRowValidation {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  gender: string;
  classCode: string;
  pinMasked: string;
  action: 'create' | 'update' | 'error';
  errors: string[];
  pinAutoGenerated: boolean;
}

export interface ImportPreviewResult {
  batchId: string;
  fileName: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  createCount: number;
  updateCount: number;
  rows: ImportRowValidation[];
  canConfirm: boolean;
}

export interface StudentLessonScoreItem {
  lessonId: string;
  grade: GradeLevel;
  lessonNumber: string;
  title: string;
  pageRange: string;
  started: boolean;
  practiceCompleted: boolean;
  practiceXp: number;
  minigameCompleted: boolean;
  minigameXp: number;
  quizBestPercent: number | null;
  quizPassed: boolean;
  quizXp: number;
  earnedXp: number;
  maxXp: number;
  completionPercent: number;
  statusLabel: 'Hoàn thành đủ' | 'Đang học' | 'Chưa bắt đầu';
  lastActivityAt: string | null;
}

export interface StudentWeeklyDayBar {
  isoWeekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  dayLabel: string;
  xp: number;
  awardsCount: number;
  isToday: boolean;
}

export interface StudentGradeCompletion {
  grade: GradeLevel;
  label: string;
  completedCount: number;
  publishedCount: number;
  catalogCount: number;
  percent: number;
  isCurrentGrade: boolean;
}

export interface StudentAnalyticsSummary {
  totalLessonsAvailable: number;
  totalLessonsInGradeCatalog: number;
  startedLessonsCount: number;
  completedLessonsCount: number;
  fullyMasteredLessonsCount: number;
  minigamesWonCount: number;
  quizzesCompletedCount: number;
  averageQuizPercent: number | null;
  totalXp: number;
  maxPossibleXp: number;
  weeklyTotalXp: number;
  weeklyDays: StudentWeeklyDayBar[];
  lessonScores: StudentLessonScoreItem[];
  gradeCompletions: StudentGradeCompletion[];
  overallLevelCompletionPercent: number;
}

export type ArenaRoomStatus = 'waiting' | 'started' | 'closed';

export type ArenaScope = 'class' | 'shared';

export type ArenaMode = 'quiz' | 'game';

export interface ArenaParticipant {
  uid: string;
  studentCode: string;
  fullName: string;
  nickname: string;
  avatarId: string;
  classId: string;
  classCode: string;
  joinedAt: string;
  ready: boolean;
  readyAt: string | null;
  submittedScore?: number | null;
  submittedTotal?: number | null;
  submittedAt?: string | null;
}

export interface ArenaRoom {
  id: string;
  roomCode: string;
  title: string;
  lessonId: string;
  lessonTitle: string;
  classId: string;
  classCode: string;
  scope: ArenaScope;
  mode: ArenaMode;
  itemCount: number;
  maxParticipants: number;
  teacherUid: string;
  teacherName: string;
  status: ArenaRoomStatus;
  waitingDurationSec: number;
  countdownSec: number;
  createdAt: string;
  waitingEndsAt: string;
  countdownEndsAt: string | null;
  startedAt: string | null;
  closedAt: string | null;
  participants: ArenaParticipant[];
}



