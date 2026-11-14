import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  Gamepad2,
  GraduationCap,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildCompletedLessonsChartData,
  buildLessonComparisonChartData,
  type LessonComparisonChartDatum,
} from '../shared/studentAnalytics';
import { useTheme } from '../contexts/ThemeContext';
import type {
  GradeLevel,
  LessonStage,
  StudentAnalyticsSummary,
  StudentGradeCompletion,
  StudentWeeklyDayBar,
} from '../shared/types';

interface StudentDashboardChartsProps {
  analytics: StudentAnalyticsSummary;
  grade: GradeLevel;
  unlockedBadgesCount: number;
  onOpenLesson: (lessonId: string, initialStage?: LessonStage) => void;
}

type LessonScopeFilter = 'attempted' | 'all';
type LessonChartMetric = 'xp' | 'quiz';
type SecondaryChartMode = 'levels' | 'weekly';

interface CustomTooltipProps<T> {
  active?: boolean;
  payload?: Array<{ payload?: T }>;
}

const WeeklyXpTooltip: React.FC<CustomTooltipProps<StudentWeeklyDayBar>> = ({
  active,
  payload,
}) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-lg text-xs space-y-1 border border-slate-700">
      <p className="font-display font-extrabold text-sm">
        {item.dayLabel} {item.isToday ? '(Hôm nay)' : ''}
      </p>
      <p className="font-mono font-bold text-sky-300 tabular-nums">
        Điểm đạt được: +{item.xp} XP
      </p>
      <p className="text-slate-300">
        Số lượt nhận thưởng: {item.awardsCount} lượt
      </p>
    </div>
  );
};

const GradeCompletionTooltip: React.FC<CustomTooltipProps<StudentGradeCompletion>> = ({
  active,
  payload,
}) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-lg text-xs space-y-1 border border-slate-700">
      <p className="font-display font-extrabold text-sm">
        {item.label} {item.isCurrentGrade ? '(Lớp em)' : ''}
      </p>
      <p className="font-mono font-bold text-emerald-300 tabular-nums">
        Hoàn thành: {item.percent}% ({item.completedCount}/{item.publishedCount} bài đang mở)
      </p>
      <p className="text-slate-300">
        Tổng mục SGK Lớp {item.grade}: {item.catalogCount} bài
      </p>
    </div>
  );
};

const LessonComparisonTooltip: React.FC<
  CustomTooltipProps<LessonComparisonChartDatum> & { metric: LessonChartMetric }
> = ({ active, payload, metric }) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-lg text-xs space-y-1.5 max-w-[260px] border border-slate-700">
      <p className="font-display font-extrabold text-sm leading-snug text-white">
        {item.fullTitle}
      </p>
      {metric === 'xp' ? (
        <div className="space-y-0.5 text-slate-200 font-mono tabular-nums">
          <p className="text-sky-300">Tự làm: +{item.practiceXp} / 20 XP</p>
          <p className="text-emerald-300">
            Đố vui: +{item.quizXp} / 10 XP{' '}
            {item.hasQuizAttempt ? `(${item.quizPercent}%)` : '(chưa làm)'}
          </p>
          <p className="text-amber-300">Trò chơi: +{item.minigameXp} / 5 XP</p>
          <p className="pt-1 border-t border-slate-700 font-extrabold text-white">
            Tổng bài: {item.earnedXp} / {item.maxXp} XP ({item.completionPercent}%)
          </p>
        </div>
      ) : (
        <div className="space-y-0.5 text-slate-200 font-mono tabular-nums">
          <p
            className={
              !item.hasQuizAttempt
                ? 'text-slate-300'
                : item.quizPercent >= 80
                  ? 'text-emerald-300 font-bold'
                  : 'text-amber-300 font-bold'
            }
          >
            Điểm Đố vui cao nhất:{' '}
            {item.hasQuizAttempt ? `${item.quizPercent}%` : 'Chưa làm'}
          </p>
          <p className="text-sky-300">
            Tổng XP bài: {item.earnedXp} / {item.maxXp} XP
          </p>
        </div>
      )}
    </div>
  );
};

export const StudentDashboardCharts: React.FC<StudentDashboardChartsProps> = ({
  analytics,
  grade,
  unlockedBadgesCount,
  onOpenLesson,
}) => {
  const { isDark } = useTheme();
  const chartColors = useMemo(
    () => ({
      gridStroke: isDark ? '#25334D' : '#E2E8F0',
      axisLineStroke: isDark ? '#334155' : '#CBD5E1',
      axisTickFill: isDark ? '#CBD5E1' : '#475569',
      yAxisTickFill: isDark ? '#94A3B8' : '#64748B',
      cursorFill: isDark ? 'rgba(56, 189, 248, 0.12)' : '#F1F5F9',
      refMaxStroke: isDark ? '#64748B' : '#94A3B8',
      refMaxLabel: isDark ? '#94A3B8' : '#64748B',
      refPassStroke: isDark ? '#34D399' : '#059669',
      refPassLabel: isDark ? '#34D399' : '#059669',
      emptyBarFill: isDark ? '#25334D' : '#E2E8F0',
      emptyLevelBarFill: isDark ? '#334155' : '#CBD5E1',
      legendColor: isDark ? '#CBD5E1' : '#475569',
      practiceBar: isDark ? '#38BDF8' : '#0284C7',
      quizBar: isDark ? '#34D399' : '#10B981',
      minigameBar: isDark ? '#FBBF24' : '#F59E0B',
      todayBar: isDark ? '#FB923C' : '#F97316',
    }),
    [isDark],
  );

  const attemptedChartData = useMemo(
    () => buildCompletedLessonsChartData(analytics.lessonScores),
    [analytics.lessonScores],
  );
  const allChartData = useMemo(
    () => buildLessonComparisonChartData(analytics.lessonScores),
    [analytics.lessonScores],
  );

  const [lessonScope, setLessonScope] = useState<LessonScopeFilter>(() =>
    attemptedChartData.length > 0 ? 'attempted' : 'attempted',
  );
  const [lessonMetric, setLessonMetric] = useState<LessonChartMetric>('xp');
  const [secondaryMode, setSecondaryMode] = useState<SecondaryChartMode>('levels');

  const activeLessonChartData =
    lessonScope === 'attempted' ? attemptedChartData : allChartData;

  const gradeCompletions = useMemo(() => {
    if (analytics.gradeCompletions?.length) return analytics.gradeCompletions;
    return ([3, 4, 5] as const).map((g) => ({
      grade: g,
      label: `Cấp độ ${g}`,
      completedCount: g === grade ? analytics.completedLessonsCount : 0,
      publishedCount: g === grade ? analytics.totalLessonsAvailable : 7,
      catalogCount: g === grade ? analytics.totalLessonsInGradeCatalog : 16,
      percent:
        g === grade && analytics.totalLessonsAvailable > 0
          ? Math.round((analytics.completedLessonsCount / analytics.totalLessonsAvailable) * 100)
          : 0,
      isCurrentGrade: g === grade,
    }));
  }, [analytics, grade]);

  const currentLevelCompletion =
    gradeCompletions.find((g) => g.grade === grade) ?? gradeCompletions[0];

  const weeklyMax = useMemo(
    () => Math.max(35, ...analytics.weeklyDays.map((d) => d.xp)),
    [analytics.weeklyDays],
  );

  return (
    <section
      id="thong-ke-hoc-tap"
      data-testid="student-analytics-dashboard"
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display font-extrabold text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            Chỉ số &amp; Biểu đồ học tập của em
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Theo dõi tổng số bài đã hoàn thành, tổng XP tích lũy, tỷ lệ hoàn thành cấp độ (3, 4, 5) và so sánh điểm XP giữa các bài đã làm.
          </p>
        </div>
      </div>

      {/* 3 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Tổng số bài đã hoàn thành */}
        <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 flex flex-col justify-between space-y-2.5 transition-colors">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Tổng số bài đã hoàn thành</span>
            <BookOpenCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          </div>
          <div>
            <p
              className="font-display font-black text-3xl text-slate-900 dark:text-slate-100 tabular-nums"
              data-testid="kpi-completed-lessons"
            >
              {analytics.completedLessonsCount}{' '}
              <span className="text-base font-bold text-slate-400 dark:text-slate-400">
                / {analytics.totalLessonsAvailable} bài
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Đã bắt đầu {analytics.startedLessonsCount} bài · Đố vui TB:{' '}
              <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                {analytics.averageQuizPercent !== null ? `${analytics.averageQuizPercent}%` : '--'}
              </strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-[#25334D] flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Trò chơi đã thắng: {analytics.minigamesWonCount}/{analytics.totalLessonsAvailable}</span>
            <span className="font-semibold text-slate-500 dark:text-slate-400">SGK Lớp {grade}: {analytics.totalLessonsInGradeCatalog} bài</span>
          </div>
        </div>

        {/* KPI 2: Tổng XP tích lũy */}
        <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 flex flex-col justify-between space-y-2.5 transition-colors">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Tổng XP tích lũy</span>
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          </div>
          <div>
            <p
              className="font-display font-black text-3xl text-sky-700 dark:text-sky-400 tabular-nums"
              data-testid="kpi-total-xp"
            >
              {analytics.totalXp}{' '}
              <span className="text-base font-bold text-slate-400">
                / {analytics.maxPossibleXp} XP
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              Tuần này tích lũy:{' '}
              <strong className="text-orange-600 dark:text-orange-400">+{analytics.weeklyTotalXp} XP</strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-[#25334D] flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 font-semibold text-violet-700 dark:text-violet-300">
              <Award className="w-3.5 h-3.5" />
              {unlockedBadgesCount} huy hiệu đã mở
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400">Mỗi bài tối đa 35 XP</span>
          </div>
        </div>

        {/* KPI 3: Tỷ lệ hoàn thành các cấp độ (3, 4, 5) */}
        <div
          className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 flex flex-col justify-between space-y-2.5 transition-colors"
          data-testid="kpi-level-completions"
        >
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Tỷ lệ hoàn thành cấp độ (3, 4, 5)</span>
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display font-black text-3xl text-emerald-700 dark:text-emerald-400 tabular-nums">
              {currentLevelCompletion.percent}%
            </p>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Lớp {grade} của em ({currentLevelCompletion.completedCount}/{currentLevelCompletion.publishedCount} bài)
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {gradeCompletions.map((item) => (
              <div key={item.grade} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className={item.isCurrentGrade ? 'text-sky-800 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}>
                    Cấp độ {item.grade} {item.isCurrentGrade ? '(Đang học)' : ''}
                  </span>
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {item.percent}% ({item.completedCount}/{item.publishedCount})
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#1A2742] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.isCurrentGrade ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-sky-400 dark:bg-sky-500'
                    }`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2 Side-by-Side Recharts BarCharts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1 (7 cols): Recharts BarChart comparing XP across completed/attempted lessons */}
        <div
          className="lg:col-span-7 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 flex flex-col justify-between transition-colors"
          data-testid="chart-lesson-scores"
        >
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-slate-100">
                Biểu đồ cột so sánh điểm XP giữa các bài học đã làm
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lessonMetric === 'xp'
                  ? 'So sánh điểm XP từng bài (Tự làm 20 + Đố vui 10 + Trò chơi 5 = tối đa 35 XP)'
                  : 'So sánh tỉ lệ phần trăm (%) điểm Đố vui giữa các bài học (mốc đạt 80%)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div
                className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155]"
                role="group"
                aria-label="Lọc phạm vi bài học trên biểu đồ"
              >
                <button
                  type="button"
                  onClick={() => setLessonScope('attempted')}
                  data-testid="btn-chart-scope-attempted"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    lessonScope === 'attempted'
                      ? 'bg-white dark:bg-[#25334D] text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Bài đã làm ({attemptedChartData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLessonScope('all')}
                  data-testid="btn-chart-scope-all"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    lessonScope === 'all'
                      ? 'bg-white dark:bg-[#25334D] text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Tất cả ({allChartData.length})
                </button>
              </div>

              <div
                className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155]"
                role="group"
                aria-label="Chọn chỉ số so sánh theo bài học"
              >
                <button
                  type="button"
                  onClick={() => setLessonMetric('xp')}
                  data-testid="btn-chart-metric-xp"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    lessonMetric === 'xp'
                      ? 'bg-white dark:bg-[#25334D] text-sky-700 dark:text-sky-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  XP (0–35)
                </button>
                <button
                  type="button"
                  onClick={() => setLessonMetric('quiz')}
                  data-testid="btn-chart-metric-quiz"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    lessonMetric === 'quiz'
                      ? 'bg-white dark:bg-[#25334D] text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Đố vui (%)
                </button>
              </div>
            </div>
          </div>

          {activeLessonChartData.length === 0 ? (
            <div
              className="mt-4 py-12 px-4 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-dashed border-slate-200 dark:border-[#334155] text-center space-y-3"
              data-testid="chart-attempted-empty"
            >
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Em chưa hoàn thành hay bắt đầu bài học nào. Hãy làm bài đầu tiên để xem cột điểm XP xuất hiện tại đây nhé!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {allChartData[0] && (
                  <button
                    type="button"
                    onClick={() => onOpenLesson(allChartData[0].lessonId, 'practice')}
                    className="min-h-[38px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Làm {allChartData[0].shortLabel} ngay
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLessonScope('all')}
                  className="min-h-[38px] px-4 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#131D31] hover:bg-slate-100 dark:hover:bg-[#223254] text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Xem tất cả ({allChartData.length} bài)
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 w-full h-[270px]" data-testid="recharts-lesson-bar-wrapper">
              <ResponsiveContainer width="100%" height={270} minWidth={200}>
                {lessonMetric === 'xp' ? (
                  <BarChart
                    data={activeLessonChartData}
                    margin={{ top: 16, right: 12, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStroke} />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fill: chartColors.axisTickFill, fontSize: 12, fontWeight: 700 }}
                      axisLine={{ stroke: chartColors.axisLineStroke }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 35]}
                      ticks={[0, 10, 20, 30, 35]}
                      tick={{ fill: chartColors.yAxisTickFill, fontSize: 11, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      unit=" XP"
                    />
                    <Tooltip
                      cursor={{ fill: chartColors.cursorFill }}
                      content={<LessonComparisonTooltip metric="xp" />}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 8, color: chartColors.legendColor }}
                    />
                    <ReferenceLine
                      y={35}
                      stroke={chartColors.refMaxStroke}
                      strokeDasharray="4 4"
                      label={{
                        value: 'Tối đa 35 XP',
                        position: 'insideTopRight',
                        fill: chartColors.refMaxLabel,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <Bar
                      dataKey="practiceXp"
                      name="Tự làm (20 XP)"
                      stackId="xp"
                      fill={chartColors.practiceBar}
                      maxBarSize={48}
                    />
                    <Bar
                      dataKey="quizXp"
                      name="Đố vui (10 XP)"
                      stackId="xp"
                      fill={chartColors.quizBar}
                      maxBarSize={48}
                    />
                    <Bar
                      dataKey="minigameXp"
                      name="Trò chơi (5 XP)"
                      stackId="xp"
                      fill={chartColors.minigameBar}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                ) : (
                  <BarChart
                    data={activeLessonChartData}
                    margin={{ top: 16, right: 12, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStroke} />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fill: chartColors.axisTickFill, fontSize: 12, fontWeight: 700 }}
                      axisLine={{ stroke: chartColors.axisLineStroke }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tick={{ fill: chartColors.yAxisTickFill, fontSize: 11, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      cursor={{ fill: chartColors.cursorFill }}
                      content={<LessonComparisonTooltip metric="quiz" />}
                    />
                    <ReferenceLine
                      y={80}
                      stroke={chartColors.refPassStroke}
                      strokeDasharray="4 4"
                      label={{
                        value: 'Mốc đạt 80%',
                        position: 'insideTopRight',
                        fill: chartColors.refPassLabel,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                    <Bar
                      dataKey="quizPercent"
                      name="Điểm Đố vui (%)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={48}
                    >
                      {activeLessonChartData.map((entry) => (
                        <Cell
                          key={entry.lessonId}
                          fill={
                            !entry.hasQuizAttempt
                              ? chartColors.emptyBarFill
                              : entry.quizPercent >= 80
                                ? chartColors.quizBar
                                : chartColors.minigameBar
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2 (5 cols): Recharts Grade Level Completion (3,4,5) OR Weekly Daily XP */}
        <div
          className="lg:col-span-5 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 flex flex-col justify-between transition-colors"
          data-testid="chart-weekly-xp"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div className="min-w-0">
              <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-slate-100">
                {secondaryMode === 'levels'
                  ? 'Tỷ lệ hoàn thành các cấp độ (3, 4, 5)'
                  : 'Biểu đồ XP theo ngày trong tuần'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {secondaryMode === 'levels'
                  ? 'Phần trăm bài học đã hoàn thành theo từng khối lớp'
                  : 'Thống kê XP đạt được từ Thứ 2 → Chủ nhật'}
              </p>
            </div>

            <div
              className="inline-flex self-start items-center p-1 rounded-xl bg-slate-100 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155] shrink-0"
              role="group"
              aria-label="Chọn biểu đồ phụ"
            >
              <button
                type="button"
                onClick={() => setSecondaryMode('levels')}
                data-testid="btn-secondary-levels"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  secondaryMode === 'levels'
                    ? 'bg-white dark:bg-[#25334D] text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cấp độ 3·4·5
              </button>
              <button
                type="button"
                onClick={() => setSecondaryMode('weekly')}
                data-testid="btn-secondary-weekly"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  secondaryMode === 'weekly'
                    ? 'bg-white dark:bg-[#25334D] text-sky-700 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                XP tuần
              </button>
            </div>
          </div>

          <div className="mt-4 w-full h-[250px]" data-testid="recharts-weekly-bar-wrapper">
            <ResponsiveContainer width="100%" height={250} minWidth={180}>
              {secondaryMode === 'levels' ? (
                <BarChart
                  data={gradeCompletions}
                  margin={{ top: 16, right: 12, left: -12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStroke} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: chartColors.axisTickFill, fontSize: 12, fontWeight: 700 }}
                    axisLine={{ stroke: chartColors.axisLineStroke }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: chartColors.yAxisTickFill, fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip cursor={{ fill: chartColors.cursorFill }} content={<GradeCompletionTooltip />} />
                  <Bar
                    dataKey="percent"
                    name="Tỷ lệ hoàn thành (%)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={52}
                  >
                    {gradeCompletions.map((entry) => (
                      <Cell
                        key={entry.grade}
                        fill={
                          entry.isCurrentGrade
                            ? chartColors.quizBar
                            : entry.percent > 0
                              ? chartColors.practiceBar
                              : chartColors.emptyLevelBarFill
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart
                  data={analytics.weeklyDays}
                  margin={{ top: 16, right: 8, left: -16, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStroke} />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fill: chartColors.axisTickFill, fontSize: 12, fontWeight: 700 }}
                    axisLine={{ stroke: chartColors.axisLineStroke }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, weeklyMax]}
                    tick={{ fill: chartColors.yAxisTickFill, fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: chartColors.cursorFill }} content={<WeeklyXpTooltip />} />
                  <Bar
                    dataKey="xp"
                    name="XP trong ngày"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={36}
                  >
                    {analytics.weeklyDays.map((day) => (
                      <Cell
                        key={day.isoWeekday}
                        fill={
                          day.xp === 0
                            ? chartColors.emptyBarFill
                            : day.isToday
                              ? chartColors.todayBar
                              : chartColors.practiceBar
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-[#25334D]">
            {secondaryMode === 'levels' ? (
              <>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mr-1.5 align-middle" />
                Cột màu xanh lá đánh dấu cấp độ Lớp {grade} hiện tại của em.
              </>
            ) : (
              <>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 dark:bg-orange-400 mr-1.5 align-middle" />
                Cột màu cam đánh dấu hoạt động hôm nay (theo giờ Việt Nam).
              </>
            )}
          </p>
        </div>
      </div>

      {/* Per-Lesson Score Detail Table */}
      {analytics.lessonScores.length > 0 && (
        <div
          className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl overflow-hidden transition-colors"
          data-testid="student-scores-table"
        >
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#25334D] flex items-center justify-between gap-2">
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-slate-100">
              Bảng điểm chi tiết từng bài
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng cộng {analytics.lessonScores.length} bài
            </span>
          </div>
          {/* Mobile compact cards */}
          <div className="sm:hidden divide-y divide-slate-100 dark:divide-[#25334D]">
            {analytics.lessonScores.map((item) => (
              <div key={item.lessonId} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {item.lessonId.startsWith('CHUNG')
                        ? `${item.lessonNumber}: ${item.title}`
                        : `Bài ${item.lessonNumber}: ${item.title}`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tin học {item.grade} · {item.pageRange}
                    </p>
                  </div>
                  <span className="font-mono font-extrabold text-sm text-sky-700 dark:text-sky-400 tabular-nums shrink-0">
                    {item.earnedXp} / {item.maxXp} XP
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-[#1A2742] rounded-xl p-2.5">
                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">Tự làm</span>
                    <strong className={item.practiceCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}>
                      {item.practiceCompleted ? `+${item.practiceXp} XP` : '0/20'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">Trò chơi</span>
                    <strong className={item.minigameCompleted ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}>
                      {item.minigameCompleted ? `+${item.minigameXp} XP` : '0/5'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">Đố vui</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {item.quizBestPercent !== null ? `${item.quizBestPercent}%` : '--'}
                    </strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenLesson(item.lessonId, 'watch')}
                  className="w-full min-h-[40px] rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" />
                  {item.started ? 'Vào làm tiếp' : 'Bắt đầu'}
                </button>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#1A2742] border-b border-slate-200 dark:border-[#25334D] text-xs font-bold text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4">Bài học</th>
                  <th className="py-3 px-3 whitespace-nowrap">Tự làm</th>
                  <th className="py-3 px-3 whitespace-nowrap">Trò chơi</th>
                  <th className="py-3 px-3 whitespace-nowrap">Đố vui</th>
                  <th className="py-3 px-3 whitespace-nowrap text-right">Tổng điểm bài</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Thực hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#25334D]">
                {analytics.lessonScores.map((item) => (
                  <tr key={item.lessonId} className="hover:bg-slate-50/70 dark:hover:bg-[#1A2742]/70">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {item.lessonId.startsWith('CHUNG')
                          ? `${item.lessonNumber}: ${item.title}`
                          : `Bài ${item.lessonNumber}: ${item.title}`}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tin học {item.grade} · {item.pageRange}
                      </p>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {item.practiceCompleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          +{item.practiceXp} XP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <CircleDashed className="w-4 h-4" />
                          0 / 20 XP
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {item.minigameCompleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                          <Gamepad2 className="w-4 h-4" />
                          +{item.minigameXp} XP
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">0 / 5 XP</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-xs">
                      {item.quizBestPercent !== null ? (
                        <span className={item.quizPassed ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-bold text-amber-700 dark:text-amber-400'}>
                          {item.quizBestPercent}% ({item.quizXp > 0 ? `+${item.quizXp} XP` : 'chưa đạt 80%'})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-sans">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-extrabold text-sky-700 dark:text-sky-400 tabular-nums">
                      {item.earnedXp} / {item.maxXp} XP
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenLesson(item.lessonId, 'watch')}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        {item.started ? 'Vào làm tiếp' : 'Bắt đầu'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
