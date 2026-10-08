// 月間予算: 「毎月共通の予算」と「その月だけの予算」。その月だけの設定があればそちらを優先する。

export type BudgetOverrides = Record<string, number>; // キーは "YYYY-MM"

export interface EffectiveBudget {
    amount: number | null;
    isOverride: boolean; // その月だけの予算か
}

export function effectiveBudget(defaultBudget: number | null, overrides: BudgetOverrides, month: string): EffectiveBudget {
    const o = overrides[month];
    if (typeof o === 'number' && o > 0) return { amount: o, isOverride: true };
    return { amount: defaultBudget, isOverride: false };
}

// その月だけの予算を設定する。null で解除（共通の予算に戻る）。元のオブジェクトは変更しない
export function withMonthBudget(overrides: BudgetOverrides, month: string, amount: number | null): BudgetOverrides {
    const next = { ...overrides };
    if (amount === null || !(amount > 0)) delete next[month];
    else next[month] = Math.floor(amount);
    return next;
}

// 保存データ・バックアップから読んだ値を検査する（キーは YYYY-MM、値は正の整数のものだけ残す）
export function normalizeOverrides(raw: unknown): BudgetOverrides {
    const out: BudgetOverrides = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(k)) continue;
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    }
    return out;
}
