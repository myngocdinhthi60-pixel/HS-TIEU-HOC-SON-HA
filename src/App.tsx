import { useCallback, useEffect, useState } from 'react';
import { api, type ClientUser } from './services/api';
import type { ArenaRoom, LessonStage } from './shared/types';
import { ArenaWaitingRoom } from './components/ArenaWaitingRoom';
import { LandingPage } from './components/LandingPage';
import { LessonPlayer } from './components/LessonPlayer';
import { LoginView } from './components/LoginView';
import { StudentHome } from './components/StudentHome';
import { TeacherDashboard } from './components/TeacherDashboard';

type AppRoute = '/' | '/dang-nhap/hoc-sinh' | '/dang-nhap/giao-vien';

type PendingIntent =
  | { type: 'lesson'; lessonId: string; title: string; classHint: string }
  | { type: 'arena' }
  | null;

const LESSON_META: Record<string, { title: string; classHint: string; demoHint: string }> = {
  'L3-B5': {
    title: 'Lớp 3 · Sử dụng bàn phím',
    classHint: '3A1',
    demoHint: 'gợi ý Lớp 3A1: mã HS301 · PIN 024680',
  },
  'L4-B5': {
    title: 'Lớp 4 · Thao tác với tệp và thư mục',
    classHint: '4A2',
    demoHint: 'gợi ý Lớp 4A2: mã HS001 · PIN 012345',
  },
  'L5-B4': {
    title: 'Lớp 5 · Cây thư mục',
    classHint: '5A1',
    demoHint: 'gợi ý Lớp 5A1: mã HS501 · PIN 055667',
  },
};

function readRouteFromLocation(): AppRoute {
  if (typeof window === 'undefined') return '/';
  const p = window.location.pathname;
  if (p === '/dang-nhap/hoc-sinh') return '/dang-nhap/hoc-sinh';
  if (p === '/dang-nhap/giao-vien') return '/dang-nhap/giao-vien';
  return '/';
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [routePath, setRoutePath] = useState<AppRoute>(() => readRouteFromLocation());
  const [user, setUser] = useState<ClientUser | null>(null);
  const [activeLesson, setActiveLesson] = useState<{ lessonId: string; stage?: LessonStage } | null>(null);
  const [activeArena, setActiveArena] = useState<{
    roomId: string;
    initialRoom?: ArenaRoom | null;
    serverNow?: string;
  } | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent>(null);
  const [focusArena, setFocusArena] = useState(false);
  const [lowSpec2D, setLowSpec2D] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('lowSpec2D') === '1') return true;
      }
      return localStorage.getItem('ph_low_spec_2d') === '1';
    } catch {
      return false;
    }
  });
  const [revokedNotice, setRevokedNotice] = useState<string | null>(null);

  const navigateTo = useCallback((nextPath: AppRoute) => {
    setRoutePath(nextPath);
    if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoutePath(readRouteFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Restore session + active Arena room across F5 / tab reopen via HttpOnly cookie -> /api/auth/session
  useEffect(() => {
    let active = true;
    api
      .getSession()
      .then((res) => {
        if (!active) return;
        const sessionUser = res.authenticated ? res.user : null;
        setUser(sessionUser);
        if (sessionUser && sessionUser.role === 'student') {
          try {
            const urlRoomId = new URLSearchParams(window.location.search).get('arenaRoom');
            const storedRoomId = sessionStorage.getItem(`ph_arena_room_${sessionUser.uid}`);
            const restoreId = urlRoomId || storedRoomId;
            if (restoreId) {
              setActiveArena({ roomId: restoreId, initialRoom: null });
            }
          } catch {
            // ignore storage errors
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const persistActiveArena = useCallback((uid: string | undefined, roomId: string | null) => {
    try {
      if (uid) {
        if (roomId) sessionStorage.setItem(`ph_arena_room_${uid}`, roomId);
        else sessionStorage.removeItem(`ph_arena_room_${uid}`);
      }
      const url = new URL(window.location.href);
      if (roomId) url.searchParams.set('arenaRoom', roomId);
      else url.searchParams.delete('arenaRoom');
      window.history.replaceState(null, '', url.pathname + url.search);
    } catch {
      // ignore URL/storage restrictions
    }
  }, []);

  const handleToggleLowSpec2D = () => {
    setLowSpec2D((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ph_low_spec_2d', next ? '1' : '0');
      } catch {
        // ignore storage restrictions
      }
      return next;
    });
  };

  const handleSessionRevoked = useCallback(
    (reason: string) => {
      persistActiveArena(user?.uid, null);
      setActiveLesson(null);
      setActiveArena(null);
      setFocusArena(false);
      setUser(null);
      setRevokedNotice(reason);
      navigateTo('/dang-nhap/hoc-sinh');
    },
    [navigateTo, persistActiveArena, user?.uid],
  );

  const handleSelectLessonFromLanding = (lessonId: string) => {
    if (user && user.role === 'student') {
      setFocusArena(false);
      setActiveLesson({ lessonId, stage: 'watch' });
      return;
    }
    const meta = LESSON_META[lessonId];
    setPendingIntent({
      type: 'lesson',
      lessonId,
      title: meta?.title ?? lessonId,
      classHint: meta?.classHint ?? '4A2',
    });
    setRevokedNotice(null);
    navigateTo('/dang-nhap/hoc-sinh');
  };

  const handleEnterArenaFromLanding = () => {
    if (user && user.role === 'student') {
      setActiveLesson(null);
      setFocusArena(true);
      return;
    }
    setPendingIntent({ type: 'arena' });
    setRevokedNotice(null);
    navigateTo('/dang-nhap/hoc-sinh');
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#F3F7FD] dark:bg-[#0B1220] flex items-center justify-center p-6">
        <p className="font-display font-bold text-lg text-[#13264D] dark:text-slate-100">
          Đang khởi động Phòng thực hành Tin học 3, 4, 5...
        </p>
      </div>
    );
  }

  if (!user) {
    if (routePath === '/') {
      return (
        <LandingPage
          user={null}
          lowSpec2D={lowSpec2D}
          onNavigateStudentLogin={() => {
            setPendingIntent(null);
            setRevokedNotice(null);
            navigateTo('/dang-nhap/hoc-sinh');
          }}
          onNavigateTeacherLogin={() => {
            setPendingIntent(null);
            setRevokedNotice(null);
            navigateTo('/dang-nhap/giao-vien');
          }}
          onSelectLesson={handleSelectLessonFromLanding}
          onEnterArena={handleEnterArenaFromLanding}
          onReturnWorkspace={() => undefined}
        />
      );
    }

    const pendingNotice =
      pendingIntent?.type === 'lesson'
        ? `Em hãy đăng nhập tài khoản học sinh để mở bài "${pendingIntent.title}" (${LESSON_META[pendingIntent.lessonId]?.demoHint ?? 'xem tài khoản mẫu bên dưới'}).`
        : pendingIntent?.type === 'arena'
          ? 'Em hãy đăng nhập bằng tài khoản học sinh để vào Đấu trường và bảng xếp hạng của lớp nhé.'
          : null;

    return (
      <div>
        {revokedNotice && (
          <div
            role="alert"
            className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-800 px-4 py-3 text-center text-sm font-semibold text-amber-950 dark:text-amber-100"
          >
            {revokedNotice}
          </div>
        )}
        <LoginView
          initialRole={routePath === '/dang-nhap/giao-vien' ? 'teacher' : 'student'}
          pendingNotice={pendingNotice}
          preferredClassCode={pendingIntent?.type === 'lesson' ? pendingIntent.classHint : null}
          onBackHome={() => {
            setPendingIntent(null);
            setRevokedNotice(null);
            navigateTo('/');
          }}
          onLoggedIn={(loggedUser) => {
            setRevokedNotice(null);
            setUser(loggedUser);
            if (loggedUser.role === 'student') {
              if (pendingIntent?.type === 'lesson') {
                setActiveLesson({ lessonId: pendingIntent.lessonId, stage: 'watch' });
                setFocusArena(false);
              } else if (pendingIntent?.type === 'arena') {
                setActiveLesson(null);
                setFocusArena(true);
              } else {
                setActiveLesson(null);
                setFocusArena(false);
              }
            } else {
              setActiveLesson(null);
              setFocusArena(false);
            }
            setPendingIntent(null);
            navigateTo('/');
          }}
        />
      </div>
    );
  }

  if (user.role === 'teacher' || user.role === 'admin') {
    return (
      <TeacherDashboard
        onLoggedOut={() => {
          setUser(null);
          setActiveLesson(null);
          setPendingIntent(null);
          setFocusArena(false);
          navigateTo('/');
        }}
      />
    );
  }

  if (activeArena) {
    return (
      <ArenaWaitingRoom
        roomId={activeArena.roomId}
        initialRoom={activeArena.initialRoom}
        initialServerNow={activeArena.serverNow}
        currentUid={user.uid}
        lowSpec2D={lowSpec2D}
        onExitToLobby={() => {
          persistActiveArena(user.uid, null);
          setActiveArena(null);
          setFocusArena(true);
        }}
        onSessionRevoked={handleSessionRevoked}
      />
    );
  }

  if (activeLesson) {
    return (
      <LessonPlayer
        lessonId={activeLesson.lessonId}
        initialStage={activeLesson.stage}
        lowSpec2D={lowSpec2D}
        onToggleLowSpec2D={handleToggleLowSpec2D}
        onBackHome={() => {
          setActiveLesson(null);
          setFocusArena(false);
        }}
        onUserUpdated={(updated) => setUser(updated)}
      />
    );
  }

  return (
    <StudentHome
      user={user}
      lowSpec2D={lowSpec2D}
      focusArena={focusArena}
      onToggleLowSpec2D={handleToggleLowSpec2D}
      onOpenLesson={(lessonId, stage) => {
        persistActiveArena(user.uid, null);
        setActiveArena(null);
        setFocusArena(false);
        setActiveLesson({ lessonId, stage });
      }}
      onEnterArenaRoom={(room, serverNow) => {
        setActiveLesson(null);
        setFocusArena(true);
        persistActiveArena(user.uid, room.id);
        setActiveArena({ roomId: room.id, initialRoom: room, serverNow });
      }}
      onLoggedOut={() => {
        persistActiveArena(user.uid, null);
        setUser(null);
        setActiveLesson(null);
        setActiveArena(null);
        setPendingIntent(null);
        setFocusArena(false);
        navigateTo('/');
      }}
      onSessionRevoked={handleSessionRevoked}
    />
  );
}
