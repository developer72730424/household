import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectiveBudget, normalizeOverrides, withMonthBudget } from '../utils/budget.ts';

test('予算: その月だけの設定が無ければ共通の予算', () => {
    assert.deepEqual(effectiveBudget(50000, {}, '2026-10'), { amount: 50000, isOverride: false });
    assert.deepEqual(effectiveBudget(null, {}, '2026-10'), { amount: null, isOverride: false });
});

test('予算: その月だけの設定があれば優先（共通の予算が無くても有効）', () => {
    assert.deepEqual(effectiveBudget(50000, { '2026-10': 80000 }, '2026-10'), { amount: 80000, isOverride: true });
    assert.deepEqual(effectiveBudget(null, { '2026-10': 80000 }, '2026-10'), { amount: 80000, isOverride: true });
    // 別の月には影響しない
    assert.deepEqual(effectiveBudget(50000, { '2026-10': 80000 }, '2026-11'), { amount: 50000, isOverride: false });
});

test('予算: 設定と解除（元のオブジェクトは変えない）', () => {
    const base = { '2026-09': 30000 };
    const added = withMonthBudget(base, '2026-10', 80000.9);
    assert.deepEqual(added, { '2026-09': 30000, '2026-10': 80000 });
    assert.deepEqual(base, { '2026-09': 30000 });
    assert.deepEqual(withMonthBudget(added, '2026-10', null), { '2026-09': 30000 });
    assert.deepEqual(withMonthBudget(added, '2026-10', 0), { '2026-09': 30000 });
});

test('予算: 読み込み時に不正な月・値を除く', () => {
    assert.deepEqual(
        normalizeOverrides({ '2026-10': 5000, '2026-13': 1, '2026-1': 1, '2026-09': -5, '2026-08': 'x', '2026-07': 1000.7 }),
        { '2026-10': 5000, '2026-07': 1000 },
    );
    assert.deepEqual(normalizeOverrides(null), {});
    assert.deepEqual(normalizeOverrides([1, 2]), {});
});
