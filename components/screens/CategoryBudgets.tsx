import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import type { CategoryBudgets } from '@/utils/category-budget';
import { validateAmountInput } from '@/utils/entries';

interface Props {
    categories: string[];
    budgets: CategoryBudgets;
    onSet: (category: string, amount: number | null) => void;
    onBack: () => void;
}

// カテゴリごとの毎月の予算を設定する。カテゴリをタップして金額を入れる。空欄で保存すると解除
export default function CategoryBudgetsScreen({ categories, budgets, onSet, onBack }: Props) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [editing, setEditing] = useState<string | null>(null);
    const [draft, setDraft] = useState('');

    const startEdit = (category: string) => {
        setEditing(category);
        setDraft(budgets[category] ? String(budgets[category]) : '');
    };

    const save = () => {
        if (editing === null) return;
        if (draft.trim() === '') {
            onSet(editing, null);
        } else {
            const check = validateAmountInput(draft);
            if (!check.ok) {
                Alert.alert('入力エラー', check.message);
                return;
            }
            onSet(editing, check.value);
        }
        Keyboard.dismiss();
        setEditing(null);
    };

    const total = Object.values(budgets).reduce((sum, v) => sum + v, 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← 戻る</Text></TouchableOpacity>
                <Text style={styles.title}>カテゴリ別の予算</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={categories}
                keyExtractor={item => item}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                    <View style={styles.intro}>
                        <Text style={styles.introText}>
                            カテゴリごとの毎月の予算を決めると、ホームで使いすぎに気づけます。カテゴリをタップして金額を入れてください（空欄で保存すると解除）。
                        </Text>
                        {total > 0 && <Text style={styles.total}>設定済みの合計 ¥{total.toLocaleString()}</Text>}
                    </View>
                }
                renderItem={({ item }) => {
                    const isEditing = editing === item;
                    return (
                        <View style={[styles.row, isEditing && styles.rowEditing]}>
                            <TouchableOpacity style={styles.rowMain} onPress={() => startEdit(item)} accessibilityLabel={`${item}の予算を設定`}>
                                <Text style={styles.name}>{item}</Text>
                                <Text style={[styles.value, !budgets[item] && { color: c.textMuted }]}>
                                    {budgets[item] ? `¥${budgets[item].toLocaleString()}` : '未設定'}
                                </Text>
                            </TouchableOpacity>
                            {isEditing && (
                                <View style={styles.editRow}>
                                    <TextInput
                                        style={styles.input}
                                        value={draft}
                                        onChangeText={setDraft}
                                        keyboardType="numeric"
                                        placeholder="例：30000"
                                        placeholderTextColor={c.textMuted}
                                        autoFocus
                                    />
                                    <TouchableOpacity style={[styles.btn, { backgroundColor: c.primary }]} onPress={save}>
                                        <Text style={styles.btnText}>保存</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.btn, { backgroundColor: c.chip }]} onPress={() => { Keyboard.dismiss(); setEditing(null); }}>
                                        <Text style={[styles.btnText, { color: c.textSecondary }]}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                }}
            />
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8) },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
    backText: { color: c.primaryText, fontWeight: '600', fontSize: 15 },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    intro: { marginHorizontal: 16, marginBottom: 12 },
    introText: { fontSize: 12, color: c.textSecondary, lineHeight: 18 },
    total: { fontSize: 13, color: c.text, fontWeight: '700', marginTop: 8 },
    row: { backgroundColor: c.card, marginHorizontal: 16, marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
    rowEditing: { borderWidth: 2, borderColor: c.primary },
    rowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    name: { fontSize: 15, fontWeight: '600', color: c.text },
    value: { fontSize: 15, fontWeight: '700', color: c.primaryText },
    editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
    input: { flex: 1, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 10, color: c.text, fontSize: 16 },
    btn: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8 },
    btnText: { color: '#fff', fontWeight: '700' },
});
