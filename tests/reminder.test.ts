import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_REMINDER, formatTime, hasEntryOn, normalizeReminder, parseTimeInput } from '../utils/reminder.ts';

test('設定の読み込み: 既定値と不正値の補正', () => {
    assert.deepEqual(normalizeReminder(undefined), DEFAULT_REMINDER);
    assert.deepEqual(normalizeReminder({ enabled: true, hour: 8, minute: 30 }), { enabled: true, hour: 8, minute: 30 });
    assert.deepEqual(normalizeReminder({ enabled: 'yes', hour: 25, minute: -1 }), { enabled: false, hour: 21, minute: 0 });
    assert.deepEqual(normalizeReminder({ enabled: true, hour: 8.5, minute: 'x' }), { enabled: true, hour: 21, minute: 0 });
});

test('時刻の入力: 全角・ゼロ埋め無しも読める', () => {
    assert.deepEqual(parseTimeInput('21:30'), { hour: 21, minute: 30 });
    assert.deepEqual(parseTimeInput('9:5'), { hour: 9, minute: 5 });
    assert.deepEqual(parseTimeInput('２１：３０'), { hour: 21, minute: 30 });
    assert.deepEqual(parseTimeInput(' 0:00 '), { hour: 0, minute: 0 });
});

test('時刻の入力: 範囲外・形式違いは拒否', () => {
    for (const bad of ['24:00', '12:60', '2130', '12', 'ab:cd', '', '12:3:4']) assert.equal(parseTimeInput(bad), null, bad);
});

test('時刻の表示とその日の記録有無', () => {
    assert.equal(formatTime(9, 5), '09:05');
    assert.equal(hasEntryOn(['2026-10-07', '2026-10-08'], '2026-10-08'), true);
    assert.equal(hasEntryOn(['2026-10-07'], '2026-10-08'), false);
});
