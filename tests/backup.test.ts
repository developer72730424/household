import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBackup, parseBackup, shouldRemindBackup, snoozeUntilFrom } from '../utils/backup.ts';
import type { Entry } from '../utils/entries.ts';

const entry: Entry = { id: 'a', item: 'ランチ', amount: 1200, category: '食費', type: 'expense', date: '2026-10-03' };
const snapshot = {
    entries: [entry],
    categories: ['食費'],
    templates: [{ id: 't', name: '朝食', item: 'パン', amount: '300', category: '食費' }],
    recurring: [{ id: 'r', item: '家賃', amount: 80000, type: 'expense' as const, category: '食費', day: 7, lastGenerated: '2026-10' }],
    budget: 50000,
};

test('バックアップを作って、そのまま読み戻せる（往復で同じ）', () => {
    const text = JSON.stringify(buildBackup(snapshot, new Date('2026-10-07T00:00:00Z')), null, 2);
    const parsed = parseBackup(text);
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.entries, snapshot.entries);
    assert.deepEqual(parsed.categories, snapshot.categories);
    assert.deepEqual(parsed.templates, snapshot.templates);
    assert.deepEqual(parsed.recurring, snapshot.recurring);
    assert.equal(parsed.budget, 50000);
    assert.equal(parsed.skipped, 0);
});

test('旧バージョンのバックアップ（履歴とカテゴリだけ・旧形式）も読める', () => {
    const old = JSON.stringify({
        exportDate: '2026-01-01T00:00:00Z',
        version: '1.0',
        categories: ['食費', '収入'],
        history: [
            { id: '1', item: 'ランチ', amount: '1200', category: '食費', date: '2026/10/3' },
            { id: '2', item: '給与', amount: '250000', category: '収入', date: '2026/10/1' },
        ],
    });
    const parsed = parseBackup(old);
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.entries.map(x => [x.type, x.amount, x.date]), [['expense', 1200, '2026-10-03'], ['income', 250000, '2026-10-01']]);
    assert.deepEqual(parsed.categories, ['食費']); // 予約名「収入」は除かれる
    assert.equal(parsed.templates, null);          // 含まれない項目は今の値を残す
    assert.equal(parsed.recurring, null);
    assert.equal(parsed.budget, undefined);
});

test('読めない行があれば件数を返す', () => {
    const parsed = parseBackup(JSON.stringify({ history: [{ id: '1', item: 'a', amount: '1', category: 'x', date: '2026/1/1' }, { id: '2', amount: 'x', date: '?' }] }));
    assert.ok(parsed.ok);
    if (parsed.ok) assert.equal(parsed.skipped, 1);
});

test('壊れたJSON・別の形式・全行が不正なものは拒否', () => {
    assert.equal(parseBackup('{oops').ok, false);
    assert.equal(parseBackup('[]').ok, false);
    assert.equal(parseBackup('{"foo":1}').ok, false);
    assert.equal(parseBackup(JSON.stringify({ history: [{ x: 1 }, { y: 2 }] })).ok, false);
});

test('空の履歴のバックアップは読める（空にリセットする用途）', () => {
    assert.ok(parseBackup(JSON.stringify({ history: [] })).ok);
});

test('バックアップ案内: 記録が無ければ出さない', () => {
    assert.equal(shouldRemindBackup({ now: new Date(), lastBackupAt: null, snoozeUntil: null, entryCount: 0 }), false);
});

test('バックアップ案内: 一度もしていない場合は10件たまってから', () => {
    const base = { now: new Date('2026-10-07T00:00:00Z'), lastBackupAt: null, snoozeUntil: null };
    assert.equal(shouldRemindBackup({ ...base, entryCount: 9 }), false);
    assert.equal(shouldRemindBackup({ ...base, entryCount: 10 }), true);
});

test('バックアップ案内: 14日以上空いたら出す', () => {
    const now = new Date('2026-10-20T00:00:00Z');
    assert.equal(shouldRemindBackup({ now, lastBackupAt: '2026-10-07T00:00:00Z', snoozeUntil: null, entryCount: 50 }), false);
    assert.equal(shouldRemindBackup({ now, lastBackupAt: '2026-10-06T00:00:00Z', snoozeUntil: null, entryCount: 50 }), true);
});

test('バックアップ案内: 「あとで」を押した間は出さず、過ぎたら再開', () => {
    const now = new Date('2026-10-20T00:00:00Z');
    const snooze = snoozeUntilFrom(now);
    const args = { lastBackupAt: '2026-01-01T00:00:00Z', snoozeUntil: snooze, entryCount: 50 };
    assert.equal(shouldRemindBackup({ ...args, now }), false);
    assert.equal(shouldRemindBackup({ ...args, now: new Date('2026-10-28T00:00:00Z') }), true);
});

test('バックアップ案内: 日時が壊れていても落ちない', () => {
    assert.equal(shouldRemindBackup({ now: new Date(), lastBackupAt: 'xx', snoozeUntil: 'yy', entryCount: 20 }), true);
});
