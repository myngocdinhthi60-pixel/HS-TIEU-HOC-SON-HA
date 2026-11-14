import type { AwardType, LeaderboardEntry, RankTier } from './types';

export const XP_VALUES: Record<AwardType, number> = {
  practice: 20,
  quiz: 10,
  minigame: 5,
};

export const QUIZ_PASS_PERCENT = 80;

export const RANK_TIERS: RankTier[] = [
  { id: 'tan-binh', name: 'Tân binh', minXp: 0, nextMinXp: 50, badgeCode: 'BADGE_TAN_BINH' },
  { id: 'kham-pha', name: 'Khám phá', minXp: 50, nextMinXp: 120, badgeCode: 'BADGE_KHAM_PHA' },
  { id: 'thanh-thao', name: 'Thành thạo', minXp: 120, nextMinXp: 250, badgeCode: 'BADGE_THANH_THAO' },
  { id: 'chuyen-gia', name: 'Chuyên gia nhí', minXp: 250, nextMinXp: null, badgeCode: 'BADGE_CHUYEN_GIA' },
];

export function getRankForXp(totalXp: number): RankTier {
  let current = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (totalXp >= tier.minXp) {
      current = tier;
    }
  }
  return current;
}

export function makeAwardId(uid: string, lessonId: string, awardType: AwardType): string {
  return `${uid}__${lessonId}__${awardType}`;
}

/**
 * Computes ISO week key (YYYY-Www) in Asia/Ho_Chi_Minh timezone.
 */
export function getHoChiMinhWeekKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '2026');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');

  // Compute ISO week using UTC midnight of local Ho Chi Minh calendar date
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Ranks leaderboard entries descending by weeklyXp with dense-tie standard competition ranking (1, 1, 3).
 */
export function rankLeaderboardEntries(
  raw: Array<Omit<LeaderboardEntry, 'rank'>>,
  limit = 10,
): { top: LeaderboardEntry[]; allRanked: LeaderboardEntry[] } {
  const sorted = [...raw].sort((a, b) => {
    if (b.weeklyXp !== a.weeklyXp) return b.weeklyXp - a.weeklyXp;
    return a.nickname.localeCompare(b.nickname, 'vi');
  });

  const allRanked: LeaderboardEntry[] = [];
  let prevXp: number | null = null;
  let currentRank = 0;

  sorted.forEach((entry, idx) => {
    if (prevXp === null || entry.weeklyXp < prevXp) {
      currentRank = idx + 1;
      prevXp = entry.weeklyXp;
    }
    allRanked.push({ ...entry, rank: currentRank });
  });

  return {
    top: allRanked.slice(0, limit),
    allRanked,
  };
}
