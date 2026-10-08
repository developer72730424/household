import React, { useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CalendarModal from '@/components/calendar-modal';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { formatDisplayDate, toDateString, type Template } from '@/utils/entries';

interface InputItemProps {
    item: string;
    setItem: (t: string) => void;
    amount: string;
    setAmount: (t: string) => void;
    selectedCategory: string;
    setSelectedCategory: (c: string) => void;
    categories: string[];
    date: Date;
    onChangeDate: (d: Date) => void;
    isEditMode?: boolean;
    onSave: () => void;
    onCancel: () => void;
    templates?: Template[];
    onSelectTemplate?: (template: Template) => void;
    extras?: React.ReactNode; // 日付の下に出す追加の入力（メモ・支払い方法・レシート写真）
}

export default function InputItem({
    item, setItem, amount, setAmount, selectedCategory, setSelectedCategory, categories,
    date, onChangeDate, isEditMode = false, onSave, onCancel, templates = [], onSelectTemplate, extras,
}: InputItemProps) {
    const c = useAppColors();
    const headerHeight = useHeaderHeight();
    const styles = useMemo(() => createStyles(c), [c]);
    const [calendarVisible, setCalendarVisible] = useState(false);

    return (
        // 数値キーボードには閉じるボタンが無いため、キーボード分だけ持ち上げて保存ボタンを隠さないようにする
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
                <Text style={styles.screenTitle}>{isEditMode ? '支出を編集' : '支出を入力'}</Text>

                <View style={styles.inputCard}>
                    <Text style={styles.label}>品目</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：ランチ"
                        placeholderTextColor={c.textMuted}
                        value={item}
                        onChangeText={setItem}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                    />

                    <Text style={styles.label}>金額</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：1000"
                        placeholderTextColor={c.textMuted}
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
                                <Text style={selectedCategory === cat ? { color: '#fff', fontWeight: '600', fontSize: 13 } : { color: c.textSecondary, fontWeight: '500', fontSize: 13 }}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.dateSelector} onPress={() => setCalendarVisible(true)}>
                        <Text style={{ color: c.text, fontWeight: '500' }}>📅 日付：{formatDisplayDate(toDateString(date))}</Text>
                    </TouchableOpacity>

                    {extras}

                    <CalendarModal
                        visible={calendarVisible}
                        value={date}
                        onSelect={(d) => { onChangeDate(d); setCalendarVisible(false); }}
                        onClose={() => setCalendarVisible(false)}
                    />

                    {templates.length > 0 && !isEditMode && (
                        <>
                            <Text style={[styles.label, { marginTop: 20 }]}>📋 よく使うテンプレート</Text>
                            {/* テンプレートが多い場合でもすべて参照できるように横スクロールにする */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingVertical: 12 }}
                                keyboardShouldPersistTaps="handled"
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
    scrollContent: {
        flex: 1,
        padding: 16,
    },
    screenTitle: { 
        fontSize: 24, 
        fontWeight: '700', 
        marginBottom: 20, 
        textAlign: 'center',
        color: c.text
    },
    inputCard: { 
        backgroundColor: c.card, 
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
        color: c.textSecondary, 
        marginBottom: 8, 
        marginTop: 14,
        fontWeight: '600'
    },
    input: { 
        backgroundColor: c.background, 
        padding: 14, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: c.border,
        marginBottom: 12,
        color: c.text,
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
        backgroundColor: c.chip,
        borderWidth: 1,
        borderColor: c.border
    },
    catBtnActive: { 
        backgroundColor: c.primary,
        borderColor: c.primary
    },
    dateSelector: { 
        padding: 16, 
        backgroundColor: c.background, 
        borderRadius: 10, 
        marginTop: 12,
        borderWidth: 1,
        borderColor: c.border,
        color: c.text,
        fontSize: 15,
        fontWeight: '500'
    },
    mainAddButton: { 
        backgroundColor: c.primary, 
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
    templateQuick: {
        flex: 1,
        backgroundColor: c.tintBg,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.primary,
        alignItems: 'center',
        elevation: 2,
    },
    templateQuickText: {
        fontSize: 13,
        color: c.primaryText,
        fontWeight: '700',
        marginBottom: 6,
    },
    templateQuickAmount: {
        fontSize: 14,
        color: c.primaryText,
        fontWeight: '700',
    },
    buttonContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: c.card,
        borderTopWidth: 1,
        borderTopColor: c.border,
    },
    cancelButton: {
        backgroundColor: c.chip,
        padding: 14,
        borderRadius: 10,
        marginTop: 10,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: c.border,
    },
    cancelButtonText: {
        color: c.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
});
