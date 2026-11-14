import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Gamepad2, RotateCcw, Sparkles, Trophy, XCircle } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { ArenaRoom, PublicQuizQuestion, QuizQuestionResult } from '../shared/types';
import { AvatarBadge } from './AvatarIcon';
import { QuizSection } from './simulators/QuizSection';
import { ThemeToggle } from './ThemeToggle';

export interface ArenaGameTask {
  id: string;
  prompt: string;
  options: string[];
  hint: string;
}

interface ArenaMatchViewProps {
  room: ArenaRoom;
  currentUid: string;
  questions: PublicQuizQuestion[];
  gameTasks: ArenaGameTask[];
  onRoomUpdated: (room: ArenaRoom, serverNow?: string) => void;
  onExitToLobby: () => void;
}

export const ArenaMatchView: React.FC<ArenaMatchViewProps> = ({
  room,
  currentUid,
  questions,
  gameTasks,
  onRoomUpdated,
  onExitToLobby,
}) => {
  const myParticipant = room.participants.find((p) => p.uid === currentUid);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, unknown>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizQuestionResult[] | undefined>(undefined);
  const [quizScorePercent, setQuizScorePercent] = useState<number | null>(() => {
    if (
      myParticipant &&
      typeof myParticipant.submittedScore === 'number' &&
      typeof myParticipant.submittedTotal === 'number' &&
      myParticipant.submittedTotal > 0
    ) {
      return Math.round((myParticipant.submittedScore / myParticipant.submittedTotal) * 100);
    }
    return null;
  });

  // Game mode state
  const [roundIdx, setRoundIdx] = useState(0);
  const [gameAnswers, setGameAnswers] = useState<Record<string, number>>({});
  const [gameFinished, setGameFinished] = useState<boolean>(
    () => typeof myParticipant?.submittedScore === 'number',
  );
  const [gameResultSummary, setGameResultSummary] = useState<{ score: number; total: number; percent: number } | null>(() => {
    if (
      myParticipant &&
      typeof myParticipant.submittedScore === 'number' &&
      typeof myParticipant.submittedTotal === 'number'
    ) {
      const total = Math.max(1, myParticipant.submittedTotal);
      return {
        score: myParticipant.submittedScore,
        total,
        percent: Math.round((myParticipant.submittedScore / total) * 100),
      };
    }
    return null;
  });
  const [gameSubmitting, setGameSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sortedParticipants = useMemo(() => {
    return [...room.participants].sort((a, b) => {
      const sa = typeof a.submittedScore === 'number' ? a.submittedScore : -1;
      const sb = typeof b.submittedScore === 'number' ? b.submittedScore : -1;
      if (sb !== sa) return sb - sa;
      return a.nickname.localeCompare(b.nickname);
    });
  }, [room.participants]);

  const handleSubmitQuiz = async () => {
    setQuizSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.submitArenaResult(room.id, { answers: quizAnswers });
      setQuizResults(res.results);
      setQuizScorePercent(res.scorePercent);
      onRoomUpdated(res.room, res.serverNow);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Không thể nộp bài thi đấu. Em thử lại nhé.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handlePickGameOption = async (taskId: string, optionIdx: number) => {
    if (gameFinished || gameSubmitting) return;
    const nextAnswers = { ...gameAnswers, [taskId]: optionIdx };
    setGameAnswers(nextAnswers);

    if (roundIdx + 1 >= gameTasks.length) {
      setGameSubmitting(true);
      setSubmitError(null);
      try {
        const res = await api.submitArenaResult(room.id, { gameAnswers: nextAnswers });
        setGameResultSummary({
          score: res.score,
          total: res.total,
          percent: res.scorePercent,
        });
        setGameFinished(true);
        onRoomUpdated(res.room, res.serverNow);
      } catch (err) {
        setSubmitError(err instanceof ApiError ? err.message : 'Không thể lưu điểm trò chơi.');
      } finally {
        setGameSubmitting(false);
      }
    } else {
      window.setTimeout(() => {
        setRoundIdx((i) => i + 1);
      }, 280);
    }
  };

  const currentTask = gameTasks[roundIdx];

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#CFE6FF] via-[#E5F2FF] to-[#F3FAFF] dark:from-[#0B1220] dark:via-[#0F1B33] dark:to-[#0B1220] flex flex-col"
      data-testid="arena-match-view"
    >
      <header className="relative z-20 bg-gradient-to-r from-[#0265E4] via-[#0166E3] to-[#025ED6] dark:from-[#0E1E3A] dark:via-[#12264A] dark:to-[#0E1E3A] border-b-[3px] border-[#A3E635] dark:border-sky-500/60 px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/student-icons/logo-mam-xanh-white.png"
              alt="Logo Đấu trường Tin học"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
            />
            <span className="h-5 w-px bg-white/45 shrink-0 hidden sm:inline-block" aria-hidden="true" />
            <span className="font-display font-black text-base sm:text-[19px] text-white tracking-tight truncate">
              Đấu trường Tin học · Phòng {room.roomCode}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle variant="header" />
            <button
              type="button"
              onClick={onExitToLobby}
              className="min-h-[42px] px-4 rounded-full border-[1.5px] border-white/85 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-display font-bold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về sảnh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
        <section className="bg-white/95 dark:bg-[#131D31] border border-[#D4E6FA] dark:border-[#25334D] rounded-[22px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5" />
              {room.mode === 'game' ? 'Trò chơi thi đấu đang diễn ra' : 'Thi trắc nghiệm đang diễn ra'}
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-[#0F2654] dark:text-slate-100 mt-1.5">
              {room.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Lớp {room.classCode} · {room.lessonTitle}
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-[#EAF4FF] dark:bg-[#1A2742] border border-[#BDDCFC] dark:border-[#334155] text-right">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Quy mô đề thi</p>
            <p className="font-display font-black text-lg text-[#0F2654] dark:text-sky-200">
              {room.mode === 'game' ? `${gameTasks.length} lượt chơi` : `${questions.length} câu hỏi`}
            </p>
          </div>
        </section>

        {submitError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-100 text-sm font-semibold flex items-center gap-2"
          >
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Active Arena Quiz or Game */}
          <section className="lg:col-span-8">
            {room.mode === 'quiz' ? (
              questions.length === 0 ? (
                <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 text-center text-sm text-slate-600 dark:text-slate-300">
                  Không có câu hỏi cho phòng thi đấu này.
                </div>
              ) : (
                <QuizSection
                  questions={questions}
                  answers={quizAnswers}
                  onChangeAnswer={(qId, val) => setQuizAnswers((prev) => ({ ...prev, [qId]: val }))}
                  onSubmitQuiz={handleSubmitQuiz}
                  submitting={quizSubmitting}
                  results={quizResults}
                  scorePercent={quizScorePercent}
                  solutionsVisible
                />
              )
            ) : (
              <div
                className="bg-white dark:bg-[#131D31] border border-[#D4E6FA] dark:border-[#25334D] rounded-[22px] p-5 sm:p-6 space-y-5 shadow-sm"
                data-testid="arena-game-stage"
              >
                {gameFinished && gameResultSummary ? (
                  <div className="text-center space-y-4 py-4">
                    <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
                    <h2 className="font-display font-black text-2xl text-[#0F2654] dark:text-slate-100">
                      Hoàn thành Trò chơi Đấu trường!
                    </h2>
                    <p className="text-base text-slate-700 dark:text-slate-200">
                      Em đạt <strong className="font-mono text-[#0166E3] dark:text-sky-300">{gameResultSummary.score}/{gameResultSummary.total}</strong> điểm ({gameResultSummary.percent}%)
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRoundIdx(0);
                          setGameAnswers({});
                          setGameFinished(false);
                        }}
                        className="min-h-[44px] px-5 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Chơi lại
                      </button>
                      <button
                        type="button"
                        onClick={onExitToLobby}
                        className="min-h-[44px] px-5 rounded-xl bg-[#0166E3] hover:bg-[#025ED6] text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                      >
                        Về sảnh Đấu trường
                      </button>
                    </div>
                  </div>
                ) : currentTask ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 font-display font-extrabold text-base text-[#0F2654] dark:text-slate-100">
                        <Gamepad2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        Lượt {roundIdx + 1} / {gameTasks.length}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 text-xs font-mono font-bold">
                        {Object.keys(gameAnswers).length}/{gameTasks.length} đã trả lời
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-[#ECF6FF] dark:bg-sky-950/50 border border-[#BDDCFC] dark:border-sky-800/60">
                      <p className="font-display font-extrabold text-lg text-[#0F2654] dark:text-slate-100">
                        {currentTask.prompt}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {currentTask.options.map((opt, idx) => {
                        const chosen = gameAnswers[currentTask.id] === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={gameSubmitting}
                            onClick={() => handlePickGameOption(currentTask.id, idx)}
                            className={`w-full text-left min-h-[50px] px-4 py-3 rounded-xl border-2 font-semibold text-sm sm:text-base transition-colors cursor-pointer ${
                              chosen
                                ? 'bg-[#0166E3] border-[#0166E3] text-white'
                                : 'bg-white dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] hover:border-[#0166E3] text-[#0F2654] dark:text-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">Đang chuẩn bị lượt chơi...</p>
                )}
              </div>
            )}
          </section>

          {/* Live Classmates Scoreboard */}
          <aside className="lg:col-span-4 bg-white/95 dark:bg-[#131D31] border border-[#D4E6FA] dark:border-[#25334D] rounded-[22px] p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="font-display font-black text-lg text-[#0F2654] dark:text-slate-100">
                Bảng điểm phòng thi
              </h2>
            </div>
            <ul className="space-y-2.5">
              {sortedParticipants.map((p) => {
                const isMe = p.uid === currentUid;
                const hasScore = typeof p.submittedScore === 'number';
                return (
                  <li
                    key={p.uid}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 ${
                      isMe
                        ? 'bg-[#EAF4FF] dark:bg-sky-950/60 border-[#58A3FF] dark:border-sky-600'
                        : 'bg-slate-50 dark:bg-[#1A2742] border-slate-200 dark:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarBadge avatarId={p.avatarId} size="sm" shape="circle" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0F2654] dark:text-slate-100 truncate">
                          {p.nickname} {isMe && '(Em)'}
                        </p>
                      </div>
                    </div>
                    {hasScore ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 text-xs font-mono font-extrabold shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {p.submittedScore}/{p.submittedTotal ?? room.itemCount}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 shrink-0">
                        Đang làm bài
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
};
