import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { api, ApiError } from '../services/api';
import {
  computeArenaStartCountdown,
  countReadyParticipants,
  DEFAULT_ARENA_MAX_PARTICIPANTS,
} from '../shared/arenaLogic';
import type { ArenaRoom, PublicQuizQuestion } from '../shared/types';
import { ArenaMatchView, type ArenaGameTask } from './ArenaMatchView';
import { AvatarBadge } from './AvatarIcon';
import { ArenaStarsCanvas } from './LandingThreeEffects';
import { ThemeToggle } from './ThemeToggle';

interface ArenaWaitingRoomProps {
  roomId: string;
  initialRoom?: ArenaRoom | null;
  initialServerNow?: string;
  currentUid: string;
  lowSpec2D: boolean;
  onExitToLobby: () => void;
  onSessionRevoked: (reason: string) => void;
}

const SparkleRays: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 28 24" aria-hidden="true" className={`${className} shrink-0 pointer-events-none`}>
    <path
      d="M5 17 L13 9 M8 20 L21 15 M6 9 L12 3"
      stroke="#FACC15"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </svg>
);

const CornerTreeLeaves: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <svg
    viewBox="0 0 180 96"
    aria-hidden="true"
    className={`pointer-events-none select-none absolute top-0 ${
      side === 'left' ? 'left-0' : 'right-0 -scale-x-100'
    } w-36 sm:w-52 h-auto opacity-85 dark:opacity-45 z-0`}
  >
    <path d="M-4 0 C22 0, 56 14, 72 42 C46 52, 16 40, -4 26 Z" fill="#84CC16" />
    <path d="M36 0 C64 2, 92 18, 108 38 C82 42, 54 28, 36 0 Z" fill="#65A30D" />
    <path d="M84 0 C110 4, 134 14, 146 28 C122 30, 98 18, 84 0 Z" fill="#A3E635" />
  </svg>
);

export const ArenaWaitingRoom: React.FC<ArenaWaitingRoomProps> = ({
  roomId,
  initialRoom = null,
  initialServerNow,
  currentUid,
  lowSpec2D,
  onExitToLobby,
  onSessionRevoked,
}) => {
  const [room, setRoom] = useState<ArenaRoom | null>(initialRoom);
  const [questions, setQuestions] = useState<PublicQuizQuestion[]>([]);
  const [gameTasks, setGameTasks] = useState<ArenaGameTask[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialRoom);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState<number>(() => {
    if (initialServerNow) {
      const parsed = new Date(initialServerNow).getTime();
      if (!Number.isNaN(parsed)) return parsed - Date.now();
    }
    return 0;
  });
  const [nowMs, setNowMs] = useState<number>(() => Date.now() + clockOffsetMs);

  const [readyBusy, setReadyBusy] = useState(false);
  const [readyError, setReadyError] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState<'connected' | 'reconnecting'>('connected');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leavingBusy, setLeavingBusy] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const sseRef = useRef<EventSource | null>(null);
  const manualLeaveRef = useRef(false);

  const applyServerNow = useCallback((serverNow?: string) => {
    if (!serverNow) return;
    const parsed = new Date(serverNow).getTime();
    if (!Number.isNaN(parsed)) {
      const offset = parsed - Date.now();
      setClockOffsetMs(offset);
      setNowMs(Date.now() + offset);
    }
  }, []);

  const fetchRoomDetail = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await api.getStudentArenaRoomDetail(roomId);
      setRoom(res.room);
      setQuestions(res.questions ?? []);
      setGameTasks(res.gameTasks ?? []);
      applyServerNow(res.serverNow);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : 'Không thể tải thông tin phòng chờ thi đấu.',
      );
    } finally {
      setLoading(false);
    }
  }, [applyServerNow, roomId]);

  useEffect(() => {
    void fetchRoomDetail();
  }, [fetchRoomDetail]);

  // Real-time SSE connection with automatic snapshot recovery on reconnect (does NOT remove participant)
  const connectSse = useCallback(() => {
    sseRef.current?.close();
    const es = new EventSource('/api/sse/arena');
    sseRef.current = es;

    es.onopen = () => {
      setSseStatus('connected');
    };

    es.addEventListener('arena_snapshot', (ev) => {
      setSseStatus('connected');
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          rooms: ArenaRoom[];
          serverNow: string;
        };
        applyServerNow(payload.serverNow);
        const match = (payload.rooms ?? []).find((r) => r.id === roomId);
        if (match) {
          setRoom(match);
        } else {
          // Check whether room closed or student was removed
          void fetchRoomDetail();
        }
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('session_revoked', (ev) => {
      es.close();
      if (manualLeaveRef.current) return;
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as { reason?: string };
        onSessionRevoked(payload.reason || 'Phiên đăng nhập đã kết thúc.');
      } catch {
        onSessionRevoked('Phiên đăng nhập đã kết thúc.');
      }
    });

    es.onerror = () => {
      if (!manualLeaveRef.current) {
        setSseStatus('reconnecting');
      }
    };

    return es;
  }, [applyServerNow, fetchRoomDetail, onSessionRevoked, roomId]);

  useEffect(() => {
    const es = connectSse();
    return () => {
      es.close();
      if (sseRef.current === es) {
        sseRef.current = null;
      }
    };
  }, [connectSse]);

  // Smooth tick during 3-2-1 synchronized countdown
  useEffect(() => {
    const intervalMs = room?.status === 'started' ? 120 : 1000;
    const timer = window.setInterval(() => {
      setNowMs(Date.now() + clockOffsetMs);
    }, intervalMs);
    setNowMs(Date.now() + clockOffsetMs);
    return () => window.clearInterval(timer);
  }, [clockOffsetMs, room?.status]);

  const startInfo = useMemo(() => {
    if (!room) return { phase: 'waiting' as const, countNumber: 0 as const, remainingMs: 0 };
    return computeArenaStartCountdown(room, nowMs);
  }, [nowMs, room]);

  // Refetch questions/tasks once match starts to be 100% sure match payload is fresh
  useEffect(() => {
    if (startInfo.phase === 'active' && questions.length === 0 && gameTasks.length === 0) {
      void fetchRoomDetail();
    }
  }, [fetchRoomDetail, gameTasks.length, questions.length, startInfo.phase]);

  useEffect(() => {
    if (!showLeaveDialog) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !leavingBusy) {
        setShowLeaveDialog(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [leavingBusy, showLeaveDialog]);

  const handleToggleReady = async (nextReady: boolean) => {
    if (!room || readyBusy) return;
    setReadyBusy(true);
    setReadyError(null);
    try {
      const res = await api.setArenaReady(room.id, nextReady);
      setRoom(res.room);
      applyServerNow(res.serverNow);
    } catch (err) {
      setReadyError(
        err instanceof ApiError ? err.message : 'Không thể cập nhật trạng thái sẵn sàng. Em thử lại nhé!',
      );
    } finally {
      setReadyBusy(false);
    }
  };

  const handleConfirmLeave = async () => {
    if (leavingBusy) return;
    setLeavingBusy(true);
    setLeaveError(null);
    manualLeaveRef.current = true;
    try {
      await api.leaveArenaRoom(roomId);
    } catch (err) {
      setLeaveError(err instanceof ApiError ? err.message : 'Không thể rời phòng lúc này.');
      setLeavingBusy(false);
      manualLeaveRef.current = false;
      return;
    }
    sseRef.current?.close();
    sseRef.current = null;
    setShowLeaveDialog(false);
    onExitToLobby();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#BCE2FF] via-[#DCEEFF] to-[#EFF7FF] dark:from-[#0B1220] dark:via-[#0F1B33] dark:to-[#0B1220] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#131D31] border border-[#D4E6FA] dark:border-[#25334D] rounded-2xl p-6 text-center space-y-2 shadow-sm">
          <p className="font-display font-extrabold text-lg text-[#0F2654] dark:text-slate-100">
            Đang kết nối vào Phòng chờ thi đấu...
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Em chờ một chút để đồng bộ danh sách lớp nhé.
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !room || room.status === 'closed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#BCE2FF] via-[#DCEEFF] to-[#EFF7FF] dark:from-[#0B1220] dark:via-[#0F1B33] dark:to-[#0B1220] flex items-center justify-center p-6">
        <div
          className="max-w-md w-full bg-white dark:bg-[#131D31] border border-[#D4E6FA] dark:border-[#25334D] rounded-[24px] p-6 text-center space-y-4 shadow-md"
          data-testid="arena-waiting-error"
        >
          <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto" />
          <h1 className="font-display font-black text-xl text-[#0F2654] dark:text-slate-100">
            {room?.status === 'closed' ? 'Phòng thi đấu đã kết thúc' : 'Không thể mở phòng chờ'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {loadError || 'Thầy/cô đã đóng phòng thi đấu này. Em hãy quay lại sảnh Đấu trường nhé!'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {loadError && (
              <button
                type="button"
                onClick={() => void fetchRoomDetail()}
                className="min-h-[44px] px-5 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm font-bold text-[#0F2654] dark:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </button>
            )}
            <button
              type="button"
              onClick={onExitToLobby}
              className="min-h-[44px] px-5 rounded-xl bg-[#0166E3] hover:bg-[#025ED6] text-white text-sm font-bold cursor-pointer"
            >
              Về sảnh Đấu trường
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Automatic transition to active Arena Quiz or Game once 3-2-1 synchronized countdown ends
  if (startInfo.phase === 'active') {
    return (
      <ArenaMatchView
        room={room}
        currentUid={currentUid}
        questions={questions}
        gameTasks={gameTasks}
        onRoomUpdated={(updatedRoom, serverNow) => {
          setRoom(updatedRoom);
          applyServerNow(serverNow);
        }}
        onExitToLobby={() => {
          sseRef.current?.close();
          sseRef.current = null;
          onExitToLobby();
        }}
      />
    );
  }

  const maxParticipants = room.maxParticipants || DEFAULT_ARENA_MAX_PARTICIPANTS;
  const joinedCount = room.participants.length;
  const readyCount = countReadyParticipants(room.participants);
  const myParticipant = room.participants.find((p) => p.uid === currentUid);
  const isReady = Boolean(myParticipant?.ready);
  const modeLabel = room.mode === 'game' ? 'Trò chơi' : 'Thi trắc nghiệm';
  const countLabel = `${room.itemCount || 10} ${room.mode === 'game' ? 'lượt' : 'câu'}`;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#BFE2FF] via-[#DCEEFF] to-[#EDF7FF] dark:from-[#0B1220] dark:via-[#0F1B33] dark:to-[#0B1220] flex flex-col relative overflow-x-hidden transition-colors duration-200"
      data-testid="arena-waiting-room"
    >
      {/* Top Cobalt Blue Header */}
      <header className="relative z-20 bg-gradient-to-r from-[#0265E4] via-[#0166E3] to-[#025ED6] dark:from-[#0E1E3A] dark:via-[#12264A] dark:to-[#0E1E3A] border-b-[3px] border-[#A3E635] dark:border-sky-500/60 px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/student-icons/logo-mam-xanh-white.png"
              alt="Logo Đấu trường Tin học"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
            />
            <span className="h-5 w-px bg-white/45 shrink-0 hidden sm:inline-block" aria-hidden="true" />
            <span className="font-display font-black text-lg sm:text-[21px] text-white tracking-tight truncate">
              Đấu trường Tin học
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <ThemeToggle variant="header" />
            <button
              type="button"
              onClick={() => {
                setLeaveError(null);
                setShowLeaveDialog(true);
              }}
              data-testid="btn-arena-leave"
              className="min-h-[42px] px-4 rounded-full border-[1.5px] border-white/85 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-display font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/45 transition-colors"
            >
              <img
                src="/assets/arena/roi-phong-white.png"
                alt=""
                aria-hidden="true"
                className="w-5 h-5 object-contain shrink-0 pointer-events-none"
              />
              <span>Rời phòng</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Waiting Stage */}
      <div className="relative flex-1 flex flex-col">
        <CornerTreeLeaves side="left" />
        <CornerTreeLeaves side="right" />

        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
          {/* Temporary SSE Disconnect / Reconnect Banner (non-destructive) */}
          {sseStatus === 'reconnecting' && (
            <div
              role="status"
              data-testid="arena-reconnect-banner"
              className="rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-amber-950 dark:text-amber-100 shadow-sm"
            >
              <p className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Mất kết nối tạm thời với máy chủ. Em vẫn ở trong phòng chờ và đang tự động kết nối lại...
              </p>
              <button
                type="button"
                onClick={() => {
                  void fetchRoomDetail();
                  connectSse();
                }}
                className="min-h-[36px] px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thử lại ngay
              </button>
            </div>
          )}

          {/* Top Row: Title + Match Metadata Pill + Room Code Card */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            {/* Room Code prioritized at top on mobile via order-first */}
            <div className="order-1 lg:order-2 flex items-center justify-between lg:justify-end">
              <div
                className="w-full sm:w-auto bg-white/95 dark:bg-[#131D31] border border-[#CBE0F9] dark:border-[#283B5E] rounded-2xl px-4 py-2.5 shadow-[0_10px_24px_-12px_rgba(15,48,110,0.18)] inline-flex items-center justify-between sm:justify-start gap-3"
                data-testid="arena-room-code-card"
              >
                <span className="font-display font-extrabold text-sm sm:text-base text-[#13264D] dark:text-slate-200">
                  Mã phòng
                </span>
                <span className="h-6 w-px bg-slate-200 dark:bg-[#2B3E5E]" aria-hidden="true" />
                <span
                  data-testid="arena-room-code-value"
                  className="px-4 py-1 rounded-xl bg-[#FEF3C7] dark:bg-amber-900/60 text-[#0F2654] dark:text-amber-100 font-mono font-black text-xl sm:text-2xl tracking-wider tabular-nums"
                >
                  {room.roomCode}
                </span>
              </div>
            </div>

            <div className="order-2 lg:order-1 space-y-2">
              <div className="inline-flex items-center gap-2">
                <h1 className="font-display font-black text-2xl sm:text-[34px] leading-tight text-[#0F2654] dark:text-slate-100">
                  Phòng chờ thi đấu
                </h1>
                <SparkleRays className="w-6 h-6 -mt-3" />
              </div>
              <div>
                <span
                  data-testid="arena-room-meta"
                  className="inline-flex flex-wrap items-center gap-1.5 px-4 py-1 rounded-full bg-[#EAF4FF]/95 dark:bg-[#162744] border border-[#BDDCFC] dark:border-[#2B436E] text-[#13264D] dark:text-sky-100 text-xs sm:text-sm font-extrabold shadow-xs"
                >
                  Lớp {room.classCode} · {modeLabel} · {countLabel}
                </span>
              </div>
            </div>
          </div>

          {/* 3-2-1 Synchronized Countdown Banner when Teacher Clicks Start */}
          {startInfo.phase === 'countdown' && (
            <section
              role="status"
              aria-live="assertive"
              data-testid="arena-start-countdown"
              className="rounded-[24px] bg-gradient-to-r from-[#0166E3] via-[#0277F0] to-[#16823A] dark:from-sky-700 dark:to-emerald-700 text-white p-6 sm:p-8 shadow-xl border-2 border-white/80 text-center space-y-2"
            >
              <p className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-200">
                <Sparkles className="w-4 h-4" />
                Giáo viên đã bấm bắt đầu!
              </p>
              <p className="font-mono font-black text-6xl sm:text-7xl tabular-nums drop-shadow-sm">
                {startInfo.countNumber}
              </p>
              <p className="font-display font-bold text-base sm:text-lg text-white/95">
                Chuẩn bị vào {modeLabel.toLowerCase()} trong giây lát...
              </p>
            </section>
          )}

          {/* 2-Column Main Workspace (On mobile: Right Status Column comes FIRST!) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* RIGHT COLUMN: Illustration + Ready Controls (order-1 on mobile, order-2 on desktop) */}
            <section className="lg:col-span-6 order-1 lg:order-2 bg-white/95 dark:bg-[#131D31] border border-[#D4E6FA] dark:border-[#25334D] rounded-[24px] p-4 sm:p-6 shadow-[0_14px_34px_-16px_rgba(15,48,110,0.18)] flex flex-col justify-between space-y-5">
              {/* Sky Card Stage with Illustration */}
              <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#A8DBFF] via-[#D2EEFF] to-[#E6F8E2] dark:from-[#163156] dark:via-[#1C3D69] dark:to-[#193A32] px-4 pt-4 pb-1 border border-[#CBE4FD] dark:border-[#29436B]">
                <ArenaStarsCanvas lowSpec2D={lowSpec2D} />
                <img
                  src="/assets/arena/minh-hoa-phong-cho.png"
                  alt="Hai bạn nhỏ vui vẻ giơ ngón cái bên chiếc cúp vàng Đấu trường Tin học"
                  className="relative z-10 w-full max-w-[430px] mx-auto h-auto object-contain select-none pointer-events-none"
                />
              </div>

              {/* Student Ready Status & Controls */}
              <div className="flex flex-col items-center text-center space-y-3.5 pt-1" data-testid="arena-ready-panel">
                {isReady ? (
                  <>
                    <div
                      data-testid="arena-ready-confirmed-badge"
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#DCFCE7] dark:bg-emerald-950/60 border border-[#96E6B9] dark:border-emerald-700/60 text-[#16823A] dark:text-emerald-200 font-display font-extrabold text-sm sm:text-base"
                    >
                      <img
                        src="/assets/aistudio/san-sang_2ae82a12.svg"
                        alt=""
                        aria-hidden="true"
                        className="w-5 h-5 shrink-0"
                      />
                      <span>Em đã sẵn sàng</span>
                    </div>

                    <div className="inline-flex items-center justify-center gap-1.5">
                      <h2 className="font-display font-black text-xl sm:text-[26px] text-[#0F2654] dark:text-slate-100 leading-snug">
                        Đang chờ giáo viên bắt đầu
                      </h2>
                      <SparkleRays className="w-5 h-5 -mt-4" />
                    </div>

                    <button
                      type="button"
                      disabled={readyBusy || room.status !== 'waiting'}
                      onClick={() => void handleToggleReady(false)}
                      data-testid="btn-arena-unready"
                      className="min-h-[46px] px-7 rounded-full border-2 border-[#0166E3] dark:border-sky-400 bg-white dark:bg-[#1A2742] hover:bg-[#EAF4FF] dark:hover:bg-sky-950/60 disabled:opacity-55 text-[#0166E3] dark:text-sky-300 font-display font-extrabold text-sm sm:text-base cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 transition-colors"
                    >
                      {readyBusy ? 'Đang cập nhật...' : 'Hủy sẵn sàng'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={readyBusy || room.status !== 'waiting'}
                      onClick={() => void handleToggleReady(true)}
                      data-testid="btn-arena-ready"
                      className="min-h-[52px] px-8 rounded-full bg-[#16823A] hover:bg-[#126D30] dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-55 text-white font-display font-extrabold text-base sm:text-lg inline-flex items-center justify-center gap-2.5 shadow-[0_10px_22px_-8px_rgba(22,130,58,0.55)] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full bg-white text-[#16823A] inline-flex items-center justify-center font-black text-sm">
                        ✓
                      </span>
                      <span>{readyBusy ? 'Đang gửi...' : 'Em sẵn sàng'}</span>
                    </button>

                    <p className="font-display font-bold text-sm sm:text-base text-[#13264D] dark:text-slate-200">
                      Hãy bấm &ldquo;Em sẵn sàng&rdquo; khi em đã chuẩn bị xong nhé!
                    </p>
                  </>
                )}

                {readyError && (
                  <div
                    role="alert"
                    className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-100 text-xs font-bold flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>{readyError}</span>
                    <button
                      type="button"
                      onClick={() => void handleToggleReady(!isReady)}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                <div className="w-full border-t border-[#E2ECF9] dark:border-[#25334D] pt-3">
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Khi giáo viên bắt đầu, em sẽ thấy đếm ngược 3 giây.
                  </p>
                </div>
              </div>
            </section>

            {/* LEFT COLUMN: Classmates Roster & Ready Counts (order-2 on mobile, order-1 on desktop) */}
            <section
              className="lg:col-span-6 order-2 lg:order-1 bg-white/95 dark:bg-[#131D31] border border-[#D4E6FA] dark:border-[#25334D] rounded-[24px] p-4 sm:p-6 shadow-[0_14px_34px_-16px_rgba(15,48,110,0.18)] space-y-4"
              data-testid="arena-classmates-panel"
            >
              <div className="flex items-center gap-1.5">
                <SparkleRays className="w-5 h-5 -mt-3 -scale-x-100" />
                <h2 className="font-display font-black text-xl sm:text-[26px] text-[#0F2654] dark:text-slate-100">
                  Bạn cùng lớp
                </h2>
              </div>

              {/* Joined & Ready Counters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2">
                  <img
                    src="/assets/aistudio/nguoi-choi_7a660ccd.svg"
                    alt=""
                    aria-hidden="true"
                    className="w-7 h-7 shrink-0"
                  />
                  <span
                    data-testid="arena-joined-counter"
                    className="px-3.5 py-1 rounded-full bg-[#DCEEFF] dark:bg-sky-950/75 text-[#0F2654] dark:text-sky-100 font-display font-extrabold text-sm tabular-nums"
                  >
                    {joinedCount} / {maxParticipants} đã vào
                  </span>
                </div>

                <span className="h-6 w-px bg-slate-200 dark:bg-[#2B3E5E] hidden sm:inline-block" aria-hidden="true" />

                <div className="inline-flex items-center gap-2">
                  <img
                    src="/assets/aistudio/san-sang_2ae82a12.svg"
                    alt=""
                    aria-hidden="true"
                    className="w-6 h-6 shrink-0"
                  />
                  <span
                    data-testid="arena-ready-counter"
                    className="px-3.5 py-1 rounded-full bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#114A2B] dark:text-emerald-200 font-display font-extrabold text-sm tabular-nums"
                  >
                    {readyCount} / {maxParticipants} sẵn sàng
                  </span>
                </div>
              </div>

              {/* Classmate Cards Grid */}
              {room.participants.length === 0 ? (
                <div className="rounded-2xl bg-[#F4F9FF] dark:bg-[#1A2742] border border-[#D8E7F8] dark:border-[#334155] p-6 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Đang chờ các bạn cùng lớp vào phòng...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="arena-participant-grid">
                  {room.participants.map((p) => {
                    const isMe = p.uid === currentUid;
                    return (
                      <article
                        key={p.uid}
                        data-testid={`arena-participant-${p.uid}`}
                        className={`rounded-2xl border p-2.5 sm:p-3 flex items-center gap-2.5 min-w-0 transition-colors ${
                          isMe
                            ? 'bg-[#EEF6FF] dark:bg-sky-950/55 border-[#6CB2FF] dark:border-sky-600 shadow-xs'
                            : 'bg-[#F8FBFF] dark:bg-[#18253E] border-[#DCEBFC] dark:border-[#2B3E5E]'
                        }`}
                      >
                        <AvatarBadge avatarId={p.avatarId} size="md" shape="circle" />

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-display font-black text-[15px] text-[#0F2654] dark:text-slate-100 truncate">
                              {p.nickname}
                            </p>
                            {isMe && (
                              <span
                                data-testid="arena-me-badge"
                                className="px-2 py-0.5 rounded-md bg-[#0166E3] dark:bg-sky-500 text-white font-display font-extrabold text-[11px] shrink-0"
                              >
                                Em
                              </span>
                            )}
                          </div>

                          <div>
                            {p.ready ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#16823A] dark:text-emerald-300 font-display font-extrabold text-xs">
                                <img
                                  src="/assets/aistudio/san-sang_2ae82a12.svg"
                                  alt=""
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 shrink-0"
                                />
                                <span>Sẵn sàng</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-amber-950/60 text-[#A64B0A] dark:text-amber-300 font-display font-extrabold text-xs">
                                <img
                                  src="/assets/aistudio/dang-cho_3a35bef2.svg"
                                  alt=""
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 shrink-0"
                                />
                                <span>Chưa sẵn sàng</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* Explicit Leave Confirmation Modal */}
      {showLeaveDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="arena-leave-title"
          data-testid="arena-leave-dialog"
          className="fixed inset-0 z-50 bg-slate-900/55 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="max-w-sm w-full bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200 dark:border-[#25334D] p-6 space-y-4 shadow-xl">
            <h3 id="arena-leave-title" className="font-display font-black text-lg text-[#0F2654] dark:text-slate-100">
              Em muốn rời phòng thi đấu?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Nếu rời phòng {room.roomCode}, tên của em sẽ được rút khỏi danh sách chờ trận này và quay lại sảnh Đấu trường.
            </p>
            {leaveError && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{leaveError}</p>
            )}
            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={leavingBusy}
                onClick={() => setShowLeaveDialog(false)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2742] cursor-pointer"
              >
                Ở lại phòng
              </button>
              <button
                type="button"
                disabled={leavingBusy}
                onClick={() => void handleConfirmLeave()}
                data-testid="btn-confirm-arena-leave"
                className="min-h-[44px] px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold cursor-pointer"
              >
                {leavingBusy ? 'Đang rời phòng...' : 'Xác nhận rời phòng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
