import React, { useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CalendarModal from '@/components/calendar-modal';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { formatDisplayDate, toDateString } from '@/utils/entries';

interface InputIncomeProps {
    item: string;
    setItem: (t: string) => void;
    amount: string;
    setAmount: (t: string) => void;
    date: Date;
    onChangeDate: (d: Date) => void;
    isEditMode?: boolean;
    onSave: () => void;
    onCancel: () => void;
}

export default function InputIncome({
    item, setItem, amount, setAmount, date, onChangeDate, isEditMode = false, onSave, onCancel,
}: InputIncomeProps) {
    const c = useAppColors();
    const headerHeight = useHeaderHeight();
    const styles = useMemo(() => createStyles(c), [c]);
    const [calendarVisible, setCalendarVisible] = useState(false);

    return (
        <KeyboardAvoidingView
            style={styles.fullScreenContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={headerHeight}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                <Text style={styles.screenTitle}>{isEditMode ? '収入を編集' : '収入を入力'}</Text>

                <View style={styles.inputCard}>
                    <Text style={styles.label}>収入元</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：給与"
                        placeholderTextColor={c.textMuted}
                        value={item}
                        onChangeText={setItem}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                    />

                    <Text style={styles.label}>金額</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：50000"
                        placeholderTextColor={c.textMuted}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                    />

                    <TouchableOpacity style={styles.dateSelector} onPress={() => setCalendarVisible(true)}>
                        <Text style={{ color: c.text, fontWeight: '500' }}>📅 日付：{formatDisplayDate(toDateString(date))}</Text>
                    </TouchableOpacity>

                    <CalendarModal
                        visible={calendarVisible}
                        value={date}
                        onSelect={(d) => { onChangeDate(d); setCalendarVisible(false); }}
                        onClose={() => setCalendarVisible(false)}
                    />
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.mainAddButton} onPress={onSave}>
                    <Text style={styles.mainAddButtonText}>{isEditMode ? '更新して戻る' : '保存して戻る'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    fullScreenContainer: { 
        flex: 1, 
        backgroundColor: c.background, 
        display: 'flex',
        flexDirection: 'column',
    },
    scrollContent: { flex: 1, padding: 16 },
    screenTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: c.text },
    inputCard: { backgroundColor: c.card, padding: 24, borderRadius: 16, elevation: 4, shadowColor: '#5B4FA3', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    label: { fontSize: 15, color: c.textSecondary, marginBottom: 8, marginTop: 14, fontWeight: '600' },
    input: { backgroundColor: c.background, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: c.border, marginBottom: 12, color: c.text, fontSize: 15 },
    dateSelector: { padding: 16, backgroundColor: c.background, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: c.border },
    mainAddButton: { backgroundColor: '#34C759', padding: 18, borderRadius: 12, marginTop: 32, alignItems: 'center' },
    mainAddButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    buttonContainer: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border },
    cancelButton: { backgroundColor: c.chip, padding: 14, borderRadius: 10, marginTop: 10, alignItems: 'center', borderWidth: 1.5, borderColor: c.border },
    cancelButtonText: { color: c.textSecondary, fontSize: 15, fontWeight: '600' },
});
