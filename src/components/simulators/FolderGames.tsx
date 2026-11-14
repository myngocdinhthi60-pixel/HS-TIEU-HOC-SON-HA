import React, { useState } from 'react';
import { CheckCircle2, FolderSearch, Mail, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { getInitialL5B4Fs } from '../../shared/virtualFs';
import type { VirtualFsState } from '../../shared/types';
import { FolderSimulator } from './FolderSimulator';

interface FolderGamesProps {
  lessonId: 'L4-B5' | 'L5-B4';
  onSubmitGame: (roundsCompleted: number, score: number) => Promise<void>;
  alreadyWon: boolean;
}

interface PostOfficeRound {
  id: string;
  requestText: string;
  fileName: string;
  sourceFolder: string;
  expectedAction: 'copy' | 'move';
  expectedDest: string;
  destOptions: string[];
  beforeDesc: string;
  afterWrongDesc: string;
  afterRightDesc: string;
}

const POST_OFFICE_ROUNDS: PostOfficeRound[] = [
  {
    id: 'po-1',
    requestText: 'Bạn Thu An muốn gửi tệp "Gioi thieu.pptx" sang thư mục Nhom 2 nhưng VẪN GIỮ bản gốc ở ổ Du lieu (D:).',
    fileName: 'Gioi thieu.pptx',
    sourceFolder: 'Du lieu (D:)',
    expectedAction: 'copy',
    expectedDest: 'Nhom 2',
    destOptions: ['Nhom 2', 'Win (C:) / Windows', 'Nhom 1'],
    beforeDesc: 'Trước khi làm: Gioi thieu.pptx đang ở ổ Du lieu (D:).',
    afterWrongDesc: 'Nếu chọn Di chuyển, ổ D: sẽ bị mất tệp nguồn! Cần chọn Sao chép để cả 2 nơi đều có tệp.',
    afterRightDesc: 'Đúng rồi! Cả ổ D: và thư mục Nhom 2 đều có "Gioi thieu.pptx".',
  },
  {
    id: 'po-2',
    requestText: 'Cô giáo nhắc em chuyển toàn bộ thư mục "Thu An" từ Nhom 1 sang Nhom 2 để ghép nhóm mới (không để lại ở Nhom 1).',
    fileName: 'Thu mục Thu An',
    sourceFolder: 'Nhom 1',
    expectedAction: 'move',
    expectedDest: 'Nhom 2',
    destOptions: ['Nhom 2', 'Du lieu (D:)', 'Win (C:)'],
    beforeDesc: 'Trước khi làm: Thu An đang ở Nhom 1.',
    afterWrongDesc: 'Nếu dùng Sao chép, thư mục cũ vẫn bị trùng lặp ở Nhom 1! Cần chọn Di chuyển sang Nhom 2.',
    afterRightDesc: 'Chuẩn xác! Thư mục Thu An và các tệp bên trong đã chuyển hoàn toàn sang Nhom 2.',
  },
  {
    id: 'po-3',
    requestText: 'Em cần giữ lại phiếu "Lich hoc.docx" ở thư mục "Hoc tap" và tạo thêm một bản ở thư mục "Du phong".',
    fileName: 'Lich hoc.docx',
    sourceFolder: 'Hoc tap',
    expectedAction: 'copy',
    expectedDest: 'Du phong',
    destOptions: ['Du phong', 'Win (C:)', 'Thu rac'],
    beforeDesc: 'Trước khi làm: Lich hoc.docx nằm ở Hoc tap.',
    afterWrongDesc: 'Hãy nhớ: Muốn giữ bản cũ và thêm bản mới ở "Du phong" thì phải dùng Sao chép (Copy → Paste).',
    afterRightDesc: 'Tuyệt vời! Em đã gửi bản sao sang "Du phong" và giữ an toàn bản gốc.',
  },
];

interface DetectiveCase {
  id: string;
  clue: string;
  targetFileId: string;
  targetFileName: string;
  expectedParentId: string;
}

const DETECTIVE_CASES: DetectiveCase[] = [
  {
    id: 'det-1',
    clue: 'Manh mối 1: Hãy tìm bức ảnh "Ho-Than-tho.jpg" nằm trong thư mục Anh-Bai-tap-nhom rồi bấm "Mở vị trí tệp" để tới đúng thư mục của bạn giữ ảnh!',
    targetFileId: 'f-thantho',
    targetFileName: 'Ho-Than-tho.jpg',
    expectedParentId: 'khoa-dir',
  },
  {
    id: 'det-2',
    clue: 'Manh mối 2: Hãy tìm tệp trình chiếu "Ki-nghi-he.pptx" (đang nằm ở ổ Local Disk (D:) ngoài thư mục Anh-Bai-tap-nhom) rồi bấm "Mở vị trí tệp"!',
    targetFileId: 'f-kinghihe',
    targetFileName: 'Ki-nghi-he.pptx',
    expectedParentId: 'ho-so',
  },
  {
    id: 'det-3',
    clue: 'Manh mối 3: Tìm bức ảnh "San-bay-Cam-Ranh.jpg" trong Anh-Bai-tap-nhom và mở đúng thư mục chứa bức ảnh đó!',
    targetFileId: 'f-camranh',
    targetFileName: 'San-bay-Cam-Ranh.jpg',
    expectedParentId: 'an-dir',
  },
];

export const FolderGames: React.FC<FolderGamesProps> = ({ lessonId, onSubmitGame, alreadyWon }) => {
  // L4-B5 Post Office state
  const [poIndex, setPoIndex] = useState(0);
  const [pickedAction, setPickedAction] = useState<'copy' | 'move' | ''>('');
  const [pickedDest, setPickedDest] = useState('');
  const [poScore, setPoScore] = useState(0);
  const [poFeedback, setPoFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [poFinished, setPoFinished] = useState(false);

  // L5-B4 Detective state
  const [detIndex, setDetIndex] = useState(0);
  const [detFs, setDetFs] = useState<VirtualFsState>(() => getInitialL5B4Fs());
  const [detScore, setDetScore] = useState(0);
  const [detFeedback, setDetFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [detFinished, setDetFinished] = useState(false);

  if (lessonId === 'L4-B5') {
    const round = POST_OFFICE_ROUNDS[poIndex];
    const handleCheckPo = async () => {
      if (!pickedAction || !pickedDest) {
        setPoFeedback({ ok: false, text: 'Em hãy chọn đủ Thao tác (Sao chép hay Di chuyển) và Thư mục đích nhé.' });
        return;
      }
      const isRight = pickedAction === round.expectedAction && pickedDest === round.expectedDest;
      if (isRight) {
        const nextScore = poScore + 1;
        setPoScore(nextScore);
        setPoFeedback({ ok: true, text: round.afterRightDesc });
        if (poIndex + 1 >= POST_OFFICE_ROUNDS.length) {
          setPoFinished(true);
          await onSubmitGame(POST_OFFICE_ROUNDS.length, nextScore);
        } else {
          setTimeout(() => {
            setPoIndex((i) => i + 1);
            setPickedAction('');
            setPickedDest('');
            setPoFeedback(null);
          }, 800);
        }
      } else {
        setPoFeedback({
          ok: false,
          text: `${round.afterWrongDesc} (Thao tác đúng là ${
            round.expectedAction === 'copy' ? 'Sao chép' : 'Di chuyển'
          } → ${round.expectedDest}).`,
        });
      }
    };

    return (
      <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 space-y-5 transition-colors" data-testid="game-post-office">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
              Bưu điện tệp tin · Bưu kiện {poIndex + 1}/{POST_OFFICE_ROUNDS.length}
            </h3>
          </div>
          <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
            Điểm: {poScore}/{POST_OFFICE_ROUNDS.length}
          </span>
        </div>

        {!poFinished ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60">
              <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">{round.beforeDesc}</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{round.requestText}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">1. Chọn lệnh xử lí:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPickedAction('copy')}
                    className={`min-h-[48px] px-3 rounded-xl border text-sm font-bold cursor-pointer ${
                      pickedAction === 'copy'
                        ? 'bg-sky-600 dark:bg-sky-500 border-sky-600 dark:border-sky-500 text-white'
                        : 'bg-white dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#223254]'
                    }`}
                  >
                    Sao chép (Copy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickedAction('move')}
                    className={`min-h-[48px] px-3 rounded-xl border text-sm font-bold cursor-pointer ${
                      pickedAction === 'move'
                        ? 'bg-amber-600 dark:bg-amber-500 border-amber-600 dark:border-amber-500 text-white'
                        : 'bg-white dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#223254]'
                    }`}
                  >
                    Di chuyển (Move)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">2. Chọn thư mục đích:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {round.destOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPickedDest(opt)}
                      className={`min-h-[48px] px-3 rounded-xl border text-sm font-bold cursor-pointer ${
                        pickedDest === opt
                          ? 'bg-sky-600 dark:bg-sky-500 border-sky-600 dark:border-sky-500 text-white'
                          : 'bg-white dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#223254]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {poFeedback && (
              <div
                role="status"
                className={`p-3.5 rounded-xl border text-sm font-medium flex items-center gap-2 ${
                  poFeedback.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                }`}
              >
                {poFeedback.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{poFeedback.text}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckPo}
              className="min-h-[48px] px-6 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-display font-bold text-base cursor-pointer"
            >
              Gửi bưu kiện
            </button>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-display font-bold text-emerald-950 dark:text-emerald-100 text-base">
                  Hoàn thành Bưu điện tệp tin! {alreadyWon ? 'Em đã nhận XP trò chơi ở lượt trước.' : 'Đã cộng +5 XP vào hồ sơ!'}
                </p>
                <p className="text-sm text-emerald-800 dark:text-emerald-200">Em phân biệt rất chuẩn giữa Sao chép (giữ gốc) và Di chuyển.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPoIndex(0);
                setPoScore(0);
                setPickedAction('');
                setPickedDest('');
                setPoFeedback(null);
                setPoFinished(false);
              }}
              className="min-h-[44px] px-4 rounded-xl bg-white dark:bg-[#131D31] border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Chơi lại
            </button>
          </div>
        )}
      </div>
    );
  }

  // L5-B4 Detective game
  const activeCase = DETECTIVE_CASES[detIndex];
  const handleFsUpdate = async (nextFs: VirtualFsState) => {
    setDetFs(nextFs);
    const lastAction = nextFs.actions[nextFs.actions.length - 1];
    if (
      lastAction &&
      lastAction.type === 'open_file_location' &&
      lastAction.targetId === activeCase.targetFileId &&
      nextFs.currentFolderId === activeCase.expectedParentId
    ) {
      const nextScore = detScore + 1;
      setDetScore(nextScore);
      setDetFeedback({
        ok: true,
        text: `Phá án thành công! Em đã mở đúng thư mục chứa "${activeCase.targetFileName}".`,
      });
      if (detIndex + 1 >= DETECTIVE_CASES.length) {
        setDetFinished(true);
        await onSubmitGame(DETECTIVE_CASES.length, nextScore);
      } else {
        setTimeout(() => {
          setDetIndex((i) => i + 1);
          setDetFeedback(null);
        }, 900);
      }
    }
  };

  return (
    <div className="space-y-4" data-testid="game-detective">
      <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <FolderSearch className="w-6 h-6 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-sky-700 dark:text-sky-400">
              Vụ án {detIndex + 1}/{DETECTIVE_CASES.length} · Điểm: {detScore}/{DETECTIVE_CASES.length}
            </p>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">{activeCase.clue}</p>
          </div>
        </div>
        {detFinished && (
          <button
            type="button"
            onClick={() => {
              setDetIndex(0);
              setDetScore(0);
              setDetFs(getInitialL5B4Fs());
              setDetFeedback(null);
              setDetFinished(false);
            }}
            className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#1A2742] whitespace-nowrap cursor-pointer"
          >
            Chơi lại
          </button>
        )}
      </div>

      {detFeedback && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100 text-sm font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{detFeedback.text}</span>
        </div>
      )}

      <FolderSimulator fsState={detFs} onChange={handleFsUpdate} enableSearch />
    </div>
  );
};
