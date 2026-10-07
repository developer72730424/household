import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    entriesInMonth, expenseByCategory, formatDisplayDate, hasLegacyShape, incomeBySource, monthlyTrend,
    normalizeCategories, normalizeDateString, normalizeEntries, normalizeEntry, parseAmount, sortEntries,
    restoreDeleted, summarize, toDateString, validateAmountInput, type Entry,
} from '../utils/entries.ts';

const e = (over: Partial<Entry>): Entry => ({
    id: 'x', item: 'a', amount: 100, category: '食費', type: 'expense', date: '2026-10-01', ...over,
});

test('日付: 旧形式をゼロ埋めの YYYY-MM-DD にそろえる', () => {
    assert.equal(normalizeDateString('2026/1/5'), '2026-01-05');
    assert.equal(normalizeDateString('2026-10-03'), '2026-10-03');
    assert.equal(normalizeDateString('2026-10-03T12:00:00.000Z'), '2026-10-03');
});

test('日付: 存在しない日付・不正な値は null', () => {
    assert.equal(normalizeDateString('2026/2/30'), null);
    assert.equal(normalizeDateString('2026/13/1'), null);
    assert.equal(normalizeDateString('abc'), null);
    assert.equal(normalizeDateString(undefined), null);
    assert.equal(normalizeDateString('2025/2/29'), null); // 平年
    assert.equal(normalizeDateString('2028/2/29'), '2028-02-29'); // うるう年
});

test('日付: Date との相互変換と表示用の形式', () => {
    assert.equal(toDateString(new Date(2026, 0, 5)), '2026-01-05');
    assert.equal(formatDisplayDate('2026-10-03'), '2026/10/3');
});

test('月の絞り込み: 1月に10〜12月が混ざらない（以前のバグ）', () => {
    const list = [e({ id: '1', date: '2026-01-20' }), e({ id: '2', date: '2026-10-06' }), e({ id: '3', date: '2026-12-31' })];
    assert.deepEqual(entriesInMonth(list, '2026-01').map(x => x.id), ['1']);
    assert.deepEqual(entriesInMonth(list, '2026-10').map(x => x.id), ['2']);
});

test('金額: 全角・カンマ・円記号を読める', () => {
    assert.equal(parseAmount('１，２００'), 1200);
    assert.equal(parseAmount('¥3,500円'), 3500);
    assert.equal(parseAmount('12a'), null);
    assert.equal(parseAmount(''), null);
    assert.equal(parseAmount(NaN), null);
});

test('金額入力: 1以上の整数のみ受け付ける', () => {
    assert.deepEqual(validateAmountInput('1,200'), { ok: true, value: 1200 });
    assert.equal(validateAmountInput('0').ok, false);
    assert.equal(validateAmountInput('-5').ok, false);
    assert.equal(validateAmountInput('12.5').ok, false);
    assert.equal(validateAmountInput('abc').ok, false);
    assert.equal(validateAmountInput('').ok, false);
});

test('移行: 旧形式の支出（金額が文字列・日付が Y/M/D）', () => {
    const r = normalizeEntry({ id: '170', item: 'ランチ', amount: '1200', category: '食費', date: '2026/10/3' });
    assert.deepEqual(r, { id: '170', item: 'ランチ', amount: 1200, category: '食費', type: 'expense', date: '2026-10-03' });
});

test('移行: カテゴリ名が「収入」の旧データは type=income になる', () => {
    const r = normalizeEntry({ id: '1', item: '給与', amount: '250000', category: '収入', date: '2026/10/1' });
    assert.equal(r?.type, 'income');
    assert.equal(r?.category, '収入');
    assert.equal(r?.amount, 250000);
});

test('移行: 負の金額は絶対値、小数は丸める', () => {
    assert.equal(normalizeEntry({ id: '1', item: 'a', amount: '-300', category: 'x', date: '2026/1/1' })?.amount, 300);
    assert.equal(normalizeEntry({ id: '1', item: 'a', amount: '12.6', category: 'x', date: '2026/1/1' })?.amount, 13);
});

test('移行: 新形式はそのまま（冪等）', () => {
    const entry = e({ id: 'abc' });
    assert.deepEqual(normalizeEntry(entry), entry);
    const once = normalizeEntries([{ id: '1', item: 'a', amount: '5', category: '食費', date: '2026/1/2' }]).entries;
    assert.deepEqual(normalizeEntries(once).entries, once);
});

test('移行: 読めない行は数えて除き、重複IDは振り直す', () => {
    const { entries, skipped } = normalizeEntries([
        { id: '1', item: 'ok', amount: '10', category: 'a', date: '2026/1/1' },
        { id: '1', item: 'dup', amount: '20', category: 'a', date: '2026/1/2' },
        { id: '2', item: 'bad date', amount: '10', category: 'a', date: 'いつか' },
        { id: '3', item: 'bad amount', amount: 'とても高い', category: 'a', date: '2026/1/1' },
        null,
    ]);
    assert.equal(entries.length, 2);
    assert.equal(skipped, 3);
    assert.notEqual(entries[0].id, entries[1].id);
});

test('旧形式の判定', () => {
    assert.equal(hasLegacyShape([{ id: '1', amount: '5', date: '2026/1/1', category: 'a', item: 'a' }]), true);
    assert.equal(hasLegacyShape([e({})]), false);
    assert.equal(hasLegacyShape([]), false);
    assert.equal(hasLegacyShape('x'), false);
});

test('カテゴリ: 空・重複・予約名「収入」を除く', () => {
    assert.deepEqual(normalizeCategories(['食費', ' 食費 ', '', '収入', '趣味', 3]), ['食費', '趣味']);
    assert.deepEqual(normalizeCategories([]), ['食費', '日用品', 'その他']);
    assert.deepEqual(normalizeCategories(undefined), ['食費', '日用品', 'その他']);
});

test('集計: 収入と支出を type で分ける', () => {
    const list = [
        e({ amount: 1200 }),
        e({ amount: 800, category: '日用品' }),
        e({ amount: 250000, type: 'income', category: '収入', item: '給与' }),
    ];
    assert.deepEqual(summarize(list), { income: 250000, expense: 2000, balance: 248000, count: 3 });
    assert.deepEqual(expenseByCategory(list), [{ name: '食費', amount: 1200 }, { name: '日用品', amount: 800 }]);
    assert.deepEqual(incomeBySource(list), [{ name: '給与', amount: 250000 }]);
});

test('集計: 「収入」という名前の支出カテゴリが無いので収入と混ざらない', () => {
    // 旧データで type が無く category が「収入」のものだけが収入になる
    const { entries } = normalizeEntries([
        { id: '1', item: '給与', amount: '100', category: '収入', date: '2026/1/1' },
        { id: '2', item: '食事', amount: '50', category: '食費', date: '2026/1/1' },
    ]);
    assert.deepEqual(summarize(entries), { income: 100, expense: 50, balance: 50, count: 2 });
});

test('月別推移: 年をまたぐ', () => {
    const list = [e({ date: '2025-12-10', amount: 100 }), e({ date: '2026-01-05', amount: 300, type: 'income', category: '収入' })];
    const trend = monthlyTrend(list, new Date(2026, 1, 15), 3);
    assert.deepEqual(trend, [
        { month: '2025-12', income: 0, expense: 100 },
        { month: '2026-01', income: 300, expense: 0 },
        { month: '2026-02', income: 0, expense: 0 },
    ]);
});

test('並び替え: 日付の新しい順、同じ日は元の順を保つ', () => {
    const sorted = sortEntries([
        e({ id: 'a', date: '2026-10-01' }),
        e({ id: 'b', date: '2026-10-05' }),
        e({ id: 'c', date: '2026-10-01' }),
    ]);
    assert.deepEqual(sorted.map(x => x.id), ['b', 'a', 'c']);
});

test('削除の取り消し: 戻した記録は一覧に入り、日付順の表示で元の位置に並ぶ', () => {
    const a = e({ id: 'a', date: '2026-10-05' });
    const b = e({ id: 'b', date: '2026-10-03' });
    const c = e({ id: 'c', date: '2026-10-01' });
    const after = restoreDeleted([a, c], b);
    assert.equal(after.length, 3);
    assert.deepEqual(sortEntries(after).map(x => x.id), ['a', 'b', 'c']);
});

test('削除の取り消し: すでに戻っている記録は二重に戻さない', () => {
    const a = e({ id: 'a' });
    const list = [a];
    assert.equal(restoreDeleted(list, a), list); // 同じ配列をそのまま返す（変更なし）
});
