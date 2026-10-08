import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { summarizeYear, yearsWithEntries } from '@/utils/annual';
import type { Entry } from '@/utils/entries';

interface Props {
    entries: Entry[];
    onBack: () => void;
}

const yen = (n: number) => `¥${n.toLocaleString()}`;
const signed = (n: number) => `${n < 0 ? '-' : n > 0 ? '+' : ''}¥${Math.abs(n).toLocaleString()}`;

// 年間の集計: 年の合計・貯蓄率・月ごとの収支・支出の多いカテゴリ
export default function Annual({ entries, onBack }: Props) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const thisYear = new Date().getFullYear();
    const years = useMemo(() => yearsWithEntries(entries, thisYear), [entries, thisYear]);
    const [year, setYear] = useState(thisYear);
    const s = useMemo(() => summarizeYear(entries, year), [entries, year]);
    const maxMonthExpense = Math.max(1, ...s.months.map(m => m.expense));

    const idx = years.indexOf(year);
    const canPrev = idx < years.length - 1;
    const canNext = idx > 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← 戻る</Text></TouchableOpacity>
                <Text style={styles.title}>年間の集計</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                <View style={styles.yearNav}>
                    <TouchableOpacity disabled={!canPrev} onPress={() => setYear(years[idx + 1])} style={[styles.navBtn, !canPrev && { opacity: 0.3 }]} accessibilityLabel="前の年">
                        <Text style={styles.navText}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.yearText}>{year}年</Text>
                    <TouchableOpacity disabled={!canNext} onPress={() => setYear(years[idx - 1])} style={[styles.navBtn, !canNext && { opacity: 0.3 }]} accessibilityLabel="次の年">
                        <Text style={styles.navText}>›</Text>
                    </TouchableOpacity>
                </View>

                {s.count === 0 ? (
                    <Text style={styles.empty}>この年の記録はありません</Text>
                ) : (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>年間の収支</Text>
                            <Text style={[styles.balance, s.balance < 0 && { color: c.danger }]}>{signed(s.balance)}</Text>
                            <View style={styles.row}>
                                <Text style={styles.sub}>収入 {yen(s.income)}</Text>
                                <Text style={styles.sub}>支出 {yen(s.expense)}</Text>
                            </View>
                            {s.savingsRate !== null && (
                                <Text style={styles.sub}>貯蓄率 {s.savingsRate}%{s.savingsRate < 0 ? '（支出が収入を上回っています）' : ''}</Text>
                            )}
                            {s.maxExpenseMonth !== null && <Text style={styles.sub}>支出が最も多い月：{s.maxExpenseMonth}月（{yen(s.months[s.maxExpenseMonth - 1].expense)}）</Text>}
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>月ごとの収支</Text>
                            {s.months.map(m => (
                                <View key={m.month} style={styles.monthRow}>
                                    <Text style={styles.monthName}>{m.month}月</Text>
                                    <View style={styles.barWrap}>
                                        <View style={[styles.bar, { width: `${(m.expense / maxMonthExpense) * 100}%`, backgroundColor: c.primary }]} />
                                    </View>
                                    <View style={styles.monthNums}>
                                        <Text style={styles.monthExpense}>{m.expense > 0 ? `-${yen(m.expense)}` : '-'}</Text>
                                        {m.income > 0 && <Text style={styles.monthIncome}>+{yen(m.income)}</Text>}
                                    </View>
                                </View>
                            ))}
                        </View>

                        {s.topExpenseCategories.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>支出の多いカテゴリ</Text>
                                {s.topExpenseCategories.slice(0, 8).map((t, i) => (
                                    <View key={t.name} style={styles.catRow}>
                                        <Text style={styles.catRank}>{i + 1}</Text>
                                        <Text style={styles.catName} numberOfLines={1}>{t.name}</Text>
                                        <Text style={styles.catAmount}>{yen(t.amount)}</Text>
                                        <Text style={styles.catPct}>{s.expense > 0 ? Math.round((t.amount / s.expense) * 100) : 0}%</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
    backText: { color: c.primaryText, fontWeight: '600', fontSize: 15 },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    yearNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 6 },
    navBtn: { paddingHorizontal: 18, paddingVertical: 6 },
    navText: { fontSize: 24, fontWeight: '700', color: c.primaryText },
    yearText: { fontSize: 20, fontWeight: '800', color: c.primaryText, minWidth: 110, textAlign: 'center' },
    empty: { textAlign: 'center', color: c.textMuted, marginTop: 40 },
    card: { backgroundColor: c.card, marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16 },
    cardLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 8 },
    balance: { fontSize: 28, fontWeight: '800', color: c.primaryText, marginBottom: 6 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    sub: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    monthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
    monthName: { width: 36, fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    barWrap: { flex: 1, height: 10, borderRadius: 5, backgroundColor: c.chip, overflow: 'hidden', marginHorizontal: 8 },
    bar: { height: '100%', borderRadius: 5 },
    monthNums: { width: 104, alignItems: 'flex-end' },
    monthExpense: { fontSize: 12, color: c.text, fontWeight: '600' },
    monthIncome: { fontSize: 11, color: c.success, fontWeight: '600' },
    catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    catRank: { width: 22, fontSize: 13, fontWeight: '700', color: c.textMuted },
    catName: { flex: 1, fontSize: 14, color: c.text, fontWeight: '500' },
    catAmount: { fontSize: 14, color: c.text, fontWeight: '700', marginLeft: 8 },
    catPct: { width: 44, textAlign: 'right', fontSize: 12, color: c.textSecondary },
});
