import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  Swords,
  Users,
  XCircle,
} from 'lucide-react';
import { computeArenaCountdown, countReadyParticipants, isArenaRoomFull } from '../shared/arenaLogic';
import type { ArenaRoom } from '../shared/types';
import { AvatarBadge } from './AvatarIcon';

interface ArenaRoomPanelProps {
  rooms: ArenaRoom[];
  serverNow?: string;
  viewerRole: 'student' | 'teacher';
  currentUid: string;
  busyRoomId?: string | null;
  onJoinRoom?: (roomId: string) => void;
  onEnterWaitingRoom?: (room: ArenaRoom) => void;
  onLeaveRoom?: (roomId: string) => void;
  onStartRoom?: (roomId: string) => void;
  onCloseRoom?: (roomId: string) => void;
}

export const ArenaRoomPanel: React.FC<ArenaRoomPanelProps> = ({
  rooms,
  serverNow,
  viewerRole,
  currentUid,
  busyRoomId,
  onJoinRoom,
  onEnterWaitingRoom,
  onLeaveRoom,
  onStartRoom,
  onCloseRoom,
}) => {
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (serverNow) {
      const parsed = new Date(serverNow).getTime();
      if (!Number.isNaN(parsed)) {
        setClockOffsetMs(parsed - Date.now());
      }
    }
  }, [serverNow]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now() + clockOffsetMs);
    }, 1000);
    setNowMs(Date.now() + clockOffsetMs);
    return () => window.clearInterval(timer);
  }, [clockOffsetMs]);

  if (rooms.length === 0) {
    return (
      <div
        className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-8 text-center space-y-2 transition-colors"
        data-testid="arena-empty-state"
      >
        <Swords className="w-8 h-8 text-sky-600 dark:text-sky-400 mx-auto" />
        <p className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
          {viewerRole === 'teacher'
            ? 'Chưa có phòng Đấu trường nào được mở'
            : 'Hiện chưa có phòng Đấu trường nào đang mở'}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          {viewerRole === 'teacher'
            ? 'Hãy chọn lớp, chế độ thi, bài thi đấu và bấm "Mở phòng chờ 5 phút" ở khung bên trái để học sinh cùng tham gia.'
            : 'Khi thầy/cô mở bài thi đấu cho lớp hoặc toàn khối, em có thể chọn phòng tại đây hoặc nhập Mã phòng ở trên để vào phòng chờ.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="arena-room-list">
      {rooms.map((room) => {
        const countdown = computeArenaCountdown(
          room.waitingEndsAt,
          nowMs,
          room.waitingDurationSec,
        );
        const joined = room.participants.some((p) => p.uid === currentUid);
        const readyCount = countReadyParticipants(room.participants);
        const isFull = isArenaRoomFull(room, currentUid);
        const isBusy = busyRoomId === room.id;
        const modeLabel = room.mode === 'game' ? 'Trò chơi' : 'Thi trắc nghiệm';
        const countLabel = `${room.itemCount || 10} ${room.mode === 'game' ? 'lượt' : 'câu'}`;

        return (
          <article
            key={room.id}
            data-testid={`arena-room-${room.id}`}
            className={`bg-white dark:bg-[#131D31] border rounded-2xl p-5 sm:p-6 space-y-4 transition-colors ${
              room.status === 'started'
                ? 'border-emerald-300 dark:border-emerald-700/70 ring-2 ring-emerald-100 dark:ring-emerald-900/40'
                : room.status === 'closed'
                  ? 'border-slate-200 dark:border-[#25334D] opacity-75'
                  : 'border-sky-200 dark:border-sky-800/60 shadow-sm'
            }`}
          >
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 border border-amber-200 dark:border-amber-700/60 font-mono">
                    Mã phòng: {room.roomCode}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800/60">
                    Lớp {room.classCode}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1A2742] text-slate-800 dark:text-slate-200">
                    {modeLabel} · {countLabel}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg border ${
                      room.status === 'waiting'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/60'
                        : room.status === 'started'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-slate-100 dark:bg-[#1A2742] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#334155]'
                    }`}
                  >
                    {room.status === 'waiting'
                      ? 'Phòng chờ thi đấu'
                      : room.status === 'started'
                        ? 'Đang thi đấu'
                        : 'Đã kết thúc'}
                  </span>
                </div>

                <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-slate-100">
                  {room.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Chủ đề: <strong className="text-slate-800 dark:text-slate-100">{room.lessonTitle}</strong> · Giáo viên:{' '}
                  <strong className="text-slate-800 dark:text-slate-100">{room.teacherName}</strong>
                </p>
              </div>

              {/* 5-Minute Countdown Box */}
              {room.status === 'waiting' && (
                <div
                  className="sm:min-w-[205px] p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 text-center space-y-1.5 shrink-0"
                  data-testid="arena-countdown-box"
                >
                  <p className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Thời gian chờ vào phòng
                  </p>
                  <p
                    className="font-mono font-black text-3xl text-sky-900 dark:text-sky-100 tabular-nums"
                    data-testid="arena-countdown-mmss"
                  >
                    {countdown.formattedMMSS}
                  </p>
                  <div className="w-full h-2 rounded-full bg-sky-100 dark:bg-[#1A2742] overflow-hidden">
                    <div
                      className="h-full bg-sky-600 dark:bg-sky-400 transition-all duration-500"
                      style={{ width: `${Math.max(4, 100 - countdown.progressPercent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-medium text-sky-800 dark:text-sky-200">
                    {readyCount}/{room.participants.length} bạn sẵn sàng · Tối đa {room.maxParticipants}
                  </p>
                </div>
              )}

              {room.status === 'started' && (
                <div
                  className="sm:min-w-[210px] p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-1 shrink-0"
                  data-testid="arena-started-badge"
                >
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <p className="font-display font-extrabold text-base text-emerald-950 dark:text-emerald-100">
                    Trận đấu đã bắt đầu!
                  </p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    {room.participants.length} thí sinh tham gia
                  </p>
                </div>
              )}
            </div>

            {/* Participants Roster */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Thí sinh đã vào phòng ({room.participants.length} / {room.maxParticipants}) · {readyCount} sẵn sàng
                </span>
                <span className="text-slate-500 dark:text-slate-400">Cập nhật trực tiếp</span>
              </div>

              {room.participants.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                  Chưa có học sinh nào vào phòng chờ.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {room.participants.map((p) => {
                    const isMe = p.uid === currentUid;
                    return (
                      <div
                        key={p.uid}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                          isMe
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-600'
                            : 'bg-white dark:bg-[#131D31] border-slate-200 dark:border-[#25334D]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <AvatarBadge avatarId={p.avatarId} size="sm" shape="circle" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {viewerRole === 'teacher'
                                ? `${p.fullName} (${p.studentCode})`
                                : `${p.nickname}${isMe ? ' (Em)' : ''}`}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              Lớp {p.classCode}
                              {viewerRole === 'teacher' ? ` · ${p.nickname}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {room.status === 'started' && typeof p.submittedScore === 'number' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-mono font-bold">
                              {p.submittedScore}/{p.submittedTotal ?? room.itemCount}
                            </span>
                          ) : p.ready ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                              Sẵn sàng
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[11px] font-bold">
                              Chưa sẵn sàng
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {viewerRole === 'teacher' && room.status !== 'closed' && (
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                {room.status === 'waiting' && onStartRoom && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onStartRoom(room.id)}
                    data-testid={`btn-start-arena-${room.id}`}
                    className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    {isBusy ? 'Đang bắt đầu...' : 'Bắt đầu thi đấu'}
                  </button>
                )}
                {onCloseRoom && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onCloseRoom(room.id)}
                    className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1A2742] hover:bg-slate-100 dark:hover:bg-[#223254] text-slate-700 dark:text-slate-200 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    Đóng phòng
                  </button>
                )}
              </div>
            )}

            {viewerRole === 'student' && room.status !== 'closed' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {joined ? (
                  <>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {room.status === 'started'
                        ? 'Trận đấu đang diễn ra! Vào phòng ngay nhé.'
                        : 'Em đã ở trong phòng chờ này.'}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {onEnterWaitingRoom && (
                        <button
                          type="button"
                          onClick={() => onEnterWaitingRoom(room)}
                          data-testid={`btn-open-waiting-room-${room.id}`}
                          className="min-h-[44px] px-5 rounded-xl bg-[#0166E3] hover:bg-[#025ED6] text-white font-display font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{room.status === 'started' ? 'Vào làm bài ngay' : 'Mở Phòng chờ'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                      {room.status === 'waiting' && onLeaveRoom && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onLeaveRoom(room.id)}
                          className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1A2742] hover:bg-slate-100 dark:hover:bg-[#223254] text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          Rời phòng
                        </button>
                      )}
                    </div>
                  </>
                ) : room.status === 'waiting' && onJoinRoom ? (
                  <button
                    type="button"
                    disabled={isBusy || isFull}
                    onClick={() => onJoinRoom(room.id)}
                    data-testid={`btn-join-arena-${room.id}`}
                    className="min-h-[48px] px-6 rounded-xl bg-[#0166E3] hover:bg-[#025ED6] dark:bg-sky-500 dark:hover:bg-sky-600 disabled:opacity-50 text-white font-display font-bold text-base flex items-center gap-2 cursor-pointer"
                  >
                    <Swords className="w-5 h-5" />
                    {isBusy ? 'Đang vào phòng...' : isFull ? 'Phòng đã đủ sĩ số' : 'Vào phòng chờ thi đấu'}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Trận đấu đã bắt đầu với danh sách thí sinh đã vào phòng.
                  </span>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
