import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Delete, Eye, EyeOff, KeyRound, Lock, Monitor, ShieldCheck, UserCheck } from 'lucide-react';
import { api, ApiError, type ClientUser } from '../services/api';
import { ThemeToggle } from './ThemeToggle';

interface LoginViewProps {
  initialRole?: 'student' | 'teacher';
  pendingNotice?: string | null;
  preferredClassCode?: string | null;
  onBackHome?: () => void;
  onLoggedIn: (user: ClientUser) => void;
}

interface DemoStudentItem {
  classCode: string;
  studentCode: string;
  pin: string;
  fullName: string;
  note: string;
}

interface DemoTeacherItem {
  email: string;
  password: string;
  label: string;
  classesNote: string;
}

const DEMO_STUDENTS: DemoStudentItem[] = [
  { classCode: '4A2', studentCode: 'HS001', pin: '012345', fullName: 'Nguyễn Thu An', note: 'Lớp 4 · Chưa làm bài' },
  { classCode: '4A2', studentCode: 'HS002', pin: '004567', fullName: 'Lê Đăng Khoa', note: 'Lớp 4 · Đã có 20 XP' },
  { classCode: '4A2', studentCode: 'HS003', pin: '089123', fullName: 'Trần Gia Minh', note: 'Lớp 4' },
  { classCode: '4A2', studentCode: 'HS004', pin: '004404', fullName: 'Đỗ Hà My', note: 'Lớp 4 · Đã có 85 XP (3 bài)' },
  { classCode: '4A2', studentCode: 'HS005', pin: '050505', fullName: 'Bùi Gia Huy', note: 'Lớp 4' },
  { classCode: '3A1', studentCode: 'HS301', pin: '024680', fullName: 'Phạm Bảo Ngọc', note: 'Lớp 3 · Bàn phím' },
  { classCode: '3A1', studentCode: 'HS302', pin: '011223', fullName: 'Nguyễn Minh Khang', note: 'Lớp 3' },
  { classCode: '3A1', studentCode: 'HS303', pin: '033303', fullName: 'Bùi Khánh Linh', note: 'Lớp 3' },
  { classCode: '3A1', studentCode: 'HS304', pin: '003304', fullName: 'Ngô Tuấn Kiệt', note: 'Lớp 3' },
  { classCode: '5A1', studentCode: 'HS501', pin: '055667', fullName: 'Vũ Hải Anh', note: 'Lớp 5 · Nhánh A' },
  { classCode: '5A1', studentCode: 'HS502', pin: '099001', fullName: 'Hoàng Đức Duy', note: 'Lớp 5 · Nhánh A' },
  { classCode: '5A1', studentCode: 'HS503', pin: '055303', fullName: 'Trịnh Ngọc Diệp', note: 'Lớp 5 · Nhánh A' },
  { classCode: '5A1', studentCode: 'HS504', pin: '005504', fullName: 'Phan Quốc Bảo', note: 'Lớp 5 · Nhánh A' },
  { classCode: '3B2', studentCode: 'HS901', pin: '033445', fullName: 'Đặng Thảo Vy', note: 'Lớp 3B2 · Thầy Bình' },
  { classCode: '3B2', studentCode: 'HS902', pin: '090202', fullName: 'Lý Minh Châu', note: 'Lớp 3B2 · Thầy Bình' },
  { classCode: '5B1', studentCode: 'HS511', pin: '051100', fullName: 'Tạ Quang Vinh', note: 'Lớp 5B1 · Nhánh B' },
  { classCode: '5B1', studentCode: 'HS512', pin: '051200', fullName: 'Võ Minh Thư', note: 'Lớp 5B1 · Nhánh B' },
];

const DEMO_TEACHERS: DemoTeacherItem[] = [
  {
    email: 'giaovien@truongtieuhoc.edu.vn',
    password: 'GiaoVien@2026',
    label: 'Cô Lan Hương',
    classesNote: '3A1, 4A2, 5A1',
  },
  {
    email: 'gv_lopkhac@truongtieuhoc.edu.vn',
    password: 'GiaoVien@2026',
    label: 'Thầy Bình',
    classesNote: 'Lớp 3B2',
  },
  {
    email: 'gv_khoi5@truongtieuhoc.edu.vn',
    password: 'GiaoVien@2026',
    label: 'Cô Thanh Mai',
    classesNote: 'Lớp 5B1 (Nhánh B)',
  },
];

const CLASS_FILTERS = ['Tất cả', '4A2', '3A1', '5A1', '3B2', '5B1'] as const;

export const LoginView: React.FC<LoginViewProps> = ({
  initialRole = 'student',
  pendingNotice = null,
  preferredClassCode = null,
  onBackHome,
  onLoggedIn,
}) => {
  const [roleTab, setRoleTab] = useState<'student' | 'teacher'>(initialRole);

  // Student login form state
  const [classCode, setClassCode] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [personalDevice, setPersonalDevice] = useState(false);

  // Teacher login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Demo account picker state
  const [classFilter, setClassFilter] = useState<string>(preferredClassCode ?? 'Tất cả');
  const [filledHint, setFilledHint] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setRoleTab(initialRole);
    setErrorMsg(null);
  }, [initialRole]);

  useEffect(() => {
    if (preferredClassCode) {
      setClassFilter(preferredClassCode);
    }
  }, [preferredClassCode]);

  const filteredDemoStudents = useMemo(
    () => (classFilter === 'Tất cả' ? DEMO_STUDENTS : DEMO_STUDENTS.filter((s) => s.classCode === classFilter)),
    [classFilter],
  );

  const handleNumpadDigit = (digit: string) => {
    setErrorMsg(null);
    setPin((prev) => (prev.length < 6 ? prev + digit : prev));
  };

  const handleNumpadBackspace = () => {
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!classCode.trim() || !studentCode.trim() || !/^\d{6}$/.test(pin.trim())) {
      setErrorMsg('Em hãy nhập đủ Mã lớp, Mã học sinh và mã PIN gồm đúng 6 chữ số nhé.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.studentLogin({
        classCode: classCode.trim().toUpperCase(),
        studentCode: studentCode.trim().toUpperCase(),
        pin: pin.trim(),
        personalDevice,
      });
      onLoggedIn(res.user);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Không thể kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu giáo viên.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.teacherLogin({ email: email.trim(), password });
      onLoggedIn(res.user);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoStudent = (item: DemoStudentItem) => {
    setRoleTab('student');
    setClassCode(item.classCode);
    setStudentCode(item.studentCode);
    setPin(item.pin);
    setErrorMsg(null);
    setFilledHint(`Đã điền: ${item.fullName} (${item.classCode} · ${item.studentCode} · PIN ${item.pin})`);
  };

  const fillDemoTeacher = (item: DemoTeacherItem) => {
    setRoleTab('teacher');
    setEmail(item.email);
    setPassword(item.password);
    setErrorMsg(null);
    setFilledHint(`Đã điền: ${item.label} (${item.email})`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col justify-between">
      {/* Clean single-row top bar */}
      <header className="bg-white dark:bg-[#131D31] border-b border-slate-200 dark:border-[#25334D] px-4 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <span className="w-9 h-9 rounded-xl bg-sky-600 text-white font-display font-extrabold text-base flex items-center justify-center">
              TH
            </span>
            <span className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100">
              Phòng thực hành Tin học 3, 4, 5
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle variant="header" />
            {onBackHome ? (
              <button
                type="button"
                onClick={onBackHome}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1A2742] hover:bg-slate-100 dark:hover:bg-[#233559] text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Về trang chủ</span>
              </button>
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">
                Kết nối tri thức với cuộc sống
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
        {pendingNotice && (
          <div
            role="status"
            className="w-full max-w-5xl px-4 py-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-100 text-sm font-semibold flex items-center justify-between gap-3"
          >
            <span>{pendingNotice}</span>
          </div>
        )}
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left column: Welcome & rich demo account switcher */}
          <section className="lg:col-span-5 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 tracking-wide">
                Phòng máy Tiểu học · An toàn &amp; Trực quan
              </p>
              <h1 className="font-display font-extrabold text-2xl text-slate-900 dark:text-slate-100 mt-1.5 leading-tight">
                Chào mừng em đến với giờ thực hành Tin học
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm leading-relaxed">
                Luyện tập thao tác bàn phím, quản lí tệp và cây thư mục mô phỏng giống máy tính thật.
              </p>

              <ul className="mt-4 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <Monitor className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <span>Xem mẫu trực quan, làm theo từng bước, tự thực hành và chơi trò chơi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Chỉ cần Mã lớp, Mã học sinh và mã PIN 6 chữ số (giữ số 0 đầu).</span>
                </li>
              </ul>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#25334D] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Tài khoản mẫu dùng thử ({DEMO_STUDENTS.length} HS · {DEMO_TEACHERS.length} GV)
                </p>
              </div>

              {/* Class filter buttons */}
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc tài khoản học sinh theo lớp">
                {CLASS_FILTERS.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setClassFilter(cls)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      classFilter === cls
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-50 dark:bg-[#1A2742] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#233559]'
                    }`}
                  >
                    {cls === 'Tất cả' ? 'Tất cả' : `Lớp ${cls}`}
                  </button>
                ))}
              </div>

              {/* Student demo accounts list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredDemoStudents.map((s) => {
                  const isActive =
                    roleTab === 'student' &&
                    classCode === s.classCode &&
                    studentCode === s.studentCode;
                  return (
                    <button
                      key={`${s.classCode}-${s.studentCode}`}
                      type="button"
                      onClick={() => fillDemoStudent(s)}
                      className={`px-2.5 py-2 text-left rounded-lg border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-400 dark:border-sky-500 text-sky-950 dark:text-sky-100'
                          : 'bg-slate-50 dark:bg-[#1A2742] hover:bg-sky-50 dark:hover:bg-[#233559] border-slate-200 dark:border-[#334155] text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-xs font-bold">
                        <span>{s.classCode} · {s.studentCode}</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-300">{s.pin}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                        {s.fullName}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Teacher demo accounts */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Giáo viên dùng thử (MK chung: GiaoVien@2026):
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {DEMO_TEACHERS.map((t) => {
                    const isActive = roleTab === 'teacher' && email === t.email;
                    return (
                      <button
                        key={t.email}
                        type="button"
                        onClick={() => fillDemoTeacher(t)}
                        className={`px-3 py-2 text-left rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          isActive
                            ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 dark:border-amber-500 text-amber-950 dark:text-amber-100'
                            : 'bg-amber-50 dark:bg-amber-950/35 hover:bg-amber-100 dark:hover:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{t.label}</div>
                          <div className="text-[11px] text-amber-800 dark:text-amber-300 font-mono truncate">{t.email}</div>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 shrink-0">{t.classesNote}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Right column: Login card */}
          <section className="lg:col-span-7 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl p-6 sm:p-8 flex flex-col justify-start">
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-[#1A2742] rounded-xl mb-5" role="tablist" aria-label="Chọn vai trò đăng nhập">
              <button
                type="button"
                role="tab"
                aria-selected={roleTab === 'student'}
                onClick={() => {
                  setRoleTab('student');
                  setErrorMsg(null);
                }}
                className={`flex-1 min-w-0 min-h-[48px] px-2.5 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  roleTab === 'student'
                    ? 'bg-white dark:bg-[#0B1220] text-sky-700 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">Học sinh vào lớp</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={roleTab === 'teacher'}
                onClick={() => {
                  setRoleTab('teacher');
                  setErrorMsg(null);
                }}
                className={`flex-1 min-w-0 min-h-[48px] px-2.5 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  roleTab === 'teacher'
                    ? 'bg-white dark:bg-[#0B1220] text-sky-700 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span className="truncate">Giáo viên quản lí</span>
              </button>
            </div>

            {filledHint && !errorMsg && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100 text-xs sm:text-sm font-medium">
                {filledHint}
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm font-medium"
              >
                {errorMsg}
              </div>
            )}

            {roleTab === 'student' ? (
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="classCode" className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Mã lớp
                    </label>
                    <input
                      id="classCode"
                      name="classCode"
                      type="text"
                      value={classCode}
                      onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                      placeholder="Ví dụ: 4A2"
                      autoComplete="off"
                      className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-base font-mono uppercase placeholder:normal-case placeholder:font-sans focus:border-sky-600 dark:focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="studentCode" className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Mã học sinh
                    </label>
                    <input
                      id="studentCode"
                      name="studentCode"
                      type="text"
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                      placeholder="Ví dụ: HS001"
                      autoComplete="off"
                      className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-base font-mono uppercase placeholder:normal-case placeholder:font-sans focus:border-sky-600 dark:focus:border-sky-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="studentPin" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      Mã PIN (6 chữ số)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin((prev) => !prev)}
                      className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showPin ? 'Ẩn PIN' : 'Hiện PIN'}
                    </button>
                  </div>
                  <input
                    id="studentPin"
                    name="pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Nhập 6 chữ số (giữ số 0 đầu)"
                    autoComplete="off"
                    className={`w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-lg font-mono placeholder:text-base placeholder:font-sans placeholder:tracking-normal focus:border-sky-600 dark:focus:border-sky-400 ${
                      pin.length > 0 ? 'tracking-[0.35em]' : ''
                    }`}
                  />

                  {/* Touch-friendly numpad for tablets/lab screens */}
                  <div className="grid grid-cols-6 gap-2 mt-3" aria-label="Bàn phím số nhập mã PIN">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleNumpadDigit(d)}
                        className="min-h-[44px] rounded-xl bg-slate-100 dark:bg-[#1A2742] hover:bg-sky-50 dark:hover:bg-[#233559] border border-slate-200 dark:border-[#334155] font-mono font-bold text-base text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleNumpadBackspace}
                      aria-label="Xóa một số"
                      className="col-span-2 min-h-[44px] rounded-xl bg-slate-100 dark:bg-[#1A2742] hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-slate-200 dark:border-[#334155] font-semibold text-sm text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Delete className="w-4 h-4" />
                      Xóa số
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1A2742] border border-slate-200 dark:border-[#334155] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={personalDevice}
                    onChange={(e) => setPersonalDevice(e.target.checked)}
                    className="w-5 h-5 mt-0.5 accent-sky-600 dark:accent-sky-400"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong className="font-semibold text-slate-900 dark:text-slate-100">Đây là máy riêng ở nhà</strong> (giữ đăng nhập 7 ngày; bỏ chọn nếu dùng máy chung ở phòng Tin học).
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[52px] rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 disabled:opacity-60 text-white font-display font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-5 h-5" />
                  {submitting ? 'Đang kiểm tra...' : 'Vào phòng thực hành'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleTeacherSubmit} className="space-y-4">
                <div>
                  <label htmlFor="teacherEmail" className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Email giáo viên
                  </label>
                  <input
                    id="teacherEmail"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="giaovien@truongtieuhoc.edu.vn"
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-base focus:border-sky-600 dark:focus:border-sky-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="teacherPassword" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    </button>
                  </div>
                  <input
                    id="teacherPassword"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu giáo viên"
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-base focus:border-sky-600 dark:focus:border-sky-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[52px] rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 disabled:opacity-60 text-white font-display font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Lock className="w-5 h-5" />
                  {submitting ? 'Đang xác thực...' : 'Đăng nhập Giáo viên'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      <footer className="py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Phòng thực hành Tin học 3, 4, 5 · Nội dung bám sát SGK Kết nối tri thức với cuộc sống
      </footer>
    </div>
  );
};

