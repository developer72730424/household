// カテゴリ別の予算（毎月共通）。キーはカテゴリ名、値は円。
import { expenseByCategory, type Entry } from './entries.ts';

export type CategoryBudgets = Record<string, number>;

export function normalizeCategoryBudgets(raw: unknown): CategoryBudgets {
    const out: CategoryBudgets = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!k.trim() || k === '収入') continue;
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    }
    return out;
}

// 設定・解除（null で解除）。元のオブジェクトは変更しない
export function withCategoryBudget(budgets: CategoryBudgets, category: string, amount: number | null): CategoryBudgets {
    const next = { ...budgets };
    if (amount === null || !(amount > 0)) delete next[category];
    else next[category] = Math.floor(amount);
    return next;
}

// カテゴリ名の変更に合わせてキーを付け替える（名前変更・削除で予算が迷子にならないように）
export function renameCategoryBudget(budgets: CategoryBudgets, from: string, to: string): CategoryBudgets {
    if (!(from in budgets)) return budgets;
    const next = { ...budgets };
    const amount = next[from];
    delete next[from];
    // 移し先に既に予算があれば、そちらを残す（上書きしない）
    if (!(to in next)) next[to] = amount;
    return next;
}

export type BudgetLevel = 'ok' | 'warn' | 'over';

export interface CategoryBudgetStatus {
    category: string;
    budget: number;
    spent: number;
    remaining: number;   // 負なら超過
    ratio: number;       // spent / budget
    level: BudgetLevel;  // 80%以上で warn、100%超で over
}

export function categoryBudgetStatuses(entries: Entry[], budgets: CategoryBudgets): CategoryBudgetStatus[] {
    const spentBy = new Map(expenseByCategory(entries).map(t => [t.name, t.amount]));
    return Object.entries(budgets)
        .map(([category, budget]) => {
            const spent = spentBy.get(category) ?? 0;
            const ratio = spent / budget;
            return {
                category, budget, spent,
                remaining: budget - spent,
                ratio,
                level: (ratio > 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok') as BudgetLevel,
            };
        })
        // 使いすぎのものを上に
        .sort((a, b) => b.ratio - a.ratio);
}
