import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

export interface Template {
    id: string;
    name: string;
    item: string;
    amount: string;
    category: string;
}

interface TemplatesProps {
    templates: Template[];
    onAddTemplate: (template: Template) => void;
    onDeleteTemplate: (id: string) => void;
    onSelectTemplate: (template: Template) => void;
    categories: string[];
    onBack: () => void;
}

export default function Templates({
    templates,
    onAddTemplate,
    onDeleteTemplate,
    onSelectTemplate,
    categories,
    onBack,
}: TemplatesProps) {
    const [mode, setMode] = useState<'list' | 'add'>('list');
    const [templateName, setTemplateName] = useState('');
    const [templateItem, setTemplateItem] = useState('');
    const [templateAmount, setTemplateAmount] = useState('');
    const [templateCategory, setTemplateCategory] = useState(categories[0] || '食費');

    const handleAddTemplate = () => {
        if (!templateName.trim() || !templateItem.trim() || !templateAmount.trim()) {
            Alert.alert('エラー', 'すべてのフィールドを入力してください');
            return;
        }
        const newTemplate: Template = {
            id: Date.now().toString(),
            name: templateName,
            item: templateItem,
            amount: templateAmount,
            category: templateCategory,
        };
        onAddTemplate(newTemplate);
        setTemplateName('');
        setTemplateItem('');
        setTemplateAmount('');
        setTemplateCategory(categories[0] || '食費');
        setMode('list');
        Alert.alert('成功', 'テンプレートを保存しました');
    };

    const handleDeleteTemplate = (id: string) => {
        Alert.alert(
            'テンプレート削除',
            'このテンプレートを削除しますか？',
            [
                { text: 'キャンセル', onPress: () => {}, style: 'cancel' },
                {
                    text: '削除',
                    onPress: () => onDeleteTemplate(id),
                    style: 'destructive',
                },
            ]
        );
    };

    if (mode === 'add') {
        return (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.container}>
                <Text style={styles.title}>テンプレートを作成</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>テンプレート名</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：いつもの朝食"
                        value={templateName}
                        onChangeText={setTemplateName}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                        blurOnSubmit={true}
                    />

                    <Text style={styles.label}>品目</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：ランチ"
                        value={templateItem}
                        onChangeText={setTemplateItem}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                        blurOnSubmit={true}
                    />

                    <Text style={styles.label}>金額</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例：1000"
                        value={templateAmount}
                        onChangeText={setTemplateAmount}
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                        blurOnSubmit={true}
                    />

                    <Text style={styles.label}>カテゴリ</Text>
                    <View style={styles.categoryRow}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setTemplateCategory(cat)}
                                style={[
                                    styles.catBtn,
                                    templateCategory === cat && styles.catBtnActive,
                                ]}
                            >
                                <Text
                                    style={
                                        templateCategory === cat ? { color: '#fff' } : { color: '#333' }
                                    }
                                >
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.mainButton}
                    onPress={handleAddTemplate}
                >
                    <Text style={styles.mainButtonText}>保存</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setMode('list')}
                    style={{ marginTop: 20 }}
                >
                    <Text style={{ color: '#666', textAlign: 'center' }}>キャンセル</Text>
                </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>テンプレート管理</Text>

            {templates.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>テンプレートがありません</Text>
                </View>
            ) : (
                <FlatList
                    data={templates}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.templateItem}
                            onPress={() => {
                                // プレビューを表示して選択/削除/キャンセルを可能にする
                                Alert.alert(
                                    item.name,
                                    `${item.item} - ${item.amount}円\nカテゴリ: ${item.category}`,
                                    [
                                        { text: 'キャンセル', style: 'cancel' },
                                        { text: '選択', onPress: () => { onSelectTemplate(item); onBack(); } },
                                        { text: '削除', style: 'destructive', onPress: () => handleDeleteTemplate(item.id) },
                                    ]
                                );
                            }}
                        >
                            <View style={styles.templateContent}>
                                <Text style={styles.templateName}>{item.name}</Text>
                                <Text style={styles.templateDetail}>
                                    {item.item} - {item.amount}円 ({item.category})
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleDeleteTemplate(item.id)}
                                style={styles.deleteBtn}
                            >
                                <Text style={styles.deleteBtnText}>削除</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                    scrollEnabled={true}
                    nestedScrollEnabled={true}
                />
            )}

            <TouchableOpacity
                style={styles.addButton}
                onPress={() => setMode('add')}
            >
                <Text style={styles.addButtonText}>+ 新規テンプレート</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={onBack}
                style={{ marginTop: 15 }}
            >
                <Text style={{ color: '#666', textAlign: 'center' }}>戻る</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        padding: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 24,
        textAlign: 'center',
        color: '#1A1A1A'
    },
    card: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        elevation: 3,
        marginBottom: 20,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    label: {
        fontSize: 15,
        color: '#666666',
        marginBottom: 8,
        marginTop: 12,
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
        marginVertical: 12,
    },
    catBtn: {
        padding: 12,
        borderRadius: 22,
        backgroundColor: '#F0F0F0',
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    catBtnActive: {
        backgroundColor: '#5B4FA3',
        borderColor: '#5B4FA3'
    },
    mainButton: {
        backgroundColor: '#5B4FA3',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
        elevation: 3,
    },
    mainButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    addButton: {
        backgroundColor: '#34C759',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
        elevation: 3,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#B0B0B0',
        fontWeight: '500'
    },
    templateItem: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#5B4FA3'
    },
    templateContent: {
        flex: 1,
    },
    templateName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 6,
    },
    templateDetail: {
        fontSize: 13,
        color: '#B0B0B0',
        fontWeight: '500'
    },
    deleteBtn: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        elevation: 2,
    },
    deleteBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});
