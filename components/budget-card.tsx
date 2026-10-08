import React, { useMemo, useState } from 'react';
import { Keyboard, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';

export type BudgetScope = 'month' | 'default';

interface BudgetCardProps {
    monthLabel: string;       // 例: "10月"
    budget: number | null;    // その月に適用される予算。未設定は null
    isOverride: boolean;      // その月だけの予算か（false なら毎月共通の予算）
    spent: number;
    // scope が 'month' ならその月だけ、'default' なら毎月共通の予算を変更する。amount が null なら解除
    onSave: (amount: number | null, scope: BudgetScope) => void;
}

// 月間予算の進捗を表示するカード。タップで予算を設定・変更できます
export default function BudgetCard({ monthLabel, budget, isOverride, spent, onSave }: BudgetCardProps) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [modalVisible, setModalVisible] = useState(false);
    const [draft, setDraft] = useState('');
    // 編集の対象: その月だけ／毎月共通
    const [scope, setScope] = useState<BudgetScope>('default');

    const openEditor = () => {
        setDraft(budget ? String(budget) : '');
        setScope(isOverride ? 'month' : 'default');
        setModalVisible(true);
    };

    const save = () => {
        const normalized = draft
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
            .replace(/[,，\s]/g, '');
        const value = Number(normalized);
        // 空欄または0なら解除（その月だけの設定なら共通の予算に戻り、共通の予算なら未設定になる）
        onSave(normalized === '' || !Number.isFinite(value) || value <= 0 ? null : Math.floor(value), scope);
        Keyboard.dismiss();
        setModalVisible(false);
    };

    const ratio = budget ? spent / budget : 0;
    const remaining = budget ? budget - spent : 0;
    // 80%以上で警告色、超過で赤
    const barColor = ratio >= 1 ? c.danger : ratio >= 0.8 ? c.warning : c.success;

    return (
        <>
            <TouchableOpacity style={styles.card} onPress={openEditor} activeOpacity={0.8}>
                {budget ? (
                    <>
                        <View style={styles.row}>
                            <Text style={styles.label}>{monthLabel}の予算{isOverride ? '（この月だけ）' : ''}</Text>
                            <Text style={styles.budgetText}>¥{budget.toLocaleString()}</Text>
                        </View>
                        <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: barColor }]} />
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.subText}>支出 ¥{spent.toLocaleString()}（{Math.round(ratio * 100)}%）</Text>
                            <Text style={[styles.remainingText, { color: remaining < 0 ? c.danger : c.text }]}>
                                {remaining < 0 ? `¥${Math.abs(remaining).toLocaleString()} 超過` : `残り ¥${remaining.toLocaleString()}`}
                            </Text>
                        </View>
                    </>
                ) : (
                    <Text style={styles.placeholder}>🎯 タップして予算を設定</Text>
                )}
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>月間予算を設定</Text>
                        <View style={styles.scopeRow}>
                            {([['default', '毎月共通'], ['month', `${monthLabel}だけ`]] as const).map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.scopeBtn, scope === key && styles.scopeBtnActive]}
                                    onPress={() => setScope(key)}
                                >
                                    <Text style={[styles.scopeText, scope === key && styles.scopeTextActive]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.modalDesc}>
                            {scope === 'default'
                                ? '毎月共通の予算です。「その月だけ」の設定がある月はそちらが優先されます。'
                                : `${monthLabel}だけの予算です。空欄で保存すると、毎月共通の予算に戻ります。`}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="例：100000"
                            placeholderTextColor={c.textMuted}
                            value={draft}
                            onChangeText={setDraft}
                            keyboardType="numeric"
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>キャンセル</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={save}>
                                <Text style={styles.saveBtnText}>保存</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    card: {
        backgroundColor: c.card,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 14,
        borderRadius: 16,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
    budgetText: { fontSize: 14, color: c.text, fontWeight: '700' },
    barTrack: {
        height: 10,
        borderRadius: 5,
        backgroundColor: c.chip,
        overflow: 'hidden',
        marginVertical: 8,
    },
    barFill: { height: '100%', borderRadius: 5 },
    subText: { fontSize: 12, color: c.textSecondary, fontWeight: '500' },
    remainingText: { fontSize: 13, fontWeight: '700' },
    placeholder: { textAlign: 'center', color: c.primaryText, fontWeight: '600', fontSize: 14 },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modal: { backgroundColor: c.card, borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 6 },
    modalDesc: { fontSize: 12, color: c.textSecondary, marginBottom: 12 },
    input: {
        backgroundColor: c.inputBg,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: c.text,
        marginBottom: 16,
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    modalBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
    cancelBtn: { backgroundColor: c.chip },
    cancelBtnText: { color: c.textSecondary, fontWeight: '600' },
    saveBtn: { backgroundColor: c.primary },
    saveBtnText: { color: '#fff', fontWeight: '700' },
    scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    scopeBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: c.chip, borderWidth: 1, borderColor: c.border },
    scopeBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    scopeText: { fontSize: 14, fontWeight: '600', color: c.textSecondary },
    scopeTextActive: { color: '#fff', fontWeight: '700' },
});
