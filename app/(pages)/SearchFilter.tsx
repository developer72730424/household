import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    FlatList,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface HistoryItem {
    id: string;
    item: string;
    amount: string;
    category: string;
    date: string;
}

interface SearchFilterProps {
    history: HistoryItem[];
    categories: string[];
    onBack: () => void;
}

export default function SearchFilter({ history, categories, onBack }: SearchFilterProps) {
    const [searchText, setSearchText] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // フィルター条件に基づいて結果を絞り込む
    const filteredResults = history.filter((item) => {
        // 検索テキストでフィルター
        if (searchText && !item.item.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }

        // カテゴリでフィルター
        if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
            return false;
        }

        // 開始日付でフィルター
        if (startDate) {
            const itemDate = parseDate(item.date);
            if (itemDate < startDate) {
                return false;
            }
        }

        // 終了日付でフィルター
        if (endDate) {
            const itemDate = parseDate(item.date);
            if (itemDate > endDate) {
                return false;
            }
        }

        return true;
    });

    // 日付文字列をDateオブジェクトに変換
    const parseDate = (dateStr: string): Date => {
        const [y, m, d] = dateStr.split('/').map(Number);
        return new Date(y, m - 1, d);
    };

    // 日付をフォーマット
    const formatDate = (date: Date | null): string => {
        if (!date) return '';
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    };

    // 開始日付の処理
    const handleStartDateChange = (_event: any, selectedDate?: Date) => {
        setShowStartPicker(Platform.OS === 'ios');
        if (selectedDate) setStartDate(selectedDate);
    };

    // 終了日付の処理
    const handleEndDateChange = (_event: any, selectedDate?: Date) => {
        setShowEndPicker(Platform.OS === 'ios');
        if (selectedDate) setEndDate(selectedDate);
    };

    // カテゴリ選択の切り替え
    const toggleCategory = (cat: string) => {
        if (selectedCategories.includes(cat)) {
            setSelectedCategories(selectedCategories.filter(c => c !== cat));
        } else {
            setSelectedCategories([...selectedCategories, cat]);
        }
    };

    // フィルターをリセット
    const resetFilters = () => {
        setSearchText('');
        setSelectedCategories([]);
        setStartDate(null);
        setEndDate(null);
    };

    // 合計金額を計算
    const totalAmount = filteredResults.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                {/* ヘッダー */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack}>
                        <Text style={styles.backText}>← 戻る</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>検索・フィルター</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* 検索バー */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="品目名で検索... (例: ランチ)"
                        value={searchText}
                        onChangeText={setSearchText}
                        returnKeyType="search"
                    />
                </View>

                {/* フィルターセクション */}
                <View style={styles.filterSection}>
                    {/* カテゴリフィルター */}
                    <Text style={styles.filterLabel}>カテゴリで絞り込み</Text>
                    <View style={styles.categoryFilter}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryTag,
                                    selectedCategories.includes(cat) && styles.categoryTagActive,
                                ]}
                                onPress={() => toggleCategory(cat)}
                            >
                                <Text
                                    style={[
                                        styles.categoryTagText,
                                        selectedCategories.includes(cat) && styles.categoryTagTextActive,
                                    ]}
                                >
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* 日付範囲フィルター */}
                    <Text style={[styles.filterLabel, { marginTop: 15 }]}>日付範囲で絞り込み</Text>
                    <View style={styles.dateFilterRow}>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowStartPicker(true)}
                        >
                            <Text style={styles.dateButtonLabel}>開始日</Text>
                            <Text style={styles.dateButtonValue}>
                                {startDate ? formatDate(startDate) : '選択'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowEndPicker(true)}
                        >
                            <Text style={styles.dateButtonLabel}>終了日</Text>
                            <Text style={styles.dateButtonValue}>
                                {endDate ? formatDate(endDate) : '選択'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* リセットボタン */}
                    {(searchText || selectedCategories.length > 0 || startDate || endDate) && (
                        <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                            <Text style={styles.resetButtonText}>フィルターをリセット</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 結果サマリー */}
                <View style={styles.resultSummary}>
                    <Text style={styles.resultCount}>
                        検索結果: {filteredResults.length}件
                    </Text>
                    <Text style={styles.resultTotal}>
                        合計: ¥{totalAmount.toLocaleString()}
                    </Text>
                </View>

                {/* 検索結果リスト */}
                {filteredResults.length > 0 ? (
                    <FlatList
                        data={filteredResults}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.resultItem}>
                                <View>
                                    <Text style={styles.resultItemName}>{item.item}</Text>
                                    <Text style={styles.resultItemMeta}>
                                        {item.category} | {item.date}
                                    </Text>
                                </View>
                                <Text style={styles.resultItemAmount}>
                                    ¥{Number(item.amount).toLocaleString()}
                                </Text>
                            </View>
                        )}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>該当する支出が見つかりません</Text>
                    </View>
                )}

                {/* 日付ピッカー */}
                {showStartPicker && (
                    <DateTimePicker
                        value={startDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={handleStartDateChange}
                    />
                )}
                {showEndPicker && (
                    <DateTimePicker
                        value={endDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={handleEndDateChange}
                    />
                )}
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA', paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8) },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backText: { color: '#5B4FA3', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },

    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    searchInput: {
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        color: '#1A1A1A'
    },

    filterSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        marginTop: 12,
        marginHorizontal: 12,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
    },
    filterLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },

    categoryFilter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryTag: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 22,
        backgroundColor: '#F0F0F0',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    categoryTagActive: { backgroundColor: '#5B4FA3', borderColor: '#5B4FA3' },
    categoryTagText: { fontSize: 13, color: '#666666', fontWeight: '500' },
    categoryTagTextActive: { color: '#fff', fontWeight: '700' },

    dateFilterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    dateButton: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    dateButtonLabel: { fontSize: 12, color: '#B0B0B0', marginBottom: 4, fontWeight: '500' },
    dateButtonValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

    resetButton: {
        marginTop: 14,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#FF9500',
        alignItems: 'center',
        elevation: 3,
    },
    resetButtonText: { fontSize: 14, color: '#fff', fontWeight: '700' },

    resultSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F0F0F0',
    },
    resultCount: { fontSize: 14, color: '#666666', fontWeight: '500' },
    resultTotal: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 10,
        elevation: 1,
        borderLeftWidth: 4,
        borderLeftColor: '#5B4FA3',
    },
    resultItemName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
    resultItemMeta: { fontSize: 12, color: '#B0B0B0', marginTop: 3, fontWeight: '500' },
    resultItemAmount: { fontSize: 15, fontWeight: '700', color: '#5B4FA3' },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: '#B0B0B0', fontWeight: '500' },
});
