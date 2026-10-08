// 年間の集計。月は 1〜12。
import { monthKey, summarize, expenseByCategory, type Entry, type NamedTotal } from './entries.ts';

export interface AnnualMonth {
    month: number;   // 1〜12
    income: number;
    expense: number;
    balance: number;
    count: number;
}

export interface AnnualSummary {
    year: number;
    months: AnnualMonth[];            // 常に12か月分（記録が無い月は0）
    income: number;
    expense: number;
    balance: number;
    count: number;
    topExpenseCategories: NamedTotal[]; // 支出の多い順
    savingsRate: number | null;       // 貯蓄率（収支 / 収入）%。収入が0なら null
    maxExpenseMonth: number | null;   // 支出が最も多い月（記録が無ければ null）
}

export function yearEntries(entries: Entry[], year: number): Entry[] {
    const prefix = `${year}-`;
    return entries.filter(e => e.date.startsWith(prefix));
}

export function summarizeYear(entries: Entry[], year: number): AnnualSummary {
    const inYear = yearEntries(entries, year);
    const months: AnnualMonth[] = [];
    for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`;
        const s = summarize(inYear.filter(e => monthKey(e.date) === key));
        months.push({ month: m, income: s.income, expense: s.expense, balance: s.balance, count: s.count });
    }
    const total = summarize(inYear);
    const peak = months.reduce<AnnualMonth | null>((best, cur) => (cur.expense > (best?.expense ?? 0) ? cur : best), null);
    return {
        year,
        months,
        income: total.income,
        expense: total.expense,
        balance: total.balance,
        count: total.count,
        topExpenseCategories: expenseByCategory(inYear),
        savingsRate: total.income > 0 ? Math.round((total.balance / total.income) * 100) : null,
        maxExpenseMonth: peak ? peak.month : null,
    };
}

// 記録のある年（新しい順）。記録が無ければ今年だけ
export function yearsWithEntries(entries: Entry[], thisYear: number): number[] {
    const years = new Set<number>([thisYear]);
    for (const e of entries) years.add(Number(e.date.slice(0, 4)));
    return Array.from(years).sort((a, b) => b - a);
}
