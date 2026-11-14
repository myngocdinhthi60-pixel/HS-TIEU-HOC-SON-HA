import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Code2,
  Folder,
  GraduationCap,
  Keyboard,
  Trophy,
  Users,
} from 'lucide-react';
import type { ClientUser } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import {
  BurstRays,
  HandUnderline,
  LeafCornerCluster,
  SproutMonitorLogo,
} from './LandingIllustrations';
import { ArenaStarsCanvas, HeroLeavesCanvas } from './LandingThreeEffects';
import { ThemeToggle } from './ThemeToggle';

interface LandingPageProps {
  user: ClientUser | null;
  lowSpec2D: boolean;
  onNavigateStudentLogin: () => void;
  onNavigateTeacherLogin: () => void;
  onSelectLesson: (lessonId: string) => void;
  onEnterArena: () => void;
  onReturnWorkspace: () => void;
}

interface LessonCardSpec {
  lessonId: string;
  gradeLabel: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  cardBg: string;
  studBg: string;
  badgeText: string;
  icon: 'keyboard' | 'folder' | 'code';
}

const LESSON_CARDS: LessonCardSpec[] = [
  {
    lessonId: 'L3-B5',
    gradeLabel: 'Lớp 3',
    title: 'Sử dụng bàn phím',
    imageSrc: '/assets/landing/lesson-3-keyboard.png',
    imageAlt: 'Bàn phím 3D minh họa bài Sử dụng bàn phím lớp 3',
    cardBg: 'bg-gradient-to-b from-[#9EDBFE] via-[#BCE8FF] to-[#DCF3FF] dark:from-[#0E2A47] dark:via-[#123659] dark:to-[#131D31]',
    studBg: 'bg-[#8FD2FA] dark:bg-[#184570]',
    badgeText: 'text-[#0284C7] border-[#BBE4FD] bg-[#F2FAFF] dark:text-sky-300 dark:border-sky-800 dark:bg-sky-950/60',
    icon: 'keyboard',
  },
  {
    lessonId: 'L4-B5',
    gradeLabel: 'Lớp 4',
    title: 'Thao tác với tệp và thư mục',
    imageSrc: '/assets/landing/lesson-4-folder.png',
    imageAlt: 'Thư mục 3D minh họa bài Thao tác với tệp và thư mục lớp 4',
    cardBg: 'bg-gradient-to-b from-[#FFD2A4] via-[#FFE2C2] to-[#FFF1DF] dark:from-[#3D2512] dark:via-[#4A2E16] dark:to-[#131D31]',
    studBg: 'bg-[#F8C48E] dark:bg-[#613C1D]',
    badgeText: 'text-[#D97706] border-[#FDE2BA] bg-[#FFF9F0] dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950/60',
    icon: 'folder',
  },
  {
    lessonId: 'L5-B4',
    gradeLabel: 'Lớp 5',
    title: 'Cây thư mục',
    imageSrc: '/assets/landing/lesson-5-tree.png',
    imageAlt: 'Cây thư mục 3D minh họa bài Cây thư mục lớp 5',
    cardBg: 'bg-gradient-to-b from-[#8CEDA3] via-[#B4F5C3] to-[#DCFCE3] dark:from-[#0F3524] dark:via-[#154530] dark:to-[#131D31]',
    studBg: 'bg-[#7CE495] dark:bg-[#1A573C]',
    badgeText: 'text-[#6D28D9] border-[#E0D4FD] bg-[#F7F4FF] dark:text-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/60',
    icon: 'code',
  },
];

const RANK_BADGES = [
  {
    name: 'Tân binh',
    xp: '0 XP',
    imageSrc: '/assets/landing/badge-tan-binh.png',
    titleBg: 'bg-[#DDEAFF] dark:bg-[#1A2B4C] dark:border dark:border-sky-800/70',
    xpBg: 'bg-[#B9D4FF] dark:bg-[#233963]',
  },
  {
    name: 'Khám phá',
    xp: '50 XP',
    imageSrc: '/assets/landing/badge-kham-pha.png',
    titleBg: 'bg-[#DCF5E4] dark:bg-[#133529] dark:border dark:border-emerald-800/70',
    xpBg: 'bg-[#BCE9CD] dark:bg-[#1A4736]',
  },
  {
    name: 'Thành thạo',
    xp: '120 XP',
    imageSrc: '/assets/landing/badge-thanh-thao.png',
    titleBg: 'bg-[#EBE3FF] dark:bg-[#261D47] dark:border dark:border-violet-800/70',
    xpBg: 'bg-[#D7C9FE] dark:bg-[#33275E]',
  },
  {
    name: 'Chuyên gia nhí',
    xp: '250 XP',
    imageSrc: '/assets/landing/badge-chuyen-gia.png',
    titleBg: 'bg-[#FDEFCF] dark:bg-[#3A2B12] dark:border dark:border-amber-800/70',
    xpBg: 'bg-[#FBE0A9] dark:bg-[#4D3918]',
  },
];

const SAMPLE_WEEKLY_BARS = [
  { day: 'T2', heightPct: 38, highlight: false },
  { day: 'T3', heightPct: 56, highlight: false },
  { day: 'T4', heightPct: 72, highlight: false },
  { day: 'T5', heightPct: 96, highlight: true },
  { day: 'T6', heightPct: 76, highlight: false },
  { day: 'T7', heightPct: 48, highlight: false },
  { day: 'CN', heightPct: 65, highlight: false },
];

const SAMPLE_LEADERBOARD_ROWS = [
  {
    nickname: 'Cú Mèo',
    xp: '85 XP',
    medalSrc: '/assets/landing/medal-1.png',
    avatarSrc: '/assets/landing/avatar-cu-meo.png',
  },
  {
    nickname: 'Mầm Xanh',
    xp: '70 XP',
    medalSrc: '/assets/landing/medal-2.png',
    avatarSrc: '/assets/landing/avatar-mam-xanh.png',
  },
  {
    nickname: 'Sao Nhỏ',
    xp: '55 XP',
    medalSrc: '/assets/landing/medal-3.png',
    avatarSrc: '/assets/landing/avatar-sao-nho.png',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  lowSpec2D,
  onNavigateStudentLogin,
  onNavigateTeacherLogin,
  onSelectLesson,
  onEnterArena,
  onReturnWorkspace,
}) => {
  const { isDark } = useTheme();
  const chartCardRef = useRef<HTMLDivElement | null>(null);
  const [chartInView, setChartInView] = useState(false);

  useEffect(() => {
    const el = chartCardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setChartInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setChartInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F7FD] dark:bg-[#0B1220] text-[#13264D] dark:text-slate-100 flex flex-col">
      {/* ==================== HEADER ==================== */}
      <header className="sticky top-0 z-40 shadow-[0_6px_18px_rgba(3,56,145,0.2)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
        <div className="bg-gradient-to-r from-[#0361DE] via-[#0166E3] to-[#0C75F2] dark:from-[#072252] dark:via-[#092B66] dark:to-[#0C357B] text-white">
          <div className="max-w-[1140px] mx-auto px-3 sm:px-5 py-2.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5 md:gap-4">
            {/* Left Logo & Brand */}
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white rounded-lg"
            >
              <SproutMonitorLogo variant="light" size="md" />
              <span aria-hidden="true" className="h-5 w-px bg-white/30 mx-0.5 hidden sm:inline-block" />
              <span className="font-display font-extrabold text-[15px] sm:text-[17px] tracking-tight text-white">
                Phòng thực hành Tin học
              </span>
            </a>

            {/* Center Smooth-Scroll Anchor Links */}
            <nav
              aria-label="Điều hướng phần nội dung"
              className="order-3 md:order-2 w-full md:w-auto flex items-center justify-center gap-5 sm:gap-6 pt-1 md:pt-0 border-t border-white/15 md:border-t-0 text-[13.5px] font-bold text-white/95"
            >
              <a
                href="#bai-hoc"
                onClick={(e) => scrollToSection(e, 'bai-hoc')}
                className="hover:text-[#BCE3FF] transition-colors py-1 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white rounded"
              >
                Bài học
              </a>
              <a
                href="#xep-hang"
                onClick={(e) => scrollToSection(e, 'xep-hang')}
                className="hover:text-[#BCE3FF] transition-colors py-1 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white rounded"
              >
                Xếp hạng
              </a>
              <a
                href="#dau-truong"
                onClick={(e) => scrollToSection(e, 'dau-truong')}
                className="hover:text-[#BCE3FF] transition-colors py-1 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white rounded"
              >
                Đấu trường
              </a>
            </nav>

            {/* Right Dual Login Buttons */}
            <div className="order-2 md:order-3 w-full md:w-auto flex items-center justify-end gap-2 shrink-0">
              {user ? (
                <button
                  type="button"
                  onClick={onReturnWorkspace}
                  className="min-h-[40px] px-4 py-1.5 rounded-full bg-white dark:bg-[#131D31] text-[#0166E3] dark:text-sky-300 hover:bg-[#EAF4FF] dark:hover:bg-[#1A2742] font-display font-extrabold text-[13px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Users className="w-4 h-4 shrink-0" />
                  Vào không gian của {user.role === 'student' ? user.nickname : 'Giáo viên'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onNavigateTeacherLogin}
                    className="flex-1 md:flex-initial min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-full border-[1.5px] border-white/90 bg-[#0558CB]/65 dark:bg-[#0D2E6B]/80 hover:bg-white/15 text-white font-display font-bold text-[12.5px] sm:text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    <span>Giáo viên đăng nhập</span>
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateStudentLogin}
                    className="flex-1 md:flex-initial min-h-[40px] px-3 sm:px-4 py-1.5 rounded-full bg-white dark:bg-[#131D31] hover:bg-[#EDF6FF] dark:hover:bg-[#1A2742] text-[#0361DE] dark:text-sky-300 font-display font-extrabold text-[12.5px] sm:text-[13px] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Học sinh vào lớp</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Thin colorful bottom strip under header matching reference */}
        <div
          aria-hidden="true"
          className="h-[4px] w-full bg-gradient-to-r from-[#38BDF8] via-[#4ADE80] via-[#FACC15] to-[#FB923C]"
        />
      </header>

      <main className="flex-1">
        {/* ==================== HERO SECTION ==================== */}
        <section
          id="top"
          className="relative overflow-hidden bg-gradient-to-b from-[#BCE4FE] via-[#D8F0FE] to-[#EEF8FE] dark:from-[#091529] dark:via-[#0D1C36] dark:to-[#0B1220]"
        >
          {/* Full hero backdrop on md+ so Image 2 artwork spans seamlessly on the right */}
          <div className="hidden md:block absolute inset-0 pointer-events-none select-none">
            <img
              src="/assets/aistudio/image_05eb7300.png"
              alt="Ba bạn học sinh học Tin học dưới tán cây xanh với máy tính xách tay"
              className="w-full h-full object-cover object-[78%_bottom] dark:brightness-75 dark:contrast-105"
            />
            {/* Soft readability wash on the left side behind text only */}
            <div
              className="absolute inset-y-0 left-0 w-[56%] dark:w-[62%]"
              style={{
                background: isDark
                  ? 'linear-gradient(90deg, rgba(11,18,32,0.95) 0%, rgba(11,18,32,0.84) 64%, rgba(11,18,32,0.16) 100%)'
                  : 'linear-gradient(90deg, rgba(226,243,254,0.92) 0%, rgba(226,243,254,0.75) 68%, rgba(226,243,254,0) 100%)',
              }}
            />
          </div>

          <LeafCornerCluster position="top-left" />

          {/* Subtle lazy Three.js drifting leaves over hero tree canopy */}
          <div className="hidden md:block">
            <HeroLeavesCanvas lowSpec2D={lowSpec2D} />
          </div>

          <div className="relative z-10 max-w-[1140px] mx-auto px-4 sm:px-6 pt-9 pb-6 md:pt-11 md:pb-14 lg:pt-14 lg:pb-16 grid grid-cols-1 md:grid-cols-12 items-center gap-6">
            {/* Hero Left Copy & Primary CTA */}
            <div className="md:col-span-6 lg:col-span-6 relative">
              <h1 className="font-display font-black text-[34px] sm:text-[42px] lg:text-[48px] leading-[1.12] tracking-[-0.015em] text-[#13264D] dark:text-slate-100">
                <span className="block">Em học Tin học,</span>
                <span className="relative inline-block text-[#0361DE] dark:text-sky-400 mt-0.5">
                  em tự tay làm!
                  <BurstRays
                    color="#FBBF24"
                    className="w-6 h-6 sm:w-7 sm:h-7 absolute -top-2 -right-7 pointer-events-none"
                  />
                  <HandUnderline className="w-full max-w-[275px] h-3.5 mt-0.5" />
                </span>
              </h1>

              <p className="mt-3.5 text-[15px] sm:text-[17px] font-bold text-[#253C63] dark:text-slate-200 max-w-md leading-snug">
                Thực hành, đố vui và chơi cùng bạn lớp 3, 4, 5.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={user ? onReturnWorkspace : onNavigateStudentLogin}
                  className="min-h-[48px] px-6 py-3 rounded-full bg-gradient-to-b from-[#1A88FF] to-[#0166E3] hover:from-[#2993FF] hover:to-[#0457C7] text-white font-display font-extrabold text-[15px] sm:text-[16px] flex items-center gap-2 shadow-[0_10px_22px_rgba(1,102,227,0.34)] transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>Vào lớp của em</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.6]" />
                </button>

                <button
                  type="button"
                  onClick={onNavigateTeacherLogin}
                  className="text-[14.5px] font-extrabold text-[#0361DE] dark:text-sky-300 hover:text-[#0244A3] dark:hover:text-sky-200 underline underline-offset-4 cursor-pointer py-2"
                >
                  Giáo viên đăng nhập
                </button>
              </div>
            </div>

            {/* Hero Right Canopy Floating Grade Tags (desktop overlay + clean mobile artwork card) */}
            <div className="md:col-span-6 lg:col-span-6 relative min-h-[210px] sm:min-h-[240px] md:min-h-[260px]">
              {/* Mobile hero illustration */}
              <div className="md:hidden relative rounded-3xl overflow-hidden shadow-[0_12px_28px_rgba(15,48,110,0.14)] border-2 border-white/70 dark:border-[#25334D]">
                <img
                  src="/assets/aistudio/image_05eb7300.png"
                  alt="Ba bạn học sinh học Tin học dưới tán cây xanh với máy tính xách tay"
                  className="w-full h-56 object-cover object-[74%_center] dark:brightness-90"
                />
                <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectLesson('L3-B5')}
                    className="bg-white/95 dark:bg-[#131D31]/95 dark:border dark:border-[#2B3E5E] rounded-full px-3 py-1.5 shadow-md flex items-center gap-1.5 font-display font-extrabold text-xs text-[#13264D] dark:text-slate-100 cursor-pointer"
                  >
                    <Keyboard className="w-4 h-4 text-[#0EA5E9]" />
                    <span>Lớp 3</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectLesson('L4-B5')}
                    className="bg-white/95 dark:bg-[#131D31]/95 dark:border dark:border-[#2B3E5E] rounded-full px-3 py-1.5 shadow-md flex items-center gap-1.5 font-display font-extrabold text-xs text-[#13264D] dark:text-slate-100 cursor-pointer"
                  >
                    <Folder className="w-4 h-4 text-[#F59E0B] fill-[#FBBF24]" />
                    <span>Lớp 4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectLesson('L5-B4')}
                    className="bg-white/95 dark:bg-[#131D31]/95 dark:border dark:border-[#2B3E5E] rounded-full px-3 py-1.5 shadow-md flex items-center gap-1.5 font-display font-extrabold text-xs text-[#13264D] dark:text-slate-100 cursor-pointer"
                  >
                    <Code2 className="w-4 h-4 text-[#7C3AED] dark:text-violet-400" />
                    <span>Lớp 5</span>
                  </button>
                </div>
              </div>

              {/* Desktop / 887px floating HTML labels on the canopy matching exact positions in Reference Image 1 */}
              <div className="hidden md:block relative w-full h-[265px] lg:h-[295px]">
                <button
                  type="button"
                  onClick={() => onSelectLesson('L3-B5')}
                  aria-label="Mở bài Tin học Lớp 3: Sử dụng bàn phím"
                  className="absolute top-[1%] left-[1%] lg:left-[6%] -rotate-6 bg-white/95 dark:bg-[#131D31]/95 hover:bg-white dark:hover:bg-[#1A2742] rounded-full px-3.5 py-1.5 shadow-[0_8px_18px_rgba(15,48,110,0.16)] border border-white dark:border-[#2B3E5E] flex items-center gap-2 font-display font-extrabold text-[15px] text-[#13264D] dark:text-slate-100 transition-transform hover:scale-105 cursor-pointer"
                >
                  <Keyboard className="w-5 h-5 text-[#0EA5E9]" />
                  <span>Lớp 3</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectLesson('L4-B5')}
                  aria-label="Mở bài Tin học Lớp 4: Thao tác với tệp và thư mục"
                  className="absolute -top-[4%] left-[41%] -rotate-2 bg-white/95 dark:bg-[#131D31]/95 hover:bg-white dark:hover:bg-[#1A2742] rounded-full px-3.5 py-1.5 shadow-[0_8px_18px_rgba(15,48,110,0.16)] border border-white dark:border-[#2B3E5E] flex items-center gap-2 font-display font-extrabold text-[15px] text-[#13264D] dark:text-slate-100 transition-transform hover:scale-105 cursor-pointer"
                >
                  <Folder className="w-5 h-5 text-[#F59E0B] fill-[#FBBF24]" />
                  <span>Lớp 4</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectLesson('L5-B4')}
                  aria-label="Mở bài Tin học Lớp 5: Cây thư mục"
                  className="absolute top-[10%] right-[1%] lg:right-[3%] rotate-6 bg-white/95 dark:bg-[#131D31]/95 hover:bg-white dark:hover:bg-[#1A2742] rounded-full px-3.5 py-1.5 shadow-[0_8px_18px_rgba(15,48,110,0.16)] border border-white dark:border-[#2B3E5E] flex items-center gap-2 font-display font-extrabold text-[15px] text-[#13264D] dark:text-slate-100 transition-transform hover:scale-105 cursor-pointer"
                >
                  <Code2 className="w-5 h-5 text-[#7C3AED] dark:text-violet-400" />
                  <span>Lớp 5</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== BÀI HỌC SECTION ==================== */}
        <section
          id="bai-hoc"
          className="relative overflow-hidden py-12 sm:py-14 bg-gradient-to-b from-[#EFF6FF] via-[#F5FAFF] to-[#E9F3FE] dark:from-[#0B1528] dark:via-[#0D1A30] dark:to-[#0B1220]"
        >
          <LeafCornerCluster position="top-left" />
          <LeafCornerCluster position="top-right" />
          <LeafCornerCluster position="bottom-left" withFlowers />
          <LeafCornerCluster position="bottom-right" withFlowers />

          <div className="relative z-10 max-w-[1040px] mx-auto px-4 sm:px-6">
            <div className="text-center">
              <h2 className="inline-flex items-center justify-center font-display font-black text-[28px] sm:text-[34px] text-[#13264D] dark:text-slate-100 relative">
                <span>
                  Khám phá <span className="text-[#0361DE] dark:text-sky-400">bài học</span>
                </span>
                <BurstRays
                  color="#FACC15"
                  className="w-6 h-6 absolute -top-2 -right-7 pointer-events-none"
                />
              </h2>
              <p className="mt-2 text-[14.5px] sm:text-[16px] font-semibold text-[#334B72] dark:text-slate-300">
                Xem mẫu → Làm theo → <strong className="font-extrabold text-[#13264D] dark:text-white">Tự làm</strong> → Đố vui
              </p>
            </div>

            {/* 3 Lesson Cards with Top Studs & Connector Dots */}
            <div className="mt-9 grid grid-cols-1 md:grid-cols-3 gap-7 md:gap-8 relative items-stretch">
              {LESSON_CARDS.map((card, idx) => (
                <div key={card.lessonId} className="relative flex flex-col">
                  {/* Connector 3 dots between cards on desktop/tablet */}
                  {idx < LESSON_CARDS.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="hidden md:flex items-center gap-1.5 absolute top-[44%] -right-[24px] z-20 pointer-events-none"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6AA8F7] dark:bg-sky-500" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6AA8F7] dark:bg-sky-500" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6AA8F7] dark:bg-sky-500" />
                    </div>
                  )}

                  {/* Decorative Lego-style top studs matching reference */}
                  <div aria-hidden="true" className="flex justify-center gap-3.5 -mb-1 relative z-0">
                    <span className={`w-9 h-2.5 rounded-t-md ${card.studBg} shadow-inner`} />
                    <span className={`w-9 h-2.5 rounded-t-md ${card.studBg} shadow-inner`} />
                    <span className={`w-9 h-2.5 rounded-t-md ${card.studBg} shadow-inner`} />
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectLesson(card.lessonId)}
                    className={`group relative z-10 flex-1 flex flex-col text-left rounded-[24px] overflow-hidden ${card.cardBg} shadow-[0_14px_30px_-12px_rgba(15,48,110,0.22)] dark:shadow-[0_14px_30px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_38px_-12px_rgba(1,102,227,0.3)] hover:-translate-y-1.5 transition-all duration-200 cursor-pointer border border-white/80 dark:border-[#25334D] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0166E3] dark:focus-visible:outline-sky-400`}
                  >
                    {/* Top pastel illustration zone */}
                    <div className="relative pt-4 pb-3 px-4 flex items-center justify-center min-h-[154px]">
                      <img
                        src={card.imageSrc}
                        alt={card.imageAlt}
                        style={{
                          WebkitMaskImage:
                            'radial-gradient(ellipse 88% 88% at 50% 50%, #000 72%, transparent 100%)',
                          maskImage:
                            'radial-gradient(ellipse 88% 88% at 50% 50%, #000 72%, transparent 100%)',
                        }}
                        className="w-44 h-32 object-contain drop-shadow-[0_10px_14px_rgba(15,48,110,0.14)] group-hover:scale-[1.04] transition-transform duration-200"
                      />
                    </div>

                    {/* Crisp lower body */}
                    <div className="flex-1 bg-white dark:bg-[#131D31] rounded-t-[20px] px-5 pt-4 pb-5 flex flex-col justify-between">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[13px] font-display font-extrabold ${card.badgeText}`}
                        >
                          {card.icon === 'keyboard' && <Keyboard className="w-4 h-4" />}
                          {card.icon === 'folder' && <Folder className="w-4 h-4 fill-amber-300" />}
                          {card.icon === 'code' && <Code2 className="w-4 h-4" />}
                          <span>{card.gradeLabel}</span>
                        </span>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <h3 className="font-display font-black text-[18px] sm:text-[19px] leading-snug text-[#13264D] dark:text-slate-100">
                          {card.title}
                        </h3>
                        <span
                          aria-hidden="true"
                          className="w-9 h-9 rounded-full bg-[#EAF4FF] dark:bg-[#1A2742] group-hover:bg-[#0166E3] dark:group-hover:bg-sky-500 text-[#0166E3] dark:text-sky-300 group-hover:text-white flex items-center justify-center shrink-0 transition-colors"
                        >
                          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== TIẾN ĐỘ VÀ XẾP HẠNG SECTION ==================== */}
        <section
          id="xep-hang"
          className="relative overflow-hidden py-12 sm:py-14 bg-gradient-to-b from-[#F4F8FE] via-[#EDF5FE] to-[#E6F0FD] dark:from-[#0B1220] dark:via-[#0E182B] dark:to-[#111D33]"
        >
          <LeafCornerCluster position="top-left" />
          <LeafCornerCluster position="top-right" />

          <div className="relative z-10 max-w-[1000px] mx-auto px-4 sm:px-6">
            <div className="text-center">
              <h2 className="inline-flex items-baseline justify-center gap-2 flex-wrap font-display font-black text-[28px] sm:text-[34px] text-[#13264D] dark:text-slate-100 relative">
                <span>Tiến độ và</span>
                <span className="relative inline-block">
                  xếp hạng
                  <HandUnderline className="w-full h-3 mt-0.5" />
                  <BurstRays
                    color="#38BDF8"
                    className="w-5 h-5 absolute -right-6 bottom-0 pointer-events-none"
                  />
                </span>
              </h2>
            </div>

            {/* 4 Rank Badges */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 max-w-[820px] mx-auto">
              {RANK_BADGES.map((badge) => (
                <div
                  key={badge.name}
                  className="flex flex-col items-center text-center"
                >
                  <img
                    src={badge.imageSrc}
                    alt={`Huy hiệu ${badge.name} (${badge.xp})`}
                    className="w-28 h-[86px] object-contain drop-shadow-[0_8px_14px_rgba(15,48,110,0.12)]"
                  />
                  <div
                    className={`mt-1.5 w-full max-w-[148px] py-1 px-3 rounded-full ${badge.titleBg} font-display font-extrabold text-[14px] text-[#13264D] dark:text-slate-100`}
                  >
                    {badge.name}
                  </div>
                  <div
                    className={`mt-1.5 px-3.5 py-0.5 rounded-full ${badge.xpBg} font-display font-extrabold text-[12.5px] text-[#13264D] dark:text-slate-100 tabular-nums`}
                  >
                    {badge.xp}
                  </div>
                </div>
              ))}
            </div>

            {/* Two Cards Side-by-Side (Chart above Leaderboard on mobile) */}
            <div className="mt-9 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[860px] mx-auto">
              {/* Weekly Progress Card */}
              <div
                ref={chartCardRef}
                className="bg-white dark:bg-[#131D31] rounded-[22px] p-5 sm:p-6 shadow-[0_14px_30px_-14px_rgba(15,48,110,0.16)] dark:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.45)] border border-white dark:border-[#25334D] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-[#EAF4FF] dark:bg-sky-950/70 text-[#0166E3] dark:text-sky-300 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 stroke-[2.4]" />
                    </span>
                    <h3 className="font-display font-extrabold text-[18px] text-[#13264D] dark:text-slate-100">
                      Tiến độ tuần
                    </h3>
                  </div>
                  <span className="text-[12.5px] font-semibold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-[#25334D] pl-2.5 whitespace-nowrap">
                    Dữ liệu minh họa
                  </span>
                </div>

                <div
                  className="mt-6 pt-2 flex items-end justify-between gap-2.5 h-36 border-b border-slate-100 dark:border-[#25334D] pb-2"
                  role="img"
                  aria-label="Biểu đồ minh họa tiến độ tuần từ Thứ 2 đến Chủ nhật với cột Thứ 5 cao nhất"
                >
                  {SAMPLE_WEEKLY_BARS.map((bar, i) => (
                    <div key={bar.day} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                      <div className="w-full h-full flex items-end justify-center">
                        <div
                          className={`w-full max-w-[34px] rounded-t-lg origin-bottom ${
                            bar.highlight
                              ? 'bg-gradient-to-b from-[#FFB438] to-[#F48316] shadow-[0_4px_10px_rgba(244,131,22,0.28)]'
                              : 'bg-gradient-to-b from-[#4DAAFF] to-[#1D79F2]'
                          } ${chartInView ? 'animate-bar-grow' : ''}`}
                          style={{
                            height: `${bar.heightPct}%`,
                            animationDelay: `${i * 55}ms`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2.5 pt-2 text-[13px] font-extrabold text-[#13264D] dark:text-slate-200">
                  {SAMPLE_WEEKLY_BARS.map((bar) => (
                    <span key={bar.day} className="flex-1 text-center">
                      {bar.day}
                    </span>
                  ))}
                </div>
              </div>

              {/* Weekly Leaderboard Card */}
              <div className="bg-white dark:bg-[#131D31] rounded-[22px] p-5 sm:p-6 shadow-[0_14px_30px_-14px_rgba(15,48,110,0.16)] dark:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.45)] border border-white dark:border-[#25334D] flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-[#FEF4D6] dark:bg-amber-950/60 text-[#EAB308] flex items-center justify-center">
                      <Trophy className="w-5 h-5 fill-[#FACC15] text-[#D97706] dark:text-amber-400" />
                    </span>
                    <h3 className="font-display font-extrabold text-[18px] text-[#13264D] dark:text-slate-100">
                      Xếp hạng tuần
                    </h3>
                  </div>
                  <span className="text-[12.5px] font-semibold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-[#25334D] pl-2.5 whitespace-nowrap">
                    Dữ liệu minh họa
                  </span>
                </div>

                <ul className="mt-4 divide-y divide-slate-100 dark:divide-[#25334D]">
                  {SAMPLE_LEADERBOARD_ROWS.map((row) => (
                    <li
                      key={row.nickname}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={row.medalSrc}
                          alt=""
                          aria-hidden="true"
                          className="w-7 h-8 object-contain shrink-0"
                        />
                        <img
                          src={row.avatarSrc}
                          alt={`Avatar ${row.nickname}`}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-[#334155]"
                        />
                        <span className="font-display font-extrabold text-[15px] text-[#13264D] dark:text-slate-100 truncate">
                          {row.nickname}
                        </span>
                      </div>
                      <span className="font-display font-black text-[15px] text-[#13264D] dark:text-sky-300 tabular-nums whitespace-nowrap">
                        {row.xp}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== ĐẤU TRƯỜNG TIN HỌC SECTION ==================== */}
        <section
          id="dau-truong"
          className="relative overflow-hidden pt-10 pb-8 bg-gradient-to-b from-[#DFE8FC] via-[#DCE6FC] to-[#D4E0FA] dark:from-[#0F1B33] dark:via-[#111E38] dark:to-[#0B1220]"
        >
          <LeafCornerCluster position="bottom-left" withFlowers />
          <LeafCornerCluster position="bottom-right" withFlowers />

          <div className="relative z-10 max-w-[1000px] mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 items-center gap-6">
            <div className="md:col-span-6 text-center md:text-left">
              <h2 className="inline-block font-display font-black text-[28px] sm:text-[34px] text-[#13264D] dark:text-slate-100 relative">
                <span>
                  Đấu trường <span className="text-[#0361DE] dark:text-sky-400">Tin học</span>
                </span>
                <BurstRays
                  color="#FACC15"
                  className="w-6 h-6 absolute -top-2 -right-7 pointer-events-none"
                />
              </h2>

              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#131D31] dark:border dark:border-[#25334D] text-[#13264D] dark:text-slate-100 font-display font-extrabold text-[13.5px] shadow-[0_6px_14px_rgba(15,48,110,0.08)]">
                  <CalendarDays className="w-4 h-4 text-[#0166E3] dark:text-sky-400" />
                  <span>Thử thách tuần</span>
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#131D31] dark:border dark:border-[#25334D] text-[#13264D] dark:text-slate-100 font-display font-extrabold text-[13.5px] shadow-[0_6px_14px_rgba(15,48,110,0.08)]">
                  <Users className="w-4 h-4 text-[#0166E3] dark:text-sky-400" />
                  <span>Thi cùng lớp</span>
                </span>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={onEnterArena}
                  className="min-h-[48px] px-7 py-3 rounded-full bg-gradient-to-b from-[#1A88FF] to-[#0166E3] hover:from-[#2993FF] hover:to-[#0457C7] text-white font-display font-extrabold text-[15.5px] inline-flex items-center gap-2 shadow-[0_10px_24px_rgba(1,102,227,0.34)] transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>Vào đấu trường</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.6]" />
                </button>
              </div>
            </div>

            <div className="md:col-span-6 relative">
              <div className="relative rounded-[22px] overflow-hidden shadow-[0_14px_32px_rgba(15,48,110,0.14)] border-2 border-white/80 dark:border-[#25334D] bg-[#DCE7FC] dark:bg-[#131D31]">
                <img
                  src="/assets/landing/arena-scene.png"
                  alt="Hai học sinh đang thi đấu trên máy tính bảng và laptop bên cúp vàng Đấu trường Tin học"
                  className="w-full h-auto block object-contain dark:brightness-90"
                />
                {/* Lazy Three.js subtle 3D golden stars beside the trophy */}
                <ArenaStarsCanvas lowSpec2D={lowSpec2D} />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="relative overflow-hidden bg-white dark:bg-[#0B1220] border-t border-slate-100 dark:border-[#25334D] py-5 px-4">
        <LeafCornerCluster position="bottom-left" />
        <LeafCornerCluster position="bottom-right" />
        <div className="relative z-10 max-w-[1140px] mx-auto flex items-center justify-center gap-2.5">
          <SproutMonitorLogo variant={isDark ? 'light' : 'dark'} size="sm" />
          <span aria-hidden="true" className="h-5 w-px bg-slate-300 dark:bg-[#25334D]" />
          <span className="font-display font-extrabold text-[15px] text-[#13264D] dark:text-slate-100">
            Phòng thực hành Tin học
          </span>
        </div>
      </footer>

      <ThemeToggle variant="floating" />
    </div>
  );
};
