// 固定費（毎月決まった日に発生する支出）の自動登録ロジック
import { INCOME_LABEL, newEntryId, pad2, parseAmount, type Entry, type EntryType } from './entries.ts';

export interface RecurringRule {
    id: string;
    item: string;
    amount: number;
    type: EntryType;        // 収入（給与など）か支出（家賃など）か。古いデータは支出として読む
    category: string;       // 収入のときは常に INCOME_LABEL
    day: number;            // 毎月の発生日（1〜28）
    lastGenerated: string;  // 最後に履歴へ追加した年月 "YYYY-MM"
}

const toYM = (year: number, monthIndex: number): string => {
    const d = new Date(year, monthIndex, 1);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

// "YYYY-MM"（旧形式の "YYYY/M" も可）を読む。読めなければ null
const parseYM = (ym: unknown): { year: number; monthIndex: number } | null => {
    if (typeof ym !== 'string') return null;
    const m = ym.trim().match(/^(\d{4})[-/](\d{1,2})$/);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
    return { year: Number(m[1]), monthIndex: Number(m[2]) - 1 };
};

// 保存データ・バックアップから読んだ固定費を検証して新形式にする（旧形式の金額文字列・年月も受け付ける）
export function normalizeRule(raw: unknown): RecurringRule | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const amount = parseAmount(r.amount);
    const ym = parseYM(r.lastGenerated);
    const day = Number(r.day);
    if (amount === null || amount <= 0 || !ym || !Number.isInteger(day) || day < 1 || day > 28) return null;
    const type: EntryType = r.type === 'income' ? 'income' : 'expense';
    const category = type === 'income'
        ? INCOME_LABEL
        : typeof r.category === 'string' && r.category.trim() && r.category.trim() !== INCOME_LABEL
            ? r.category.trim()
            : 'その他';
    return {
        id: typeof r.id === 'string' && r.id ? r.id : newEntryId(),
        item: typeof r.item === 'string' ? r.item.trim() : '',
        amount: Math.round(amount),
        type,
        category,
        day,
        lastGenerated: toYM(ym.year, ym.monthIndex),
    };
}

export function normalizeRules(raw: unknown): RecurringRule[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeRule).filter((r): r is RecurringRule => r !== null);
}

// 新規ルールの lastGenerated 初期値。
// 今月の発生日を既に過ぎていれば（手入力済みの可能性が高いので）来月から自動登録する
export function initialLastGenerated(day: number, today: Date = new Date()): string {
    const offset = day <= today.getDate() ? 0 : -1;
    return toYM(today.getFullYear(), today.getMonth() + offset);
}

// 前回登録以降、今日までに発生日を迎えた分の履歴を生成する（アプリを開かなかった月も遡って登録）
export function generateDueEntries(rules: RecurringRule[], today: Date = new Date()) {
    const entries: Entry[] = [];
    const updatedRules = rules.map(rule => {
        const ym = parseYM(rule.lastGenerated);
        if (!ym) return rule;
        let cursor = new Date(ym.year, ym.monthIndex + 1, 1);
        let last = rule.lastGenerated;
        // 発生日の 0:00 が今日以前なら登録対象
        while (new Date(cursor.getFullYear(), cursor.getMonth(), rule.day) <= today) {
            const key = toYM(cursor.getFullYear(), cursor.getMonth());
            entries.push({
                id: `${newEntryId()}_${rule.id}_${key}`,
                item: rule.item,
                amount: rule.amount,
                category: rule.category,
                type: rule.type,
                date: `${key}-${pad2(rule.day)}`,
            });
            last = key;
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        }
        return last === rule.lastGenerated ? rule : { ...rule, lastGenerated: last };
    });
    return { entries, updatedRules, changed: entries.length > 0 };
}
