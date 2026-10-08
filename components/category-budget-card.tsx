import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import type { CategoryBudgetStatus } from '@/utils/category-budget';

interface Props {
    statuses: CategoryBudgetStatus[];
    onEdit: () => void; // カテゴリ別予算の設定画面へ
}

// カテゴリ別予算の進み具合（使いすぎのカテゴリが上）。設定が無ければ何も出さない
export default function CategoryBudgetCard({ statuses, onEdit }: Props) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    if (statuses.length === 0) return null;

    const color = (level: CategoryBudgetStatus['level']) => (level === 'over' ? c.danger : level === 'warn' ? c.warning : c.success);

    return (
        <TouchableOpacity style={styles.card} onPress={onEdit} activeOpacity={0.8} accessibilityLabel="カテゴリ別の予算を編集">
            <Text style={styles.title}>カテゴリ別の予算</Text>
            {statuses.map(s => (
                <View key={s.category} style={styles.row}>
                    <View style={styles.rowTop}>
                        <Text style={styles.name} numberOfLines={1}>{s.category}</Text>
                        <Text style={[styles.remaining, { color: s.level === 'over' ? c.danger : c.textSecondary }]}>
                            {s.remaining < 0
                                ? `¥${Math.abs(s.remaining).toLocaleString()} 超過`
                                : `残り ¥${s.remaining.toLocaleString()}`}
                        </Text>
                    </View>
                    <View style={styles.track}>
                        <View style={[styles.fill, { width: `${Math.min(s.ratio, 1) * 100}%`, backgroundColor: color(s.level) }]} />
                    </View>
                    <Text style={styles.sub}>¥{s.spent.toLocaleString()} / ¥{s.budget.toLocaleString()}（{Math.round(s.ratio * 100)}%）</Text>
                </View>
            ))}
        </TouchableOpacity>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    card: { backgroundColor: c.card, marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 16, elevation: 2 },
    title: { fontSize: 12, color: c.textMuted, fontWeight: '600', marginBottom: 8 },
    row: { marginBottom: 10 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
    remaining: { fontSize: 12, fontWeight: '600' },
    track: { height: 8, borderRadius: 4, backgroundColor: c.chip, overflow: 'hidden', marginVertical: 5 },
    fill: { height: '100%', borderRadius: 4 },
    sub: { fontSize: 11, color: c.textMuted },
});
