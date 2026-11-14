import React, { useState } from 'react';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import type { PracticeTaskItem } from '../../shared/types';

interface InteractiveTaskPracticeProps {
  tasks: PracticeTaskItem[];
  answers: Record<string, number>;
  onChange: (nextAnswers: Record<string, number>) => void;
}

export const InteractiveTaskPractice: React.FC<InteractiveTaskPracticeProps> = ({
  tasks,
  answers,
  onChange,
}) => {
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 text-sm text-slate-600 dark:text-slate-300">
        Chưa có tình huống thực hành cho bài học này.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="interactive-task-practice">
      {tasks.map((task, idx) => {
        const chosen = answers[task.id];
        const hintOpen = Boolean(openHints[task.id]);
        return (
          <div
            key={task.id}
            className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 space-y-3 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-extrabold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                  Tình huống thực hành {idx + 1} / {tasks.length}
                </p>
                <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                  {task.prompt}
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setOpenHints((prev) => ({ ...prev, [task.id]: !prev[task.id] }))
                }
                className="min-h-[36px] px-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1A2742] hover:bg-slate-100 dark:hover:bg-[#223254] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {hintOpen ? 'Ẩn gợi ý' : 'Gợi ý'}
              </button>
            </div>

            {hintOpen && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-100">
                {task.hint}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5 pt-1" role="radiogroup" aria-label={task.prompt}>
              {task.options.map((opt, optIdx) => {
                const selected = Number(chosen) === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange({ ...answers, [task.id]: optIdx })}
                    className={`w-full min-h-[48px] px-4 py-3 rounded-xl border text-left text-sm font-semibold flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-200 dark:ring-sky-700/50'
                        : 'bg-white dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#223254] text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <span>
                      <strong className="font-mono mr-2 text-sky-700 dark:text-sky-400">
                        {String.fromCharCode(65 + optIdx)}.
                      </strong>
                      {opt}
                    </span>
                    {selected && <CheckCircle2 className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
