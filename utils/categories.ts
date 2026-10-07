// カテゴリの名前変更・削除。記録・テンプレート・固定費の持つカテゴリ名もいっしょに更新する純粋な関数。
import { INCOME_LABEL, type Entry, type Template } from './entries.ts';
import type { RecurringRule } from './recurring.ts';

export interface CategoryData {
    entries: Entry[];
    categories: string[];
    templates: Template[];
    recurring: RecurringRule[];
}

export type CategoryChange =
    | { ok: true; data: CategoryData; moved: number } // moved: カテゴリが変わった記録の件数
    | { ok: false; message: string };

const FALLBACK_PREFERRED = 'その他';

function mapCategory(data: CategoryData, from: string, to: string, categories: string[]): CategoryChange {
    let moved = 0;
    const entries = data.entries.map(e => {
        if (e.type === 'expense' && e.category === from) {
            moved += 1;
            return { ...e, category: to };
        }
        return e;
    });
    return {
        ok: true,
        moved,
        data: {
            categories,
            entries,
            templates: data.templates.map(t => (t.category === from ? { ...t, category: to } : t)),
            recurring: data.recurring.map(r => (r.category === from ? { ...r, category: to } : r)),
        },
    };
}

export function renameCategory(data: CategoryData, from: string, newName: string): CategoryChange {
    const to = newName.trim();
    if (!data.categories.includes(from)) return { ok: false, message: 'カテゴリが見つかりません' };
    if (!to) return { ok: false, message: 'カテゴリ名を入力してください' };
    if (to === from) return { ok: false, message: '名前が変わっていません' };
    if (to === INCOME_LABEL) return { ok: false, message: `「${INCOME_LABEL}」は収入用の名前なので使えません` };
    if (data.categories.includes(to)) return { ok: false, message: '同じ名前のカテゴリがすでにあります' };
    return mapCategory(data, from, to, data.categories.map(c => (c === from ? to : c)));
}

// 削除するカテゴリの記録などの移し先。「その他」があればそこへ、なければ先頭のカテゴリへ
export function fallbackCategory(categories: string[], removing: string): string | null {
    const rest = categories.filter(c => c !== removing);
    if (rest.length === 0) return null;
    return rest.includes(FALLBACK_PREFERRED) ? FALLBACK_PREFERRED : rest[0];
}

export function removeCategory(data: CategoryData, name: string): CategoryChange {
    if (!data.categories.includes(name)) return { ok: false, message: 'カテゴリが見つかりません' };
    const to = fallbackCategory(data.categories, name);
    if (to === null) return { ok: false, message: '最後のカテゴリは削除できません' };
    return mapCategory(data, name, to, data.categories.filter(c => c !== name));
}

// カテゴリごとの記録件数（支出のみ）
export function countUsage(entries: Entry[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of entries) {
        if (e.type === 'expense') counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
    return counts;
}
