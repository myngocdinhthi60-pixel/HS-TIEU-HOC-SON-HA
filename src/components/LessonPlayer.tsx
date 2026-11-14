import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  WifiOff,
  X,
} from 'lucide-react';
import { api, ApiError, type ClientUser, type LessonWorkspaceData } from '../services/api';
import {
  getInitialL4B5Fs,
  getInitialL4B5PracticeFs,
  getInitialL5B4Fs,
  getInitialL5B4PracticeFs,
} from '../shared/virtualFs';
import type { AttemptDraft, LessonStage, QuizQuestionResult, VirtualFsState } from '../shared/types';
import { FolderGames } from './simulators/FolderGames';
import { FolderSimulator } from './simulators/FolderSimulator';
import { InteractiveTaskPractice } from './simulators/InteractiveTaskPractice';
import { KeyboardSimulator } from './simulators/KeyboardSimulator';
import { QuickMatchGame } from './simulators/QuickMatchGame';
import { QuizSection } from './simulators/QuizSection';
import { ThemeToggle } from './ThemeToggle';
import { ThreeRewardOrVisual } from './ThreeEffects';

interface LessonPlayerProps {
  lessonId: string;
  initialStage?: LessonStage;
  lowSpec2D: boolean;
  onToggleLowSpec2D: () => void;
  onBackHome: () => void;
  onUserUpdated: (user: ClientUser) => void;
}

const STAGES: Array<{ id: LessonStage; label: string }> = [
  { id: 'watch', label: '1. Xem mẫu' },
  { id: 'guided', label: '2. Làm theo' },
  { id: 'practice', label: '3. Tự làm' },
  { id: 'game', label: '4. Trò chơi' },
  { id: 'quiz', label: '5. Đố vui' },
];

export const LessonPlayer: React.FC<LessonPlayerProps> = ({
  lessonId,
  initialStage = 'watch',
  lowSpec2D,
  onToggleLowSpec2D,
  onBackHome,
  onUserUpdated,
}) => {
  const [workspace, setWorkspace] = useState<LessonWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stage, setStage] = useState<LessonStage>(initialStage);

  // Watch & Guided state
  const [watchIdx, setWatchIdx] = useState(0);
  const [guidedIdx, setGuidedIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Guided FS state (for L4-B5 / L5-B4)
  const [guidedFs, setGuidedFs] = useState<VirtualFsState>(() =>
    lessonId === 'L5-B4' ? getInitialL5B4Fs() : getInitialL4B5Fs(),
  );
  // Guided keyboard / tasks state
  const [guidedBumpDone, setGuidedBumpDone] = useState(false);
  const [guidedTypeDone, setGuidedTypeDone] = useState(false);
  const [guidedTaskAck, setGuidedTaskAck] = useState(false);

  // Practice Draft state (persisted to backend via autosave)
  const [revision, setRevision] = useState(1);
  const [practiceFs, setPracticeFs] = useState<VirtualFsState>(() =>
    lessonId === 'L5-B4' ? getInitialL5B4PracticeFs() : getInitialL4B5PracticeFs(),
  );
  const [typingStats, setTypingStats] = useState({
    completedSequences: [] as string[],
    accuracy: 100,
    wpm: 0,
    selfCheckFingers: false,
  });
  const [taskAnswers, setTaskAnswers] = useState<Record<string, number>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, unknown>>({});

  // Save & Grading states
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [practiceResult, setPracticeResult] = useState<{
    passed: boolean;
    feedback: string;
    checks?: Array<{ id: string; label: string; ok: boolean; hint: string }>;
  } | null>(null);
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);

  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizQuestionResult[] | undefined>(undefined);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [solutionsVisible, setSolutionsVisible] = useState(true);

  const [practiceSuccessModal, setPracticeSuccessModal] = useState<{
    lessonTitle: string;
    awardedXp: number;
    alreadyAwarded: boolean;
    totalXp: number;
    badgeName: string | null;
  } | null>(null);

  useEffect(() => {
    if (!practiceSuccessModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPracticeSuccessModal(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [practiceSuccessModal]);

  const pendingDraftRef = useRef<AttemptDraft | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setStage(initialStage);
  }, [lessonId, initialStage]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg(null);
    setPracticeResult(null);
    setGuidedIdx(0);
    setWatchIdx(0);
    setGuidedBumpDone(false);
    setGuidedTypeDone(false);
    setGuidedTaskAck(false);
    api
      .getStudentLesson(lessonId)
      .then((data) => {
        if (!active) return;
        setWorkspace(data);
        setRevision(data.attempt.revision || 1);
        if (data.attempt.draft.fsState) {
          setPracticeFs(data.attempt.draft.fsState);
        } else {
          setPracticeFs(lessonId === 'L5-B4' ? getInitialL5B4PracticeFs() : getInitialL4B5PracticeFs());
        }
        if (data.attempt.draft.typingStats) {
          setTypingStats(data.attempt.draft.typingStats);
        }
        setTaskAnswers(data.attempt.draft.taskAnswers ?? {});
        if (data.attempt.draft.quizAnswers) {
          setQuizAnswers(data.attempt.draft.quizAnswers);
        }
        if (data.attempt.quizResults) {
          setQuizResults(data.attempt.quizResults);
        } else {
          setQuizResults(undefined);
        }
        setQuizScore(data.attempt.quizScorePercent);
        setSolutionsVisible(data.canRevealSolutions);
        setGuidedFs(lessonId === 'L5-B4' ? getInitialL5B4Fs() : getInitialL4B5Fs());
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err instanceof ApiError ? err.message : 'Không thể tải bài học.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [lessonId]);

  const flushAutosave = useCallback(
    async (draft: AttemptDraft, rev: number) => {
      try {
        setSaveStatus('saving');
        const res = await api.autosaveAttempt(lessonId, rev, draft);
        setRevision(res.revision);
        pendingDraftRef.current = null;
        setSaveStatus('saved');
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && err.data?.revision) {
          setRevision(Number(err.data.revision));
          setSaveStatus('saved');
        } else {
          setSaveStatus('offline');
          pendingDraftRef.current = draft;
        }
      }
    },
    [lessonId],
  );

  // Retry queued autosave when browser returns online
  useEffect(() => {
    const onOnline = () => {
      if (pendingDraftRef.current) {
        void flushAutosave(pendingDraftRef.current, revision);
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushAutosave, revision]);

  const scheduleAutosave = (patch: AttemptDraft) => {
    pendingDraftRef.current = patch;
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void flushAutosave(patch, revision);
    }, 650);
  };

  const bundle = workspace?.bundle;
  const lesson = workspace?.lesson;

  const practiceKind = useMemo(() => {
    if (lesson?.practiceKind) return lesson.practiceKind;
    if (lessonId === 'L3-B5' || lessonId === 'L4-B2' || lessonId === 'CHUNG-BAN-PHIM') return 'keyboard';
    if (lessonId === 'L4-B5' || lessonId === 'L5-B4' || lessonId === 'CHUNG-TEP-THU-MUC') return 'folder';
    return 'tasks';
  }, [lesson?.practiceKind, lessonId]);

  const guidedSteps = bundle?.guidedSteps ?? [];
  const activeGuidedStep = guidedSteps[guidedIdx];

  // Auto-detect guided step completion
  const guidedStepDone = useMemo(() => {
    if (!activeGuidedStep) return false;
    if (practiceKind === 'folder') {
      if (lessonId === 'L5-B4') {
        if (activeGuidedStep.id === 'g-open-scope') {
          return guidedFs.currentFolderId === 'anh-nhom';
        }
        if (activeGuidedStep.id === 'g-search-thantho') {
          return guidedFs.actions.some(
            (a) => a.type === 'search' && (a.query || '').toLowerCase().includes('ho-than-tho'),
          );
        }
        if (activeGuidedStep.id === 'g-open-loc') {
          return guidedFs.currentFolderId === 'khoa-dir';
        }
      } else {
        if (activeGuidedStep.id === 'g-copy-select') {
          return guidedFs.clipboard?.mode === 'copy' && guidedFs.clipboard.nodeId === 'file-gioithieu';
        }
        if (activeGuidedStep.id === 'g-paste-nhom2') {
          const inNhom2 = guidedFs.nodes.some((n) => n.parentId === 'nhom-2' && n.name === 'Gioi thieu.pptx');
          const stillInD = guidedFs.nodes.some((n) => n.parentId === 'drive-d' && n.name === 'Gioi thieu.pptx');
          return inNhom2 && stillInD;
        }
        if (activeGuidedStep.id === 'g-move-thuan') {
          const thuAn = guidedFs.nodes.find((n) => n.id === 'thu-an');
          return thuAn?.parentId === 'nhom-2';
        }
        if (activeGuidedStep.id === 'g-rename') {
          return guidedFs.nodes.some((n) => n.parentId === 'nhom-2' && n.name === 'Gioi thieu nhom.pptx');
        }
        if (activeGuidedStep.id === 'g-delete-undo') {
          const hasDeleted = guidedFs.actions.some((a) => a.type === 'delete');
          const hasUndone = guidedFs.actions.some((a) => a.type === 'undo');
          const fileRestored = guidedFs.nodes.some((n) => n.id === 'file-nhap');
          return hasDeleted && hasUndone && fileRestored;
        }
      }
    }
    if (practiceKind === 'keyboard') {
      if (activeGuidedStep.id === 'g-find-fj') return guidedBumpDone;
      return guidedTypeDone;
    }
    return guidedTaskAck;
  }, [activeGuidedStep, guidedBumpDone, guidedFs, guidedTaskAck, guidedTypeDone, lessonId, practiceKind]);

  const handlePracticeFsChange = (next: VirtualFsState) => {
    setPracticeFs(next);
    scheduleAutosave({ fsState: next });
  };

  const handleTypingStatsChange = (next: typeof typingStats) => {
    setTypingStats(next);
    scheduleAutosave({ typingStats: next });
  };

  const handleTaskAnswersChange = (next: Record<string, number>) => {
    setTaskAnswers(next);
    scheduleAutosave({ taskAnswers: next });
  };

  const handleResetPractice = () => {
    setPracticeResult(null);
    if (practiceKind === 'folder') {
      const fresh = lessonId === 'L5-B4' ? getInitialL5B4PracticeFs() : getInitialL4B5PracticeFs();
      setPracticeFs(fresh);
      scheduleAutosave({ fsState: fresh });
    } else if (practiceKind === 'keyboard') {
      const fresh = { completedSequences: [], accuracy: 100, wpm: 0, selfCheckFingers: false };
      setTypingStats(fresh);
      scheduleAutosave({ typingStats: fresh });
    } else {
      setTaskAnswers({});
      scheduleAutosave({ taskAnswers: {} });
    }
  };

  const cancelPendingAutosave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingDraftRef.current = null;
  };

  const handleSubmitPractice = async () => {
    cancelPendingAutosave();
    setPracticeSubmitting(true);
    try {
      const draft: AttemptDraft =
        practiceKind === 'keyboard'
          ? { typingStats }
          : practiceKind === 'folder'
            ? { fsState: practiceFs }
            : { taskAnswers };
      const res = await api.submitPractice(lessonId, draft);
      if (res.revision) setRevision(res.revision);
      setSaveStatus('saved');
      setPracticeResult({
        passed: res.passed,
        feedback: res.feedback,
        checks: res.checks,
      });
      onUserUpdated(res.user);
      if (res.passed) {
        setPracticeSuccessModal({
          lessonTitle: lesson?.title ?? 'bài thực hành',
          awardedXp: res.awardedXp,
          alreadyAwarded: res.alreadyAwarded,
          totalXp: res.user.totalXp,
          badgeName: res.unlockedBadge?.name ?? null,
        });
      }
    } catch (err) {
      setPracticeResult({
        passed: false,
        feedback: err instanceof ApiError ? err.message : 'Lỗi chấm bài thực hành.',
      });
    } finally {
      setPracticeSubmitting(false);
    }
  };

  const handleSubmitGame = async (roundsCompleted: number, score: number) => {
    cancelPendingAutosave();
    try {
      const res = await api.submitMinigame(lessonId, roundsCompleted, score);
      if (res.revision) setRevision(res.revision);
      setSaveStatus('saved');
      onUserUpdated(res.user);
    } catch {
      // non-blocking
    }
  };

  const handleSubmitQuiz = async () => {
    cancelPendingAutosave();
    setQuizSubmitting(true);
    try {
      const res = await api.submitQuiz(lessonId, quizAnswers);
      if (res.revision) setRevision(res.revision);
      setSaveStatus('saved');
      setQuizResults(res.results);
      setQuizScore(res.scorePercent);
      setSolutionsVisible(res.solutionsVisible);
      onUserUpdated(res.user);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Không thể nộp bài Đố vui.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-8 text-center">
          <p className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Đang chuẩn bị phòng thực hành...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !workspace || !lesson || !bundle) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#131D31] border border-rose-200 dark:border-rose-800/60 rounded-2xl p-6 space-y-4 text-center">
          <p className="font-bold text-rose-800 dark:text-rose-200">{errorMsg || 'Bài học chưa sẵn sàng.'}</p>
          <button
            type="button"
            onClick={onBackHome}
            className="min-h-[46px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-bold cursor-pointer"
          >
            Quay lại trang học tập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col transition-colors duration-200">
      {/* Clean Top Bar */}
      <header className="bg-white dark:bg-[#131D31] border-b border-slate-200 dark:border-[#25334D] px-4 sm:px-6 py-3.5 sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#1A2742] text-slate-800 dark:text-slate-100 text-sm font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Trang học tập
            </button>
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 truncate">
                Lớp {lesson.grade} · Bài {lesson.lessonNumber}: {lesson.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {lesson.topic} · SGK {lesson.pageRange}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <span
              className={`text-xs font-semibold flex items-center gap-1.5 ${
                saveStatus === 'offline' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {saveStatus === 'offline' && <WifiOff className="w-4 h-4" />}
              {saveStatus === 'saving'
                ? 'Đang lưu...'
                : saveStatus === 'offline'
                  ? 'Mất mạng, chưa lưu'
                  : 'Đã lưu'}
            </span>
            <button
              type="button"
              onClick={onToggleLowSpec2D}
              className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1A2742] hover:bg-slate-100 dark:hover:bg-[#223254] text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap cursor-pointer"
            >
              {lowSpec2D ? 'Đồ họa: 2D nhẹ' : 'Đồ họa: 3D/2D'}
            </button>
            <ThemeToggle variant="header" />
          </div>
        </div>
      </header>

      {/* Stage Stepper */}
      <div className="bg-white dark:bg-[#131D31] border-b border-slate-200 dark:border-[#25334D] px-4 sm:px-6 py-2.5 transition-colors">
        <div
          className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto"
          role="tablist"
          aria-label="Các bước học của bài"
        >
          {STAGES.map((s) => {
            const active = stage === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStage(s.id);
                  setShowHint(false);
                }}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-600 dark:bg-sky-500 text-white'
                    : 'bg-slate-100 dark:bg-[#1A2742] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#223254]'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stage Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* STAGE 1: XEM MẪU */}
        {stage === 'watch' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-5 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-sky-700 dark:text-sky-400">
                  Minh họa mẫu {watchIdx + 1}/{bundle.watchSteps.length}
                </span>
                <div className="flex gap-1.5">
                  {bundle.watchSteps.map((ws, i) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => setWatchIdx(i)}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer ${
                        i === watchIdx
                          ? 'bg-sky-600 dark:bg-sky-500 text-white'
                          : 'bg-slate-100 dark:bg-[#1A2742] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#223254]'
                      }`}
                    >
                      Mẫu {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-display font-extrabold text-xl text-slate-900 dark:text-slate-100">
                  {bundle.watchSteps[watchIdx].title}
                </h2>
                <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed mt-2">
                  {bundle.watchSteps[watchIdx].description}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-100 text-sm font-medium">
                {bundle.watchSteps[watchIdx].exampleTip}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={watchIdx === 0}
                  onClick={() => setWatchIdx((i) => i - 1)}
                  className="min-h-[46px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1A2742] disabled:opacity-40 cursor-pointer"
                >
                  Mẫu trước
                </button>
                {watchIdx < bundle.watchSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setWatchIdx((i) => i + 1)}
                    className="min-h-[46px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    Xem mẫu tiếp
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStage('guided')}
                    className="min-h-[48px] px-6 rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-display font-bold text-base flex items-center gap-2 cursor-pointer"
                  >
                    Chuyển sang 2. Làm theo
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <ThreeRewardOrVisual
                mode={lessonId === 'L4-B5' ? 'copy_split' : 'badge'}
                title={
                  lessonId === 'L4-B5'
                    ? 'Sao chép: Giữ bản gốc và tạo bản mới'
                    : lessonId === 'L3-B5'
                      ? 'Mục tiêu: Gõ 10 ngón từ hàng cơ sở F & J'
                      : 'Mục tiêu: Cây thư mục gọn gàng, tìm đúng phạm vi'
                }
                subtitle="Hiệu ứng trực quan hỗ trợ ghi nhớ thao tác"
                lowSpec2D={lowSpec2D}
              />

              <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">
                  Mục tiêu bài học (SGK {lesson.pageRange})
                </h3>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5">
                  {lesson.objectives.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* STAGE 2: LÀM THEO */}
        {stage === 'guided' && activeGuidedStep && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-400">
                <span>
                  Bước {guidedIdx + 1}/{guidedSteps.length}
                </span>
                {guidedStepDone && (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Đã hoàn thành bước
                  </span>
                )}
              </div>

              <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                {activeGuidedStep.verbTitle}
              </h2>
              <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                {activeGuidedStep.instruction}
              </p>

              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 text-xs sm:text-sm text-sky-950 dark:text-sky-100">
                {activeGuidedStep.exampleSideNote}
              </div>

              {showHint && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs sm:text-sm text-amber-950 dark:text-amber-100 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{activeGuidedStep.hint}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1A2742] flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {showHint ? 'Ẩn gợi ý' : 'Gợi ý'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuidedFs(lessonId === 'L5-B4' ? getInitialL5B4Fs() : getInitialL4B5Fs());
                    setGuidedBumpDone(false);
                    setGuidedTypeDone(false);
                  }}
                  className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1A2742] flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Làm lại
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-[#25334D]">
                <button
                  type="button"
                  disabled={guidedIdx === 0}
                  onClick={() => {
                    setGuidedIdx((i) => i - 1);
                    setShowHint(false);
                  }}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1A2742] disabled:opacity-40 cursor-pointer"
                >
                  Bước trước
                </button>
                {guidedIdx < guidedSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGuidedIdx((i) => i + 1);
                      setShowHint(false);
                      setGuidedTypeDone(false);
                    }}
                    className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-sm font-bold cursor-pointer"
                  >
                    Bước tiếp theo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStage('practice')}
                    className="min-h-[46px] px-4 rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-bold cursor-pointer"
                  >
                    Sang 3. Tự làm
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-8">
              {practiceKind === 'keyboard' ? (
                <KeyboardSimulator
                  mode="guided"
                  guidedTarget={
                    activeGuidedStep.id === 'g-find-fj'
                      ? 'key-fj'
                      : activeGuidedStep.id === 'g-reach-type'
                        ? 'typing-reach'
                        : 'typing-home'
                  }
                  onGuidedBumpDone={() => setGuidedBumpDone(true)}
                  onGuidedTypeDone={() => setGuidedTypeDone(true)}
                  typingStats={typingStats}
                  onTypingStatsChange={handleTypingStatsChange}
                />
              ) : practiceKind === 'folder' ? (
                <FolderSimulator
                  fsState={guidedFs}
                  onChange={setGuidedFs}
                  highlightTarget={activeGuidedStep.highlightTarget}
                  enableSearch={lessonId === 'L5-B4'}
                  lowSpec2D={lowSpec2D}
                />
              ) : (
                <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-4">
                  <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                    Hướng dẫn làm mẫu · {lesson.title}
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    {bundle.practiceMissionSteps.map((st, idx) => (
                      <li key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155]">
                        {st}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setGuidedTaskAck(true)}
                      className="min-h-[44px] px-4 rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-sm font-bold cursor-pointer"
                    >
                      {guidedTaskAck ? 'Đã nắm rõ hướng dẫn ✓' : 'Em đã hiểu cách làm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStage('practice')}
                      className="min-h-[44px] px-5 rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-bold cursor-pointer"
                    >
                      Bắt đầu 3. Tự làm ngay →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* STAGE 3: TỰ LÀM */}
        {stage === 'practice' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 space-y-4">
              <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                {bundle.practiceMissionTitle}
              </h2>

              <ul className="space-y-2 text-sm text-slate-800 dark:text-slate-200">
                {bundle.practiceMissionSteps.map((step, i) => (
                  <li key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155]">
                    {step}
                  </li>
                ))}
              </ul>

              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-950 dark:text-sky-100">
                {bundle.practiceExampleNote}
              </div>

              {showHint && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-100">
                  <strong>Gợi ý:</strong> {bundle.practiceHint}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1A2742] flex items-center gap-1.5 cursor-pointer"
                >
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Gợi ý
                </button>
                <button
                  type="button"
                  onClick={handleResetPractice}
                  className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1A2742] flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Làm lại
                </button>
              </div>

              <button
                type="button"
                onClick={handleSubmitPractice}
                disabled={practiceSubmitting}
                className="w-full min-h-[52px] px-5 rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-60 text-white font-display font-bold text-base cursor-pointer"
              >
                {practiceSubmitting ? 'Đang chấm bài...' : 'Kiểm tra & Nộp bài Tự làm'}
              </button>

              {practiceResult && (
                <div
                  role="status"
                  className={`p-4 rounded-xl border space-y-2 text-sm ${
                    practiceResult.passed
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100'
                      : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100'
                  }`}
                >
                  <p className="font-bold flex items-center gap-2">
                    {practiceResult.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Award className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    {practiceResult.feedback}
                  </p>
                  {practiceResult.checks && practiceResult.checks.length > 0 && (
                    <ul className="space-y-1.5 text-xs pt-1">
                      {practiceResult.checks.map((c) => (
                        <li key={c.id} className="flex items-start gap-2">
                          <span className="font-bold">{c.ok ? '[Đạt]' : '[Chưa đạt]'}</span>
                          <span>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {practiceResult.passed && (
                    <button
                      type="button"
                      onClick={() => setStage('game')}
                      className="mt-2 w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-bold text-sm cursor-pointer"
                    >
                      Tiếp tục sang 4. Trò chơi
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-8">
              {practiceKind === 'keyboard' ? (
                <KeyboardSimulator
                  mode="practice"
                  typingStats={typingStats}
                  onTypingStatsChange={handleTypingStatsChange}
                />
              ) : practiceKind === 'folder' ? (
                <FolderSimulator
                  fsState={practiceFs}
                  onChange={handlePracticeFsChange}
                  enableSearch={lessonId === 'L5-B4'}
                  lowSpec2D={lowSpec2D}
                />
              ) : (
                <InteractiveTaskPractice
                  tasks={bundle.practiceTasks ?? []}
                  answers={taskAnswers}
                  onChange={handleTaskAnswersChange}
                />
              )}
            </div>
          </section>
        )}

        {/* STAGE 4: TRÒ CHƠI */}
        {stage === 'game' && (
          <section className="space-y-4">
            <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-extrabold text-xl text-slate-900 dark:text-slate-100">{bundle.gameTitle}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{bundle.gameDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setStage('quiz')}
                className="min-h-[46px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-sm font-bold whitespace-nowrap cursor-pointer"
              >
                Sang 5. Đố vui
              </button>
            </div>

            {practiceKind === 'keyboard' ? (
              <KeyboardSimulator
                mode="game"
                typingStats={typingStats}
                onTypingStatsChange={handleTypingStatsChange}
                onGameComplete={handleSubmitGame}
              />
            ) : practiceKind === 'folder' ? (
              <FolderGames
                lessonId={lessonId === 'L5-B4' ? 'L5-B4' : 'L4-B5'}
                onSubmitGame={handleSubmitGame}
                alreadyWon={workspace.attempt.minigamePassed}
              />
            ) : (
              <QuickMatchGame
                tasks={bundle.practiceTasks ?? []}
                alreadyWon={workspace.attempt.minigamePassed}
                onSubmitGame={handleSubmitGame}
              />
            )}
          </section>
        )}

        {/* STAGE 5: ĐỐ VUI */}
        {stage === 'quiz' && (
          <section className="space-y-4">
            <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5">
              <h2 className="font-display font-extrabold text-xl text-slate-900 dark:text-slate-100">
                Đố vui củng cố kiến thức ({workspace.questions.length} câu hỏi)
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Đạt từ 80% trở lên để hoàn thành phần Đố vui và nhận thêm +10 XP.
              </p>
            </div>
            <QuizSection
              questions={workspace.questions}
              answers={quizAnswers}
              onChangeAnswer={(qId, val) => {
                const next = { ...quizAnswers, [qId]: val };
                setQuizAnswers(next);
                scheduleAutosave({ quizAnswers: next });
              }}
              onSubmitQuiz={handleSubmitQuiz}
              submitting={quizSubmitting}
              results={quizResults}
              scorePercent={quizScore}
              solutionsVisible={solutionsVisible}
            />
          </section>
        )}
      </main>

      {/* Practice Completion Confirmation Dialog */}
      {practiceSuccessModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="practice-congrats-title"
          data-testid="practice-congrats-dialog"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPracticeSuccessModal(null);
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/55 dark:bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white dark:bg-[#131D31] rounded-[24px] border border-[#D8E7F8] dark:border-[#25334D] p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/assets/student-icons/tan-binh.png"
                  alt=""
                  aria-hidden="true"
                  className="w-11 h-11 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <h3
                    id="practice-congrats-title"
                    className="font-display font-black text-2xl text-[#0F2654] dark:text-slate-100 leading-tight"
                  >
                    Chúc mừng em!
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                    Em đã hoàn thành bài thực hành{' '}
                    <span className="font-bold text-[#13264D] dark:text-slate-100">
                      {practiceSuccessModal.lessonTitle}
                    </span>
                    .
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPracticeSuccessModal(null)}
                aria-label="Đóng thông báo chúc mừng"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2742] text-slate-500 dark:text-slate-400 shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* XP Awarded Readout */}
            <div
              data-testid="practice-congrats-xp"
              className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/45 p-4 flex items-center justify-between gap-4"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {practiceSuccessModal.awardedXp > 0
                    ? 'Số XP nhận được'
                    : 'Số XP lượt này'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {practiceSuccessModal.alreadyAwarded && practiceSuccessModal.awardedXp === 0
                    ? `Đã nhận +20 XP ở lượt trước · Tổng XP: ${practiceSuccessModal.totalXp} XP`
                    : `Tổng XP hiện tại của em: ${practiceSuccessModal.totalXp} XP`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono font-black text-2xl sm:text-3xl tabular-nums text-[#02994A] dark:text-emerald-400">
                  +{practiceSuccessModal.awardedXp} XP
                </span>
              </div>
            </div>

            {practiceSuccessModal.badgeName && (
              <div className="rounded-2xl border border-[#D8E7F8] dark:border-[#2B3E5E] bg-[#F4F9FF] dark:bg-[#1A2742] p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/65 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#025ED6] dark:text-sky-400">
                    Huy hiệu bài học
                  </p>
                  <p className="font-display font-extrabold text-sm sm:text-base text-[#0F2654] dark:text-slate-100 leading-snug">
                    {practiceSuccessModal.badgeName}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPracticeSuccessModal(null)}
                className="sm:flex-1 min-h-[46px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1A2742] hover:bg-slate-50 dark:hover:bg-[#223254] text-slate-800 dark:text-slate-100 font-display font-bold text-sm cursor-pointer transition-colors"
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => {
                  setPracticeSuccessModal(null);
                  setStage('game');
                }}
                className="sm:flex-[1.3] min-h-[46px] px-4 rounded-xl bg-[#02994A] hover:bg-[#02823F] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-display font-extrabold text-sm cursor-pointer transition-colors"
              >
                Sang 4. Trò chơi →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
