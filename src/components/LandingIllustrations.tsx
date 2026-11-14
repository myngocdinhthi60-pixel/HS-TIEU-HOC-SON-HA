import React from 'react';

export const SproutMonitorLogo: React.FC<{ variant?: 'light' | 'dark'; size?: 'md' | 'sm' }> = ({
  variant = 'light',
  size = 'md',
}) => {
  const stroke = variant === 'light' ? '#FFFFFF' : '#0166E3';
  const screenFill = variant === 'light' ? '#0C7CE8' : '#E8F4FF';
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';

  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${dim} shrink-0`}
      aria-hidden="true"
    >
      {/* Cute green sprout leaves on top right of monitor */}
      <path
        d="M27 12C27 7.5 31.5 5 35.5 5.5C35.5 9.5 32.5 13 27 12Z"
        fill="#6CE649"
        stroke="#2EA826"
        strokeWidth="1.2"
      />
      <path
        d="M26.5 12C24 8 20.5 7 18.5 8.5C19.5 11.5 23 13.5 26.5 12Z"
        fill="#8DF25C"
        stroke="#2EA826"
        strokeWidth="1.2"
      />
      {/* Monitor body */}
      <rect
        x="5"
        y="11"
        width="27"
        height="20"
        rx="4.5"
        fill={screenFill}
        stroke={stroke}
        strokeWidth="2.4"
      />
      {/* Smiling face inside monitor */}
      <circle cx="14.5" cy="19.5" r="1.6" fill={stroke} />
      <circle cx="22.5" cy="19.5" r="1.6" fill={stroke} />
      <path
        d="M15.5 23.2C17 25 20 25 21.5 23.2"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Monitor stand */}
      <path d="M18.5 31V35.5M12.5 35.5H24.5" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      {/* 3 warm yellow rays */}
      <path
        d="M36 16.5L40 14.5M36.5 21H41M35.5 25.5L39.5 27.5"
        stroke="#FACC15"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const HandUnderline: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 260 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M4 12.5C68 4.5 178 3.5 256 10.5"
      stroke="#1A82F5"
      strokeWidth="5.5"
      strokeLinecap="round"
    />
  </svg>
);

export const BurstRays: React.FC<{ color?: string; className?: string }> = ({
  color = '#FBBF24',
  className = 'w-6 h-6',
}) => (
  <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path d="M7 13L11 4" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
    <path d="M12 16L22 9" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
    <path d="M14 21L24 19" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

export const LeafCornerCluster: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  withFlowers?: boolean;
}> = ({ position, withFlowers = false }) => {
  const posClass =
    position === 'top-left'
      ? 'top-0 left-0'
      : position === 'top-right'
        ? 'top-0 right-0 scale-x-[-1]'
        : position === 'bottom-left'
          ? 'bottom-0 left-0 scale-y-[-1]'
          : 'bottom-0 right-0 scale-x-[-1] scale-y-[-1]';

  return (
    <svg
      viewBox="0 0 180 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none absolute ${posClass} w-28 sm:w-36 md:w-44 h-auto opacity-95`}
      aria-hidden="true"
    >
      {/* Back darker foliage */}
      <path d="M-10 -10H115C90 22 64 38 30 48C14 54 -10 80 -10 80V-10Z" fill="#52B728" fillOpacity="0.32" />
      {/* Individual crisp sunlit leaves */}
      <path d="M8 10C38 2 62 18 58 40C36 44 14 30 8 10Z" fill="#70D62E" />
      <path d="M16 14C34 18 46 28 54 38" stroke="#47A218" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M56 4C82 -2 108 12 102 32C82 36 62 24 56 4Z" fill="#8AE53B" />
      <path d="M64 8C80 12 90 20 98 28" stroke="#53B01E" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M98 2C122 -2 142 8 136 24C118 26 102 16 98 2Z" fill="#A4EE4B" />
      <path d="M2 42C28 32 52 46 46 68C24 72 6 58 2 42Z" fill="#5FC724" />
      <path d="M44 26C66 22 82 36 74 52C56 54 44 40 44 26Z" fill="#9BF046" />
      <path d="M0 72C18 68 32 82 26 98C12 98 0 88 0 72Z" fill="#75DA32" />

      {withFlowers && (
        <g transform="translate(36 44)">
          <circle cx="0" cy="-6" r="4" fill="#FFFFFF" />
          <circle cx="5.7" cy="-2" r="4" fill="#FFFFFF" />
          <circle cx="3.5" cy="4.8" r="4" fill="#FFFFFF" />
          <circle cx="-3.5" cy="4.8" r="4" fill="#FFFFFF" />
          <circle cx="-5.7" cy="-2" r="4" fill="#FFFFFF" />
          <circle cx="0" cy="0" r="3.4" fill="#FACC15" />
        </g>
      )}
    </svg>
  );
};
