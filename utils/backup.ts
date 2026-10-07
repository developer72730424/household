// バックアップ（JSON）の作成・読み込みと、バックアップ案内の表示判定。
import {
    normalizeCategories, normalizeEntries, normalizeTemplates, summarize, type Entry, type Template,
} from './entries.ts';
import { normalizeRules, type RecurringRule } from './recurring.ts';

export const BACKUP_VERSION = 2;
// これだけ空いたらバックアップを案内する
export const BACKUP_REMIND_DAYS = 14;
// 一度もバックアップしていない場合は、記録がこの件数に達してから案内する（使い始めに急かさない）
export const BACKUP_FIRST_REMIND_ENTRIES = 10;
export const BACKUP_SNOOZE_DAYS = 7;

export interface AppSnapshot {
    entries: Entry[];
    categories: string[];
    templates: Template[];
    recurring: RecurringRule[];
    budget: number | null;
}

export interface BackupPayload {
    app: 'household';
    version: number;
    exportDate: string;
    summary: { totalRecords: number; totalIncome: number; totalExpense: number };
    categories: string[];
    history: Entry[];
    templates: Template[];
    recurring: RecurringRule[];
    budget: number | null;
}

export function buildBackup(data: AppSnapshot, now: Date = new Date()): BackupPayload {
    const s = summarize(data.entries);
    return {
        app: 'household',
        version: BACKUP_VERSION,
        exportDate: now.toISOString(),
        summary: { totalRecords: s.count, totalIncome: s.income, totalExpense: s.expense },
        categories: data.categories,
        history: data.entries,
        templates: data.templates,
        recurring: data.recurring,
        budget: data.budget,
    };
}

export type ParsedBackup =
    | {
        ok: true;
        entries: Entry[];
        skipped: number;
        // 含まれていなかった項目は null / undefined（復元時に今の値を残す）
        categories: string[] | null;
        templates: Template[] | null;
        recurring: RecurringRule[] | null;
        budget: number | null | undefined;
    }
    | { ok: false; error: string };

// 貼り付けられたバックアップを検証して新形式にそろえる。旧バージョン（履歴とカテゴリだけ・金額が文字列）のものも読める
export function parseBackup(text: string): ParsedBackup {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text.trim());
    } catch {
        return { ok: false, error: 'JSONとして読み取れませんでした。エクスポートしたJSONをそのまま貼り付けてください。' };
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Record<string, unknown>).history)) {
        return { ok: false, error: 'このアプリのバックアップ形式ではありません。' };
    }
    const p = parsed as Record<string, unknown>;
    const rawHistory = p.history as unknown[];
    const { entries, skipped } = normalizeEntries(rawHistory);
    if (rawHistory.length > 0 && entries.length === 0) {
        return { ok: false, error: '記録を1件も読み取れませんでした。バックアップの内容を確認してください。' };
    }

    let budget: number | null | undefined;
    if (p.budget === null) budget = null;
    else if (typeof p.budget === 'number' && Number.isFinite(p.budget)) budget = p.budget > 0 ? Math.floor(p.budget) : null;

    return {
        ok: true,
        entries,
        skipped,
        categories: Array.isArray(p.categories) ? normalizeCategories(p.categories) : null,
        templates: Array.isArray(p.templates) ? normalizeTemplates(p.templates) : null,
        recurring: Array.isArray(p.recurring) ? normalizeRules(p.recurring) : null,
        budget,
    };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function shouldRemindBackup(args: {
    now: Date;
    lastBackupAt: string | null;
    snoozeUntil: string | null;
    entryCount: number;
}): boolean {
    const { now, lastBackupAt, snoozeUntil, entryCount } = args;
    if (entryCount === 0) return false;
    const snooze = snoozeUntil ? Date.parse(snoozeUntil) : NaN;
    if (!Number.isNaN(snooze) && now.getTime() < snooze) return false;
    const last = lastBackupAt ? Date.parse(lastBackupAt) : NaN;
    if (Number.isNaN(last)) return entryCount >= BACKUP_FIRST_REMIND_ENTRIES;
    return now.getTime() - last >= BACKUP_REMIND_DAYS * DAY_MS;
}

export const snoozeUntilFrom = (now: Date): string =>
    new Date(now.getTime() + BACKUP_SNOOZE_DAYS * DAY_MS).toISOString();
