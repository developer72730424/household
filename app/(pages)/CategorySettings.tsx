import React, { useState, useMemo } from 'react';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { Alert, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
    categories: string[];
    onAdd: (name: string) => void;
    onDelete: (name: string) => void;
    onBack: () => void;
}

export default function CategorySettings({ categories, onAdd, onDelete, onBack }: Props) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [newCat, setNewCat] = useState('');

    const confirmDelete = (name: string) => {
        Alert.alert("削除", `${name}を削除しますか？`, [
            { text: "キャンセル", style: "cancel" },
            { text: "削除", style: "destructive", onPress: () => onDelete(name) }
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
                    value={newCat}
                    onChangeText={setNewCat}
                />
                <TouchableOpacity style={styles.addBtn} onPress={() => {
                    if (newCat) { onAdd(newCat); setNewCat(''); }
                }}>
                    <Text style={{ color: '#fff' }}>追加</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={categories}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                    <View style={styles.listItem}>
                        <Text style={{ color: c.text }}>{item}</Text>
                        <TouchableOpacity onPress={() => confirmDelete(item)}>
                            <Text style={{ color: 'red' }}>削除</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
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
        backgroundColor: '#34C759', 
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
    }
});
