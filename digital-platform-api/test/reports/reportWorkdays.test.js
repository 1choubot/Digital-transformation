import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getExpectedWorkdatesForWeek,
  getWeekStart,
  invertWeeklyRestMode,
  isExpectedWorkdate,
  resolveWeeklyRestMode
} from '../../src/domain/reportWorkdays.js';
import { WeeklyRestMode } from '../../src/domain/reports.js';

// The week-start helper must use natural weeks that begin on Monday.
test('getWeekStart resolves any date to the Monday of its natural week', () => {
  assert.equal(getWeekStart('2026-06-24'), '2026-06-22');
  assert.equal(getWeekStart('2026-06-28'), '2026-06-22');
  assert.equal(getWeekStart('2026-06-29'), '2026-06-29');
});

// The default mode is used independently when there is no historical anchor.
test('resolveWeeklyRestMode uses default double-rest mode when no anchor exists', () => {
  assert.equal(
    resolveWeeklyRestMode({
      targetWeekStart: '2026-06-22',
      latestAnchor: null,
      defaultMode: WeeklyRestMode.DOUBLE_REST
    }),
    WeeklyRestMode.DOUBLE_REST
  );
});

// A single-rest anchor alternates single -> double -> single by week distance.
test('resolveWeeklyRestMode alternates forward from a single-rest anchor', () => {
  const latestAnchor = {
    weekStart: '2026-06-15',
    restMode: WeeklyRestMode.SINGLE_REST
  };

  assert.equal(
    resolveWeeklyRestMode({ targetWeekStart: '2026-06-15', latestAnchor, defaultMode: WeeklyRestMode.DOUBLE_REST }),
    WeeklyRestMode.SINGLE_REST
  );
  assert.equal(
    resolveWeeklyRestMode({ targetWeekStart: '2026-06-22', latestAnchor, defaultMode: WeeklyRestMode.DOUBLE_REST }),
    WeeklyRestMode.DOUBLE_REST
  );
  assert.equal(
    resolveWeeklyRestMode({ targetWeekStart: '2026-06-29', latestAnchor, defaultMode: WeeklyRestMode.DOUBLE_REST }),
    WeeklyRestMode.SINGLE_REST
  );
});

// A double-rest anchor alternates double -> single -> double by week distance.
test('resolveWeeklyRestMode alternates forward from a double-rest anchor', () => {
  const latestAnchor = {
    weekStart: '2026-06-15',
    restMode: WeeklyRestMode.DOUBLE_REST
  };

  assert.equal(
    resolveWeeklyRestMode({ targetWeekStart: '2026-06-22', latestAnchor, defaultMode: WeeklyRestMode.DOUBLE_REST }),
    WeeklyRestMode.SINGLE_REST
  );
});

// Expected work dates are Monday-Friday for double-rest and Monday-Saturday for single-rest.
test('getExpectedWorkdatesForWeek returns the correct denominator dates', () => {
  assert.deepEqual(getExpectedWorkdatesForWeek('2026-06-22', WeeklyRestMode.DOUBLE_REST), [
    '2026-06-22',
    '2026-06-23',
    '2026-06-24',
    '2026-06-25',
    '2026-06-26'
  ]);
  assert.deepEqual(getExpectedWorkdatesForWeek('2026-06-22', WeeklyRestMode.SINGLE_REST), [
    '2026-06-22',
    '2026-06-23',
    '2026-06-24',
    '2026-06-25',
    '2026-06-26',
    '2026-06-27'
  ]);
});

// Saturday only counts in single-rest mode, and Sunday never counts in P0/P1.
test('isExpectedWorkdate handles Saturday and Sunday according to rest mode', () => {
  assert.equal(isExpectedWorkdate('2026-06-27', WeeklyRestMode.DOUBLE_REST), false);
  assert.equal(isExpectedWorkdate('2026-06-27', WeeklyRestMode.SINGLE_REST), true);
  assert.equal(isExpectedWorkdate('2026-06-28', WeeklyRestMode.SINGLE_REST), false);
});

// Invalid rest modes must fail fast instead of silently changing scoring rules.
test('invertWeeklyRestMode rejects unsupported rest modes', () => {
  assert.throws(() => invertWeeklyRestMode('holiday_calendar'));
});
