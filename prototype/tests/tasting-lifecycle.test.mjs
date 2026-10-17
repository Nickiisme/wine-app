import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
const source = readFileSync(new URL('../src/lib/tastingDates.ts', import.meta.url), 'utf8');
const dates = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(source))}`);
test('calendar date has priority over late creation time', () => {
  assert.equal(dates.tastingDate({ tastedOn: '2026-09-01', createdAt: '2026-10-17T10:00:00Z' }), '2026-09-01');
});
test('rejects future dates and impossible dates', () => {
  assert.throws(() => dates.validateTastingDate('2026-10-18', '2026-10-17'));
  assert.throws(() => dates.validateTastingDate('2026-02-30', '2026-10-17'));
  assert.throws(() => dates.validateTastingDate('', '2026-10-17'));
  assert.equal(dates.validateTastingDate('2024-02-29', '2026-10-17'), '2024-02-29');
});
test('date-only survives timezone changes', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['Asia/Shanghai', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = zone;
      assert.equal(dates.tastingDate({ tastedOn: '2026-10-17' }), '2026-10-17');
      assert.match(dates.tastingLabel({ tastedOn: '2026-10-17' }), /2026.*10.*17/);
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
test('legacy full dates precede creation fallback; ambiguous dates remain unknown', () => {
  assert.equal(dates.tastingDate({ date: '2025-01-01', createdAt: '2026-10-17' }), '2025-01-01');
  assert.equal(dates.tastingDate({ date: '1月1日' }), '');
});
