import { describe, expect, it } from 'vitest';

import { ageOn, ageStatus } from './age.js';

describe('ageOn (BR-AUTH-05)', () => {
  it('counts a year on the birthday itself', () => {
    expect(ageOn('2010-06-15', '2026-06-14')).toBe(15);
    expect(ageOn('2010-06-15', '2026-06-15')).toBe(16);
  });

  it('compares the month before the day', () => {
    expect(ageOn('2010-06-15', '2026-05-30')).toBe(15);
    expect(ageOn('2010-06-15', '2026-07-01')).toBe(16);
  });

  it('moves a 29 February birthday to the 28th in common years', () => {
    expect(ageOn('2008-02-29', '2025-02-27')).toBe(16);
    expect(ageOn('2008-02-29', '2025-02-28')).toBe(17);
  });

  it('keeps a 29 February birthday in leap years', () => {
    expect(ageOn('2008-02-29', '2024-02-28')).toBe(15);
    expect(ageOn('2008-02-29', '2024-02-29')).toBe(16);
  });

  it('treats 1900 as a common year and 2000 as a leap year', () => {
    expect(ageOn('1896-02-29', '1900-02-28')).toBe(4);
    expect(ageOn('1996-02-29', '2000-02-28')).toBe(3);
  });

  it('is negative for a birthdate after today', () => {
    expect(ageOn('2026-11-23', '2026-11-22')).toBe(-1);
  });

  it.each(['2010-6-15', '15/06/2010', '', '2010-06-15T00:00:00Z'])('rejects %j', (date) => {
    expect(() => ageOn(date, '2026-11-22')).toThrow(RangeError);
    expect(() => ageOn('2010-06-15', date)).toThrow(RangeError);
  });
});

describe('ageStatus (BR-AUTH-05)', () => {
  const today = '2026-11-22';

  it('is under_minimum until the 16th birthday', () => {
    expect(ageStatus('2010-11-23', today)).toBe('under_minimum');
    expect(ageStatus('2026-11-23', today)).toBe('under_minimum');
  });

  it('is minor from the 16th birthday to the day before the 18th', () => {
    expect(ageStatus('2010-11-22', today)).toBe('minor');
    expect(ageStatus('2008-11-23', today)).toBe('minor');
  });

  it('is adult from the 18th birthday', () => {
    expect(ageStatus('2008-11-22', today)).toBe('adult');
    expect(ageStatus('1980-01-01', today)).toBe('adult');
  });
});
