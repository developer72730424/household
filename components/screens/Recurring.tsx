import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { newEntryId, validateAmountInput } from '@/utils/entries';
import { initialLastGenerated, type RecurringRule } from '@/utils/recurring';

interface RecurringProps {
    rules: RecurringRule[];
    categories: string[];
    onAdd: (rule: RecurringRule) => void;
    onUpdate: (rule: RecurringRule) => void;
    onDelete: (id: string) => void;
    onBack: () => void;
}

export default function Recurring({ rules, categories, onAdd, onUpdate, onDelete, onBack }: RecurringProps) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [day, setDay] = useState('');
    const [category, setCategory] = useState(categories[0] ?? '食費');
    // 編集中の固定費（null のときは新規追加）
    const [editing, setEditing] = useState<RecurringRule | null>(null);

    // 削除済みのカテゴリが設定されている固定費も、編集中はそのカテゴリを選択肢に残す
    const categoryOptions = categories.includes(category) ? categories : [category, ...categories];

    const resetForm = () => {
        setEditing(null);
        setItem('');
        setAmount('');
        setDay('');
        setCategory(categories[0] ?? '食費');
        Keyboard.dismiss();
    };

    const startEdit = (rule: RecurringRule) => {
        setEditing(rule);
        setItem(rule.item);
        setAmount(String(rule.amount));
        setDay(String(rule.day));
        setCategory(rule.category);
    };

    const handleAdd = () => {
        if (!item.trim()) {
            Alert.alert('入力エラー', '品目を入力してください');
            return;
        }
        const amountCheck = validateAmountInput(amount);
        if (!amountCheck.ok) {
            Alert.alert('入力エラー', amountCheck.message);
            return;
        }
        // 29〜31日は存在しない月があるため 28日までに制限
        const dayValue = Number(day.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)));
        if (!Number.isInteger(dayValue) || dayValue < 1 || dayValue > 28) {
            Alert.alert('入力エラー', '発生日は1〜28の整数で入力してください');
            return;
        }
        if (editing) {
            // 登録済みの月（lastGenerated）はそのまま。金額・発生日を変えても、すでに登録した分は重複しない
            onUpdate({ ...editing, item: item.trim(), amount: amountCheck.value, category, day: dayValue });
        } else {
            onAdd({
                id: newEntryId(),
                item: item.trim(),
                amount: amountCheck.value,
                category,
                day: dayValue,
                lastGenerated: initialLastGenerated(dayValue),
            });
        }
        resetForm();
    };

    const confirmDelete = (rule: RecurringRule) => {
        Alert.alert('削除', `固定費「${rule.item}」を削除しますか？\n（登録済みの履歴は残ります）`, [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: '削除',
                style: 'destructive',
                onPress: () => {
                    onDelete(rule.id);
                    if (editing?.id === rule.id) resetForm();
                },
            },
        ]);
    };

    const monthlyTotal = rules.reduce((sum, r) => sum + r.amount, 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← 戻る</Text></TouchableOpacity>
                <Text style={styles.title}>固定費</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={rules}
                keyExtractor={r => r.id}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                    <>
                        <View style={styles.card}>
                            <Text style={styles.desc}>
                                家賃・サブスクなど毎月の支出を登録すると、発生日に自動で履歴へ追加されます。
                            </Text>
                            <TextInput style={styles.input} placeholder="品目（例：家賃）" placeholderTextColor={c.textMuted} value={item} onChangeText={setItem} />
                            <View style={styles.inlineRow}>
                                <TextInput
                                    style={[styles.input, { flex: 2, marginRight: 8 }]}
                                    placeholder="金額"
                                    placeholderTextColor={c.textMuted}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="毎月○日"
                                    placeholderTextColor={c.textMuted}
                                    value={day}
                                    onChangeText={setDay}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                            </View>
                            <View style={styles.categoryRow}>
                                {categoryOptions.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => setCategory(cat)}
                                        style={[styles.catBtn, category === cat && styles.catBtnActive]}
                                    >
                                        <Text style={[styles.catBtnText, category === cat && styles.catBtnTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                                <Text style={styles.addBtnText}>{editing ? '✓ 固定費を更新' : '＋ 固定費を追加'}</Text>
                            </TouchableOpacity>
                            {editing && (
                                <TouchableOpacity style={styles.cancelEditBtn} onPress={resetForm}>
                                    <Text style={styles.cancelEditText}>編集をやめる</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {rules.length > 0 && (
                            <Text style={styles.sectionTitle}>登録中の固定費（月 ¥{monthlyTotal.toLocaleString()}）</Text>
                        )}
                    </>
                }
                ListEmptyComponent={<Text style={styles.empty}>まだ固定費が登録されていません</Text>}
                renderItem={({ item: rule }) => (
                    <TouchableOpacity
                        style={[styles.listItem, editing?.id === rule.id && styles.listItemEditing]}
                        onPress={() => startEdit(rule)}
                        accessibilityLabel={`${rule.item}を編集`}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.listItemTitle}>{rule.item}</Text>
                            <Text style={styles.listItemSub}>毎月{rule.day}日 | {rule.category} | タップで編集</Text>
                        </View>
                        <Text style={styles.listItemAmount}>¥{rule.amount.toLocaleString()}</Text>
                        <TouchableOpacity onPress={() => confirmDelete(rule)} style={styles.deleteBtn}>
                            <Text style={{ color: c.danger }}>削除</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8) },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
    backText: { color: c.primaryText, fontWeight: '600', fontSize: 15 },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    card: { backgroundColor: c.card, margin: 16, padding: 16, borderRadius: 16, elevation: 2 },
    desc: { fontSize: 12, color: c.textSecondary, marginBottom: 12, lineHeight: 18 },
    input: {
        backgroundColor: c.inputBg,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        color: c.text,
    },
    inlineRow: { flexDirection: 'row' },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    catBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.chip, borderWidth: 1, borderColor: c.border },
    catBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    catBtnText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    catBtnTextActive: { color: '#fff', fontWeight: '600' },
    addBtn: { backgroundColor: c.primary, padding: 14, borderRadius: 10, alignItems: 'center' },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    sectionTitle: { marginHorizontal: 16, marginBottom: 8, fontSize: 13, fontWeight: '700', color: c.textSecondary },
    empty: { textAlign: 'center', color: c.textMuted, marginTop: 8 },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.card,
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 14,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: c.warning,
    },
    listItemTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    listItemSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    listItemAmount: { fontSize: 15, fontWeight: '700', color: c.primaryText, marginRight: 12 },
    deleteBtn: { paddingVertical: 4, paddingHorizontal: 6 },
    listItemEditing: { borderWidth: 2, borderColor: c.primary },
    cancelEditBtn: { padding: 12, alignItems: 'center', marginTop: 6 },
    cancelEditText: { color: c.textSecondary, fontWeight: '600' },
});
