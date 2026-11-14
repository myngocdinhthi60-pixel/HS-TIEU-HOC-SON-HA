import React from 'react';

const AVATAR_STYLES: Record<string, { bg: string; label: string; glyph: string; imageSrc?: string }> = {
  'cu-meo': { bg: '#E0F2FE', label: 'Cú Mèo', glyph: 'CM', imageSrc: '/assets/aistudio/cu-meo_7eaf17d1.png' },
  'mam-xanh': { bg: '#FCE7F3', label: 'Mầm Xanh', glyph: 'MX', imageSrc: '/assets/aistudio/mam-xanh_2b3bfef1.png' },
  'may-trang': { bg: '#E0F2FE', label: 'Mây Trắng', glyph: 'MT', imageSrc: '/assets/aistudio/may-trang_d69d2a72.png' },
  'ong-vang': { bg: '#FEF9C3', label: 'Ong Vàng', glyph: 'OV', imageSrc: '/assets/aistudio/ong-vang_abb6440f.png' },
  'sao-nho': { bg: '#EDE9FE', label: 'Sao Nhỏ', glyph: 'SN', imageSrc: '/assets/aistudio/sao-nho_ca1faa5a.png' },
  'soc-nau': { bg: '#FEF3C7', label: 'Sóc Nâu', glyph: 'SC', imageSrc: '/assets/aistudio/soc-nau_3bd888e3.png' },

  squirrel: { bg: '#FCE7F3', label: 'Sóc', glyph: 'S', imageSrc: '/assets/aistudio/mam-xanh_2b3bfef1.png' },
  fox: { bg: '#EDE9FE', label: 'Cáo', glyph: 'C', imageSrc: '/assets/aistudio/sao-nho_ca1faa5a.png' },
  panda: { bg: '#FEF3C7', label: 'Gấu', glyph: 'G', imageSrc: '/assets/aistudio/soc-nau_3bd888e3.png' },
  rabbit: { bg: '#E0F2FE', label: 'Thỏ', glyph: 'T', imageSrc: '/assets/aistudio/may-trang_d69d2a72.png' },
  cat: { bg: '#EDE9FE', label: 'Mèo', glyph: 'M', imageSrc: '/assets/aistudio/sao-nho_ca1faa5a.png' },
  elephant: { bg: '#DBEAFE', label: 'Voi', glyph: 'V', imageSrc: '/assets/aistudio/cu-meo_7eaf17d1.png' },
  deer: { bg: '#DCFCE7', label: 'Hươu', glyph: 'H', imageSrc: '/assets/aistudio/mam-xanh_2b3bfef1.png' },
  bird: { bg: '#FEF9C3', label: 'Én', glyph: 'É', imageSrc: '/assets/aistudio/ong-vang_abb6440f.png' },
  turtle: { bg: '#FEF3C7', label: 'Rùa', glyph: 'R', imageSrc: '/assets/aistudio/soc-nau_3bd888e3.png' },
  bee: { bg: '#FEF9C3', label: 'Ong', glyph: 'O', imageSrc: '/assets/aistudio/ong-vang_abb6440f.png' },
  owl: { bg: '#E0F2FE', label: 'Cú', glyph: 'C', imageSrc: '/assets/aistudio/may-trang_d69d2a72.png' },
  dolphin: { bg: '#CFFAFE', label: 'Cá heo', glyph: 'Đ', imageSrc: '/assets/aistudio/cu-meo_7eaf17d1.png' },
  teacher: { bg: '#E0F2FE', label: 'Giáo viên', glyph: 'GV' },
};

export const AvatarBadge: React.FC<{
  avatarId: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'circle';
}> = ({ avatarId, size = 'md', shape = 'rounded' }) => {
  const cfg = AVATAR_STYLES[avatarId] ?? AVATAR_STYLES.squirrel;
  const dims =
    size === 'sm'
      ? 'w-9 h-9 text-xs'
      : size === 'lg'
        ? 'w-14 h-14 text-lg'
        : 'w-11 h-11 text-sm';

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <span
      className={`${dims} ${shapeClass} inline-flex items-center justify-center font-display font-extrabold text-slate-900 border-2 border-[#C7E2FF] dark:border-slate-600 shrink-0 select-none overflow-hidden`}
      style={{ backgroundColor: cfg.bg }}
      aria-hidden="true"
    >
      {cfg.imageSrc ? (
        <img
          src={cfg.imageSrc}
          alt=""
          className="w-full h-full object-cover scale-[1.04]"
        />
      ) : (
        cfg.glyph
      )}
    </span>
  );
};
