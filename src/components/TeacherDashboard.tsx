import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  KeyRound,
  Lock,
  LogOut,
  MonitorPlay,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Swords,
  Trophy,
  Unlock,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { api, ApiError, type TeacherOverviewData } from '../services/api';
import type { ArenaMode, ArenaRoom, ArenaScope, BranchSelection, ImportPreviewResult } from '../shared/types';
import { ArenaRoomPanel } from './ArenaRoomPanel';
import { AvatarBadge } from './AvatarIcon';
import { ThemeToggle } from './ThemeToggle';

interface TeacherDashboardProps {
  onLoggedOut: () => void;
}

type TeacherTab = 'classes' | 'students' | 'assignments' | 'arena' | 'curriculum' | 'reports' | 'leaderboard';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLoggedOut }) => {
  const [data, setData] = useState<TeacherOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TeacherTab>('classes');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Import Excel/CSV state
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [provisionedPins, setProvisionedPins] = useState<
    Array<{ studentCode: string; fullName: string; classCode: string; pin: string }>
  >([]);

  // One-time PIN modal & Printable slip
  const [oneTimePinModal, setOneTimePinModal] = useState<{
    studentCode: string;
    fullName: string;
    classCode: string;
    pin: string;
  } | null>(null);

  // Edit student modal
  const [editStudent, setEditStudent] = useState<{
    uid: string;
    fullName: string;
    gender: string;
    classId: string;
  } | null>(null);

  // Create assignment form
  const [asgLessonId, setAsgLessonId] = useState('L4-B5');
  const [asgMode, setAsgMode] = useState<'practice' | 'test'>('practice');
  const [asgReveal, setAsgReveal] = useState<'immediate' | 'after_submit' | 'after_due'>('immediate');
  const [asgDueAt, setAsgDueAt] = useState('');

  // Curriculum 51 filter & Add question
  const [gradeFilter, setGradeFilter] = useState<'all' | 3 | 4 | 5>('all');
  const [questionLessonId, setQuestionLessonId] = useState('L4-B5');
  const [qPrompt, setQPrompt] = useState('');
  const [qOpt0, setQOpt0] = useState('');
  const [qOpt1, setQOpt1] = useState('');
  const [qOpt2, setQOpt2] = useState('');
  const [qOpt3, setQOpt3] = useState('');
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qExplanation, setQExplanation] = useState('');

  // Presentation mode
  const [presentationMode, setPresentationMode] = useState(false);
  const [liveProgressTick, setLiveProgressTick] = useState<string | null>(null);

  // Arena room management
  const [liveArenaRooms, setLiveArenaRooms] = useState<ArenaRoom[]>([]);
  const [arenaServerNow, setArenaServerNow] = useState<string | undefined>(undefined);
  const [arenaScope, setArenaScope] = useState<ArenaScope>('class');
  const [arenaMode, setArenaMode] = useState<ArenaMode>('quiz');
  const [arenaItemCount, setArenaItemCount] = useState<number>(10);
  const [arenaMaxParticipants, setArenaMaxParticipants] = useState<number>(30);
  const [arenaLessonId, setArenaLessonId] = useState('L4-B5');
  const [arenaTitle, setArenaTitle] = useState('');
  const [arenaBusyId, setArenaBusyId] = useState<string | null>(null);
  const [creatingArena, setCreatingArena] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.getTeacherOverview();
      setData(res);
      setLiveArenaRooms(res.arenaRooms ?? []);
      setArenaServerNow(res.serverNow);
      if (!selectedClassId && res.classes.length > 0) {
        const preferred = res.classes.find((c) => c.code === '4A2') ?? res.classes[0];
        setSelectedClassId(preferred.id);
      }
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Không thể tải dữ liệu giáo viên.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOverview();
  }, []);

  // Same-origin SSE stream for real-time Arena participant updates
  useEffect(() => {
    const es = new EventSource('/api/sse/arena');
    es.addEventListener('arena_snapshot', (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          rooms: ArenaRoom[];
          serverNow: string;
        };
        setLiveArenaRooms(payload.rooms ?? []);
        setArenaServerNow(payload.serverNow);
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, []);

  // Same-origin SSE stream for live class progress
  useEffect(() => {
    if (!selectedClassId) return;
    const es = new EventSource(`/api/sse/teacher-progress?classId=${encodeURIComponent(selectedClassId)}`);
    es.addEventListener('progress_snapshot', (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          updatedAt: string;
          progress: TeacherOverviewData['progress'];
          students: Array<{ uid: string; totalXp: number; locked: boolean }>;
        };
        setLiveProgressTick(new Date(payload.updatedAt).toLocaleTimeString('vi-VN'));
        setData((prev) => {
          if (!prev) return prev;
          const otherProgress = prev.progress.filter((p) => p.classId !== selectedClassId);
          const updatedStudents = prev.students.map((s) => {
            const match = payload.students.find((ps) => ps.uid === s.uid);
            return match ? { ...s, totalXp: match.totalXp, locked: match.locked } : s;
          });
          return {
            ...prev,
            students: updatedStudents,
            progress: [...otherProgress, ...payload.progress],
          };
        });
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, [selectedClassId]);

  const activeClass = useMemo(
    () => data?.classes.find((c) => c.id === selectedClassId) ?? data?.classes[0],
    [data?.classes, selectedClassId],
  );

  const classStudents = useMemo(
    () => (data?.students ?? []).filter((s) => s.classId === activeClass?.id),
    [activeClass?.id, data?.students],
  );

  const publishedLessons = useMemo(
    () => (data?.lessons ?? []).filter((l) => l.publishStatus === 'published' && l.sourceStatus === 'complete'),
    [data?.lessons],
  );

  const filteredCurriculum = useMemo(() => {
    const all = (data?.lessons ?? []).filter((l) => l.scope !== 'common');
    if (gradeFilter === 'all') return all;
    return all.filter((l) => l.grade === gradeFilter);
  }, [data?.lessons, gradeFilter]);

  const handleCreateArenaRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (arenaScope === 'class' && !activeClass) return;
    setCreatingArena(true);
    setBanner(null);
    try {
      const res = await api.createArenaRoom({
        scope: arenaScope,
        classId: arenaScope === 'class' ? activeClass?.id : undefined,
        lessonId: arenaLessonId,
        title: arenaTitle.trim() || undefined,
        mode: arenaMode,
        itemCount: arenaItemCount,
        maxParticipants: arenaMaxParticipants,
      });
      setArenaTitle('');
      setArenaServerNow(res.serverNow);
      setLiveArenaRooms((prev) => [res.room, ...prev.filter((r) => r.id !== res.room.id)]);
      setBanner({
        ok: true,
        text: `Đã mở phòng Đấu trường ${res.room.roomCode} (${res.room.classCode}) với thời gian chờ 5 phút!`,
      });
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Không thể mở phòng Đấu trường.' });
    } finally {
      setCreatingArena(false);
    }
  };

  const handleStartArenaRoom = async (roomId: string) => {
    setArenaBusyId(roomId);
    setBanner(null);
    try {
      const res = await api.startArenaRoom(roomId);
      setArenaServerNow(res.serverNow);
      setLiveArenaRooms((prev) => prev.map((r) => (r.id === roomId ? res.room : r)));
      setBanner({ ok: true, text: `Đã bấm Bắt đầu thi đấu phòng ${res.room.roomCode}!` });
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Không thể bắt đầu phòng thi đấu.' });
    } finally {
      setArenaBusyId(null);
    }
  };

  const handleCloseArenaRoom = async (roomId: string) => {
    setArenaBusyId(roomId);
    setBanner(null);
    try {
      const res = await api.closeArenaRoom(roomId);
      setArenaServerNow(res.serverNow);
      setLiveArenaRooms((prev) => prev.map((r) => (r.id === roomId ? res.room : r)));
      setBanner({ ok: true, text: `Đã đóng phòng ${res.room.roomCode}.` });
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Không thể đóng phòng.' });
    } finally {
      setArenaBusyId(null);
    }
  };

  const handleToggleLeaderboard = async (classId: string, nextEnabled: boolean) => {
    try {
      await api.updateClassSettings(classId, { leaderboardEnabled: nextEnabled });
      setBanner({
        ok: true,
        text: `Đã ${nextEnabled ? 'BẬT' : 'TẮT'} bảng thi đua cho lớp.`,
      });
      await fetchOverview();
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Lỗi cập nhật lớp.' });
    }
  };

  const handleChangeBranch = async (classId: string, branchSelection: BranchSelection) => {
    try {
      await api.updateClassSettings(classId, { branchSelection });
      setBanner({ ok: true, text: 'Đã cập nhật nhánh SGK cho lớp.' });
      await fetchOverview();
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Lỗi cập nhật nhánh.' });
    }
  };

  const handleResetPin = async (s: TeacherOverviewData['students'][number]) => {
    try {
      const res = await api.resetStudentPin(s.uid);
      setOneTimePinModal({
        studentCode: res.studentCode,
        fullName: s.fullName,
        classCode: res.classCode,
        pin: res.oneTimePin,
      });
      setBanner({ ok: true, text: `Đã cấp lại PIN cho ${s.fullName} và thu hồi phiên đăng nhập cũ.` });
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Không thể cấp lại PIN.' });
    }
  };

  const handleToggleLock = async (s: TeacherOverviewData['students'][number]) => {
    try {
      await api.toggleStudentLock(s.uid, !s.locked);
      setBanner({
        ok: true,
        text: `${!s.locked ? 'Đã khóa' : 'Đã mở khóa'} tài khoản ${s.fullName}.`,
      });
      await fetchOverview();
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Lỗi khóa/mở khóa.' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportBusy(true);
    setBanner(null);
    setProvisionedPins([]);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Content = btoa(binary);
      const preview = await api.previewImport(file.name, base64Content);
      setImportPreview(preview);
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Không thể đọc tệp tải lên.' });
    } finally {
      setImportBusy(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImportBusy(true);
    try {
      const res = await api.confirmImport(importPreview.batchId);
      setProvisionedPins(res.provisionedPins);
      setImportPreview(null);
      setBanner({
        ok: true,
        text: `Nhập danh sách hoàn tất: tạo mới ${res.createdCount} học sinh, cập nhật ${res.updatedCount} học sinh.`,
      });
      await fetchOverview();
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Lỗi xác nhận nhập danh sách.' });
    } finally {
      setImportBusy(false);
    }
  };

  const handlePublishLesson = async (lessonId: string, publishStatus: 'draft' | 'published') => {
    try {
      await api.publishLesson(lessonId, publishStatus);
      setBanner({ ok: true, text: `Đã cập nhật trạng thái bài ${lessonId}.` });
      await fetchOverview();
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Không thể xuất bản bài học.' });
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    const lesson = data?.lessons.find((l) => l.id === asgLessonId);
    try {
      await api.createAssignment({
        classId: activeClass.id,
        lessonId: asgLessonId,
        title: lesson ? `Bài ${lesson.lessonNumber}: ${lesson.title}` : asgLessonId,
        mode: asgMode,
        revealAnswersPolicy: asgReveal,
        dueAt: asgDueAt ? new Date(asgDueAt).toISOString() : null,
      });
      setBanner({ ok: true, text: `Đã giao bài cho lớp ${activeClass.code}.` });
      await fetchOverview();
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Không thể giao bài.' });
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const options = [qOpt0, qOpt1, qOpt2, qOpt3].map((s) => s.trim()).filter(Boolean);
    try {
      await api.addQuestion(questionLessonId, {
        prompt: qPrompt,
        options,
        correctIndex: qCorrectIdx,
        explanation: qExplanation,
      });
      setQPrompt('');
      setQOpt0('');
      setQOpt1('');
      setQOpt2('');
      setQOpt3('');
      setQExplanation('');
      setBanner({ ok: true, text: `Đã thêm câu hỏi mới vào bài ${questionLessonId}.` });
      await fetchOverview();
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Không thể thêm câu hỏi.' });
    }
  };

  const handleReconcile = async () => {
    if (!activeClass) return;
    try {
      await api.reconcileLeaderboard(activeClass.id);
      setBanner({ ok: true, text: `Đã đối soát bảng thi đua lớp ${activeClass.code}.` });
      await fetchOverview();
    } catch (err) {
      setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Lỗi đối soát.' });
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex items-center justify-center p-6">
        <p className="font-display font-bold text-lg text-slate-800 dark:text-slate-100">
          Đang tải bảng điều khiển giáo viên...
        </p>
      </div>
    );
  }

  // Presentation Mode: Strict zero-PII classroom projection view
  if (presentationMode && activeClass && data) {
    const lb = data.leaderboards[activeClass.id];
    const completedTotal = data.progress.filter(
      (p) => p.classId === activeClass.id && p.practiceCompleted,
    ).length;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10 flex flex-col justify-between" data-testid="presentation-mode">
        <div className="max-w-5xl w-full mx-auto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <p className="text-xs font-semibold text-sky-400">Chế độ trình chiếu lớp học · Ẩn toàn bộ dữ liệu cá nhân</p>
              <h1 className="font-display font-extrabold text-3xl text-white mt-1">
                Lớp {activeClass.code} · Thi đua tuần {lb?.weekKey}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setPresentationMode(false)}
              className="min-h-[46px] px-5 rounded-xl bg-white text-slate-900 font-bold text-sm cursor-pointer"
            >
              Thoát trình chiếu
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-sm text-slate-400">Sĩ số lớp</p>
              <p className="font-mono font-extrabold text-4xl text-white mt-2 tabular-nums">
                {classStudents.length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-sm text-slate-400">Lượt hoàn thành Tự làm</p>
              <p className="font-mono font-extrabold text-4xl text-emerald-400 mt-2 tabular-nums">
                {completedTotal}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-sm text-slate-400">Trạng thái Bảng thi đua</p>
              <p className="font-display font-bold text-2xl text-amber-400 mt-2">
                {lb?.enabled ? 'Đang bật' : 'Đang tắt'}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Bảng thi đua biệt danh (Top 10)
            </h2>
            {!lb?.enabled ? (
              <p className="text-slate-400">Bảng thi đua đang tắt. Giáo viên có thể bật trong bảng điều khiển.</p>
            ) : lb.top.length === 0 ? (
              <p className="text-slate-400">Chưa có điểm tuần này.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lb.top.map((entry) => (
                  <div
                    key={entry.uid}
                    className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-extrabold text-xl text-amber-400 w-8 tabular-nums">
                        #{entry.rank}
                      </span>
                      <AvatarBadge avatarId={entry.avatarId} size="md" />
                      <span className="font-display font-bold text-lg text-white">{entry.nickname}</span>
                    </div>
                    <span className="font-mono font-bold text-lg text-sky-400 tabular-nums">
                      {entry.weeklyXp} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white dark:bg-[#131D31] border-b border-slate-200 dark:border-[#25334D] px-4 sm:px-6 py-3.5 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <span className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-display font-extrabold text-sm flex items-center justify-center">
              GV
            </span>
            <span className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100">
              Quản lí Phòng thực hành
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <span className="text-sm text-slate-600 dark:text-slate-300 hidden md:inline">
              {data?.teacher.fullName}
            </span>
            <ThemeToggle variant="header" />
            <button
              type="button"
              onClick={async () => {
                await api.logout();
                onLoggedOut();
              }}
              className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#1A2742] dark:hover:bg-[#233457] dark:border dark:border-[#334155] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs + Class Selector */}
      <div className="bg-white dark:bg-[#131D31] border-b border-slate-200 dark:border-[#25334D] px-4 sm:px-6 py-2.5 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Chức năng giáo viên">
            {[
              { id: 'classes' as const, label: 'Lớp học', icon: ShieldCheck },
              { id: 'students' as const, label: 'Học sinh & Nhập Excel', icon: Users },
              { id: 'assignments' as const, label: 'Giao bài', icon: ClipboardList },
              { id: 'arena' as const, label: `Đấu trường (${liveArenaRooms.filter((r) => r.status !== 'closed').length})`, icon: Swords },
              { id: 'curriculum' as const, label: '51 Mục bài & Câu hỏi', icon: BookMarked },
              { id: 'reports' as const, label: 'Kết quả & Báo cáo', icon: FileSpreadsheet },
              { id: 'leaderboard' as const, label: 'Bảng hạng & Trình chiếu', icon: Trophy },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.id)}
                  className={`min-h-[42px] px-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2742]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="teacher-class-select" className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Lớp đang chọn:
            </label>
            <select
              id="teacher-class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="min-h-[38px] min-w-[180px] pl-3 pr-8 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm font-bold text-slate-900 dark:text-slate-100"
            >
              {data?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Khối {c.grade})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {banner && (
          <div
            role="status"
            className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between gap-3 no-print ${
              banner.ok
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-100'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-700/60 text-rose-950 dark:text-rose-100'
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{banner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-xs font-bold hover:underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* TAB 1: LỚP HỌC */}
        {tab === 'classes' && data && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {data.classes.map((c) => {
              const count = data.students.filter((s) => s.classId === c.id).length;
              return (
                <article
                  key={c.id}
                  className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Khối {c.grade} · Mã lớp {c.code}
                      </p>
                      <h2 className="font-display font-extrabold text-xl text-slate-900 dark:text-slate-100 mt-0.5">
                        {c.name}
                      </h2>
                    </div>
                    <span className="font-mono font-bold text-sm text-sky-700 dark:text-sky-300 tabular-nums">
                      {count} HS
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={`branch-${c.id}`}
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Nhánh sách giáo khoa lựa chọn:
                    </label>
                    <select
                      id={`branch-${c.id}`}
                      value={c.branchSelection}
                      onChange={(e) => handleChangeBranch(c.id, e.target.value as BranchSelection)}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                    >
                      {c.grade === 5 ? (
                        <>
                          <option value="branchA">Phương án A: Bài 8A–9A (Phần mềm đồ họa)</option>
                          <option value="branchB">Phương án B: Bài 8B–9B (Tạo sản phẩm thủ công)</option>
                        </>
                      ) : (
                        <>
                          <option value="12A">Nhánh 12A: Sử dụng phần mềm máy tính</option>
                          <option value="12B">Nhánh 12B: Lắp ghép mô hình / đồ chơi</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-[#25334D] flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Bảng thi đua: {c.leaderboardEnabled ? 'Đang bật' : 'Đang tắt'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleLeaderboard(c.id, !c.leaderboardEnabled)}
                      className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold cursor-pointer ${
                        c.leaderboardEnabled
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-slate-200 dark:bg-[#1A2742] text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-[#233457] dark:border dark:border-[#334155]'
                      }`}
                    >
                      {c.leaderboardEnabled ? 'Tắt bảng hạng' : 'Bật bảng hạng'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* TAB 2: HỌC SINH & NHẬP EXCEL/CSV */}
        {tab === 'students' && activeClass && (
          <div className="space-y-6">
            {/* Import Panel */}
            <section className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-4 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                    Nhập danh sách học sinh từ Excel (.xlsx) hoặc CSV UTF-8
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    Cột PIN nên định dạng Text (&ldquo;@&rdquo;) để giữ số 0 đầu (ví dụ 012345). Để trống cột PIN nếu muốn hệ thống tự sinh.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/api/teacher/students/sample-xlsx"
                    className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1A2742] hover:bg-slate-100 dark:hover:bg-[#233457] text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Tải file mẫu .xlsx
                  </a>
                  <a
                    href="/api/teacher/students/sample-csv"
                    className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1A2742] hover:bg-slate-100 dark:hover:bg-[#233457] text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Tải file mẫu .csv
                  </a>
                  <label className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {importBusy ? 'Đang đọc...' : 'Tải lên Excel / CSV'}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {importPreview && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#25334D] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm space-x-3 tabular-nums text-slate-800 dark:text-slate-200">
                      <strong>Tệp: {importPreview.fileName}</strong>
                      <span>· Tổng: {importPreview.totalRows}</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                        · Hợp lệ: {importPreview.validCount}
                      </span>
                      <span className="text-rose-700 dark:text-rose-300 font-bold">
                        · Lỗi: {importPreview.errorCount}
                      </span>
                      <span>· Tạo mới: {importPreview.createCount}</span>
                      <span>· Cập nhật: {importPreview.updateCount}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setImportPreview(null)}
                        className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#131D31] text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={!importPreview.canConfirm || importBusy}
                        onClick={handleConfirmImport}
                        className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                      >
                        Xác nhận nhập {importPreview.validCount} dòng hợp lệ
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-[#25334D] text-slate-600 dark:text-slate-300">
                          <th className="py-2 pr-3">Dòng</th>
                          <th className="py-2 pr-3">Mã HS</th>
                          <th className="py-2 pr-3">Họ và tên</th>
                          <th className="py-2 pr-3">Lớp</th>
                          <th className="py-2 pr-3">PIN</th>
                          <th className="py-2 pr-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#25334D]">
                        {importPreview.rows.map((r) => (
                          <tr
                            key={r.rowNumber}
                            className={
                              r.action === 'error'
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200'
                                : 'text-slate-800 dark:text-slate-200'
                            }
                          >
                            <td className="py-2 pr-3 font-mono tabular-nums">{r.rowNumber}</td>
                            <td className="py-2 pr-3 font-mono font-bold">{r.studentCode}</td>
                            <td className="py-2 pr-3">{r.fullName}</td>
                            <td className="py-2 pr-3 font-mono">{r.classCode}</td>
                            <td className="py-2 pr-3 font-mono">
                              {r.pinAutoGenerated ? 'Tự sinh 6 số' : r.pinMasked}
                            </td>
                            <td className="py-2 pr-3">
                              {r.action === 'error' ? (
                                <span className="text-rose-700 dark:text-rose-300 font-semibold">
                                  {r.errors.join(' ')}
                                </span>
                              ) : (
                                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                  {r.action === 'create' ? 'Tạo mới' : 'Cập nhật'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {provisionedPins.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 space-y-3 print:bg-white print:border-slate-300">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-amber-950 dark:text-amber-100 print:text-slate-900">
                      Mã PIN hiển thị một lần cho các tài khoản mới tạo ({provisionedPins.length} học sinh)
                    </p>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="min-h-[38px] px-3.5 rounded-xl bg-slate-900 dark:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer no-print"
                    >
                      <Printer className="w-4 h-4" />
                      In phiếu vào lớp
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {provisionedPins.map((p) => (
                      <div
                        key={p.studentCode}
                        className="p-3 rounded-xl bg-white dark:bg-[#131D31] border border-amber-200 dark:border-amber-700/50 text-xs print:bg-white print:border-slate-300"
                      >
                        <p className="font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
                          {p.fullName}
                        </p>
                        <p className="font-mono text-slate-700 dark:text-slate-300 print:text-slate-800 mt-0.5">
                          Lớp: {p.classCode} · Mã: {p.studentCode} · PIN: <strong>{p.pin}</strong>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Student list table */}
            <section className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Danh sách học sinh {activeClass.name} ({classStudents.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#25334D] text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 pr-4">Mã HS</th>
                      <th className="py-2.5 pr-4">Họ và tên</th>
                      <th className="py-2.5 pr-4">Biệt danh bảng hạng</th>
                      <th className="py-2.5 pr-4 text-right">Tổng XP</th>
                      <th className="py-2.5 pr-4">Trạng thái</th>
                      <th className="py-2.5 text-right no-print">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#25334D]">
                    {classStudents.map((s) => (
                      <tr key={s.uid} className="hover:bg-slate-50 dark:hover:bg-[#1A2742]">
                        <td className="py-3 pr-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {s.studentCode}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">{s.fullName}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{s.nickname}</td>
                        <td className="py-3 pr-4 text-right font-mono font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                          {s.totalXp}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`text-xs font-bold ${
                              s.locked
                                ? 'text-rose-700 dark:text-rose-300'
                                : 'text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {s.locked ? 'Đã khóa' : 'Hoạt động'}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2 whitespace-nowrap no-print">
                          <button
                            type="button"
                            onClick={() =>
                              setEditStudent({
                                uid: s.uid,
                                fullName: s.fullName,
                                gender: s.gender || '',
                                classId: s.classId || activeClass.id,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#233457] cursor-pointer"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPin(s)}
                            className="px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-700/60 bg-sky-50 dark:bg-sky-950/60 text-xs font-bold text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/60 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Cấp lại PIN
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLock(s)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#233457] inline-flex items-center gap-1 cursor-pointer"
                          >
                            {s.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            {s.locked ? 'Mở khóa' : 'Khóa'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: GIAO BÀI */}
        {tab === 'assignments' && activeClass && data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleCreateAssignment}
              className="lg:col-span-5 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Giao bài mới cho lớp {activeClass.code}
              </h2>
              <div>
                <label htmlFor="asg-lesson" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn bài đã xuất bản (đủ trang SGK):
                </label>
                <select
                  id="asg-lesson"
                  value={asgLessonId}
                  onChange={(e) => setAsgLessonId(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                >
                  {publishedLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.scope === 'common'
                        ? `Phần chung · ${l.lessonNumber}: ${l.title}`
                        : `Lớp ${l.grade} · Bài ${l.lessonNumber}: ${l.title} (${l.pageRange})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="asg-mode" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chế độ
                  </label>
                  <select
                    id="asg-mode"
                    value={asgMode}
                    onChange={(e) => setAsgMode(e.target.value as 'practice' | 'test')}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="practice">Luyện tập (mở gợi ý)</option>
                    <option value="test">Kiểm tra</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="asg-reveal" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hiện lời giải Đố vui
                  </label>
                  <select
                    id="asg-reveal"
                    value={asgReveal}
                    onChange={(e) => setAsgReveal(e.target.value as typeof asgReveal)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="immediate">Ngay khi nộp</option>
                    <option value="after_submit">Sau khi nộp</option>
                    <option value="after_due">Sau hạn nộp</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="asg-due" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hạn nộp (tùy chọn):
                </label>
                <input
                  id="asg-due"
                  type="datetime-local"
                  value={asgDueAt}
                  onChange={(e) => setAsgDueAt(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Giao bài cho lớp {activeClass.code}
              </button>
            </form>

            <section className="lg:col-span-7 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Bài đã giao cho lớp {activeClass.code}
              </h2>
              <div className="space-y-3">
                {data.assignments
                  .filter((a) => a.classId === activeClass.id)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-[#25334D] bg-slate-50 dark:bg-[#1A2742]"
                    >
                      <p className="font-bold text-slate-900 dark:text-slate-100">{a.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Mã bài: {a.lessonId} · Chế độ: {a.mode === 'test' ? 'Kiểm tra' : 'Luyện tập'} · Mở lời giải: {a.revealAnswersPolicy}
                        {a.dueAt ? ` · Hạn: ${new Date(a.dueAt).toLocaleString('vi-VN')}` : ' · Không giới hạn'}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 3B: ĐẤU TRƯỜNG (MỞ PHÒNG CHỜ 5 PHÚT & BẮT ĐẦU) */}
        {tab === 'arena' && activeClass && data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" data-testid="teacher-arena-tab">
            <form
              onSubmit={handleCreateArenaRoom}
              className="lg:col-span-4 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Swords className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Mở phòng Đấu trường mới
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Khi mở bài, hệ thống tự động tạo phòng chờ đếm ngược <strong>5 phút (05:00)</strong> để học sinh tham gia, sau đó thầy/cô bấm <strong>Bắt đầu thi đấu</strong>.
              </p>

              <div>
                <label htmlFor="arena-scope" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phạm vi tham gia
                </label>
                <select
                  id="arena-scope"
                  value={arenaScope}
                  onChange={(e) => setArenaScope(e.target.value as ArenaScope)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="class">Riêng lớp {activeClass.code} (Khối {activeClass.grade})</option>
                  <option value="shared">Chung cả 3 khối phụ trách ({data.classes.map((c) => c.code).join(', ')})</option>
                </select>
              </div>

              <div>
                <label htmlFor="arena-lesson" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn bài học / chuyên đề thi đấu
                </label>
                <select
                  id="arena-lesson"
                  value={arenaLessonId}
                  onChange={(e) => setArenaLessonId(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                >
                  {publishedLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.scope === 'common'
                        ? `Phần chung · ${l.lessonNumber}: ${l.title}`
                        : `Lớp ${l.grade} · Bài ${l.lessonNumber}: ${l.title}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="arena-mode" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chế độ thi
                  </label>
                  <select
                    id="arena-mode"
                    value={arenaMode}
                    onChange={(e) => {
                      const nextMode = e.target.value as ArenaMode;
                      setArenaMode(nextMode);
                      setArenaItemCount(nextMode === 'game' ? 5 : 10);
                    }}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="quiz">Thi trắc nghiệm</option>
                    <option value="game">Trò chơi</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="arena-item-count" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {arenaMode === 'game' ? 'Số lượt chơi' : 'Số câu hỏi'}
                  </label>
                  <input
                    id="arena-item-count"
                    type="number"
                    min={1}
                    max={20}
                    value={arenaItemCount}
                    onChange={(e) => setArenaItemCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="arena-max-participants" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sĩ số tối đa
                  </label>
                  <input
                    id="arena-max-participants"
                    type="number"
                    min={2}
                    max={50}
                    value={arenaMaxParticipants}
                    onChange={(e) => setArenaMaxParticipants(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="arena-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên phòng thi đấu (tùy chọn)
                </label>
                <input
                  id="arena-title"
                  type="text"
                  value={arenaTitle}
                  onChange={(e) => setArenaTitle(e.target.value)}
                  placeholder="Ví dụ: Đấu trường Tuần 12 - Thao tác tệp"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={creatingArena}
                data-testid="btn-create-arena"
                className="w-full min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {creatingArena ? 'Đang mở phòng...' : 'Mở phòng chờ 5 phút'}
              </button>
            </form>

            <section className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                  Danh sách phòng Đấu trường ({liveArenaRooms.length})
                </h3>
                <button
                  type="button"
                  onClick={fetchOverview}
                  className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#131D31] hover:bg-slate-50 dark:hover:bg-[#1A2742] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Làm mới
                </button>
              </div>

              <ArenaRoomPanel
                rooms={liveArenaRooms}
                serverNow={arenaServerNow}
                viewerRole="teacher"
                currentUid={data.teacher.uid}
                busyRoomId={arenaBusyId}
                onStartRoom={handleStartArenaRoom}
                onCloseRoom={handleCloseArenaRoom}
              />
            </section>
          </div>
        )}

        {/* TAB 4: 51 MỤC BÀI SGK & NGÂN HÀNG CÂU HỎI */}
        {tab === 'curriculum' && data && (
          <div className="space-y-6">
            <section className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                    Danh mục 51 mục bài SGK Kết nối tri thức (Lớp 3, 4, 5)
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Bài thiếu trang SGK (&ldquo;Một phần&rdquo; / &ldquo;Chỉ mục lục&rdquo;) bị khóa ở trạng thái Bản nháp và không thể xuất bản cho học sinh.
                  </p>
                </div>
                <div className="flex gap-1.5 bg-slate-100 dark:bg-[#1A2742] p-1 rounded-xl">
                  {(['all', 3, 4, 5] as const).map((g) => (
                    <button
                      key={String(g)}
                      type="button"
                      onClick={() => setGradeFilter(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        gradeFilter === g
                          ? 'bg-white dark:bg-sky-600 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {g === 'all' ? 'Tất cả (51)' : `Lớp ${g}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#25334D] text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3">Mã</th>
                      <th className="py-2 pr-3">Bài học &amp; Chủ đề</th>
                      <th className="py-2 pr-3">Trang SGK</th>
                      <th className="py-2 pr-3">Đối chiếu nguồn</th>
                      <th className="py-2 pr-3">Trạng thái</th>
                      <th className="py-2 text-right">Xuất bản</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#25334D]">
                    {filteredCurriculum.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2.5 pr-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {l.id}
                        </td>
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            Bài {l.lessonNumber}: {l.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{l.topic}</p>
                        </td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {l.pageRange}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span
                            className={`text-xs font-bold ${
                              l.sourceStatus === 'complete'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : l.sourceStatus === 'partial'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {l.sourceStatus === 'complete'
                              ? 'Đủ nội dung'
                              : l.sourceStatus === 'partial'
                                ? 'Một phần (thiếu trang)'
                                : 'Chỉ mục lục'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span
                            className={`text-xs font-bold ${
                              l.publishStatus === 'published'
                                ? 'text-sky-700 dark:text-sky-300'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {l.publishStatus === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              handlePublishLesson(l.id, l.publishStatus === 'published' ? 'draft' : 'published')
                            }
                            className="px-3 py-1 rounded-lg border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2742] cursor-pointer"
                          >
                            {l.publishStatus === 'published' ? 'Chuyển nháp' : 'Xuất bản'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Add Quiz Question */}
            <form
              onSubmit={handleAddQuestion}
              className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Thêm câu hỏi Đố vui vào ngân hàng bài học
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="q-lesson" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bài học
                  </label>
                  <select
                    id="q-lesson"
                    value={questionLessonId}
                    onChange={(e) => setQuestionLessonId(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                  >
                    {['L3-B5', 'L4-B5', 'L5-B4'].map((id) => (
                      <option key={id} value={id}>
                        {id} ({data.questionBank[id]?.length ?? 0} câu hiện có)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="q-correct" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Đáp án đúng (0–3)
                  </label>
                  <select
                    id="q-correct"
                    value={qCorrectIdx}
                    onChange={(e) => setQCorrectIdx(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value={0}>Phương án A (1)</option>
                    <option value={1}>Phương án B (2)</option>
                    <option value={2}>Phương án C (3)</option>
                    <option value={3}>Phương án D (4)</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="q-prompt" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung câu hỏi
                </label>
                <input
                  id="q-prompt"
                  type="text"
                  value={qPrompt}
                  onChange={(e) => setQPrompt(e.target.value)}
                  placeholder="Ví dụ: Phím nào có gờ nổi bên tay trái?"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={qOpt0}
                  onChange={(e) => setQOpt0(e.target.value)}
                  placeholder="Phương án A"
                  aria-label="Phương án A"
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={qOpt1}
                  onChange={(e) => setQOpt1(e.target.value)}
                  placeholder="Phương án B"
                  aria-label="Phương án B"
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={qOpt2}
                  onChange={(e) => setQOpt2(e.target.value)}
                  placeholder="Phương án C"
                  aria-label="Phương án C"
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={qOpt3}
                  onChange={(e) => setQOpt3(e.target.value)}
                  placeholder="Phương án D"
                  aria-label="Phương án D"
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label htmlFor="q-exp" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lời giải thích cho học sinh
                </label>
                <input
                  id="q-exp"
                  type="text"
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Giải thích ngắn gọn dựa theo SGK..."
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold cursor-pointer"
              >
                Lưu câu hỏi mới
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: KẾT QUẢ & BÁO CÁO */}
        {tab === 'reports' && activeClass && data && (
          <section className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                  Theo dõi tiến độ trực tiếp · {activeClass.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cập nhật qua kênh SSE nội bộ {liveProgressTick ? `· Đồng bộ lúc ${liveProgressTick}` : ''}
                </p>
              </div>
              <a
                href={`/api/teacher/reports/export.xlsx?classId=${encodeURIComponent(activeClass.id)}`}
                className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất báo cáo Excel (.xlsx)
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#25334D] text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-4">Mã HS</th>
                    <th className="py-2 pr-4">Họ và tên</th>
                    <th className="py-2 pr-4 text-right">Tổng XP</th>
                    <th className="py-2 pr-4 text-right">Bài Tự làm đạt</th>
                    <th className="py-2 pr-4 text-right">Đố vui cao nhất</th>
                    <th className="py-2">Chủ đề cần ôn thêm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#25334D]">
                  {classStudents.map((s) => {
                    const progs = data.progress.filter((p) => p.uid === s.uid);
                    const doneCount = progs.filter((p) => p.practiceCompleted).length;
                    const bestQuiz = progs.reduce((m, p) => Math.max(m, p.quizBestPercent ?? 0), 0);
                    const weak = progs.flatMap((p) => p.weakTopics).slice(0, 2);
                    return (
                      <tr key={s.uid} className="hover:bg-slate-50 dark:hover:bg-[#1A2742]">
                        <td className="py-3 pr-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {s.studentCode}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">{s.fullName}</td>
                        <td className="py-3 pr-4 text-right font-mono font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                          {s.totalXp}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                          {doneCount}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                          {bestQuiz}%
                        </td>
                        <td className="py-3 text-xs text-slate-600 dark:text-slate-300">
                          {weak.length > 0 ? weak.join('; ') : 'Đạt yêu cầu'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 6: BẢNG HẠNG & TRÌNH CHIẾU */}
        {tab === 'leaderboard' && activeClass && data && (
          <section className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                  Bảng thi đua tuần {data.leaderboards[activeClass.id]?.weekKey} · {activeClass.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Mặc định TẮT. Chỉ hiển thị biệt danh và hạng cạnh tranh chuẩn (1, 1, 3).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleLeaderboard(activeClass.id, !activeClass.leaderboardEnabled)}
                  className={`min-h-[42px] px-4 rounded-xl text-xs font-bold cursor-pointer ${
                    activeClass.leaderboardEnabled
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-900 dark:bg-[#1A2742] text-white hover:bg-slate-800 dark:hover:bg-[#233457] dark:border dark:border-[#334155]'
                  }`}
                >
                  {activeClass.leaderboardEnabled ? 'Đang BẬT (bấm để Tắt)' : 'Đang TẮT (bấm để Bật)'}
                </button>
                <button
                  type="button"
                  onClick={handleReconcile}
                  className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1A2742] hover:bg-slate-50 dark:hover:bg-[#233457] text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Đối soát điểm tuần
                </button>
                <button
                  type="button"
                  onClick={() => setPresentationMode(true)}
                  className="min-h-[42px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <MonitorPlay className="w-4 h-4" />
                  Chế độ trình chiếu
                </button>
              </div>
            </div>

            {data.leaderboards[activeClass.id]?.top.length ? (
              <div className="divide-y divide-slate-100 dark:divide-[#25334D] border border-slate-200 dark:border-[#25334D] rounded-xl overflow-hidden">
                {data.leaderboards[activeClass.id].top.map((e) => (
                  <div
                    key={e.uid}
                    className="px-4 py-3 flex items-center justify-between bg-white dark:bg-[#1A2742]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-extrabold text-base text-slate-700 dark:text-slate-300 w-7 tabular-nums">
                        #{e.rank}
                      </span>
                      <AvatarBadge avatarId={e.avatarId} size="sm" />
                      <span className="font-bold text-slate-900 dark:text-slate-100">{e.nickname}</span>
                    </div>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                      {e.weeklyXp} XP
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300 py-4">
                {activeClass.leaderboardEnabled
                  ? 'Chưa có học sinh nào ghi điểm tuần này.'
                  : 'Bảng thi đua đang tắt cho lớp này.'}
              </p>
            )}
          </section>
        )}
      </main>

      {/* One-time PIN modal & Printable Login Slip */}
      {oneTimePinModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200 dark:border-[#25334D] p-6 space-y-4 shadow-xl print:bg-white print:border-0 print:shadow-none">
            <div className="flex items-center justify-between no-print">
              <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Phiếu cấp lại PIN (chỉ hiển thị 1 lần)
              </h3>
              <button
                type="button"
                onClick={() => setOneTimePinModal(null)}
                aria-label="Đóng phiếu PIN"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2742] text-slate-500 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-[#334155] bg-slate-50 dark:bg-[#1A2742] space-y-1.5 text-sm text-slate-800 dark:text-slate-200 print:bg-white print:text-slate-900 print:border-slate-400">
              <p className="font-display font-bold text-base text-slate-900 dark:text-slate-100 print:text-slate-900">
                PHIẾU ĐĂNG NHẬP TIN HỌC
              </p>
              <p>Học sinh: <strong>{oneTimePinModal.fullName}</strong></p>
              <p className="font-mono">Mã lớp: <strong>{oneTimePinModal.classCode}</strong></p>
              <p className="font-mono">Mã học sinh: <strong>{oneTimePinModal.studentCode}</strong></p>
              <p className="font-mono text-lg text-sky-800 dark:text-sky-300 print:text-slate-900 pt-1">
                Mã PIN mới: <strong>{oneTimePinModal.pin}</strong>
              </p>
            </div>
            <div className="flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1A2742] flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                In phiếu
              </button>
              <button
                type="button"
                onClick={() => setOneTimePinModal(null)}
                className="min-h-[42px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold cursor-pointer"
              >
                Đã ghi nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && data && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/75 flex items-center justify-center p-4"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.updateStudentProfile(editStudent.uid, {
                  fullName: editStudent.fullName,
                  gender: editStudent.gender,
                  classId: editStudent.classId,
                });
                setEditStudent(null);
                setBanner({ ok: true, text: 'Đã cập nhật hồ sơ học sinh.' });
                await fetchOverview();
              } catch (err) {
                setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Lỗi cập nhật.' });
              }
            }}
            className="max-w-md w-full bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200 dark:border-[#25334D] p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-100">
              Sửa thông tin học sinh
            </h3>
            <div>
              <label htmlFor="edit-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên
              </label>
              <input
                id="edit-name"
                type="text"
                value={editStudent.fullName}
                onChange={(e) => setEditStudent({ ...editStudent, fullName: e.target.value })}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-gender" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Giới tính
                </label>
                <input
                  id="edit-gender"
                  type="text"
                  value={editStudent.gender}
                  onChange={(e) => setEditStudent({ ...editStudent, gender: e.target.value })}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="edit-class" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chuyển lớp
                </label>
                <select
                  id="edit-class"
                  value={editStudent.classId}
                  onChange={(e) => setEditStudent({ ...editStudent, classId: e.target.value })}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-sm text-slate-900 dark:text-slate-100"
                >
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1A2742] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
