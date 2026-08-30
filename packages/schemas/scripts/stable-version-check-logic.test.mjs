import { describe, expect, it } from 'vitest';
import { findStableVersionViolations } from './stable-version-check-logic.mjs';

function json(obj) {
  return JSON.stringify(obj);
}

describe('findStableVersionViolations', () => {
  it('flags a stable file whose content changed without a version bump', () => {
    const before = { stability: 'stable', version: '1.0.0', description: 'old' };
    const after = { stability: 'stable', version: '1.0.0', description: 'new' };

    const violations = findStableVersionViolations(['a.json'], {
      readBefore: () => json(before),
      readAfter: () => json(after),
    });

    expect(violations).toEqual(['a.json']);
  });

  it('does not flag a stable file whose version was bumped along with the change', () => {
    const before = { stability: 'stable', version: '1.0.0', description: 'old' };
    const after = { stability: 'stable', version: '1.1.0', description: 'new' };

    const violations = findStableVersionViolations(['a.json'], {
      readBefore: () => json(before),
      readAfter: () => json(after),
    });

    expect(violations).toEqual([]);
  });

  it('does not flag a draft file that changed without a version bump', () => {
    const before = { stability: 'draft', version: '0.1.0', description: 'old' };
    const after = { stability: 'draft', version: '0.1.0', description: 'new' };

    const violations = findStableVersionViolations(['a.json'], {
      readBefore: () => json(before),
      readAfter: () => json(after),
    });

    expect(violations).toEqual([]);
  });

  it('does not flag a new file (no before content)', () => {
    const after = { stability: 'stable', version: '1.0.0', description: 'new' };

    const violations = findStableVersionViolations(['a.json'], {
      readBefore: () => undefined,
      readAfter: () => json(after),
    });

    expect(violations).toEqual([]);
  });

  it('does not flag a stable file with no actual content change', () => {
    const same = { stability: 'stable', version: '1.0.0', description: 'same' };

    const violations = findStableVersionViolations(['a.json'], {
      readBefore: () => json(same),
      readAfter: () => json(same),
    });

    expect(violations).toEqual([]);
  });

  it('checks every file independently and only reports actual violations', () => {
    const stableChanged = { stability: 'stable', version: '1.0.0', description: 'x' };
    const stableChangedAfter = { stability: 'stable', version: '1.0.0', description: 'y' };
    const stableBumped = { stability: 'stable', version: '1.0.0', description: 'x' };
    const stableBumpedAfter = { stability: 'stable', version: '2.0.0', description: 'y' };

    const violations = findStableVersionViolations(['bad.json', 'good.json'], {
      readBefore: (file) => (file === 'bad.json' ? json(stableChanged) : json(stableBumped)),
      readAfter: (file) =>
        file === 'bad.json' ? json(stableChangedAfter) : json(stableBumpedAfter),
    });

    expect(violations).toEqual(['bad.json']);
  });
});
