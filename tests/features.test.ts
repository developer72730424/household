import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeYear, yearsWithEntries } from '../utils/annual.ts';
import { MEMO_MAX_LENGTH, normalizeEntry, type Entry } from '../utils/entries.ts';
import { isPlanned, splitPlanned } from '../utils/planned.ts';

const e = (date: string, amount: number, type: Entry['type'] = 'expense', category = '食費'): Entry => ({
    id: date + amount + type + category, item: 'x', amount, category: type === 'income' ? '収入' : category, type, date,
});

test('メモ・支払い方法・写真: 正しい値だけ読み込む', () => {
    const base = { id: '1', item: 'a', amount: 100, category: '食費', date: '2026-10-01' };
    const ok = normalizeEntry({ ...base, memo: '  友人と  ', payment: 'カード', photo: 'abc-1.jpg' });
    assert.deepEqual([ok?.memo, ok?.payment, ok?.photo], ['友人と', 'カード', 'abc-1.jpg']);
    const bad = normalizeEntry({ ...base, memo: '   ', payment: 'ビットコイン', photo: '../../secret.jpg' });
    assert.deepEqual([bad?.memo, bad?.payment, bad?.photo], [undefined, undefined, undefined]);
    assert.equal(normalizeEntry({ ...base, memo: 'あ'.repeat(MEMO_MAX_LENGTH + 50) })?.memo?.length, MEMO_MAX_LENGTH);
});

test('支払い方法: 収入には付かない・旧データ（項目なし）はそのまま読める', () => {
    const income = normalizeEntry({ id: '1', item: '給与', amount: 1, category: '収入', date: '2026-10-01', payment: '現金' });
    assert.equal(income?.payment, undefined);
    const old = normalizeEntry({ id: '2', item: 'a', amount: '5', category: '食費', date: '2026/10/1' });
    assert.deepEqual(old && 'memo' in old, false);
});

test('年間集計: 12か月分・合計・貯蓄率・支出の多い月', () => {
    const list = [
        e('2026-01-10', 10000), e('2026-01-25', 5000, 'income'),
        e('2026-03-05', 30000, 'expense', '日用品'), e('2026-03-06', 20000, 'income'),
        e('2025-12-31', 99999),
    ];
    const s = summarizeYear(list, 2026);
    assert.equal(s.months.length, 12);
    assert.deepEqual([s.income, s.expense, s.balance, s.count], [25000, 40000, -15000, 4]);
    assert.equal(s.maxExpenseMonth, 3);
    assert.equal(s.savingsRate, -60);
    assert.deepEqual(s.topExpenseCategories.map(c => c.name), ['日用品', '食費']);
    assert.equal(s.months[1].count, 0);
});

test('年間集計: 記録が無い年・収入が0の年', () => {
    const empty = summarizeYear([], 2026);
    assert.deepEqual([empty.expense, empty.savingsRate, empty.maxExpenseMonth], [0, null, null]);
    assert.equal(summarizeYear([e('2026-02-01', 100)], 2026).savingsRate, null);
});

test('記録のある年: 新しい順・今年は常に含む', () => {
    assert.deepEqual(yearsWithEntries([e('2024-05-01', 1), e('2026-01-01', 1)], 2026), [2026, 2024]);
    assert.deepEqual(yearsWithEntries([], 2026), [2026]);
});

test('予定: 今日より後だけが予定（今日は実績）', () => {
    assert.equal(isPlanned(e('2026-10-08', 1), '2026-10-08'), false);
    assert.equal(isPlanned(e('2026-10-09', 1), '2026-10-08'), true);
});

test('予定: 月の記録を実績と予定に分ける', () => {
    const month = [e('2026-10-05', 1000), e('2026-10-20', 5000), e('2026-10-25', 300000, 'income')];
    assert.deepEqual(splitPlanned(month, '2026-10-08'), {
        plannedExpense: 5000, plannedIncome: 300000, plannedCount: 2, actualExpense: 1000, actualIncome: 0,
    });
});

import { LOCK_GRACE_SECONDS, shouldLockOnLaunch, shouldLockOnResume } from '../utils/app-lock.ts';
import { isValidReceiptFileName, orphanReceipts, receiptFileName } from '../utils/receipt-photo.ts';

test('ロック: 無効なら何もしない・起動直後は必ずロック', () => {
    assert.equal(shouldLockOnResume({ enabled: false, leftAt: 0, now: 999999 }), false);
    assert.equal(shouldLockOnLaunch(true), true);
    assert.equal(shouldLockOnLaunch(false), false);
});

test('ロック: 猶予時間内はロックしない・過ぎたらロック・時刻不明は安全側', () => {
    const now = 1_000_000;
    assert.equal(shouldLockOnResume({ enabled: true, leftAt: now - (LOCK_GRACE_SECONDS - 1) * 1000, now }), false);
    assert.equal(shouldLockOnResume({ enabled: true, leftAt: now - LOCK_GRACE_SECONDS * 1000, now }), true);
    assert.equal(shouldLockOnResume({ enabled: true, leftAt: null, now }), true);
    assert.equal(shouldLockOnResume({ enabled: true, leftAt: now - 5000, now, graceSeconds: 0 }), true);
});

test('レシート写真: ファイル名は安全な文字だけ', () => {
    assert.equal(receiptFileName('abc_123-x', 'JPG'), 'abc_123-x.jpg');
    assert.equal(receiptFileName('../../etc/passwd', 'jpeg'), 'etcpasswd.jpeg');
    assert.equal(receiptFileName('', ''), 'receipt.jpg');
    assert.equal(isValidReceiptFileName('a-1.jpg'), true);
    assert.equal(isValidReceiptFileName('../x.jpg'), false);
    assert.equal(isValidReceiptFileName('.hidden'), false);
    assert.equal(isValidReceiptFileName('a/b.jpg'), false);
});

test('レシート写真: どの記録にも使われていない写真だけを見つける', () => {
    assert.deepEqual(orphanReceipts(['a.jpg', 'b.jpg', 'c.jpg'], ['a.jpg', undefined, 'c.jpg']), ['b.jpg']);
    assert.deepEqual(orphanReceipts([], ['a.jpg']), []);
    assert.deepEqual(orphanReceipts(['a.jpg'], []), ['a.jpg']);
});
