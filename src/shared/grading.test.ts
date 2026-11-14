import test from 'node:test';
import assert from 'node:assert/strict';
import { getHoChiMinhWeekKey, getRankForXp, makeAwardId, rankLeaderboardEntries } from './grading';
import { gradeQuizAnswers, SAMPLE_LESSONS } from './lessonContent';

test('Rank tiers progress accurately', () => {
  assert.equal(getRankForXp(0).name, 'Tân binh');
  assert.equal(getRankForXp(49).name, 'Tân binh');
  assert.equal(getRankForXp(50).name, 'Khám phá');
  assert.equal(getRankForXp(120).name, 'Thành thạo');
  assert.equal(getRankForXp(250).name, 'Chuyên gia nhí');
});

test('Stable awardId prevents duplicate keys across retries', () => {
  assert.equal(makeAwardId('stu1', 'L4-B5', 'practice'), 'stu1__L4-B5__practice');
});

test('Ho Chi Minh ISO week key returns YYYY-Www format', () => {
  const wk = getHoChiMinhWeekKey(new Date('2026-11-12T10:00:00Z'));
  assert.match(wk, /^\d{4}-W\d{2}$/);
});

test('Leaderboard ranking handles ties with standard competition ranking (1, 1, 3)', () => {
  const { top } = rankLeaderboardEntries(
    [
      { uid: 'u1', nickname: 'Cáo Đỏ', avatarId: 'fox', weeklyXp: 30, syncVersion: 1 },
      { uid: 'u2', nickname: 'Sóc Nâu', avatarId: 'squirrel', weeklyXp: 30, syncVersion: 2 },
      { uid: 'u3', nickname: 'Gấu Trúc', avatarId: 'panda', weeklyXp: 20, syncVersion: 1 },
    ],
    10,
  );
  assert.equal(top[0].rank, 1);
  assert.equal(top[1].rank, 1);
  assert.equal(top[2].rank, 3);
});

test('Quiz grading calculates >= 80% pass threshold and hides solutions when requested', () => {
  const questions = SAMPLE_LESSONS['L4-B5'].questions;
  const answers: Record<string, unknown> = {};
  for (const q of questions) {
    answers[q.id] = q.correctAnswer;
  }
  const hidden = gradeQuizAnswers(questions, answers, false);
  assert.equal(hidden.scorePercent, 100);
  assert.equal(hidden.results[0].correctAnswer, undefined);

  const revealed = gradeQuizAnswers(questions, answers, true);
  assert.equal(revealed.scorePercent, 100);
  assert.ok(revealed.results[0].explanation);
});
