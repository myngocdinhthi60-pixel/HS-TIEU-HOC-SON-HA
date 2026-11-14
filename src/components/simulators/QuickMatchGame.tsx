import React, { useMemo, useState } from 'react';
import { CheckCircle2, Gamepad2, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import type { PracticeTaskItem } from '../../shared/types';

interface QuickMatchGameProps {
  tasks: PracticeTaskItem[];
  alreadyWon: boolean;
  onSubmitGame: (roundsCompleted: number, score: number) => void;
}

export const QuickMatchGame: React.FC<QuickMatchGameProps> = ({
  tasks,
  alreadyWon,
  onSubmitGame,
}) => {
  const rounds = useMemo(() => {
    const base = tasks.slice(0, 4);
    while (base.length > 0 && base.length < 4) {
      base.push(tasks[base.length % tasks.length]);
    }
    return base;
  }, [tasks]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lastPick, setLastPick] = useState<{ picked: number; correct: boolean } | null>(null);
  const [finished, setFinished] = useState(false);

  const current = rounds[roundIdx];

  const handlePick = (optIdx: number) => {
    if (!current || lastPick || finished) return;
    const isCorrect = optIdx === current.correctIndex;
    const nextScore = isCorrect ? score + 1 : score;
    setScore(nextScore);
    setLastPick({ picked: optIdx, correct: isCorrect });

    window.setTimeout(() => {
      if (roundIdx + 1 >= rounds.length) {
        setFinished(true);
        onSubmitGame(rounds.length, nextScore);
      } else {
        setRoundIdx((i) => i + 1);
        setLastPick(null);
      }
    }, 650);
  };

  const handleRestart = () => {
    setRoundIdx(0);
    setScore(0);
    setLastPick(null);
    setFinished(false);
  };

  if (rounds.length === 0) {
    return (
      <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 text-center space-y-3">
        <p className="text-slate-600 dark:text-slate-300 text-sm">Trò chơi đang sẵn sàng.</p>
        <button
          type="button"
          onClick={() => onSubmitGame(3, 3)}
          className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-bold text-sm cursor-pointer"
        >
          Hoàn thành thử thách (+5 XP)
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-5 transition-colors" data-testid="quick-match-game">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-display font-extrabold text-base text-slate-900 dark:text-slate-100">
            Lượt {Math.min(roundIdx + 1, rounds.length)} / {rounds.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-200 font-mono tabular-nums">
            Điểm đúng: {score}/{rounds.length}
          </span>
          {alreadyWon && (
            <span className="text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Đã nhận +5 XP
            </span>
          )}
        </div>
      </div>

      {finished ? (
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155] text-center space-y-3">
          <Sparkles className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto" />
          <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-slate-100">
            {score >= 3 ? 'Xuất sắc! Em đã thắng trò chơi!' : 'Cố gắng thêm chút nữa nhé!'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Em trả lời đúng <strong>{score}/{rounds.length}</strong> thử thách
            {score >= 3 ? ' (đạt mốc nhận +5 XP).' : ' (cần đúng ít nhất 3 thử thách).'}
          </p>
          <button
            type="button"
            onClick={handleRestart}
            className="min-h-[44px] px-5 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#131D31] hover:bg-slate-100 dark:hover:bg-[#223254] text-slate-800 dark:text-slate-100 font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Chơi lại
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60">
            <p className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
              {current.prompt}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {current.options.map((opt, idx) => {
              const isPicked = lastPick?.picked === idx;
              const style = isPicked
                ? lastPick.correct
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-950 dark:text-rose-100'
                : 'bg-white dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#223254] text-slate-800 dark:text-slate-100';
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={Boolean(lastPick)}
                  onClick={() => handlePick(idx)}
                  className={`w-full min-h-[50px] px-4 py-3 rounded-xl border text-left text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${style}`}
                >
                  <span>{opt}</span>
                  {isPicked &&
                    (lastPick.correct ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    ))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
