import React, { useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
    categories: string[];
    onAdd: (name: string) => void;
    onDelete: (name: string) => void;
    onBack: () => void;
}

export default function CategorySettings({ categories, onAdd, onDelete, onBack }: Props) {
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
                        <Text>{item}</Text>
                        <TouchableOpacity onPress={() => confirmDelete(item)}>
                            <Text style={{ color: 'red' }}>削除</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA', paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8) },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        padding: 16, 
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backText: { color: '#5B4FA3', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
    inputArea: { 
        flexDirection: 'row', 
        padding: 16, 
        gap: 12,
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
    },
    input: { 
        flex: 1, 
        backgroundColor: '#F8F9FA', 
        padding: 12, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#E0E0E0',
        color: '#1A1A1A'
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
        backgroundColor: '#FFFFFF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#E0E0E0',
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 10,
        elevation: 1,
    }
});
