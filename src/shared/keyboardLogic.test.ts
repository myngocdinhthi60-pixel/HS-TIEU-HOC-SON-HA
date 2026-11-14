import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateKeystroke, getKeySpec, gradeL3B5Practice } from './keyboardLogic';

test('F and J are marked as tactile bump keys on home row', () => {
  const f = getKeySpec('f');
  const j = getKeySpec('j');
  assert.equal(f?.row, 'home');
  assert.equal(f?.isBump, true);
  assert.equal(f?.finger, 'L2');
  assert.equal(j?.row, 'home');
  assert.equal(j?.isBump, true);
  assert.equal(j?.finger, 'R2');
});

test('Keystroke evaluation matches and keeps target on mismatch', () => {
  assert.equal(evaluateKeystroke('f', 'f').matched, true);
  assert.equal(evaluateKeystroke('f', 'g').matched, false);
});

test('L3-B5 practice grader enforces all 3 drills, >= 75% accuracy, and finger check', () => {
  assert.equal(
    gradeL3B5Practice({
      completedSequences: ['home-row-basic', 'home-row-reach', 'top-bottom-mix'],
      accuracy: 92,
      selfCheckFingers: true,
    }).passed,
    true,
  );
  assert.equal(
    gradeL3B5Practice({
      completedSequences: ['home-row-basic'],
      accuracy: 95,
      selfCheckFingers: true,
    }).passed,
    false,
  );
});
