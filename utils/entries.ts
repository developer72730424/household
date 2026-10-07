// 収支データの型と、日付・金額の正規化、集計、旧データの移行ロジック。
// React Native に依存しない純粋な関数だけで書いてあるので、node でそのままテストできる。

export type EntryType = 'income' | 'expense';

export interface Entry {
    id: string;
    item: string;
    amount: number;      // 円（正の整数）。収入か支出かは type で区別する
    category: string;    // 支出のカテゴリ。収入は INCOME_LABEL 固定
    type: EntryType;
    date: string;        // "YYYY-MM-DD"（ゼロ埋め。文字列のまま大小比較できる）
}

export interface Template {
    id: string;
    name: string;
    item: string;
    amount: string;
    category: string;
}

// 収入の表示用ラベル。カテゴリ名としては予約済み（ユーザーは同名カテゴリを作れない）
export const INCOME_LABEL = '収入';
export const DEFAULT_CATEGORIES = ['食費', '日用品', 'その他'];

// ---- 日付 ----

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function toDateString(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// "YYYY-MM-DD" / "YYYY/M/D"（旧形式）/ ISO 文字列を検証して "YYYY-MM-DD" にそろえる。存在しない日付は null
export function normalizeDateString(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const m = input.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ].*)?$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const probe = new Date(y, mo - 1, d);
    if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) return null;
    return `${m[1]}-${pad2(mo)}-${pad2(d)}`;
}

export function dateFromString(s: string): Date | null {
    const n = normalizeDateString(s);
    if (!n) return null;
    const [y, m, d] = n.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// 画面表示用: "2026-10-03" -> "2026/10/3"
export function formatDisplayDate(s: string): string {
    const n = normalizeDateString(s);
    if (!n) return s;
    const [y, m, d] = n.split('-').map(Number);
    return `${y}/${m}/${d}`;
}

// "YYYY-MM"
export const monthKeyOf = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
export const monthKey = (dateString: string): string => dateString.slice(0, 7);
export const shiftMonth = (d: Date, delta: number): Date => new Date(d.getFullYear(), d.getMonth() + delta, 1);
export const formatMonthJapanese = (d: Date): string => `${d.getFullYear()}年 ${d.getMonth() + 1}月`;

// ---- 金額 ----

// 全角数字・カンマ・円記号を許して数値にする。数値として読めなければ null
export function parseAmount(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    const half = value
        .replace(/[０-９．－]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        .replace(/[,，¥￥円\s]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(half)) return null;
    return Number(half);
}

// 入力欄の金額チェック。円なので 1 以上の整数のみ
export type AmountCheck = { ok: true; value: number } | { ok: false; message: string };
export function validateAmountInput(text: string): AmountCheck {
    const v = parseAmount(text);
    if (v === null) return { ok: false, message: '金額は数字で入力してください' };
    if (!Number.isInteger(v)) return { ok: false, message: '金額は整数（円）で入力してください' };
    if (v <= 0) return { ok: false, message: '金額は0より大きい数値で入力してください' };
    if (v > 9_999_999_999) return { ok: false, message: '金額が大きすぎます' };
    return { ok: true, value: v };
}

// ---- ID ----

let idCounter = 0;
export function newEntryId(): string {
    idCounter = (idCounter + 1) % 1_000_000;
    return `${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---- 正規化・移行 ----

// 旧形式（金額が文字列・日付が "Y/M/D"・収入はカテゴリ名 "収入"）も、新形式もまとめて Entry にする。
// 日付や金額が読めない行は null（呼び出し側で数える）
export function normalizeEntry(raw: unknown): Entry | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const date = normalizeDateString(r.date);
    if (!date) return null;
    const amt = parseAmount(r.amount);
    if (amt === null) return null;

    const rawCategory = typeof r.category === 'string' ? r.category.trim() : '';
    const type: EntryType =
        r.type === 'income' || r.type === 'expense'
            ? r.type
            : rawCategory === INCOME_LABEL ? 'income' : 'expense';
    const category = type === 'income' ? INCOME_LABEL : (rawCategory && rawCategory !== INCOME_LABEL ? rawCategory : 'その他');

    let id = '';
    if (typeof r.id === 'string' && r.id) id = r.id;
    else if (typeof r.id === 'number') id = String(r.id);

    return {
        id: id || newEntryId(),
        item: typeof r.item === 'string' ? r.item.trim() : String(r.item ?? ''),
        amount: Math.round(Math.abs(amt)),
        category,
        type,
        date,
    };
}

export function normalizeEntries(raw: unknown): { entries: Entry[]; skipped: number } {
    if (!Array.isArray(raw)) return { entries: [], skipped: 0 };
    const seen = new Set<string>();
    const entries: Entry[] = [];
    let skipped = 0;
    for (const row of raw) {
        const e = normalizeEntry(row);
        if (!e) {
            skipped += 1;
            continue;
        }
        if (seen.has(e.id)) e.id = newEntryId();
        seen.add(e.id);
        entries.push(e);
    }
    return { entries, skipped };
}

// 旧形式の行が含まれているか（移行前のバックアップを残すかの判定に使う）
export function hasLegacyShape(raw: unknown): boolean {
    if (!Array.isArray(raw)) return false;
    return raw.some(row => {
        if (!row || typeof row !== 'object') return false;
        const r = row as Record<string, unknown>;
        return typeof r.amount !== 'number' || (r.type !== 'income' && r.type !== 'expense') ||
            typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date);
    });
}

// カテゴリ一覧: 空・重複・予約名（収入）を除く
export function normalizeCategories(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [...DEFAULT_CATEGORIES];
    const out: string[] = [];
    for (const c of raw) {
        if (typeof c !== 'string') continue;
        const name = c.trim();
        if (name && name !== INCOME_LABEL && !out.includes(name)) out.push(name);
    }
    return out.length > 0 ? out : [...DEFAULT_CATEGORIES];
}

// ---- 並び替え・集計 ----

// 日付の新しい順。同じ日付なら配列の並び（新しく追加したものが先頭）を保つ
export function sortEntries(entries: Entry[]): Entry[] {
    return entries
        .map((e, i) => ({ e, i }))
        .sort((a, b) => (a.e.date === b.e.date ? a.i - b.i : a.e.date < b.e.date ? 1 : -1))
        .map(x => x.e);
}

export const entriesInMonth = (entries: Entry[], key: string): Entry[] =>
    entries.filter(e => monthKey(e.date) === key);

export interface Summary {
    income: number;
    expense: number;
    balance: number;
    count: number;
}

export function summarize(entries: Entry[]): Summary {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
        if (e.type === 'income') income += e.amount;
        else expense += e.amount;
    }
    return { income, expense, balance: income - expense, count: entries.length };
}

export interface NamedTotal {
    name: string;
    amount: number;
}

const toSortedTotals = (map: Map<string, number>): NamedTotal[] =>
    Array.from(map, ([name, amount]) => ({ name, amount }))
        .filter(t => t.amount > 0)
        .sort((a, b) => b.amount - a.amount);

export function expenseByCategory(entries: Entry[]): NamedTotal[] {
    const map = new Map<string, number>();
    for (const e of entries) {
        if (e.type !== 'expense') continue;
        map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return toSortedTotals(map);
}

// 収入は品目（収入元）ごと
export function incomeBySource(entries: Entry[]): NamedTotal[] {
    const map = new Map<string, number>();
    for (const e of entries) {
        if (e.type !== 'income') continue;
        const key = e.item || 'その他';
        map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return toSortedTotals(map);
}

export interface MonthlyPoint {
    month: string; // "YYYY-MM"
    income: number;
    expense: number;
}

// endMonth を含む直近 months か月分の月別収支
export function monthlyTrend(entries: Entry[], endMonth: Date, months: number): MonthlyPoint[] {
    const points: MonthlyPoint[] = [];
    for (let i = months - 1; i >= 0; i--) {
        const key = monthKeyOf(shiftMonth(endMonth, -i));
        const { income, expense } = summarize(entriesInMonth(entries, key));
        points.push({ month: key, income, expense });
    }
    return points;
}

// ---- テンプレート ----

export function normalizeTemplates(raw: unknown): Template[] {
    if (!Array.isArray(raw)) return [];
    const out: Template[] = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        const amount = parseAmount(r.amount);
        if (amount === null || typeof r.name !== 'string' || !r.name.trim()) continue;
        out.push({
            id: typeof r.id === 'string' && r.id ? r.id : newEntryId(),
            name: r.name.trim(),
            item: typeof r.item === 'string' ? r.item : '',
            amount: String(Math.round(Math.abs(amount))),
            category: typeof r.category === 'string' && r.category.trim() && r.category.trim() !== INCOME_LABEL
                ? r.category.trim()
                : 'その他',
        });
    }
    return out;
}
