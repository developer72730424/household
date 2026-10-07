import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateDueEntries, initialLastGenerated, normalizeRule, type RecurringRule } from '../utils/recurring.ts';

const rule = (day: number, last: string): RecurringRule => ({
    id: 'r', item: '家賃', amount: 80000, category: 'その他', day, lastGenerated: last,
});

test('新規ルール: 今月の発生日を過ぎていれば来月から', () => {
    assert.equal(initialLastGenerated(1, new Date(2026, 9, 7)), '2026-10');
    assert.equal(initialLastGenerated(25, new Date(2026, 9, 7)), '2026-09');
    assert.equal(initialLastGenerated(25, new Date(2026, 0, 7)), '2025-12');
});

test('発生日当日に登録される', () => {
    const r = generateDueEntries([rule(7, '2026-09')], new Date(2026, 9, 7, 9));
    assert.deepEqual(r.entries.map(x => x.date), ['2026-10-07']);
    assert.equal(r.entries[0].type, 'expense');
    assert.equal(r.entries[0].amount, 80000);
    assert.equal(r.updatedRules[0].lastGenerated, '2026-10');
});

test('発生日前は何もしない', () => {
    assert.equal(generateDueEntries([rule(25, '2026-09')], new Date(2026, 9, 7)).changed, false);
});

test('年をまたいで未起動の月を遡って登録し、再実行しても重複しない', () => {
    let r = generateDueEntries([rule(5, '2025-11')], new Date(2026, 1, 10));
    assert.deepEqual(r.entries.map(x => x.date), ['2025-12-05', '2026-01-05', '2026-02-05']);
    r = generateDueEntries(r.updatedRules, new Date(2026, 1, 10));
    assert.equal(r.changed, false);
});

test('登録されるIDが重複しない', () => {
    const r = generateDueEntries([rule(1, '2026-01'), { ...rule(1, '2026-01'), id: 'r2' }], new Date(2026, 5, 10));
    assert.equal(new Set(r.entries.map(x => x.id)).size, r.entries.length);
});

test('旧形式の固定費（金額が文字列・年月が Y/M）を読める', () => {
    const n = normalizeRule({ id: 'r', item: '家賃', amount: '80000', category: '住居', day: 7, lastGenerated: '2026/9' });
    assert.deepEqual(n, { id: 'r', item: '家賃', amount: 80000, category: '住居', day: 7, lastGenerated: '2026-09' });
});

test('不正な固定費は読み飛ばす（日が範囲外・金額が不正）', () => {
    assert.equal(normalizeRule({ amount: '100', day: 31, lastGenerated: '2026-09' }), null);
    assert.equal(normalizeRule({ amount: 'x', day: 5, lastGenerated: '2026-09' }), null);
    assert.equal(normalizeRule({ amount: '100', day: 5, lastGenerated: '2026-13' }), null);
});
