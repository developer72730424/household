import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Keyboard, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { ActionResult, CategoryResult } from '@/context/app-data';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { fallbackCategory } from '@/utils/categories';

interface Props {
    categories: string[];
    usage: Record<string, number>; // カテゴリごとの記録件数
    onAdd: (name: string) => ActionResult;
    onRename: (from: string, to: string) => CategoryResult;
    onDelete: (name: string) => CategoryResult;
    onBack: () => void;
}

export default function CategorySettings({ categories, usage, onAdd, onRename, onDelete, onBack }: Props) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [newCat, setNewCat] = useState('');
    const [renaming, setRenaming] = useState<string | null>(null);
    const [renameText, setRenameText] = useState('');

    const startRename = (name: string) => {
        setRenaming(name);
        setRenameText(name);
    };

    const submitRename = () => {
        if (renaming === null) return;
        const result = onRename(renaming, renameText);
        if (!result.ok) {
            Alert.alert('入力エラー', result.message);
            return;
        }
        Keyboard.dismiss();
        setRenaming(null);
    };

    const confirmDelete = (name: string) => {
        const count = usage[name] ?? 0;
        const to = fallbackCategory(categories, name);
        if (to === null) {
            Alert.alert('削除できません', '最後のカテゴリは削除できません');
            return;
        }
        const message = count > 0
            ? `「${name}」の記録${count}件は「${to}」に移ります。削除しますか？`
            : `「${name}」を削除しますか？`;
        Alert.alert('カテゴリを削除', message, [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: '削除',
                style: 'destructive',
                onPress: () => {
                    const result = onDelete(name);
                    if (!result.ok) Alert.alert('削除できません', result.message);
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← 戻る</Text></TouchableOpacity>
                <Text style={styles.title}>カテゴリ設定</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    placeholder="新しいカテゴリ名"
                    placeholderTextColor={c.textMuted}
                    value={newCat}
                    onChangeText={setNewCat}
                />
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                        const result = onAdd(newCat);
                        if (result.ok) setNewCat('');
                        else Alert.alert('入力エラー', result.message);
                    }}
                >
                    <Text style={{ color: '#fff' }}>追加</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={categories}
                keyExtractor={item => item}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                    <View style={styles.listItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: c.text, fontSize: 15 }}>{item}</Text>
                            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{usage[item] ?? 0}件の記録</Text>
                        </View>
                        <TouchableOpacity onPress={() => startRename(item)} style={styles.actionBtn} accessibilityLabel={`${item}の名前を変更`}>
                            <Text style={{ color: c.primaryText, fontWeight: '600' }}>名前を変更</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionBtn} accessibilityLabel={`${item}を削除`}>
                            <Text style={{ color: c.danger, fontWeight: '600' }}>削除</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <Modal visible={renaming !== null} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>カテゴリ名を変更</Text>
                        <Text style={styles.modalDesc}>このカテゴリの記録・テンプレート・固定費も新しい名前になります。</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={renameText}
                            onChangeText={setRenameText}
                            autoFocus
                            selectTextOnFocus
                            returnKeyType="done"
                            onSubmitEditing={submitRename}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.chip }]} onPress={() => setRenaming(null)}>
                                <Text style={{ color: c.textSecondary, fontWeight: '600' }}>キャンセル</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.primary }]} onPress={submitRename}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>変更</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8) },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        padding: 16, 
        alignItems: 'center',
        backgroundColor: c.card,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    backText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: '700', color: c.text },
    inputArea: { 
        flexDirection: 'row', 
        padding: 16, 
        gap: 12,
        backgroundColor: c.card,
        marginBottom: 12,
    },
    input: { 
        flex: 1, 
        backgroundColor: c.background, 
        padding: 12, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: c.border,
        color: c.text
    },
    addBtn: { 
        backgroundColor: c.success, 
        padding: 12, 
        borderRadius: 10, 
        justifyContent: 'center',
        elevation: 3,
    },
    listItem: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        padding: 16, 
        backgroundColor: c.card, 
        borderBottomWidth: 1, 
        borderBottomColor: c.border,
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 10,
        elevation: 1,
        alignItems: 'center',
    },
    actionBtn: { paddingHorizontal: 10, paddingVertical: 8 },
    // 縦に並ぶモーダルの中では flex: 1 を付けない（高さが潰れて文字が見えなくなる）
    modalInput: {
        backgroundColor: c.background,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.border,
        color: c.text,
        fontSize: 16,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalCard: { backgroundColor: c.card, borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 6 },
    modalDesc: { fontSize: 12, color: c.textSecondary, marginBottom: 12, lineHeight: 18 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
    modalBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
});
