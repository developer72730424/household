import React, { useMemo, useState } from 'react';
import { Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Template } from './Templates';


// App.tsxから渡してもらう「道具」の型を定義
interface InputItemProps {
    item: string;
    setItem: (t: string) => void;
    amount: string;
    setAmount: (t: string) => void;
    selectedCategory: string;
    setSelectedCategory: (c: string) => void;
    categories: string[];
    onAddCategory: (newCat: string) => void;
    onSave: () => void;
    onShowPicker?: () => void;
    onCancel: () => void;
    onSelectDate?: (d: Date) => void;
    dateText: string;
    isEditMode?: boolean;
    onUpdate?: () => void;
    templates?: Template[];
    onSelectTemplate?: (template: Template) => void;

}

export default function InputItem({
    item, setItem, amount, setAmount, selectedCategory, setSelectedCategory,
    categories, onAddCategory, onSave, onCancel, onSelectDate, dateText,
    isEditMode = false, onUpdate, templates = [], onSelectTemplate
}: InputItemProps) {
    // ローカルな UI state
    const [modalVisible, setModalVisible] = useState(false);

    // parse dateText (format: YYYY/M/D) into Date
    const parsedDate = useMemo(() => {
        try {
            const parts = dateText.split('/').map(Number);
            if (parts.length >= 3) return new Date(parts[0], parts[1] - 1, parts[2]);
        } catch (e) {}
        return new Date();
    }, [dateText]);

    const [calendarMonth, setCalendarMonth] = useState(() => new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));

    // regenerate calendar when calendarMonth changes
    const weeks = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay(); // 0 Sun .. 6 Sat

        const days: Array<Date | null> = [];
        // pad before
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

        // chunk into weeks
        const rows: Array<Array<Date | null>> = [];
        for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
        // ensure at least 6 weeks for consistent height
        while (rows.length < 6) rows.push(new Array(7).fill(null));
        return rows;
    }, [calendarMonth]);

    const goPrevMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const goNextMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const selectDate = (d: Date) => {
        onSelectDate?.(d);
        setModalVisible(false);
    };

    // ローカルな UI state
    return (
        <View style={styles.fullScreenContainer}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                <Text style={styles.screenTitle}>{isEditMode ? '支出を編集' : '支出を入力'}</Text>

                <View style={styles.inputCard}>
                    <Text style={styles.label}>品目</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：ランチ"
                        value={item}
                        onChangeText={setItem}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                    />

                    <Text style={styles.label}>金額</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：1000"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>カテゴリ</Text>
                    <View style={styles.categoryRow}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setSelectedCategory(cat)}
                                style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]}
                            >
                                <Text style={selectedCategory === cat ? { color: '#fff', fontWeight: '600', fontSize: 13 } : { color: '#666666', fontWeight: '500', fontSize: 13 }}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.dateSelector} onPress={() => setModalVisible(true)}>
                        <Text style={{ color: '#1A1A1A', fontWeight: '500' }}>📅 日付：{dateText}</Text>
                    </TouchableOpacity>

                    <Modal visible={modalVisible} transparent animationType="slide">
                        <View style={modalStyles.overlay}>
                            <View style={modalStyles.container}>
                                <View style={modalStyles.header}>
                                    <TouchableOpacity onPress={goPrevMonth} style={modalStyles.navBtn}><Text>‹</Text></TouchableOpacity>
                                    <Text style={modalStyles.headerTitle}>{calendarMonth.getFullYear()}年 {calendarMonth.getMonth() + 1}月</Text>
                                    <TouchableOpacity onPress={goNextMonth} style={modalStyles.navBtn}><Text>›</Text></TouchableOpacity>
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

                        {templates && templates.length > 0 && (
                            <>
                                <Text style={[styles.label, { marginTop: 20 }]}>📋 よく使うテンプレート</Text>
                                {/* テンプレートが多い場合でもすべて参照できるように横スクロールにする */}
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingVertical: 12 }}
                                >
                                    {templates.map((template: Template) => (
                                        <TouchableOpacity
                                            key={template.id}
                                            style={styles.templateQuick}
                                            onPress={() => onSelectTemplate?.(template)}
                                        >
                                            <Text style={styles.templateQuickText}>{template.name}</Text>
                                            <Text style={styles.templateQuickAmount}>{template.amount}円</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}
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
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: { 
        flex: 1, 
        backgroundColor: '#F8F9FA', 
        display: 'flex',
        flexDirection: 'column',
    },
    scrollContent: {
        flex: 1,
        padding: 16,
    },
    screenTitle: { 
        fontSize: 24, 
        fontWeight: '700', 
        marginBottom: 20, 
        textAlign: 'center',
        color: '#1A1A1A'
    },
    inputCard: { 
        backgroundColor: '#FFFFFF', 
        padding: 24, 
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    label: { 
        fontSize: 15, 
        color: '#666666', 
        marginBottom: 8, 
        marginTop: 14,
        fontWeight: '600'
    },
    input: { 
        backgroundColor: '#F8F9FA', 
        padding: 14, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#E0E0E0',
        marginBottom: 12,
        color: '#1A1A1A',
        fontSize: 15
    },
    categoryRow: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 12, 
        marginVertical: 12 
    },
    catBtn: { 
        padding: 12, 
        borderRadius: 20, 
        backgroundColor: '#F0F0F0',
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    catBtnActive: { 
        backgroundColor: '#5B4FA3',
        borderColor: '#5B4FA3'
    },
    dateSelector: { 
        padding: 16, 
        backgroundColor: '#F8F9FA', 
        borderRadius: 10, 
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        color: '#1A1A1A',
        fontSize: 15,
        fontWeight: '500'
    },
    mainAddButton: { 
        backgroundColor: '#5B4FA3', 
        padding: 18, 
        borderRadius: 12, 
        marginTop: 32, 
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    mainAddButtonText: { 
        color: '#fff', 
        fontSize: 16, 
        fontWeight: '700' 
    },
    addCategoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
        gap: 10
    },
    smallInput: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        color: '#1A1A1A'
    },
    miniAddBtn: {
        backgroundColor: '#34C759',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 3,
    },
    templateRow: {
        flexDirection: 'row',
        gap: 12,
        marginVertical: 12,
    },
    templateQuick: {
        flex: 1,
        backgroundColor: '#F0F8FF',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#5B4FA3',
        alignItems: 'center',
        elevation: 2,
    },
    templateQuickText: {
        fontSize: 13,
        color: '#5B4FA3',
        fontWeight: '700',
        marginBottom: 6,
    },
    templateQuickAmount: {
        fontSize: 14,
        color: '#5B4FA3',
        fontWeight: '700',
    },
    buttonContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
        padding: 14,
        borderRadius: 10,
        marginTop: 10,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
    },
    cancelButtonText: {
        color: '#666666',
        fontSize: 15,
        fontWeight: '600',
    },
});

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 520,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    navBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    weekdaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    weekday: {
        width: 36,
        textAlign: 'center',
        color: '#888',
        fontWeight: '700',
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    dayCell: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCellSelected: {
        backgroundColor: '#5B4FA3',
    },
    dayText: {
        color: '#222',
    },
    dayTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    footerRow: {
        marginTop: 8,
        alignItems: 'flex-end',
    },
    footerBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    footerBtnText: {
        color: '#5B4FA3',
        fontWeight: '700',
    }
});