// 予定の支出・収入: 今日より後の日付の記録は「予定」として扱う。
import { summarize, type Entry } from './entries.ts';

export const isPlanned = (entry: Entry, today: string): boolean => entry.date > today;

export interface PlannedSummary {
    plannedExpense: number;
    plannedIncome: number;
    plannedCount: number;
    actualExpense: number;  // すでに発生した（今日まで）支出
    actualIncome: number;
}

// 月の記録を「実績」と「予定」に分けて集計する
export function splitPlanned(monthEntries: Entry[], today: string): PlannedSummary {
    const planned = summarize(monthEntries.filter(e => isPlanned(e, today)));
    const actual = summarize(monthEntries.filter(e => !isPlanned(e, today)));
    return {
        plannedExpense: planned.expense,
        plannedIncome: planned.income,
        plannedCount: planned.count,
        actualExpense: actual.expense,
        actualIncome: actual.income,
    };
}
