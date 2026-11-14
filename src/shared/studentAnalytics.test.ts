import assert from 'node:assert/strict';
import test from 'node:test';
import { getHoChiMinhWeekKey } from './grading';
import {
  buildCompletedLessonsChartData,
  buildLessonComparisonChartData,
  buildStudentAnalytics,
  getHoChiMinhIsoWeekday,
} from './studentAnalytics';
import type { LessonCatalogItem, ProgressRecord, XpLedgerEntry } from './types';

const SAMPLE_TWO_LESSONS: LessonCatalogItem[] = [
  {
    id: 'L4-B5',
    grade: 4,
    lessonNumber: '5',
    title: 'Thao tác với tệp và thư mục',
    topic: 'Tệp và thư mục',
    startPage: 22,
    pageRange: 'Trang 22-25',
    sourceStatus: 'complete',
    publishStatus: 'published',
    branchGroup: null,
    versionId: 'v1',
    isSampleComplete: true,
    objectives: [],
    summaryActivity: '',
    sgkNotes: '',
  },
  {
    id: 'L4-B6',
    grade: 4,
    lessonNumber: '6',
    title: 'Sử dụng phần mềm khi được phép',
    topic: 'Đạo đức số',
    startPage: 26,
    pageRange: 'Trang 26-28',
    sourceStatus: 'complete',
    publishStatus: 'published',
    branchGroup: null,
    versionId: 'v1',
    isSampleComplete: true,
    objectives: [],
    summaryActivity: '',
    sgkNotes: '',
  },
];

test('buildStudentAnalytics computes totals, average quiz score, and per-lesson XP breakdown', () => {
  const fixedNow = new Date('2026-11-12T10:00:00+07:00'); // Thursday (T5)
  const weekKey = getHoChiMinhWeekKey(fixedNow);

  const progress: ProgressRecord[] = [
    {
      id: 'stu1__L4-B5',
      uid: 'stu1',
      classId: 'class-4a2',
      lessonId: 'L4-B5',
      started: true,
      practiceCompleted: true,
      minigameCompleted: true,
      quizBestPercent: 83,
      weakTopics: [],
      lastActivityAt: fixedNow.toISOString(),
    },
  ];

  const xpLedger: XpLedgerEntry[] = [
    {
      awardId: 'stu1__L4-B5__practice',
      uid: 'stu1',
      classId: 'class-4a2',
      lessonId: 'L4-B5',
      awardType: 'practice',
      xp: 20,
      weekKey,
      createdAt: '2026-11-10T09:00:00+07:00', // Tuesday (T3)
    },
    {
      awardId: 'stu1__L4-B5__quiz',
      uid: 'stu1',
      classId: 'class-4a2',
      lessonId: 'L4-B5',
      awardType: 'quiz',
      xp: 10,
      weekKey,
      createdAt: '2026-11-12T08:30:00+07:00', // Thursday (T5)
    },
    {
      awardId: 'stu1__L4-B5__minigame',
      uid: 'stu1',
      classId: 'class-4a2',
      lessonId: 'L4-B5',
      awardType: 'minigame',
      xp: 5,
      weekKey,
      createdAt: '2026-11-12T09:15:00+07:00', // Thursday (T5)
    },
  ];

  const analytics = buildStudentAnalytics({
    lessons: SAMPLE_TWO_LESSONS,
    totalLessonsInGradeCatalog: 17,
    progress,
    attempts: [],
    xpLedger,
    userTotalXp: 35,
    now: fixedNow,
  });

  assert.equal(analytics.totalLessonsAvailable, 2);
  assert.equal(analytics.totalLessonsInGradeCatalog, 17);
  assert.equal(analytics.completedLessonsCount, 1);
  assert.equal(analytics.fullyMasteredLessonsCount, 1);
  assert.equal(analytics.averageQuizPercent, 83);
  assert.equal(analytics.maxPossibleXp, 70);
  assert.equal(analytics.weeklyTotalXp, 35);

  const t3 = analytics.weeklyDays.find((d) => d.dayLabel === 'T3');
  const t5 = analytics.weeklyDays.find((d) => d.dayLabel === 'T5');
  assert.equal(t3?.xp, 20);
  assert.equal(t5?.xp, 15);
  assert.equal(t5?.isToday, true);

  assert.equal(analytics.lessonScores[0].earnedXp, 35);
  assert.equal(analytics.lessonScores[0].statusLabel, 'Hoàn thành đủ');
  assert.equal(analytics.lessonScores[1].earnedXp, 0);
  assert.equal(analytics.lessonScores[1].statusLabel, 'Chưa bắt đầu');
});

test('getHoChiMinhIsoWeekday converts Asia/Ho_Chi_Minh date correctly across UTC boundary', () => {
  // 2026-11-11 23:30 UTC is 2026-11-12 06:30 in Ho Chi Minh (Thursday = 4)
  assert.equal(getHoChiMinhIsoWeekday(new Date('2026-11-11T23:30:00Z')), 4);
});

test('buildLessonComparisonChartData maps per-lesson XP and quiz scores for Recharts BarChart', () => {
  const analytics = buildStudentAnalytics({
    lessons: SAMPLE_TWO_LESSONS,
    totalLessonsInGradeCatalog: 17,
    progress: [
      {
        id: 'stu1__L4-B5',
        uid: 'stu1',
        classId: 'class-4a2',
        lessonId: 'L4-B5',
        started: true,
        practiceCompleted: true,
        minigameCompleted: false,
        quizBestPercent: 90,
        weakTopics: [],
        lastActivityAt: '2026-11-12T09:00:00Z',
      },
    ],
    attempts: [],
    xpLedger: [],
    userTotalXp: 30,
  });

  const chartData = buildLessonComparisonChartData(analytics.lessonScores);
  assert.equal(chartData.length, 2);
  assert.deepEqual(chartData[0], {
    lessonId: 'L4-B5',
    shortLabel: 'Bài 5',
    fullTitle: 'Bài 5: Thao tác với tệp và thư mục',
    practiceXp: 20,
    quizXp: 10,
    minigameXp: 0,
    earnedXp: 30,
    maxXp: 35,
    quizPercent: 90,
    hasQuizAttempt: true,
    completionPercent: 86,
  });
  assert.equal(chartData[1].shortLabel, 'Bài 6');
  assert.equal(chartData[1].hasQuizAttempt, false);
  assert.equal(chartData[1].quizPercent, 0);

  // Only completed/attempted lessons appear in buildCompletedLessonsChartData
  const completedOnly = buildCompletedLessonsChartData(analytics.lessonScores);
  assert.equal(completedOnly.length, 1);
  assert.equal(completedOnly[0].lessonId, 'L4-B5');

  // Level completion rates across grades 3, 4, 5
  assert.equal(analytics.gradeCompletions.length, 3);
  assert.deepEqual(
    analytics.gradeCompletions.map((g) => ({ grade: g.grade, percent: g.percent, isCurrent: g.isCurrentGrade })),
    [
      { grade: 3, percent: 0, isCurrent: false },
      { grade: 4, percent: 50, isCurrent: true },
      { grade: 5, percent: 0, isCurrent: false },
    ],
  );
});
