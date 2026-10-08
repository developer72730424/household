// 先月との比較。月は "YYYY-MM"。
import { entriesInMonth, monthKeyOf, shiftMonth, summarize, type Entry } from './entries.ts';

export interface MonthComparison {
    previousMonth: string;   // 比較先の月（"YYYY-MM"）
    hasPrevious: boolean;    // 先月に記録があるか（無ければ比較しない）
    expenseDiff: number;     // 支出の増減（今月 - 先月）。正なら増えた
    incomeDiff: number;
    expensePercent: number | null; // 支出の増減率（%）。先月の支出が0なら null
}

export function compareWithPreviousMonth(entries: Entry[], month: Date): MonthComparison {
    const prevKey = monthKeyOf(shiftMonth(month, -1));
    const current = summarize(entriesInMonth(entries, monthKeyOf(month)));
    const previousEntries = entriesInMonth(entries, prevKey);
    const previous = summarize(previousEntries);
    return {
        previousMonth: prevKey,
        hasPrevious: previousEntries.length > 0,
        expenseDiff: current.expense - previous.expense,
        incomeDiff: current.income - previous.income,
        expensePercent: previous.expense > 0 ? Math.round(((current.expense - previous.expense) / previous.expense) * 100) : null,
    };
}

// 「先月より ¥12,000 増（+15%）」のような1行。比較できないときは null
export function describeExpenseChange(c: MonthComparison): string | null {
    if (!c.hasPrevious) return null;
    if (c.expenseDiff === 0) return '支出は先月と同じです';
    const amount = `¥${Math.abs(c.expenseDiff).toLocaleString()}`;
    const dir = c.expenseDiff > 0 ? '増' : '減';
    const pct = c.expensePercent === null ? '' : `（${c.expensePercent > 0 ? '+' : ''}${c.expensePercent}%）`;
    return `支出は先月より ${amount} ${dir}${pct}`;
}
