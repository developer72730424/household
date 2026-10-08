import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareWithPreviousMonth, describeExpenseChange } from '../utils/compare.ts';
import type { Entry } from '../utils/entries.ts';

const e = (date: string, amount: number, type: Entry['type'] = 'expense'): Entry => ({
    id: date + amount + type, item: 'x', amount, category: type === 'income' ? '収入' : '食費', type, date,
});

test('比較: 支出が増えた', () => {
    const list = [e('2026-09-10', 10000), e('2026-10-05', 12000)];
    const c = compareWithPreviousMonth(list, new Date(2026, 9, 15));
    assert.equal(c.expenseDiff, 2000);
    assert.equal(c.expensePercent, 20);
    assert.equal(describeExpenseChange(c), '支出は先月より ¥2,000 増（+20%）');
});

test('比較: 支出が減った', () => {
    const c = compareWithPreviousMonth([e('2026-09-10', 10000), e('2026-10-05', 7500)], new Date(2026, 9, 1));
    assert.equal(describeExpenseChange(c), '支出は先月より ¥2,500 減（-25%）');
});

test('比較: 先月と同じ・先月に記録が無い・先月の支出が0', () => {
    assert.equal(describeExpenseChange(compareWithPreviousMonth([e('2026-09-10', 5), e('2026-10-10', 5)], new Date(2026, 9, 1))), '支出は先月と同じです');
    assert.equal(describeExpenseChange(compareWithPreviousMonth([e('2026-10-10', 5)], new Date(2026, 9, 1))), null);
    const onlyIncomeLast = compareWithPreviousMonth([e('2026-09-01', 100, 'income'), e('2026-10-10', 300)], new Date(2026, 9, 1));
    assert.equal(onlyIncomeLast.expensePercent, null);
    assert.equal(describeExpenseChange(onlyIncomeLast), '支出は先月より ¥300 増');
});

test('比較: 年をまたぐ（1月と前年12月）・収入の差も出る', () => {
    const c = compareWithPreviousMonth([e('2025-12-20', 1000), e('2026-01-05', 4000), e('2026-01-01', 900, 'income')], new Date(2026, 0, 10));
    assert.equal(c.previousMonth, '2025-12');
    assert.equal(c.expenseDiff, 3000);
    assert.equal(c.incomeDiff, 900);
});
