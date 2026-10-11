import test from 'node:test';
import assert from 'node:assert/strict';
import { assessLiveSignalAlert } from '../lib/live-signals.ts';
const base = { fetchedAt: '2026-10-11T12:00:00Z', river: null, warnings: [] };
test('no observed data produces no alert', () => assert.equal(assessLiveSignalAlert({ ...base, rain: null }, 80), null));
test('normal observed rain produces no alert', () => assert.equal(assessLiveSignalAlert({ ...base, rain: { mmPerHour: 2, observedAt: base.fetchedAt, source: 'test' } }, 80), null));
test('increased rain produces watch', () => assert.equal(assessLiveSignalAlert({ ...base, rain: { mmPerHour: 8, observedAt: base.fetchedAt, source: 'test' } }, 80)?.level, 'watch'));
test('heavy rain produces elevated alert and hypothetical ETA', () => {
  const result = assessLiveSignalAlert({ ...base, rain: { mmPerHour: 32, observedAt: base.fetchedAt, source: 'test' } }, 95);
  assert.equal(result?.level, 'elevated');
  assert.match(result?.message ?? '', /95 minutes/);
});
test('observed river rise can trigger elevated alert', () => assert.equal(assessLiveSignalAlert({ ...base, rain: null, river: { siteId: '01234567', stageMeters: 3, recentRiseMeters: 0.35, observedAt: base.fetchedAt, source: 'test' } }, null)?.level, 'elevated'));
