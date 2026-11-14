import React, { useEffect, useState } from 'react';
import { CheckCircle2, Flame, Keyboard as KeyboardIcon, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import {
  evaluateKeystroke,
  FINGER_INFO,
  getKeySpec,
  KEYBOARD_ROWS,
  L3_B5_DRILLS,
  type FingerId,
} from '../../shared/keyboardLogic';

interface KeyboardSimulatorProps {
  mode: 'guided' | 'practice' | 'game';
  guidedTarget?: 'key-fj' | 'typing-home' | 'typing-reach';
  onGuidedBumpDone?: () => void;
  onGuidedTypeDone?: () => void;
  typingStats: {
    completedSequences: string[];
    accuracy: number;
    wpm: number;
    selfCheckFingers: boolean;
  };
  onTypingStatsChange: (next: {
    completedSequences: string[];
    accuracy: number;
    wpm: number;
    selfCheckFingers: boolean;
  }) => void;
  onGameComplete?: (roundsCompleted: number, score: number) => void;
}

const GAME_TARGETS = ['f', 'j', 'a', 's', 'd', 'k', 'l', ';', 'g', 'h'];

export const KeyboardSimulator: React.FC<KeyboardSimulatorProps> = ({
  mode,
  guidedTarget,
  onGuidedBumpDone,
  onGuidedTypeDone,
  typingStats,
  onTypingStatsChange,
  onGameComplete,
}) => {
  const [touchMode, setTouchMode] = useState(false);
  const [selectedBumpKeys, setSelectedBumpKeys] = useState<string[]>([]);
  const [activeDrillIdx, setActiveDrillIdx] = useState(0);
  const [cursorIdx, setCursorIdx] = useState(0);
  const [correctPresses, setCorrectPresses] = useState(0);
  const [totalPresses, setTotalPresses] = useState(0);
  const [startMs, setStartMs] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Game state: Đom đóm tìm phím
  const [slowMode, setSlowMode] = useState(false);
  const [gameRound, setGameRound] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);

  const activeSequence =
    mode === 'guided'
      ? guidedTarget === 'typing-reach'
        ? 'er ui cv nm'
        : 'asdf jkl;'
      : L3_B5_DRILLS[activeDrillIdx]?.target ?? 'asdf jkl;';

  const expectedChar =
    mode === 'game'
      ? GAME_TARGETS[gameRound % GAME_TARGETS.length]
      : activeSequence[cursorIdx] ?? '';

  const expectedSpec = expectedChar ? getKeySpec(expectedChar) : undefined;
  const expectedFinger: FingerId | undefined = expectedSpec?.finger;

  const processKeyInput = (rawKey: string) => {
    const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
    if (mode === 'guided' && guidedTarget === 'key-fj') {
      if (key === 'f' || key === 'j') {
        const next = selectedBumpKeys.includes(key) ? selectedBumpKeys : [...selectedBumpKeys, key];
        setSelectedBumpKeys(next);
        setFeedback({
          ok: true,
          text:
            next.length === 2
              ? 'Chính xác! Hai phím F và J có gờ nổi để đặt hai ngón trỏ.'
              : `Đúng phím ${key.toUpperCase()} rồi! Hãy bấm thêm phím có gờ còn lại.`,
        });
        if (next.length === 2) {
          onGuidedBumpDone?.();
        }
      } else {
        setFeedback({
          ok: false,
          text: 'Đây chưa phải phím có gờ F hoặc J ở hàng phím cơ sở. Hãy nhìn hai phím có gạch nổi nhỏ nhé!',
        });
      }
      return;
    }

    if (mode === 'game') {
      if (gameFinished) return;
      const evalRes = evaluateKeystroke(expectedChar, key);
      setFeedback({ ok: evalRes.matched, text: evalRes.feedback });
      if (evalRes.matched) {
        const nextScore = gameScore + 1;
        const nextRound = gameRound + 1;
        setGameScore(nextScore);
        if (nextRound >= 5) {
          setGameFinished(true);
          onGameComplete?.(5, nextScore);
        } else {
          setGameRound(nextRound);
        }
      }
      return;
    }

    if (!expectedChar) return;
    if (!startMs) setStartMs(Date.now());

    const evalRes = evaluateKeystroke(expectedChar, key);
    const nextTotal = totalPresses + 1;
    const nextCorrect = evalRes.matched ? correctPresses + 1 : correctPresses;
    setTotalPresses(nextTotal);
    setCorrectPresses(nextCorrect);
    setFeedback({ ok: evalRes.matched, text: evalRes.feedback });

    const acc = Math.round((nextCorrect / nextTotal) * 100);
    const elapsedMin = Math.max(0.1, (Date.now() - (startMs ?? Date.now())) / 60000);
    const wpm = Math.round(nextCorrect / 5 / elapsedMin);

    if (evalRes.matched) {
      const nextCursor = cursorIdx + 1;
      if (nextCursor >= activeSequence.length) {
        if (mode === 'guided') {
          setCursorIdx(nextCursor);
          onGuidedTypeDone?.();
        } else {
          const drillId = L3_B5_DRILLS[activeDrillIdx].id;
          const completed = typingStats.completedSequences.includes(drillId)
            ? typingStats.completedSequences
            : [...typingStats.completedSequences, drillId];
          onTypingStatsChange({
            ...typingStats,
            completedSequences: completed,
            accuracy: acc,
            wpm,
          });
          setCursorIdx(nextCursor);
        }
      } else {
        setCursorIdx(nextCursor);
        onTypingStatsChange({
          ...typingStats,
          accuracy: acc,
          wpm,
        });
      }
    } else {
      onTypingStatsChange({
        ...typingStats,
        accuracy: acc,
        wpm,
      });
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key.length === 1) {
        if (e.key === ' ') e.preventDefault();
        processKeyInput(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const resetCurrentDrill = () => {
    setCursorIdx(0);
    setFeedback(null);
  };

  const selectDrill = (idx: number) => {
    setActiveDrillIdx(idx);
    setCursorIdx(0);
    setFeedback(null);
  };

  return (
    <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-4 sm:p-5 space-y-5 transition-colors" data-testid="keyboard-simulator">
      {/* Mode header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <KeyboardIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {mode === 'game'
              ? `Trò chơi Đom đóm tìm phím · Lượt ${Math.min(gameRound + 1, 5)}/5`
              : mode === 'guided' && guidedTarget === 'key-fj'
                ? 'Hãy bấm vào 2 phím có gờ F và J trên bàn phím'
                : 'Gõ trực tiếp trên bàn phím thật (hoặc bật chế độ chạm)'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'game' && (
            <button
              type="button"
              onClick={() => setSlowMode((s) => !s)}
              className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                slowMode
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/70 text-emerald-800 dark:text-emerald-200'
                  : 'bg-slate-50 dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] text-slate-700 dark:text-slate-200'
              }`}
            >
              Chế độ chậm: {slowMode ? 'Đang bật' : 'Tắt'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setTouchMode((t) => !t)}
            className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold cursor-pointer ${
              touchMode
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-600 text-sky-900 dark:text-sky-200'
                : 'bg-slate-50 dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] text-slate-700 dark:text-slate-200'
            }`}
          >
            Nhận diện chạm trên màn hình: {touchMode ? 'Bật' : 'Tắt'}
          </button>
        </div>
      </div>

      {/* Practice drill selector */}
      {mode === 'practice' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {L3_B5_DRILLS.map((drill, idx) => {
            const done = typingStats.completedSequences.includes(drill.id);
            const active = idx === activeDrillIdx;
            return (
              <button
                key={drill.id}
                type="button"
                onClick={() => selectDrill(idx)}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-500 text-sky-950 dark:text-sky-100'
                    : done
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100'
                      : 'bg-white dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#223254] text-slate-800 dark:text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm">{drill.title}</span>
                  {done && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono">{drill.target}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Typing target display */}
      {!(mode === 'guided' && guidedTarget === 'key-fj') && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {mode === 'game' ? (
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/70 flex items-center justify-center">
                <Flame className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Đom đóm đang đậu ở phím:</p>
                <p className="font-mono font-extrabold text-2xl text-slate-900 dark:text-slate-100">
                  {gameFinished ? 'Hoàn thành!' : expectedChar.toUpperCase()}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Dãy phím cần gõ:</p>
              <div className="flex flex-wrap gap-1.5 font-mono text-xl font-bold">
                {activeSequence.split('').map((ch, idx) => {
                  const isDone = idx < cursorIdx;
                  const isCurrent = idx === cursorIdx;
                  return (
                    <span
                      key={`${ch}-${idx}`}
                      className={`inline-flex items-center justify-center min-w-[30px] h-10 px-2 rounded-lg border ${
                        isDone
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                          : isCurrent
                            ? 'bg-orange-100 dark:bg-orange-950/80 border-orange-500 text-orange-950 dark:text-orange-200 ring-2 ring-orange-400'
                            : 'bg-white dark:bg-[#131D31] border-slate-200 dark:border-[#334155] text-slate-500 dark:text-slate-300'
                      }`}
                    >
                      {ch === ' ' ? '␣' : ch}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm tabular-nums">
            {mode !== 'game' ? (
              <>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs block">Chính xác</span>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">{typingStats.accuracy}%</strong>
                </div>
                <button
                  type="button"
                  onClick={resetCurrentDrill}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#131D31] hover:bg-slate-100 dark:hover:bg-[#223254] text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Gõ lại dãy
                </button>
              </>
            ) : (
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-xs block">Điểm Đom đóm</span>
                <strong className="font-mono text-lg text-emerald-700 dark:text-emerald-400">{gameScore}/5</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual 5-row keyboard with F/J tactile bumps */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[660px] space-y-1.5 bg-slate-100 dark:bg-[#0F172A] p-3 rounded-2xl border border-slate-200 dark:border-[#25334D]">
          {KEYBOARD_ROWS.map((row) => (
            <div key={row.id} className="flex items-center gap-1.5">
              {row.keys.map((k) => {
                const fingerCfg = FINGER_INFO[k.finger];
                const isTarget =
                  mode === 'guided' && guidedTarget === 'key-fj'
                    ? k.code === 'f' || k.code === 'j'
                    : expectedChar !== '' && k.code.toLowerCase() === expectedChar.toLowerCase();
                const isPickedBump = selectedBumpKeys.includes(k.code);

                return (
                  <button
                    key={k.code}
                    type="button"
                    disabled={!touchMode && !(mode === 'guided' && guidedTarget === 'key-fj')}
                    onClick={() => processKeyInput(k.code)}
                    style={{ flexGrow: k.widthUnits ?? 1, flexBasis: 0 }}
                    className={`relative min-h-[46px] px-1.5 rounded-lg border text-xs sm:text-sm font-mono font-bold flex flex-col items-center justify-center transition-transform ${
                      isTarget
                        ? 'bg-amber-100 dark:bg-amber-500/25 border-orange-500 dark:border-orange-400 text-slate-950 dark:text-amber-100 ring-2 ring-orange-400 scale-[1.03]'
                        : isPickedBump
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                          : 'bg-white dark:bg-[#1E293B] border-slate-300 dark:border-[#334155] text-slate-800 dark:text-slate-100'
                    } ${touchMode || (mode === 'guided' && guidedTarget === 'key-fj') ? 'cursor-pointer hover:bg-sky-50 dark:hover:bg-[#26354D]' : 'cursor-default'}`}
                  >
                    <span>{k.label}</span>
                    {k.isBump && (
                      <span
                        title="Phím có gờ nổi"
                        className="w-4 h-1 rounded-full bg-orange-500 dark:bg-orange-400 mt-0.5"
                        aria-label="gờ nổi"
                      />
                    )}
                    <span
                      className="absolute bottom-0.5 left-1.5 right-1.5 h-1 rounded-full opacity-85"
                      style={{ backgroundColor: fingerCfg.colorHex }}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Left/Right Hand Finger Guide */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155] text-sm">
        <div>
          <span className="text-slate-600 dark:text-slate-300">Ngón tay gợi ý hiện tại: </span>
          {expectedFinger ? (
            <strong
              className="font-bold text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded-md bg-white/90 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155]"
              style={{ color: FINGER_INFO[expectedFinger].colorHex }}
            >
              {FINGER_INFO[expectedFinger].label}
            </strong>
          ) : (
            <strong className="font-bold text-slate-900 dark:text-slate-100">Hai ngón trỏ đặt trên F và J</strong>
          )}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300">
          Vị trí xuất phát: Tay trái A S D F · Tay phải J K L ; · Hai ngón cái đặt phím cách
        </div>
      </div>

      {/* Practice self-check finger placement */}
      {mode === 'practice' && (
        <label className="flex items-center gap-3 p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 cursor-pointer">
          <input
            type="checkbox"
            checked={typingStats.selfCheckFingers}
            onChange={(e) =>
              onTypingStatsChange({
                ...typingStats,
                selfCheckFingers: e.target.checked,
              })
            }
            className="w-5 h-5 accent-sky-600"
          />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Em đã đặt hai ngón trỏ lên phím có gờ F, J và hai ngón cái lên phím cách trước khi gõ.
          </span>
        </label>
      )}

      {/* Feedback strip */}
      {feedback && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
            feedback.ok
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
          }`}
        >
          {feedback.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {mode === 'game' && gameFinished && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-100 font-bold text-sm">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Tuyệt vời! Em đã đưa cả 5 chú đom đóm về đúng phím trên bàn phím!
          </div>
          <button
            type="button"
            onClick={() => {
              setGameRound(0);
              setGameScore(0);
              setGameFinished(false);
              setFeedback(null);
            }}
            className="min-h-[40px] px-4 rounded-xl bg-white dark:bg-[#131D31] border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold cursor-pointer"
          >
            Chơi lại
          </button>
        </div>
      )}
    </div>
  );
};
