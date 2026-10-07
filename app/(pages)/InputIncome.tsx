import React, { useMemo, useState } from 'react';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface InputIncomeProps {
    item: string;
    setItem: (t: string) => void;
    amount: string;
    setAmount: (t: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onSelectDate?: (d: Date) => void;
    dateText: string;
    isEditMode?: boolean;
    onUpdate?: () => void;
}

export default function InputIncome({ item, setItem, amount, setAmount, onSave, onCancel, onSelectDate, dateText, isEditMode = false, onUpdate }: InputIncomeProps) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const modalStyles = useMemo(() => createModalStyles(c), [c]);
    const [modalVisible, setModalVisible] = useState(false);

    const parsedDate = useMemo(() => {
        try {
            const parts = dateText.split('/').map(Number);
            if (parts.length >= 3) return new Date(parts[0], parts[1] - 1, parts[2]);
        } catch (e) {}
        return new Date();
    }, [dateText]);

    const [calendarMonth, setCalendarMonth] = useState(() => new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));

    const weeks = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();

        const days: Array<Date | null> = [];
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

        const rows: Array<Array<Date | null>> = [];
        for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
        while (rows.length < 6) rows.push(new Array(7).fill(null));
        return rows;
    }, [calendarMonth]);

    const goPrevMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const goNextMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const selectDate = (d: Date) => {
        onSelectDate?.(d);
        setModalVisible(false);
    };

    return (
        // 数値キーボードには閉じるボタンが無いため、キーボード分だけ持ち上げて保存ボタンを隠さないようにする
        <KeyboardAvoidingView style={styles.fullScreenContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                        value={item}
                        onChangeText={setItem}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                    />

                    <Text style={styles.label}>金額</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：50000"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                    />

                    <TouchableOpacity style={styles.dateSelector} onPress={() => setModalVisible(true)}>
                        <Text style={{ color: c.text, fontWeight: '500' }}>📅 日付：{dateText}</Text>
                    </TouchableOpacity>

                    <Modal visible={modalVisible} transparent animationType="slide">
                        <View style={modalStyles.overlay}>
                            <View style={modalStyles.container}>
                                <View style={modalStyles.header}>
                                    <TouchableOpacity onPress={goPrevMonth} style={modalStyles.navBtn}><Text style={{ color: c.text }}>‹</Text></TouchableOpacity>
                                    <Text style={modalStyles.headerTitle}>{calendarMonth.getFullYear()}年 {calendarMonth.getMonth() + 1}月</Text>
                                    <TouchableOpacity onPress={goNextMonth} style={modalStyles.navBtn}><Text style={{ color: c.text }}>›</Text></TouchableOpacity>
                                </View>

                                <View style={modalStyles.weekdaysRow}>
                                    {['日','月','火','水','木','金','土'].map((w) => (
                                        <Text key={w} style={modalStyles.weekday}>{w}</Text>
                                    ))}
                                </View>

                                {weeks.map((week, wi) => (
                                    <View key={wi} style={modalStyles.weekRow}>
                                        {week.map((d, di) => {
                                            const isSelected = d && parsedDate && d.getFullYear() === parsedDate.getFullYear() && d.getMonth() === parsedDate.getMonth() && d.getDate() === parsedDate.getDate();
                                            return (
                                                <TouchableOpacity
                                                    key={di}
                                                    style={[modalStyles.dayCell, isSelected && modalStyles.dayCellSelected]}
                                                    onPress={() => d && selectDate(d)}
                                                    disabled={!d}
                                                >
                                                    <Text style={[modalStyles.dayText, isSelected && modalStyles.dayTextSelected]}>{d ? d.getDate() : ''}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ))}

                                <View style={modalStyles.footerRow}>
                                    <TouchableOpacity style={modalStyles.footerBtn} onPress={() => setModalVisible(false)}>
                                        <Text style={modalStyles.footerBtnText}>キャンセル</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.mainAddButton} onPress={isEditMode ? onUpdate : onSave}>
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

const createModalStyles = (c: AppColors) => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    container: { width: '100%', maxWidth: 520, backgroundColor: c.card, borderRadius: 12, padding: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    navBtn: { padding: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    weekdaysRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    weekday: { width: 36, textAlign: 'center', color: c.textMuted, fontWeight: '700' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    dayCell: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    dayCellSelected: { backgroundColor: '#34C759' },
    dayText: { color: c.text },
    dayTextSelected: { color: '#fff', fontWeight: '700' },
    footerRow: { marginTop: 8, alignItems: 'flex-end' },
    footerBtn: { paddingHorizontal: 12, paddingVertical: 8 },
    footerBtnText: { color: '#34C759', fontWeight: '700' }
});
