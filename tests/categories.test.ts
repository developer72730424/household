import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countUsage, fallbackCategory, removeCategory, renameCategory, type CategoryData } from '../utils/categories.ts';
import type { Entry } from '../utils/entries.ts';

const entry = (id: string, category: string, type: Entry['type'] = 'expense'): Entry => ({
    id, item: id, amount: 100, category, type, date: '2026-10-01',
});
const data = (): CategoryData => ({
    categories: ['食費', '日用品', 'その他'],
    entries: [entry('a', '食費'), entry('b', '食費'), entry('c', '日用品'), entry('s', '収入', 'income')],
    templates: [{ id: 't', name: '朝', item: 'パン', amount: '300', category: '食費' }],
    recurring: [{ id: 'r', item: '外食', amount: 5000, type: 'expense', category: '食費', day: 5, lastGenerated: '2026-09' }],
});

test('名前変更: 記録・テンプレート・固定費のカテゴリ名もいっしょに変わる', () => {
    const r = renameCategory(data(), '食費', '食費・外食');
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(r.data.categories, ['食費・外食', '日用品', 'その他']);
    assert.equal(r.moved, 2);
    assert.deepEqual(r.data.entries.filter(e => e.category === '食費・外食').map(e => e.id), ['a', 'b']);
    assert.equal(r.data.templates[0].category, '食費・外食');
    assert.equal(r.data.recurring[0].category, '食費・外食');
});

test('名前変更: 収入の記録は影響を受けない', () => {
    const r = renameCategory(data(), '食費', '外食');
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.data.entries.find(e => e.id === 's')?.category, '収入');
});

test('名前変更: 空・同じ名前・予約名・重複は拒否', () => {
    assert.equal(renameCategory(data(), '食費', '  ').ok, false);
    assert.equal(renameCategory(data(), '食費', '食費').ok, false);
    assert.equal(renameCategory(data(), '食費', '収入').ok, false);
    assert.equal(renameCategory(data(), '食費', '日用品').ok, false);
    assert.equal(renameCategory(data(), '無い', 'x').ok, false);
});

test('名前変更: 前後の空白は取り除く', () => {
    const r = renameCategory(data(), '食費', '  外食  ');
    assert.ok(r.ok);
    if (r.ok) assert.ok(r.data.categories.includes('外食'));
});

test('削除: 記録・テンプレート・固定費は「その他」へ移る', () => {
    const r = removeCategory(data(), '食費');
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(r.data.categories, ['日用品', 'その他']);
    assert.equal(r.moved, 2);
    assert.equal(r.data.entries.find(e => e.id === 'a')?.category, 'その他');
    assert.equal(r.data.templates[0].category, 'その他');
    assert.equal(r.data.recurring[0].category, 'その他');
    // 記録の件数は減らない
    assert.equal(r.data.entries.length, 4);
});

test('削除: 「その他」自身を消すときは先頭のカテゴリへ移る', () => {
    const d = data();
    d.entries.push(entry('z', 'その他'));
    const r = removeCategory(d, 'その他');
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.data.entries.find(e => e.id === 'z')?.category, '食費');
});

test('削除: 最後の1つは消せない', () => {
    const d = { ...data(), categories: ['食費'] };
    assert.equal(removeCategory(d, '食費').ok, false);
    assert.equal(fallbackCategory(['食費'], '食費'), null);
});

test('使用件数: 支出だけ数える', () => {
    assert.deepEqual(countUsage(data().entries), { 食費: 2, 日用品: 1 });
});
