import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'header' | 'floating';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Chế độ sáng' : 'Chế độ tối';
  const ariaLabel = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={isDark}
        aria-label={ariaLabel}
        title={ariaLabel}
        data-testid="theme-toggle"
        className={`fixed bottom-4 right-4 z-40 min-h-[44px] px-4 py-2 rounded-full border shadow-lg flex items-center gap-2 font-display font-extrabold text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors no-print ${
          isDark
            ? 'bg-[#131D31] hover:bg-[#1A2742] text-amber-300 border-[#334155]'
            : 'bg-white hover:bg-sky-50 text-[#13264D] border-sky-200'
        } ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-300 shrink-0" />
        ) : (
          <Moon className="w-4 h-4 text-[#0361DE] shrink-0" />
        )}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-testid="theme-toggle"
      className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors no-print ${
        isDark
          ? 'bg-[#1A2742] hover:bg-[#233559] border-[#334155] text-amber-200'
          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-300 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-sky-700 shrink-0" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};
