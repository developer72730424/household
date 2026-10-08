import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupFileName, checkPickedFile, MAX_BACKUP_BYTES } from '../utils/backup-file.ts';

test('ファイル名: 日付入り・ゼロ埋め', () => {
    assert.equal(backupFileName(new Date(2026, 0, 5)), 'household-backup-2026-01-05.json');
    assert.equal(backupFileName(new Date(2026, 9, 18)), 'household-backup-2026-10-18.json');
});

test('選んだファイル: JSON/テキストは通す', () => {
    assert.deepEqual(checkPickedFile({ name: 'a.json', size: 1000 }), { ok: true });
    assert.deepEqual(checkPickedFile({ name: 'A.JSON', size: 1000 }), { ok: true });
    assert.deepEqual(checkPickedFile({ name: 'memo.txt', size: 10 }), { ok: true });
    assert.deepEqual(checkPickedFile({ name: null, size: null }), { ok: true });
});

test('選んだファイル: 別の種類・大きすぎるものは拒否', () => {
    assert.equal(checkPickedFile({ name: 'a.png', size: 10 }).ok, false);
    assert.equal(checkPickedFile({ name: 'a.json', size: MAX_BACKUP_BYTES + 1 }).ok, false);
});
