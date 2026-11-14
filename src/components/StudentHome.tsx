import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, RefreshCw, Swords, Trophy } from 'lucide-react';
import { api, ApiError, type ClientUser, type LeaderboardSnapshot, type StudentDashboardData } from '../services/api';
import type { ArenaRoom, LessonCatalogItem, LessonStage } from '../shared/types';
import { useTheme } from '../contexts/ThemeContext';
import { ArenaRoomPanel } from './ArenaRoomPanel';
import { AvatarBadge } from './AvatarIcon';
import { StudentDashboardCharts } from './StudentDashboardCharts';
import { ThemeToggle } from './ThemeToggle';

interface StudentHomeProps {
  user: ClientUser;
  lowSpec2D: boolean;
  focusArena?: boolean;
  onToggleLowSpec2D: () => void;
  onOpenLesson: (lessonId: string, initialStage?: LessonStage) => void;
  onEnterArenaRoom: (room: ArenaRoom, serverNow?: string) => void;
  onLoggedOut: () => void;
  onSessionRevoked: (reason: string) => void;
}

type StudentTab = 'lessons' | 'common' | 'arena' | 'badges';

type LineIconName =
  | 'logo-mam-xanh'
  | 'doi-hoc-sinh'
  | 'dang-xuat'
  | 'hoc-tiep'
  | 'phan-chung'
  | 'dau-truong'
  | 'huy-hieu'
  | 'xem-mau'
  | 'thuc-hanh'
  | 'trac-nghiem'
  | 'bai-hoc'
  | 'thong-ke';

const StudentLineIcon: React.FC<{
  name: LineIconName;
  alwaysWhite?: boolean;
  sizeClass?: string;
  alt?: string;
}> = ({ name, alwaysWhite = false, sizeClass = 'w-5 h-5', alt = '' }) => {
  const { isDark } = useTheme();
  const useWhite = alwaysWhite || isDark;
  const src = `/assets/student-icons/${name}${useWhite ? '-white' : ''}.png`;
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt === ''}
      className={`${sizeClass} object-contain shrink-0 select-none pointer-events-none`}
    />
  );
};

interface LessonVisualSpec {
  src: string;
  bgClass: string;
  isFullBleed?: boolean;
}

function getLessonVisual(lesson: LessonCatalogItem): LessonVisualSpec {
  const id = lesson.id.toUpperCase();
  const text = `${lesson.title} ${lesson.summaryActivity}`.toLowerCase();

  if (id === 'L4-B1' || id === 'L3-B1' || id === 'L5-B1' || text.includes('phần cứng')) {
    return {
      src: '/assets/student-icons/phan-cung-phan-mem.png',
      bgClass: 'bg-gradient-to-br from-[#CBE8FF] via-[#E3F2FF] to-[#D4F5CE] dark:from-[#173054] dark:via-[#1C3860] dark:to-[#183934]',
    };
  }
  if (id === 'L4-B2' || id === 'L3-B5' || id === 'CHUNG-PHIM' || text.includes('bàn phím') || text.includes('gõ')) {
    return {
      src: '/assets/student-icons/ban-phim.png',
      bgClass: 'bg-gradient-to-br from-[#EFE3FF] via-[#F4ECFF] to-[#D7F7D4] dark:from-[#261E47] dark:via-[#2C2350] dark:to-[#1B3A33]',
    };
  }
  if (id === 'L4-B3' || id === 'L4-B4' || text.includes('trang web') || text.includes('internet')) {
    return {
      src: '/assets/student-icons/trang-web.png',
      bgClass: 'bg-gradient-to-br from-[#D8EEFF] via-[#EAF7FF] to-[#D4F5CE] dark:from-[#162D4D] dark:via-[#1B3759] dark:to-[#183830]',
    };
  }
  if (id === 'L5-B4' || text.includes('cây thư mục')) {
    return {
      src: '/assets/landing/lesson-5-tree.png',
      bgClass: 'bg-[#7BE89A] dark:bg-[#194A35]',
      isFullBleed: true,
    };
  }
  if (id === 'L4-B5' || id === 'CHUNG-TEP' || text.includes('thư mục') || text.includes('tệp')) {
    return {
      src: '/assets/landing/lesson-4-folder.png',
      bgClass: 'bg-[#FFD6AE] dark:bg-[#4E311B]',
      isFullBleed: true,
    };
  }
  if (id === 'L4-B6' || id === 'CHUNG-ANTOAN' || text.includes('được phép') || text.includes('an toàn')) {
    return {
      src: '/assets/student-icons/tan-binh.png',
      bgClass: 'bg-gradient-to-br from-[#DCEEFF] via-[#EAF5FF] to-[#FFF4D6] dark:from-[#172D50] dark:via-[#1E355A] dark:to-[#3A2E1A]',
    };
  }
  return {
    src: '/assets/student-icons/phan-cung-phan-mem.png',
    bgClass: 'bg-gradient-to-br from-[#D6ECFF] via-[#ECF6FF] to-[#E2F7DB] dark:from-[#173054] dark:via-[#1C3860] dark:to-[#183934]',
  };
}

const CornerLeaves: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <svg
    viewBox="0 0 180 110"
    aria-hidden="true"
    className={`pointer-events-none select-none fixed bottom-0 ${
      side === 'left' ? 'left-0' : 'right-0 -scale-x-100'
    } w-36 sm:w-44 h-auto opacity-85 dark:opacity-55 z-0 no-print`}
  >
    <path d="M-8 112 C18 76, 54 64, 92 78 C54 92, 24 106, -8 112 Z" fill="#84CC16" />
    <path d="M22 112 C48 80, 90 74, 128 96 C92 104, 58 112, 22 112 Z" fill="#65A30D" />
    <path d="M58 112 C84 90, 122 88, 152 108 C122 112, 92 114, 58 112 Z" fill="#A3E635" />
    <circle cx="50" cy="98" r="5" fill="#FFFFFF" />
    <circle cx="50" cy="98" r="2.2" fill="#FACC15" />
    <circle cx="102" cy="100" r="4.5" fill="#FFFFFF" />
    <circle cx="102" cy="100" r="2" fill="#FACC15" />
  </svg>
);

export const StudentHome: React.FC<StudentHomeProps> = ({
  user,
  lowSpec2D,
  focusArena = false,
  onToggleLowSpec2D,
  onOpenLesson,
  onEnterArenaRoom,
  onLoggedOut,
  onSessionRevoked,
}) => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveLeaderboard, setLiveLeaderboard] = useState<LeaderboardSnapshot | null>(null);
  const [liveArenaRooms, setLiveArenaRooms] = useState<ArenaRoom[]>([]);
  const [arenaServerNow, setArenaServerNow] = useState<string | undefined>(undefined);
  const [busyArenaRoomId, setBusyArenaRoomId] = useState<string | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [arenaFeedback, setArenaFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [logoutModalMode, setLogoutModalMode] = useState<'logout' | 'switch' | null>(null);
  const [activeNav, setActiveNav] = useState<StudentTab>(() => (focusArena ? 'arena' : 'lessons'));
  const manualLogoutRef = useRef(false);
  const sseRef = useRef<EventSource | null>(null);
  const arenaSseRef = useRef<EventSource | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getStudentDashboard();
      setData(res);
      setLiveLeaderboard(res.leaderboard);
      setLiveArenaRooms(res.arenaRooms ?? []);
      setArenaServerNow(res.serverNow);
    } catch {
      // handled by App session state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  useEffect(() => {
    if (focusArena) {
      setActiveNav('arena');
    }
  }, [focusArena]);

  // Same-origin SSE stream for real-time weekly leaderboard updates
  useEffect(() => {
    if (!data?.classInfo?.id) return;
    const es = new EventSource(`/api/sse/leaderboard?classId=${encodeURIComponent(data.classInfo.id)}`);
    sseRef.current = es;

    es.addEventListener('leaderboard_snapshot', (ev) => {
      try {
        const snap = JSON.parse((ev as MessageEvent).data) as LeaderboardSnapshot;
        setLiveLeaderboard(snap);
      } catch {
        // ignore parse error
      }
    });

    es.addEventListener('session_revoked', (ev) => {
      es.close();
      if (manualLogoutRef.current) return;
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as { reason?: string };
        onSessionRevoked(payload.reason || 'Phiên đăng nhập đã kết thúc.');
      } catch {
        onSessionRevoked('Phiên đăng nhập đã kết thúc.');
      }
    });

    return () => {
      es.close();
      if (sseRef.current === es) sseRef.current = null;
    };
  }, [data?.classInfo?.id, onSessionRevoked]);

  // Same-origin SSE stream for real-time Arena waiting rooms & start state
  useEffect(() => {
    if (!data?.classInfo?.id) return;
    const es = new EventSource('/api/sse/arena');
    arenaSseRef.current = es;

    es.addEventListener('arena_snapshot', (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          rooms: ArenaRoom[];
          serverNow: string;
        };
        setLiveArenaRooms(payload.rooms ?? []);
        setArenaServerNow(payload.serverNow);
      } catch {
        // ignore parse error
      }
    });

    es.addEventListener('session_revoked', (ev) => {
      es.close();
      if (manualLogoutRef.current) return;
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as { reason?: string };
        onSessionRevoked(payload.reason || 'Phiên đăng nhập đã kết thúc.');
      } catch {
        onSessionRevoked('Phiên đăng nhập đã kết thúc.');
      }
    });

    return () => {
      es.close();
      if (arenaSseRef.current === es) arenaSseRef.current = null;
    };
  }, [data?.classInfo?.id, onSessionRevoked]);

  const primaryLesson = useMemo(() => {
    if (!data?.lessons?.length) return null;
    const incomplete = data.lessons.find((l) => {
      const p = data.progress.find((pr) => pr.lessonId === l.id);
      return !p?.practiceCompleted;
    });
    return incomplete ?? data.lessons[0];
  }, [data]);

  const rankProgressPercent = useMemo(() => {
    const xp = data?.user.totalXp ?? user.totalXp;
    const curMin = user.rank.minXp;
    const nextMin = user.rank.nextMinXp;
    if (!nextMin) return 100;
    return Math.min(100, Math.max(8, Math.round(((xp - curMin) / (nextMin - curMin)) * 100)));
  }, [data?.user.totalXp, user.rank, user.totalXp]);

  const handleJoinArenaRoom = async (roomId: string) => {
    setBusyArenaRoomId(roomId);
    setArenaFeedback(null);
    try {
      const res = await api.joinArenaRoom(roomId);
      setArenaServerNow(res.serverNow);
      setLiveArenaRooms((prev) => prev.map((r) => (r.id === roomId ? res.room : r)));
      onEnterArenaRoom(res.room, res.serverNow);
    } catch (err) {
      setArenaFeedback({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Không thể vào phòng đấu trường.',
      });
    } finally {
      setBusyArenaRoomId(null);
    }
  };

  const handleJoinArenaByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomCodeInput.trim();
    if (!trimmed) {
      setArenaFeedback({ ok: false, text: 'Em hãy nhập mã phòng trước khi bấm Vào phòng nhé.' });
      return;
    }
    setJoiningByCode(true);
    setArenaFeedback(null);
    try {
      const res = await api.joinArenaRoomByCode(trimmed);
      setArenaServerNow(res.serverNow);
      setRoomCodeInput('');
      setLiveArenaRooms((prev) => [res.room, ...prev.filter((r) => r.id !== res.room.id)]);
      onEnterArenaRoom(res.room, res.serverNow);
    } catch (err) {
      setArenaFeedback({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Không thể vào phòng với mã vừa nhập.',
      });
    } finally {
      setJoiningByCode(false);
    }
  };

  const handleLeaveArenaRoom = async (roomId: string) => {
    setBusyArenaRoomId(roomId);
    setArenaFeedback(null);
    try {
      await api.leaveArenaRoom(roomId);
      const latest = await api.getStudentArenaRooms();
      setLiveArenaRooms(latest.rooms);
      setArenaServerNow(latest.serverNow);
    } catch (err) {
      setArenaFeedback({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Không thể rời phòng chờ.',
      });
    } finally {
      setBusyArenaRoomId(null);
    }
  };

  const confirmLogout = async () => {
    manualLogoutRef.current = true;
    sseRef.current?.close();
    sseRef.current = null;
    arenaSseRef.current?.close();
    arenaSseRef.current = null;
    try {
      await api.logout();
    } finally {
      setLogoutModalMode(null);
      onLoggedOut();
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#EBF4FF] dark:bg-[#0B1220] flex items-center justify-center p-6">
        <p className="font-display font-bold text-lg text-[#13264D] dark:text-slate-100">
          Đang mở góc học tập của em...
        </p>
      </div>
    );
  }

  const displayUser = data?.user ?? user;
  const studentGrade = data?.classInfo?.grade ?? 4;
  const classCode = data?.classInfo?.code ?? displayUser.classCode;
  const leaderboard = liveLeaderboard ?? data?.leaderboard;
  const commonLessons = data?.commonLessons ?? [];
  const upcomingGradeLessons = data?.upcomingGradeLessons ?? [];

  const renderLessonCard = (lesson: LessonCatalogItem, isCommon: boolean) => {
    const prog = data?.progress.find((p) => p.lessonId === lesson.id);
    const asg = data?.assignments.find((a) => a.lessonId === lesson.id);
    const visual = getLessonVisual(lesson);

    return (
      <article
        key={lesson.id}
        data-testid={`lesson-card-${lesson.id}`}
        className="bg-white dark:bg-[#131D31] border border-[#D8E7F8] dark:border-[#25334D] rounded-[20px] p-3.5 sm:p-4 shadow-[0_8px_22px_-14px_rgba(15,48,110,0.14)] dark:shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
          {/* 3D Lesson Thumbnail */}
          <div
            className={`relative w-full sm:w-[156px] h-[94px] rounded-2xl overflow-hidden border border-white/80 dark:border-[#2B3E5E] shrink-0 flex items-center justify-center ${visual.bgClass}`}
          >
            {/* Subtle bottom grass & sparkle accent matching reference thumbnails */}
            {!visual.isFullBleed && (
              <>
                <svg
                  viewBox="0 0 160 28"
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 inset-x-0 w-full h-5 opacity-90 dark:opacity-65"
                >
                  <path d="M0 28 C14 14, 34 14, 48 28 Z" fill="#65C419" />
                  <path d="M22 28 C34 17, 50 18, 60 28 Z" fill="#8AE434" />
                  <path d="M112 28 C126 15, 146 15, 160 28 Z" fill="#65C419" />
                  <path d="M100 28 C112 18, 128 19, 138 28 Z" fill="#8AE434" />
                </svg>
                <img
                  src={visual.src}
                  alt={`Minh họa ${lesson.title}`}
                  className="relative z-10 w-[82px] h-[72px] object-contain drop-shadow-[0_6px_12px_rgba(15,48,110,0.18)]"
                />
              </>
            )}
            {visual.isFullBleed && (
              <img
                src={visual.src}
                alt={`Minh họa ${lesson.title}`}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Lesson Info */}
          <div className="sm:border-l sm:border-[#E2ECF9] dark:sm:border-[#25334D] sm:pl-4 space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#DCEEFF] dark:bg-sky-950/75 text-[#025ED6] dark:text-sky-300 font-display font-extrabold text-xs">
                {isCommon ? lesson.lessonNumber : `Bài ${lesson.lessonNumber}`}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isCommon ? 'Phần chung 3·4·5' : `Tin học ${lesson.grade} · SGK ${lesson.pageRange}`}
                {asg ? ` · Bài giao (${asg.mode === 'test' ? 'Kiểm tra' : 'Luyện tập'})` : ''}
              </span>
            </div>

            <h3 className="font-display font-extrabold text-[17px] sm:text-lg text-[#13264D] dark:text-slate-100 leading-snug">
              {lesson.title}
            </h3>

            <p className="text-xs sm:text-[13.5px] text-slate-600 dark:text-slate-300 line-clamp-2">
              {lesson.summaryActivity}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    prog?.practiceCompleted
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
                Thực hành: {prog?.practiceCompleted ? 'Đã đạt (+20 XP)' : 'Chưa xong'}
              </span>
              <span>
                Trắc nghiệm:{' '}
                <strong className="font-mono tabular-nums text-[#13264D] dark:text-slate-100">
                  {prog?.quizBestPercent !== null && prog?.quizBestPercent !== undefined
                    ? `${prog.quizBestPercent}%`
                    : '--'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* 3 Stage Action Buttons in exact order: Xem mẫu (light sky) -> Thực hành (orange) -> Trắc nghiệm (green) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenLesson(lesson.id, 'watch')}
            className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-xl border border-[#B5D6FA] dark:border-sky-700/60 bg-[#E6F2FF] hover:bg-[#D3E8FF] dark:bg-sky-950/60 dark:hover:bg-sky-900/70 text-[#13264D] dark:text-sky-100 font-display font-extrabold text-[13.5px] inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
          >
            <StudentLineIcon name="xem-mau" sizeClass="w-5 h-5" />
            <span>Xem mẫu</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenLesson(lesson.id, 'practice')}
            className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-xl bg-[#FF5508] hover:bg-[#E44800] dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-display font-extrabold text-[13.5px] inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-[0_6px_14px_-6px_rgba(255,85,8,0.5)] transition-colors"
          >
            <StudentLineIcon name="thuc-hanh" alwaysWhite sizeClass="w-5 h-5" />
            <span>Thực hành</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenLesson(lesson.id, 'quiz')}
            className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-xl bg-[#02994A] hover:bg-[#02823F] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-display font-extrabold text-[13.5px] inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-[0_6px_14px_-6px_rgba(2,153,74,0.45)] transition-colors"
          >
            <StudentLineIcon name="trac-nghiem" alwaysWhite sizeClass="w-5 h-5" />
            <span>Trắc nghiệm</span>
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#DCEEFF] via-[#EDF6FF] to-[#F5FAFF] dark:from-[#0B1220] dark:via-[#0E182B] dark:to-[#0B1220] flex flex-col relative transition-colors duration-200">
      <CornerLeaves side="left" />
      <CornerLeaves side="right" />

      {/* Top Blue Bar matching Reference Image */}
      <header className="relative z-20 bg-gradient-to-r from-[#0265E4] via-[#0166E3] to-[#025ED6] dark:from-[#0E1E3A] dark:via-[#12264A] dark:to-[#0E1E3A] border-b-[3px] border-[#A3E635] dark:border-sky-500/60 px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-3 md:gap-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/student-icons/logo-mam-xanh-white.png"
              alt="Logo Phòng thực hành Tin học"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
            />
            <span className="h-5 w-px bg-white/45 shrink-0 hidden sm:inline-block" aria-hidden="true" />
            <span className="font-display font-black text-base sm:text-[19px] text-white tracking-tight truncate">
              Phòng thực hành Tin học
            </span>
          </div>

          <div className="w-full md:w-auto flex flex-wrap items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleLowSpec2D}
              className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-sky-100 hover:text-white hover:bg-white/10 whitespace-nowrap cursor-pointer transition-colors"
            >
              {lowSpec2D ? 'Đang dùng chế độ 2D nhẹ' : 'Chế độ 2D máy yếu'}
            </button>

            <ThemeToggle variant="header" />

            <button
              type="button"
              onClick={() => setLogoutModalMode('switch')}
              className="min-h-[42px] px-3.5 rounded-xl border-[1.5px] border-white/85 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-display font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
            >
              <StudentLineIcon name="doi-hoc-sinh" alwaysWhite sizeClass="w-5 h-5" />
              <span>Đổi học sinh</span>
            </button>

            <button
              type="button"
              onClick={() => setLogoutModalMode('logout')}
              className="min-h-[42px] px-3.5 rounded-xl border-[1.5px] border-white/85 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-display font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
            >
              <StudentLineIcon name="dang-xuat" alwaysWhite sizeClass="w-5 h-5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* HERO WELCOME BANNER WITH STUDENT ARTWORK, RANK SHIELD & 4 QUICK BUTTONS */}
        <section className="relative overflow-hidden rounded-[24px] border-2 border-white/90 dark:border-[#25334D] bg-[#CBE8FF] dark:bg-[#111D33] shadow-[0_14px_34px_-16px_rgba(15,48,110,0.22)] dark:shadow-[0_16px_34px_-16px_rgba(0,0,0,0.55)]">
          {/* Project student tree illustration backdrop */}
          <div className="pointer-events-none absolute inset-0">
            <img
              src="/assets/aistudio/image_05eb7300.png"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover object-[78%_42%] opacity-90 dark:opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#CBE8FF]/95 via-[#E4F2FF]/90 to-[#CBE8FF]/65 sm:via-[#E4F2FF]/82 sm:to-transparent dark:from-[#0F1A2E]/96 dark:via-[#12203A]/92 dark:to-[#0F1A2E]/75 dark:sm:via-[#12203A]/88 dark:sm:to-[#0F1A2E]/55" />
          </div>

          <div className="relative z-10 p-5 sm:p-7 space-y-5 lg:max-w-[66%]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Greeting */}
              <div className="flex items-start gap-3.5">
                <AvatarBadge avatarId={displayUser.avatarId} size="lg" />
                <div>
                  <h1 className="font-display font-black text-2xl sm:text-[32px] text-[#0F2654] dark:text-slate-100 leading-tight">
                    Chào {displayUser.fullName}!
                  </h1>
                  <div className="mt-1 inline-block">
                    <p className="font-display font-extrabold text-base sm:text-lg text-[#13264D] dark:text-sky-300">
                      Lớp {classCode}
                    </p>
                    <svg viewBox="0 0 130 10" aria-hidden="true" className="w-28 h-2.5 -mt-0.5">
                      <path
                        d="M3 7 C38 2, 88 2, 126 5"
                        fill="none"
                        stroke="#FACC15"
                        strokeWidth="4.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-[#334B72] dark:text-slate-300 mt-0.5">
                    Khối {studentGrade} · Mã {displayUser.studentCode} · Biệt danh: {displayUser.nickname}
                  </p>
                </div>
              </div>

              {/* XP & Rank Shield Card */}
              <div className="relative sm:min-w-[238px] bg-white/92 dark:bg-[#16233B]/95 backdrop-blur-sm border border-white dark:border-[#2B3E5E] rounded-2xl px-4 py-3 shadow-[0_10px_24px_-10px_rgba(15,48,110,0.18)] flex items-center gap-3">
                <svg
                  viewBox="0 0 32 24"
                  aria-hidden="true"
                  className="w-7 h-5 absolute -top-3.5 left-1.5 pointer-events-none"
                >
                  <path
                    d="M8 18 L4 8 M16 14 L15 3 M24 18 L29 10"
                    stroke="#FACC15"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <img
                  src="/assets/student-icons/tan-binh.png"
                  alt={`Huy hiệu ${displayUser.rank.name}`}
                  className="w-11 h-11 object-contain shrink-0 drop-shadow-sm"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-display font-extrabold text-[#13264D] dark:text-slate-100 truncate">
                      {displayUser.rank.name}
                    </span>
                    <span
                      className="font-mono font-extrabold text-[#0284C7] dark:text-sky-300 tabular-nums shrink-0"
                      data-testid="student-total-xp"
                    >
                      {displayUser.totalXp} XP
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#DCEAFB] dark:bg-[#243656] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2D8CFA] to-[#0166E3] dark:from-sky-400 dark:to-sky-500 transition-all"
                      style={{ width: `${rankProgressPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                    {displayUser.rank.nextMinXp
                      ? `Còn ${displayUser.rank.nextMinXp - displayUser.totalXp} XP để lên hạng`
                      : 'Em đã đạt hạng cao nhất!'}
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Primary Quick-Access Buttons (wrap on mobile) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                disabled={!primaryLesson}
                onClick={() => primaryLesson && onOpenLesson(primaryLesson.id, 'watch')}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#FF5508] hover:bg-[#E44800] dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-display font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-[0_8px_18px_-6px_rgba(255,85,8,0.5)] transition-colors"
              >
                <StudentLineIcon name="hoc-tiep" alwaysWhite sizeClass="w-5 h-5" />
                <span>Học tiếp Lớp {studentGrade}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('common')}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl bg-[#EAF4FF] hover:bg-[#D7EAFF] dark:bg-sky-950/75 dark:hover:bg-sky-900/75 border text-[#13264D] dark:text-sky-100 font-display font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                  activeNav === 'common'
                    ? 'border-[#0284C7] ring-2 ring-sky-300/70 dark:ring-sky-500/40'
                    : 'border-[#B5D6FA] dark:border-sky-700/60'
                }`}
              >
                <StudentLineIcon name="phan-chung" sizeClass="w-5 h-5" />
                <span>Phần chung 3–4–5</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('arena')}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl bg-[#D8FCE7] hover:bg-[#C2F8D9] dark:bg-emerald-950/70 dark:hover:bg-emerald-900/75 border text-[#114A2B] dark:text-emerald-100 font-display font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                  activeNav === 'arena'
                    ? 'border-[#059669] ring-2 ring-emerald-300/70 dark:ring-emerald-500/40'
                    : 'border-[#96E6B9] dark:border-emerald-700/60'
                }`}
              >
                <StudentLineIcon name="dau-truong" sizeClass="w-5 h-5" />
                <span>
                  Đấu trường{liveArenaRooms.length > 0 ? ` (${liveArenaRooms.length})` : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('badges')}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl bg-[#FFF4D1] hover:bg-[#FEEAB0] dark:bg-amber-950/65 dark:hover:bg-amber-900/70 border text-[#5C3A05] dark:text-amber-100 font-display font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                  activeNav === 'badges'
                    ? 'border-[#D97706] ring-2 ring-amber-300/70 dark:ring-amber-500/40'
                    : 'border-[#FAD689] dark:border-amber-700/60'
                }`}
              >
                <StudentLineIcon name="huy-hieu" sizeClass="w-5 h-5" />
                <span>
                  Huy hiệu ({displayUser.unlockedBadges.length})
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* 3-STEP LEARNING GUIDE STRIP: Xem mẫu -> Thực hành -> Trắc nghiệm */}
        <section
          aria-label="Hướng dẫn học theo 3 bước"
          className="bg-white/95 dark:bg-[#131D31] border border-[#D8E7F8] dark:border-[#25334D] rounded-[22px] p-4 sm:p-5 shadow-[0_10px_28px_-14px_rgba(15,48,110,0.14)] dark:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.45)] transition-colors"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative shrink-0 lg:w-[136px] flex items-center gap-2">
              <h2 className="font-display font-black text-lg sm:text-[20px] leading-tight text-[#13264D] dark:text-slate-100">
                Học theo <span className="lg:block">3 bước</span>
              </h2>
              <svg viewBox="0 0 24 28" aria-hidden="true" className="w-5 h-6 shrink-0">
                <path
                  d="M4 10 L16 6 M6 16 L20 15 M4 22 L15 24"
                  stroke="#FACC15"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2.5 sm:gap-3">
              {/* Step 1: Xem mẫu */}
              <button
                type="button"
                disabled={!primaryLesson}
                onClick={() => primaryLesson && onOpenLesson(primaryLesson.id, 'watch')}
                className="relative w-full text-left px-4 py-3 rounded-2xl bg-[#ECF6FF] hover:bg-[#DDF0FF] dark:bg-sky-950/55 dark:hover:bg-sky-900/65 border border-[#B5D6FA] dark:border-sky-800/60 flex items-center gap-3.5 cursor-pointer transition-colors"
              >
                <StudentLineIcon name="xem-mau" sizeClass="w-11 h-11" />
                <div className="min-w-0">
                  <p className="font-display font-black text-[15px] sm:text-base text-[#13264D] dark:text-slate-100">
                    1. Xem mẫu
                  </p>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Xem cách làm
                  </p>
                </div>
              </button>

              <ArrowRight
                className="hidden md:block w-5 h-5 text-[#0369E6] dark:text-sky-400 shrink-0"
                aria-hidden="true"
              />

              {/* Step 2: Thực hành */}
              <button
                type="button"
                disabled={!primaryLesson}
                onClick={() => primaryLesson && onOpenLesson(primaryLesson.id, 'practice')}
                className="relative w-full text-left px-4 py-3 rounded-2xl bg-[#FFF8DF] hover:bg-[#FEF0C2] dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-[#FCE192] dark:border-amber-700/60 flex items-center gap-3.5 cursor-pointer transition-colors"
              >
                <StudentLineIcon name="thuc-hanh" sizeClass="w-11 h-11" />
                <div className="min-w-0">
                  <p className="font-display font-black text-[15px] sm:text-base text-[#13264D] dark:text-slate-100">
                    2. Thực hành
                  </p>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Làm theo từng bước
                  </p>
                </div>
              </button>

              <ArrowRight
                className="hidden md:block w-5 h-5 text-[#0369E6] dark:text-sky-400 shrink-0"
                aria-hidden="true"
              />

              {/* Step 3: Trắc nghiệm */}
              <button
                type="button"
                disabled={!primaryLesson}
                onClick={() => primaryLesson && onOpenLesson(primaryLesson.id, 'quiz')}
                className="relative w-full text-left px-4 py-3 rounded-2xl bg-[#E8FDF0] hover:bg-[#D5FAE4] dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-[#A5ECC1] dark:border-emerald-700/60 flex items-center gap-3.5 cursor-pointer transition-colors"
              >
                <StudentLineIcon name="trac-nghiem" sizeClass="w-11 h-11" />
                <div className="min-w-0">
                  <p className="font-display font-black text-[15px] sm:text-base text-[#13264D] dark:text-slate-100">
                    3. Trắc nghiệm
                  </p>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Kiểm tra điều đã học
                  </p>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION HEADER BAR + NAVIGATION TABS + "Biểu đồ thống kê" */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#0369E6] dark:bg-sky-600 flex items-center justify-center shadow-sm shrink-0">
                <StudentLineIcon name="bai-hoc" alwaysWhite sizeClass="w-5 h-5" />
              </span>
              <h2 className="font-display font-black text-xl sm:text-[23px] text-[#13264D] dark:text-slate-100">
                {activeNav === 'lessons'
                  ? `Bài học Lớp ${studentGrade}`
                  : activeNav === 'common'
                    ? 'Phần chung 3–4–5'
                    : activeNav === 'arena'
                      ? 'Đấu trường Tin học'
                      : 'Bộ sưu tập Huy hiệu'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchDashboard}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#C6DCF7] dark:border-[#334155] bg-white dark:bg-[#131D31] hover:bg-sky-50 dark:hover:bg-[#1A2742] text-xs font-display font-bold text-[#13264D] dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cập nhật</span>
              </button>

              <button
                type="button"
                data-testid="student-jump-charts"
                onClick={() => {
                  document
                    .getElementById('thong-ke-hoc-tap')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="min-h-[40px] px-4 rounded-xl border border-[#C6DCF7] dark:border-[#334155] bg-white dark:bg-[#131D31] hover:bg-sky-50 dark:hover:bg-[#1A2742] text-xs sm:text-sm font-display font-extrabold text-[#13264D] dark:text-slate-100 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm transition-colors"
              >
                <StudentLineIcon name="thong-ke" sizeClass="w-5 h-5" />
                <span>Biểu đồ thống kê</span>
              </button>
            </div>
          </div>

          {/* Interactive Area Switcher Tabs */}
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Khu vực học tập của học sinh"
          >
            {[
              {
                id: 'lessons' as const,
                label: `Bài học Lớp ${studentGrade} (${data?.lessons.length ?? 0})`,
                icon: 'bai-hoc' as LineIconName,
              },
              {
                id: 'common' as const,
                label: `Phần chung 3·4·5 (${commonLessons.length})`,
                icon: 'phan-chung' as LineIconName,
              },
              {
                id: 'arena' as const,
                label: `Đấu trường${liveArenaRooms.length > 0 ? ` (${liveArenaRooms.length} phòng)` : ''}`,
                icon: 'dau-truong' as LineIconName,
              },
              {
                id: 'badges' as const,
                label: `Huy hiệu (${displayUser.unlockedBadges.length})`,
                icon: 'huy-hieu' as LineIconName,
              },
            ].map((tabItem) => {
              const active = activeNav === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`student-tab-${tabItem.id}`}
                  onClick={() => setActiveNav(tabItem.id)}
                  className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-display font-extrabold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#0369E6] dark:bg-sky-600 text-white shadow-sm'
                      : 'bg-white/90 dark:bg-[#131D31] border border-[#D4E4F7] dark:border-[#25334D] text-[#13264D] dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-[#1A2742]'
                  }`}
                >
                  <StudentLineIcon
                    name={tabItem.icon}
                    alwaysWhite={active}
                    sizeClass="w-5 h-5"
                  />
                  <span>{tabItem.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: GRADE-SPECIFIC PRACTICE & QUIZ LESSONS */}
        {activeNav === 'lessons' && (
          <section className="space-y-4" data-testid="student-grade-lessons-section">
            {!data?.lessons.length ? (
              <div className="bg-white dark:bg-[#131D31] border border-[#D8E7F8] dark:border-[#25334D] rounded-2xl p-8 text-center text-slate-600 dark:text-slate-300">
                Hiện chưa có bài học Lớp {studentGrade} nào được mở cho lớp của em.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {data.lessons.map((lesson) => renderLessonCard(lesson, false))}
              </div>
            )}

            {upcomingGradeLessons.length > 0 && (
              <div className="bg-white/95 dark:bg-[#131D31] border border-[#D8E7F8] dark:border-[#25334D] rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base text-[#13264D] dark:text-slate-100 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    Các bài tiếp theo trong SGK Tin học {studentGrade} ({upcomingGradeLessons.length} bài)
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Đang đối chiếu nguồn SGK</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {upcomingGradeLessons.map((ul) => (
                    <div
                      key={ul.id}
                      className="p-3 rounded-xl bg-[#F4F9FF] dark:bg-[#1A2742] border border-[#DCE8F8] dark:border-[#334155] text-xs space-y-0.5"
                    >
                      <p className="font-bold text-[#13264D] dark:text-slate-200">
                        Bài {ul.lessonNumber}: {ul.title}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        SGK {ul.pageRange} · Chưa mở
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: COMMON LESSONS FOR GRADES 3, 4, 5 */}
        {activeNav === 'common' && (
          <section className="space-y-4" data-testid="student-common-lessons-section">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Các chuyên đề kĩ năng nền tảng dùng chung cho mọi học sinh khối 3, 4 và 5: Gõ bàn phím 10 ngón, Quản lí Tệp &amp; Thư mục, An toàn số.
            </p>

            {commonLessons.length === 0 ? (
              <div className="bg-white dark:bg-[#131D31] border border-[#D8E7F8] dark:border-[#25334D] rounded-2xl p-8 text-center text-slate-600 dark:text-slate-300">
                Chưa có chuyên đề chung nào được mở.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {commonLessons.map((lesson) => renderLessonCard(lesson, true))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: ARENA (5-MIN WAITING ROOM + LEADERBOARD) */}
        {activeNav === 'arena' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" data-testid="student-arena-section">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-[#13264D] dark:text-slate-100 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Phòng thi đấu Đấu trường Tin học
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    Thầy/cô mở phòng thi đấu sẽ có 5 phút đếm ngược để các em vào phòng chờ, sau đó thầy/cô bấm Bắt đầu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchDashboard}
                  className="min-h-[38px] px-3 rounded-xl border border-[#C6DCF7] dark:border-[#334155] bg-white dark:bg-[#131D31] hover:bg-sky-50 dark:hover:bg-[#1A2742] text-xs font-bold text-[#13264D] dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Làm mới phòng
                </button>
              </div>

              {/* Join Room by Code Bar */}
              <form
                onSubmit={handleJoinArenaByCode}
                className="bg-white dark:bg-[#131D31] border border-[#C6DCF7] dark:border-[#25334D] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-end gap-3 shadow-xs"
              >
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="arena-join-code-input"
                    className="block text-xs font-extrabold text-[#13264D] dark:text-slate-200 mb-1"
                  >
                    Vào nhanh bằng mã phòng (do thầy/cô cung cấp)
                  </label>
                  <input
                    id="arena-join-code-input"
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    placeholder="Nhập mã phòng, ví dụ: 4826"
                    data-testid="input-arena-room-code"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#C6DCF7] dark:border-[#334155] bg-[#F7FBFF] dark:bg-[#1A2742] font-mono font-bold text-base text-[#0F2654] dark:text-slate-100 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={joiningByCode}
                  data-testid="btn-join-arena-by-code"
                  className="min-h-[44px] px-5 rounded-xl bg-[#0166E3] hover:bg-[#025ED6] dark:bg-sky-500 dark:hover:bg-sky-600 disabled:opacity-55 text-white font-display font-extrabold text-sm whitespace-nowrap cursor-pointer"
                >
                  {joiningByCode ? 'Đang tìm phòng...' : 'Vào phòng bằng mã'}
                </button>
              </form>

              {arenaFeedback && (
                <div
                  role="status"
                  className={`p-3.5 rounded-xl border text-sm font-medium ${
                    arenaFeedback.ok
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-200'
                  }`}
                >
                  {arenaFeedback.text}
                </div>
              )}

              <ArenaRoomPanel
                rooms={liveArenaRooms}
                serverNow={arenaServerNow}
                viewerRole="student"
                currentUid={displayUser.uid}
                busyRoomId={busyArenaRoomId}
                onJoinRoom={handleJoinArenaRoom}
                onEnterWaitingRoom={(room) => onEnterArenaRoom(room, arenaServerNow)}
                onLeaveRoom={handleLeaveArenaRoom}
              />
            </div>

            <aside
              className="lg:col-span-4 bg-white dark:bg-[#131D31] border border-[#D8E7F8] dark:border-[#25334D] rounded-2xl p-5 space-y-4"
              data-testid="student-leaderboard"
            >
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <h3 className="font-display font-extrabold text-lg text-[#13264D] dark:text-slate-100">
                  Bảng thi đua tuần {leaderboard?.weekKey ?? ''}
                </h3>
              </div>

              {!leaderboard?.enabled ? (
                <p
                  className="text-xs sm:text-sm text-slate-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4"
                  data-testid="arena-disabled-notice"
                >
                  Bảng xếp hạng XP tuần của lớp {classCode} đang tạm ẩn bởi thầy/cô giáo. Em vẫn có thể tham gia phòng chờ Đấu trường bình thường!
                </p>
              ) : leaderboard.top.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 py-4 text-center">
                  Chưa có bạn nào ghi điểm trong tuần này.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-[#25334D]">
                  {leaderboard.top.map((entry) => {
                    const isMe = entry.uid === displayUser.uid;
                    return (
                      <li
                        key={entry.uid}
                        className={`py-2.5 flex items-center justify-between gap-3 ${
                          isMe ? 'bg-sky-50 dark:bg-sky-950/60 -mx-2 px-2 rounded-xl font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 text-center font-mono font-extrabold text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                            #{entry.rank}
                          </span>
                          <AvatarBadge avatarId={entry.avatarId} size="sm" />
                          <span className="text-sm text-[#13264D] dark:text-slate-100 truncate">
                            {entry.nickname} {isMe && '(Em)'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-sm text-sky-700 dark:text-sky-400 tabular-nums whitespace-nowrap">
                          {entry.weeklyXp} XP
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>
          </section>
        )}

        {/* TAB 4: BADGES */}
        {activeNav === 'badges' && (
          <section className="bg-white dark:bg-[#131D31] border border-[#D8E7F8] dark:border-[#25334D] rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'BADGE_L3_B5', title: 'Tay gõ mười ngón', lesson: 'Lớp 3 · Bài 5' },
                { id: 'BADGE_L4_B5', title: 'Nhà tổ chức tệp tài ba', lesson: 'Lớp 4 · Bài 5' },
                { id: 'BADGE_L5_B4', title: 'Thám tử cây thư mục', lesson: 'Lớp 5 · Bài 4' },
                { id: 'BADGE_CHUNG_PHIM', title: 'Kiện tướng Bàn phím Toàn trường', lesson: 'Phần chung 1' },
                { id: 'BADGE_CHUNG_TEP', title: 'Thủ lĩnh Quản lí Tệp', lesson: 'Phần chung 2' },
                { id: 'BADGE_CHUNG_ANTOAN', title: 'Công dân Số An toàn', lesson: 'Phần chung 3' },
              ].map((b) => {
                const unlocked = displayUser.unlockedBadges.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border space-y-2 ${
                      unlocked
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700/60 text-amber-950 dark:text-amber-100'
                        : 'bg-slate-50 dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div className={unlocked ? '' : 'opacity-45 grayscale'}>
                      <StudentLineIcon name="huy-hieu" sizeClass="w-8 h-8" />
                    </div>
                    <p className="font-display font-bold text-base">{b.title}</p>
                    <p className="text-xs">
                      {b.lesson} · {unlocked ? 'Đã mở khóa' : 'Hoàn thành Thực hành để mở'}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Student Analytics & Charts */}
        {data?.analytics && data.classInfo && (
          <StudentDashboardCharts
            analytics={data.analytics}
            grade={data.classInfo.grade}
            unlockedBadgesCount={displayUser.unlockedBadges.length}
            onOpenLesson={onOpenLesson}
          />
        )}
      </main>

      {/* Logout / Switch Student Confirmation Dialog */}
      {logoutModalMode && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="max-w-sm w-full bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200 dark:border-[#25334D] p-6 space-y-4 shadow-xl">
            <h3 className="font-display font-extrabold text-lg text-[#13264D] dark:text-slate-100">
              {logoutModalMode === 'switch' ? 'Đổi tài khoản học sinh khác?' : 'Em muốn đăng xuất?'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {logoutModalMode === 'switch'
                ? 'Nếu đang dùng chung máy tính ở phòng thực hành, hãy đăng xuất để bạn tiếp theo đăng nhập bằng mã và PIN riêng.'
                : 'Kết quả học tập đã được lưu an toàn. Em có chắc muốn thoát khỏi tài khoản này không?'}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLogoutModalMode(null)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2742] cursor-pointer"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="min-h-[44px] px-5 rounded-xl bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white text-sm font-bold cursor-pointer"
              >
                {logoutModalMode === 'switch' ? 'Đăng xuất để đổi bạn' : 'Đăng xuất'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
