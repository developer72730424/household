import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    categoryBudgetStatuses, normalizeCategoryBudgets, renameCategoryBudget, withCategoryBudget,
} from '../utils/category-budget.ts';
import type { Entry } from '../utils/entries.ts';

const e = (category: string, amount: number, type: Entry['type'] = 'expense'): Entry => ({
    id: category + amount, item: 'x', amount, category, type, date: '2026-10-01',
});

test('状況: 使用率に応じて ok / warn / over、使いすぎが上', () => {
    const list = [e('食費', 40000), e('日用品', 4000), e('趣味', 12000)];
    const s = categoryBudgetStatuses(list, { 食費: 50000, 日用品: 10000, 趣味: 10000 });
    assert.deepEqual(s.map(x => [x.category, x.level]), [['趣味', 'over'], ['食費', 'warn'], ['日用品', 'ok']]);
    assert.equal(s[0].remaining, -2000);
    assert.equal(s[1].remaining, 10000);
});

test('状況: ちょうど上限は超過ではない・80%ちょうどは警告・記録が無ければ0', () => {
    const s = categoryBudgetStatuses([e('食費', 10000), e('日用品', 8000)], { 食費: 10000, 日用品: 10000, 趣味: 5000 });
    const by = Object.fromEntries(s.map(x => [x.category, x]));
    assert.equal(by['食費'].level, 'warn');
    assert.equal(by['日用品'].level, 'warn');
    assert.equal(by['趣味'].spent, 0);
    assert.equal(by['趣味'].level, 'ok');
});

test('状況: 収入は支出に数えない', () => {
    const s = categoryBudgetStatuses([e('食費', 100), e('収入', 999999, 'income')], { 食費: 1000 });
    assert.equal(s[0].spent, 100);
});

test('設定と解除（元のオブジェクトは変えない）', () => {
    const base = { 食費: 1000 };
    assert.deepEqual(withCategoryBudget(base, '日用品', 500.9), { 食費: 1000, 日用品: 500 });
    assert.deepEqual(base, { 食費: 1000 });
    assert.deepEqual(withCategoryBudget(base, '食費', null), {});
    assert.deepEqual(withCategoryBudget(base, '食費', 0), {});
});

test('読み込み: 不正な値と「収入」を除く', () => {
    assert.deepEqual(normalizeCategoryBudgets({ 食費: 100, 収入: 5, 趣味: -1, 旅行: 'x', '': 3, 日用品: 99.9 }), { 食費: 100, 日用品: 99 });
    assert.deepEqual(normalizeCategoryBudgets(null), {});
    assert.deepEqual(normalizeCategoryBudgets([1]), {});
});

test('名前変更: 予算も新しい名前へ付け替える（移し先に既にあればそちらを残す）', () => {
    assert.deepEqual(renameCategoryBudget({ 食費: 1000, 日用品: 500 }, '食費', '外食'), { 日用品: 500, 外食: 1000 });
    assert.deepEqual(renameCategoryBudget({ 食費: 1000, その他: 300 }, '食費', 'その他'), { その他: 300 });
    const same = { 日用品: 500 };
    assert.equal(renameCategoryBudget(same, '食費', '外食'), same);
});
