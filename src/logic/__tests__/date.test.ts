import { describe, expect, it } from '@jest/globals';
import { addDays, daysBetween, daysToPrelims, lastNDays, localDate } from '../date';

describe('localDate', () => {
  it('formats a local Date as YYYY-MM-DD with zero padding', () => {
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('daysBetween', () => {
  it('counts consecutive days as 1', () => {
    expect(daysBetween('2026-10-06', '2026-10-07')).toBe(1);
  });

  it('is 0 for the same day and negative when going backwards', () => {
    expect(daysBetween('2026-10-07', '2026-10-07')).toBe(0);
    expect(daysBetween('2026-10-07', '2026-10-05')).toBe(-2);
  });

  it('crosses month boundaries', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
    expect(daysBetween('2026-09-30', '2026-10-02')).toBe(2);
  });

  it('handles February in leap and non-leap years', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2); // 2028 is a leap year
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('crosses year boundaries', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });
});

describe('addDays', () => {
  it('adds and subtracts days within a month', () => {
    expect(addDays('2026-10-07', 3)).toBe('2026-10-10');
    expect(addDays('2026-10-07', -1)).toBe('2026-10-06');
    expect(addDays('2026-10-07', 0)).toBe('2026-10-07');
  });

  it('rolls over month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('round-trips with daysBetween', () => {
    expect(daysBetween('2026-10-07', addDays('2026-10-07', 100))).toBe(100);
  });
});

describe('lastNDays', () => {
  it('returns 7 days by default, oldest first, ending today', () => {
    expect(lastNDays('2026-10-07')).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
    ]);
  });

  it('respects a custom length and crosses year boundaries', () => {
    expect(lastNDays('2027-01-02', 3)).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
  });
});

describe('daysToPrelims', () => {
  it('counts days until 24 May of the target year', () => {
    expect(daysToPrelims('2027-05-23', 2027)).toBe(1);
    expect(daysToPrelims('2027-05-24', 2027)).toBe(0);
    expect(daysToPrelims('2026-10-07', 2027)).toBe(229);
  });

  it('is never negative once the exam date has passed', () => {
    expect(daysToPrelims('2027-06-01', 2027)).toBe(0);
    expect(daysToPrelims('2030-01-01', 2027)).toBe(0);
  });
});
