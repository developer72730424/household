import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { snoozeUntilFrom, type AppSnapshot, type ParsedBackup } from '@/utils/backup';
import {
    hasLegacyShape, INCOME_LABEL, newEntryId, normalizeCategories, normalizeEntries, normalizeTemplates,
    type Entry, type EntryType, type Template,
} from '@/utils/entries';
import { generateDueEntries, normalizeRules, type RecurringRule } from '@/utils/recurring';

// 保存先のキー。履歴・カテゴリ・テンプレートは旧バージョンと同じキーを使い続ける（中身は読み込み時に新形式へ移行する）
const KEYS = {
    entries: '@expense_history_Default',
    categories: '@app_categories_Default',
    templates: '@app_templates_Default',
    budget: '@app_budget_Default',
    recurring: '@app_recurring_Default',
    lastBackupAt: '@app_last_backup_at',
    backupSnoozeUntil: '@app_backup_snooze_until',
} as const;
// 新形式へ移行する前の履歴をそのまま残しておく場所（移行で問題が起きても元に戻せる）
const LEGACY_BACKUP_KEY = '@expense_history_Default_legacy_backup';

export interface AppData {
    entries: Entry[];
    categories: string[];
    templates: Template[];
    recurring: RecurringRule[];
    budget: number | null;
    lastBackupAt: string | null;
    backupSnoozeUntil: string | null;
}

const EMPTY: AppData = {
    entries: [],
    categories: normalizeCategories(undefined),
    templates: [],
    recurring: [],
    budget: null,
    lastBackupAt: null,
    backupSnoozeUntil: null,
};

export interface EntryInput {
    item: string;
    amount: number;
    category: string;
    type: EntryType;
    date: string; // YYYY-MM-DD
}

export type ActionResult = { ok: true } | { ok: false; message: string };

interface AppDataActions {
    addEntry: (input: EntryInput) => Entry;
    updateEntry: (id: string, input: EntryInput) => void;
    deleteEntry: (id: string) => void;
    addCategory: (name: string) => ActionResult;
    deleteCategory: (name: string) => void;
    addTemplate: (template: Template) => void;
    deleteTemplate: (id: string) => void;
    setBudget: (budget: number | null) => void;
    addRecurring: (rule: RecurringRule) => void;
    deleteRecurring: (id: string) => void;
    restoreBackup: (parsed: Extract<ParsedBackup, { ok: true }>) => Promise<void>;
    resetEntries: () => Promise<void>;
    markBackedUp: () => void;
    snoozeBackup: () => void;
    getSnapshot: () => AppSnapshot;
}

type AppDataContextValue = AppData & AppDataActions & { loaded: boolean };

const AppDataContext = createContext<AppDataContextValue | null>(null);

function parseJson(raw: string | null | undefined): { ok: true; value: unknown } | { ok: false } {
    if (raw == null) return { ok: true, value: undefined };
    try {
        return { ok: true, value: JSON.parse(raw) };
    } catch {
        return { ok: false };
    }
}

// 保存データを読み込み、新形式への移行と固定費の自動登録まで行う
async function loadAll(): Promise<{ data: AppData; notice: string | null }> {
    const pairs = await AsyncStorage.multiGet(Object.values(KEYS));
    const raw: Record<string, string | null> = Object.fromEntries(pairs);
    const writes: Promise<void>[] = [];
    const notices: string[] = [];

    // 履歴
    let entries: Entry[] = [];
    const parsedHistory = parseJson(raw[KEYS.entries]);
    if (!parsedHistory.ok || (parsedHistory.value !== undefined && !Array.isArray(parsedHistory.value))) {
        // 壊れていて読めない（配列でない）場合は、上書きしてしまう前にそのまま退避する
        writes.push(AsyncStorage.setItem(`${KEYS.entries}_corrupt_${Date.now()}`, raw[KEYS.entries] ?? ''));
        notices.push('保存されていた履歴を読み込めませんでした。壊れたデータは端末内に退避してあります。');
    } else if (parsedHistory.value !== undefined) {
        const { entries: normalized, skipped } = normalizeEntries(parsedHistory.value);
        entries = normalized;
        if (hasLegacyShape(parsedHistory.value) || skipped > 0) {
            const existing = await AsyncStorage.getItem(LEGACY_BACKUP_KEY);
            if (existing == null) writes.push(AsyncStorage.setItem(LEGACY_BACKUP_KEY, raw[KEYS.entries] ?? ''));
        }
        if (skipped > 0) notices.push(`日付や金額を読み取れない記録が${skipped}件あったため、表示から除きました。`);
        if (JSON.stringify(normalized) !== raw[KEYS.entries]) {
            writes.push(AsyncStorage.setItem(KEYS.entries, JSON.stringify(normalized)));
        }
    }

    // カテゴリ・テンプレート・固定費
    const categoriesParsed = parseJson(raw[KEYS.categories]);
    const categories = normalizeCategories(categoriesParsed.ok ? categoriesParsed.value : undefined);
    if (categoriesParsed.ok && categoriesParsed.value !== undefined && JSON.stringify(categories) !== raw[KEYS.categories]) {
        writes.push(AsyncStorage.setItem(KEYS.categories, JSON.stringify(categories)));
    }

    const templatesParsed = parseJson(raw[KEYS.templates]);
    const templates = normalizeTemplates(templatesParsed.ok ? templatesParsed.value : undefined);
    if (templatesParsed.ok && templatesParsed.value !== undefined && JSON.stringify(templates) !== raw[KEYS.templates]) {
        writes.push(AsyncStorage.setItem(KEYS.templates, JSON.stringify(templates)));
    }

    const recurringParsed = parseJson(raw[KEYS.recurring]);
    let recurring = normalizeRules(recurringParsed.ok ? recurringParsed.value : undefined);

    // 固定費: 発生日を迎えた分を履歴へ追加（履歴の読み込みと同時に行うので、空の配列で上書きすることはない）
    const due = generateDueEntries(recurring);
    if (due.changed) {
        entries = [...due.entries.reverse(), ...entries];
        recurring = due.updatedRules;
        writes.push(AsyncStorage.setItem(KEYS.entries, JSON.stringify(entries)));
    }
    if (recurringParsed.ok && recurringParsed.value !== undefined && (due.changed || JSON.stringify(recurring) !== raw[KEYS.recurring])) {
        writes.push(AsyncStorage.setItem(KEYS.recurring, JSON.stringify(recurring)));
    }

    const budgetNumber = Number(raw[KEYS.budget]);
    const budget = raw[KEYS.budget] != null && Number.isFinite(budgetNumber) && budgetNumber > 0 ? Math.floor(budgetNumber) : null;

    await Promise.all(writes);

    return {
        data: {
            entries,
            categories,
            templates,
            recurring,
            budget,
            lastBackupAt: raw[KEYS.lastBackupAt] ?? null,
            backupSnoozeUntil: raw[KEYS.backupSnoozeUntil] ?? null,
        },
        notice: notices.length > 0 ? notices.join('\n') : null,
    };
}

async function writeKey(key: keyof AppData, value: AppData[keyof AppData]): Promise<void> {
    const storageKey = KEYS[key];
    if (value === null) await AsyncStorage.removeItem(storageKey);
    else if (typeof value === 'number') await AsyncStorage.setItem(storageKey, String(value));
    else if (typeof value === 'string') await AsyncStorage.setItem(storageKey, value);
    else await AsyncStorage.setItem(storageKey, JSON.stringify(value));
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<AppData>(EMPTY);
    const [loaded, setLoaded] = useState(false);
    const dataRef = useRef<AppData>(EMPTY);
    // 保存は1件ずつ順番に行う（連続操作で古い内容が後から書き込まれるのを防ぐ）
    const queue = useRef<Promise<void>>(Promise.resolve());
    const alertedSaveError = useRef(false);

    useEffect(() => {
        let cancelled = false;
        loadAll()
            .then(({ data: loadedData, notice }) => {
                if (cancelled) return;
                dataRef.current = loadedData;
                setData(loadedData);
                setLoaded(true);
                if (notice) Alert.alert('データについてのお知らせ', notice);
            })
            .catch(e => {
                console.error('読み込み失敗', e);
                if (cancelled) return;
                setLoaded(true);
                Alert.alert('読み込みに失敗しました', 'データを読み込めませんでした。アプリを再起動してもう一度お試しください。');
            });
        return () => { cancelled = true; };
    }, []);

    const commit = useCallback((patch: Partial<AppData>): Promise<void> => {
        const next = { ...dataRef.current, ...patch };
        dataRef.current = next;
        setData(next);
        const keys = Object.keys(patch) as (keyof AppData)[];
        const values = keys.map(k => next[k]);
        queue.current = queue.current
            .then(() => Promise.all(keys.map((k, i) => writeKey(k, values[i]))).then(() => undefined))
            .catch(e => {
                console.error('保存失敗', e);
                if (!alertedSaveError.current) {
                    alertedSaveError.current = true;
                    Alert.alert('保存に失敗しました', '端末の空き容量を確認してください。この操作の内容は保存されていない可能性があります。');
                }
            });
        return queue.current;
    }, []);

    const actions = useMemo<AppDataActions>(() => ({
        addEntry: (input) => {
            const entry: Entry = { id: newEntryId(), ...input };
            void commit({ entries: [entry, ...dataRef.current.entries] });
            return entry;
        },
        updateEntry: (id, input) => {
            void commit({ entries: dataRef.current.entries.map(e => (e.id === id ? { ...e, ...input } : e)) });
        },
        deleteEntry: (id) => {
            void commit({ entries: dataRef.current.entries.filter(e => e.id !== id) });
        },
        addCategory: (name) => {
            const trimmed = name.trim();
            if (!trimmed) return { ok: false, message: 'カテゴリ名を入力してください' };
            if (trimmed === INCOME_LABEL) return { ok: false, message: `「${INCOME_LABEL}」は収入用の名前なので使えません` };
            if (dataRef.current.categories.includes(trimmed)) return { ok: false, message: '同じ名前のカテゴリがすでにあります' };
            void commit({ categories: [...dataRef.current.categories, trimmed] });
            return { ok: true };
        },
        deleteCategory: (name) => {
            void commit({ categories: dataRef.current.categories.filter(c => c !== name) });
        },
        addTemplate: (template) => {
            void commit({ templates: [...dataRef.current.templates, template] });
        },
        deleteTemplate: (id) => {
            void commit({ templates: dataRef.current.templates.filter(t => t.id !== id) });
        },
        setBudget: (budget) => {
            void commit({ budget });
        },
        addRecurring: (rule) => {
            void commit({ recurring: [...dataRef.current.recurring, rule] });
        },
        deleteRecurring: (id) => {
            void commit({ recurring: dataRef.current.recurring.filter(r => r.id !== id) });
        },
        restoreBackup: (parsed) => {
            const patch: Partial<AppData> = { entries: parsed.entries };
            if (parsed.categories) patch.categories = parsed.categories;
            if (parsed.templates) patch.templates = parsed.templates;
            if (parsed.recurring) patch.recurring = parsed.recurring;
            if (parsed.budget !== undefined) patch.budget = parsed.budget;
            return commit(patch);
        },
        resetEntries: () => commit({ entries: [] }),
        markBackedUp: () => {
            void commit({ lastBackupAt: new Date().toISOString(), backupSnoozeUntil: null });
        },
        snoozeBackup: () => {
            void commit({ backupSnoozeUntil: snoozeUntilFrom(new Date()) });
        },
        getSnapshot: () => {
            const d = dataRef.current;
            return { entries: d.entries, categories: d.categories, templates: d.templates, recurring: d.recurring, budget: d.budget };
        },
    }), [commit]);

    const value = useMemo<AppDataContextValue>(() => ({ ...data, ...actions, loaded }), [data, actions, loaded]);
    return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
    const ctx = useContext(AppDataContext);
    if (!ctx) throw new Error('useAppData は AppDataProvider の中で使ってください');
    return ctx;
}
