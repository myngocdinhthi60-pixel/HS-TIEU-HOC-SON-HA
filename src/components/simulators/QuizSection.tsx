import React from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, HelpCircle, Send, XCircle } from 'lucide-react';
import type { PublicQuizQuestion, QuizQuestionResult } from '../../shared/types';

interface QuizSectionProps {
  questions: PublicQuizQuestion[];
  answers: Record<string, unknown>;
  onChangeAnswer: (questionId: string, val: unknown) => void;
  onSubmitQuiz: () => Promise<void>;
  submitting: boolean;
  results?: QuizQuestionResult[];
  scorePercent: number | null;
  solutionsVisible: boolean;
}

export const QuizSection: React.FC<QuizSectionProps> = ({
  questions,
  answers,
  onChangeAnswer,
  onSubmitQuiz,
  submitting,
  results,
  scorePercent,
  solutionsVisible,
}) => {
  const resultMap = new Map((results ?? []).map((r) => [r.questionId, r]));

  const moveOrderItem = (q: PublicQuizQuestion, index: number, dir: -1 | 1) => {
    const current = Array.isArray(answers[q.id])
      ? [...(answers[q.id] as string[])]
      : [...(q.orderItems ?? [])];
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const tmp = current[index];
    current[index] = current[targetIdx];
    current[targetIdx] = tmp;
    onChangeAnswer(q.id, current);
  };

  return (
    <div className="space-y-5" data-testid="quiz-section">
      {scorePercent !== null && (
        <div
          role="status"
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            scorePercent >= 80
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100'
              : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-100'
          }`}
        >
          <div>
            <p className="font-display font-extrabold text-xl tabular-nums">
              Kết quả Đố vui: {scorePercent}%
            </p>
            <p className="text-sm mt-0.5">
              {scorePercent >= 80
                ? 'Xuất sắc! Em đã đạt ngưỡng >= 80% và hoàn thành phần Đố vui.'
                : 'Em hãy xem lại những câu chưa đúng và thử nộp lại để đạt từ 80% trở lên nhé.'}
            </p>
          </div>
          {!solutionsVisible && (
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Lời giải chi tiết sẽ mở sau khi hết hạn nộp bài theo cài đặt của thầy/cô.
            </span>
          )}
        </div>
      )}

      {questions.map((q, qIdx) => {
        const res = resultMap.get(q.id);
        return (
          <article
            key={q.id}
            className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 space-y-4 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                Câu {qIdx + 1}. {q.prompt}
              </h3>
              {res && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap shrink-0 ${
                    res.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {res.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {res.correct ? 'Chính xác' : 'Chưa đúng'}
                </span>
              )}
            </div>

            {q.type === 'single_choice' && q.options && (
              <div className="space-y-2" role="radiogroup" aria-label={`Câu ${qIdx + 1}`}>
                {q.options.map((opt, idx) => {
                  const selected = Number(answers[q.id]) === idx;
                  return (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                        selected
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-950 dark:text-sky-100 font-semibold'
                          : 'bg-white dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#223254] text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={selected}
                        onChange={() => onChangeAnswer(q.id, idx)}
                        className="w-5 h-5 accent-sky-600 shrink-0"
                      />
                      <span className="text-sm sm:text-base">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'hotspot' && q.hotspots && (
              <div className="space-y-2">
                {q.diagramTitle && (
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{q.diagramTitle}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.hotspots.map((spot) => {
                    const selected = answers[q.id] === spot.id;
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => onChangeAnswer(q.id, spot.id)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                          selected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-950 dark:text-sky-100'
                            : 'bg-slate-50 dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#223254] text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        <p className="font-bold text-sm">{spot.label}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{spot.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {q.type === 'matching' && q.leftItems && q.rightItems && (
              <div className="space-y-3">
                {q.leftItems.map((left) => {
                  const mapVal =
                    answers[q.id] && typeof answers[q.id] === 'object'
                      ? (answers[q.id] as Record<string, string>)
                      : {};
                  return (
                    <div
                      key={left}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155]"
                    >
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{left}</span>
                      <select
                        aria-label={`Ghép cho ${left}`}
                        value={mapVal[left] ?? ''}
                        onChange={(e) => {
                          onChangeAnswer(q.id, { ...mapVal, [left]: e.target.value });
                        }}
                        className="min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#131D31] text-slate-900 dark:text-slate-100 text-sm"
                      >
                        <option value="">-- Chọn ý ghép đúng --</option>
                        {q.rightItems!.map((right) => (
                          <option key={right} value={right}>
                            {right}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'ordering' && q.orderItems && (
              <div className="space-y-2">
                {(Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : q.orderItems).map(
                  (item, idx, arr) => (
                    <div
                      key={item}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155]"
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        <strong className="font-mono mr-2 text-sky-700 dark:text-sky-400">{idx + 1}.</strong>
                        {item}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveOrderItem(q, idx, -1)}
                          aria-label={`Đưa bước "${item}" lên`}
                          className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#131D31] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#223254] disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === arr.length - 1}
                          onClick={() => moveOrderItem(q, idx, 1)}
                          aria-label={`Đưa bước "${item}" xuống`}
                          className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#131D31] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#223254] disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {res && solutionsVisible && res.explanation && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155] text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Lời giải:</strong> {res.explanation}
                </div>
              </div>
            )}
          </article>
        );
      })}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmitQuiz}
          disabled={submitting}
          className="min-h-[52px] px-7 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 disabled:opacity-60 text-white font-display font-bold text-base flex items-center gap-2 cursor-pointer"
        >
          <Send className="w-5 h-5" />
          {submitting ? 'Đang chấm bài...' : 'Nộp bài Đố vui'}
        </button>
      </div>
    </div>
  );
};
