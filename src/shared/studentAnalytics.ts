import { getHoChiMinhWeekKey, QUIZ_PASS_PERCENT, XP_VALUES } from './grading';
import type {
  GradeLevel,
  LessonCatalogItem,
  ProgressRecord,
  StudentAnalyticsSummary,
  StudentGradeCompletion,
  StudentLessonScoreItem,
  StudentWeeklyDayBar,
  XpLedgerEntry,
} from './types';

const DAY_LABELS: Array<{ isoWeekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; dayLabel: string }> = [
  { isoWeekday: 1, dayLabel: 'T2' },
  { isoWeekday: 2, dayLabel: 'T3' },
  { isoWeekday: 3, dayLabel: 'T4' },
  { isoWeekday: 4, dayLabel: 'T5' },
  { isoWeekday: 5, dayLabel: 'T6' },
  { isoWeekday: 6, dayLabel: 'T7' },
  { isoWeekday: 7, dayLabel: 'CN' },
];

const GRADE_LEVELS: GradeLevel[] = [3, 4, 5];

/**
 * Returns ISO weekday 1 (Monday) .. 7 (Sunday) in Asia/Ho_Chi_Minh timezone.
 */
export function getHoChiMinhIsoWeekday(date: Date = new Date()): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '2026');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (utcDay === 0 ? 7 : utcDay) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

function buildLessonScoreItem(
  lesson: LessonCatalogItem,
  progress: ProgressRecord[],
  attempts: Array<{
    lessonId: string;
    practicePassed: boolean;
    minigamePassed: boolean;
    quizScorePercent: number | null;
    quizPassed: boolean;
    updatedAt: string;
  }>,
  ledgerByLesson: Map<string, XpLedgerEntry[]>,
  maxPerLesson: number,
): StudentLessonScoreItem {
  const prog = progress.find((p) => p.lessonId === lesson.id);
  const att = attempts.find((a) => a.lessonId === lesson.id);
  const entries = ledgerByLesson.get(lesson.id) ?? [];

  const practiceFromLedger = entries.find((e) => e.awardType === 'practice')?.xp ?? 0;
  const quizFromLedger = entries.find((e) => e.awardType === 'quiz')?.xp ?? 0;
  const minigameFromLedger = entries.find((e) => e.awardType === 'minigame')?.xp ?? 0;

  const practiceCompleted = Boolean(prog?.practiceCompleted || att?.practicePassed || practiceFromLedger > 0);
  const minigameCompleted = Boolean(prog?.minigameCompleted || att?.minigamePassed || minigameFromLedger > 0);
  const quizBestPercent = prog?.quizBestPercent ?? att?.quizScorePercent ?? null;
  const quizPassed = Boolean(
    att?.quizPassed ||
      quizFromLedger > 0 ||
      (quizBestPercent !== null && quizBestPercent >= QUIZ_PASS_PERCENT),
  );
  const started = Boolean(
    prog?.started || att || practiceCompleted || minigameCompleted || quizBestPercent !== null || entries.length > 0,
  );

  const practiceXp = practiceFromLedger || (practiceCompleted ? XP_VALUES.practice : 0);
  const quizXp = quizFromLedger || (quizPassed ? XP_VALUES.quiz : 0);
  const minigameXp = minigameFromLedger || (minigameCompleted ? XP_VALUES.minigame : 0);
  const earnedXp = practiceXp + quizXp + minigameXp;

  const completionPercent = maxPerLesson > 0 ? Math.min(100, Math.round((earnedXp / maxPerLesson) * 100)) : 0;

  const statusLabel: StudentLessonScoreItem['statusLabel'] =
    practiceCompleted && minigameCompleted && quizPassed
      ? 'Hoàn thành đủ'
      : started
        ? 'Đang học'
        : 'Chưa bắt đầu';

  return {
    lessonId: lesson.id,
    grade: lesson.grade,
    lessonNumber: lesson.lessonNumber,
    title: lesson.title,
    pageRange: lesson.pageRange,
    started,
    practiceCompleted,
    practiceXp,
    minigameCompleted,
    minigameXp,
    quizBestPercent,
    quizPassed,
    quizXp,
    earnedXp,
    maxXp: maxPerLesson,
    completionPercent,
    statusLabel,
    lastActivityAt: prog?.lastActivityAt ?? att?.updatedAt ?? null,
  };
}

export function buildStudentAnalytics(params: {
  lessons: LessonCatalogItem[];
  commonLessons?: LessonCatalogItem[];
  allCatalogLessons?: LessonCatalogItem[];
  currentGrade?: GradeLevel;
  totalLessonsInGradeCatalog: number;
  progress: ProgressRecord[];
  attempts: Array<{
    lessonId: string;
    practicePassed: boolean;
    minigamePassed: boolean;
    quizScorePercent: number | null;
    quizPassed: boolean;
    updatedAt: string;
  }>;
  xpLedger: XpLedgerEntry[];
  userTotalXp: number;
  now?: Date;
}): StudentAnalyticsSummary {
  const {
    lessons,
    commonLessons = [],
    allCatalogLessons,
    currentGrade,
    totalLessonsInGradeCatalog,
    progress,
    attempts,
    xpLedger,
    userTotalXp,
    now = new Date(),
  } = params;

  const activeGrade: GradeLevel = currentGrade ?? lessons[0]?.grade ?? 4;
  const currentWeekKey = getHoChiMinhWeekKey(now);
  const todayWeekday = getHoChiMinhIsoWeekday(now);
  const maxPerLesson = XP_VALUES.practice + XP_VALUES.quiz + XP_VALUES.minigame; // 35 XP

  // Group ledger entries by lessonId
  const ledgerByLesson = new Map<string, XpLedgerEntry[]>();
  for (const entry of xpLedger) {
    const arr = ledgerByLesson.get(entry.lessonId) ?? [];
    arr.push(entry);
    ledgerByLesson.set(entry.lessonId, arr);
  }

  const gradeLessonScores: StudentLessonScoreItem[] = lessons.map((lesson) =>
    buildLessonScoreItem(lesson, progress, attempts, ledgerByLesson, maxPerLesson),
  );

  // Include started/completed common lessons in lessonScores so cross-grade practice appears in charts
  const seenLessonIds = new Set(gradeLessonScores.map((item) => item.lessonId));
  const attemptedCommonScores: StudentLessonScoreItem[] = commonLessons
    .filter((l) => !seenLessonIds.has(l.id))
    .map((l) => buildLessonScoreItem(l, progress, attempts, ledgerByLesson, maxPerLesson))
    .filter((item) => item.started || item.earnedXp > 0);

  const lessonScores = [...gradeLessonScores, ...attemptedCommonScores];

  // Compute completion rates across Grade Levels 3, 4, 5
  const catalogSource = allCatalogLessons ?? lessons;
  const gradeCompletions: StudentGradeCompletion[] = GRADE_LEVELS.map((g) => {
    const allInGrade = catalogSource.filter((l) => l.scope !== 'common' && l.grade === g);
    const publishedInGrade = allInGrade.filter(
      (l) => l.publishStatus === 'published' && l.sourceStatus === 'complete',
    );
    const completedCount = publishedInGrade.filter((l) => {
      const prog = progress.find((p) => p.lessonId === l.id);
      const att = attempts.find((a) => a.lessonId === l.id);
      const entries = ledgerByLesson.get(l.id) ?? [];
      return Boolean(
        prog?.practiceCompleted ||
          att?.practicePassed ||
          entries.some((e) => e.awardType === 'practice'),
      );
    }).length;
    const publishedCount = publishedInGrade.length;
    const percent = publishedCount > 0 ? Math.round((completedCount / publishedCount) * 100) : 0;

    return {
      grade: g,
      label: `Cấp độ ${g}`,
      completedCount,
      publishedCount,
      catalogCount: allInGrade.length,
      percent,
      isCurrentGrade: g === activeGrade,
    };
  });

  const totalPublishedAcrossGrades = gradeCompletions.reduce((sum, g) => sum + g.publishedCount, 0);
  const totalCompletedAcrossGrades = gradeCompletions.reduce((sum, g) => sum + g.completedCount, 0);
  const overallLevelCompletionPercent =
    totalPublishedAcrossGrades > 0
      ? Math.round((totalCompletedAcrossGrades / totalPublishedAcrossGrades) * 100)
      : 0;

  // Weekly daily XP histogram computed from student's own xpLedger in currentWeekKey
  const dayBuckets = new Map<number, { xp: number; count: number }>();
  let weeklyTotalXp = 0;
  for (const entry of xpLedger) {
    if (entry.weekKey !== currentWeekKey) continue;
    weeklyTotalXp += entry.xp;
    const createdDate = new Date(entry.createdAt);
    const dayNum = Number.isNaN(createdDate.getTime()) ? todayWeekday : getHoChiMinhIsoWeekday(createdDate);
    const cur = dayBuckets.get(dayNum) ?? { xp: 0, count: 0 };
    cur.xp += entry.xp;
    cur.count += 1;
    dayBuckets.set(dayNum, cur);
  }

  const weeklyDays: StudentWeeklyDayBar[] = DAY_LABELS.map(({ isoWeekday, dayLabel }) => {
    const bucket = dayBuckets.get(isoWeekday);
    return {
      isoWeekday,
      dayLabel,
      xp: bucket?.xp ?? 0,
      awardsCount: bucket?.count ?? 0,
      isToday: isoWeekday === todayWeekday,
    };
  });

  const quizValues = lessonScores
    .map((l) => l.quizBestPercent)
    .filter((v): v is number => v !== null && typeof v === 'number');

  const averageQuizPercent =
    quizValues.length > 0
      ? Math.round(quizValues.reduce((sum, v) => sum + v, 0) / quizValues.length)
      : null;

  return {
    totalLessonsAvailable: lessons.length,
    totalLessonsInGradeCatalog,
    startedLessonsCount: lessonScores.filter((l) => l.started).length,
    completedLessonsCount: lessonScores.filter((l) => l.practiceCompleted).length,
    fullyMasteredLessonsCount: lessonScores.filter(
      (l) => l.practiceCompleted && l.minigameCompleted && l.quizPassed,
    ).length,
    minigamesWonCount: lessonScores.filter((l) => l.minigameCompleted).length,
    quizzesCompletedCount: quizValues.length,
    averageQuizPercent,
    totalXp: userTotalXp,
    maxPossibleXp: lessons.length * maxPerLesson,
    weeklyTotalXp,
    weeklyDays,
    lessonScores,
    gradeCompletions,
    overallLevelCompletionPercent,
  };
}

export interface LessonComparisonChartDatum {
  lessonId: string;
  shortLabel: string;
  fullTitle: string;
  practiceXp: number;
  quizXp: number;
  minigameXp: number;
  earnedXp: number;
  maxXp: number;
  quizPercent: number;
  hasQuizAttempt: boolean;
  completionPercent: number;
}

export function buildLessonComparisonChartData(
  lessonScores: StudentLessonScoreItem[],
): LessonComparisonChartDatum[] {
  return lessonScores.map((item) => ({
    lessonId: item.lessonId,
    shortLabel: item.lessonId.startsWith('CHUNG') ? item.lessonNumber : `Bài ${item.lessonNumber}`,
    fullTitle: item.lessonId.startsWith('CHUNG')
      ? `${item.lessonNumber}: ${item.title}`
      : `Bài ${item.lessonNumber}: ${item.title}`,
    practiceXp: item.practiceXp,
    quizXp: item.quizXp,
    minigameXp: item.minigameXp,
    earnedXp: item.earnedXp,
    maxXp: item.maxXp,
    quizPercent: item.quizBestPercent ?? 0,
    hasQuizAttempt: item.quizBestPercent !== null,
    completionPercent: item.completionPercent,
  }));
}

export function buildCompletedLessonsChartData(
  lessonScores: StudentLessonScoreItem[],
): LessonComparisonChartDatum[] {
  const attempted = lessonScores.filter(
    (item) =>
      item.started ||
      item.earnedXp > 0 ||
      item.practiceCompleted ||
      item.minigameCompleted ||
      item.quizBestPercent !== null,
  );
  return buildLessonComparisonChartData(attempted);
}
