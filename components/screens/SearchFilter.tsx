import React, { useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CalendarModal from '@/components/calendar-modal';
import { Collapsible } from '@/components/ui/collapsible';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { formatDisplayDate, INCOME_LABEL, sortEntries, summarize, toDateString, type Entry } from '@/utils/entries';

interface SearchFilterProps {
    entries: Entry[];
    categories: string[];
    onBack: () => void;
}

export default function SearchFilter({ entries, categories, onBack }: SearchFilterProps) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [searchText, setSearchText] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [picker, setPicker] = useState<'start' | 'end' | null>(null);

    // 「収入」も絞り込みの選択肢にする（収入は type が income のものとして扱われる）
    const filterCategories = useMemo(() => [...categories, INCOME_LABEL], [categories]);

    // フィルター条件に基づいて結果を絞り込む。日付は YYYY-MM-DD なので文字列のまま比較できる
    const filteredResults = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        const start = startDate ? toDateString(startDate) : null;
        const end = endDate ? toDateString(endDate) : null;
        return sortEntries(entries).filter((e) => {
            if (keyword && !e.item.toLowerCase().includes(keyword)) return false;
            if (selectedCategories.length > 0 && !selectedCategories.includes(e.category)) return false;
            if (start && e.date < start) return false;
            if (end && e.date > end) return false;
            return true;
        });
    }, [entries, searchText, selectedCategories, startDate, endDate]);

    // カテゴリ選択の切り替え
    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => (prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]));
    };

    // フィルターをリセット
    const resetFilters = () => {
        setSearchText('');
        setSelectedCategories([]);
        setStartDate(null);
        setEndDate(null);
    };

    // 収入・支出を分けて合計を計算
    const { income: incomeTotal, expense: expenseTotal, balance: netTotal } = useMemo(() => summarize(filteredResults), [filteredResults]);

    return (
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
                    placeholderTextColor={c.textMuted}
                    value={searchText}
                    onChangeText={setSearchText}
                    returnKeyType="search"
                />
            </View>

            {/* フィルターセクション */}
            <View style={styles.filterSection}>
                <Collapsible title="絞り込み">
                    <View style={styles.collapsibleContent}>
                        <View style={styles.categoryFilter}>
                            {filterCategories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.categoryTag, selectedCategories.includes(cat) && styles.categoryTagActive]}
                                    onPress={() => toggleCategory(cat)}
                                >
                                    <Text style={[styles.categoryTagText, selectedCategories.includes(cat) && styles.categoryTagTextActive]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.filterLabel, { marginTop: 15 }]}>日付範囲で絞り込み</Text>
                        <View style={styles.dateFilterRow}>
                            <TouchableOpacity style={styles.dateButton} onPress={() => setPicker('start')}>
                                <Text style={styles.dateButtonLabel}>開始日</Text>
                                <Text style={styles.dateButtonValue}>
                                    {startDate ? formatDisplayDate(toDateString(startDate)) : '選択'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.dateButton} onPress={() => setPicker('end')}>
                                <Text style={styles.dateButtonLabel}>終了日</Text>
                                <Text style={styles.dateButtonValue}>
                                    {endDate ? formatDisplayDate(toDateString(endDate)) : '選択'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {(searchText || selectedCategories.length > 0 || startDate || endDate) && (
                            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                                <Text style={styles.resetButtonText}>フィルターをリセット</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Collapsible>
            </View>

            {/* 結果サマリー */}
            <View style={styles.resultSummary}>
                <Text style={styles.resultCount}>検索結果: {filteredResults.length}件</Text>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.resultIncome}>収入: ¥{incomeTotal.toLocaleString()}</Text>
                    <Text style={styles.resultExpense}>支出: ¥{expenseTotal.toLocaleString()}</Text>
                    <Text style={[styles.resultTotal, { marginTop: 2, fontSize: 13 }]}>
                        収支: {netTotal >= 0 ? '+' : '-'}¥{Math.abs(netTotal).toLocaleString()}
                    </Text>
                </View>
            </View>

            {/* 検索結果リスト */}
            {filteredResults.length > 0 ? (
                <View style={{ flex: 1, minHeight: 0 }}>
                    <FlatList
                        style={{ flex: 1 }}
                        data={filteredResults}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator
                        renderItem={({ item }) => {
                            const isIncome = item.type === 'income';
                            return (
                                <View style={[styles.resultItem, { borderLeftColor: isIncome ? c.success : c.primary }]}>
                                    <View>
                                        <Text style={styles.resultItemName}>{item.item}</Text>
                                        <Text style={styles.resultItemMeta}>
                                            {item.category} | {formatDisplayDate(item.date)}
                                        </Text>
                                    </View>
                                    <Text style={[styles.resultItemAmount, { color: isIncome ? c.success : c.primaryText }]}>
                                        {isIncome ? '+' : '-'}¥{item.amount.toLocaleString()}
                                    </Text>
                                </View>
                            );
                        }}
                    />
                </View>
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>該当する収入・支出が見つかりません</Text>
                </View>
            )}

            <CalendarModal
                visible={picker === 'start'}
                value={startDate}
                onSelect={(d) => { setStartDate(d); setPicker(null); }}
                onClose={() => setPicker(null)}
            />
            <CalendarModal
                visible={picker === 'end'}
                value={endDate}
                onSelect={(d) => { setEndDate(d); setPicker(null); }}
                onClose={() => setPicker(null)}
            />
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    // minHeight:0 を追加して子要素（FlatList）が正しく伸縮できるようにする
    // height: '100%' を追加して、親が flex を持たない場合でも全高を確保する
    container: { flex: 1, minHeight: 0, height: '100%', backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8) },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: c.card,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    backText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: '700', color: c.text },

    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: c.card,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    searchInput: {
        backgroundColor: c.background,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        fontSize: 15,
        borderWidth: 1,
        borderColor: c.border,
        color: c.text
    },

    filterSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        // 背景に馴染むように透明化しカード感を抑える
        backgroundColor: 'transparent',
        marginTop: 12,
        marginHorizontal: 12,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 0,
        borderWidth: 0,
    },
    filterLabel: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 10 },

    categoryFilter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    collapsibleContent: {
        backgroundColor: c.card,
        padding: 12,
        borderRadius: 12,
        // 軽い影でカード感を出す
        elevation: 2,
        borderWidth: 1,
        borderColor: c.border,
    },
    categoryTag: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 22,
        // タグは白背景にして背景とコントラストを確保
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
    },
    categoryTagActive: { backgroundColor: c.primary, borderColor: c.primary },
    categoryTagText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    categoryTagTextActive: { color: '#fff', fontWeight: '700' },

    dateFilterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    dateButton: {
        flex: 1,
        // 日付ボタンは白背景にして視認性を向上
        backgroundColor: c.card,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.border,
    },
    dateButtonLabel: { fontSize: 12, color: c.textMuted, marginBottom: 4, fontWeight: '500' },
    dateButtonValue: { fontSize: 14, fontWeight: '700', color: c.text },

    resetButton: {
        marginTop: 14,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: c.warning,
        alignItems: 'center',
        elevation: 3,
    },
    resetButtonText: { fontSize: 14, color: '#fff', fontWeight: '700' },

    resultSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: c.chip,
    },
    resultCount: { fontSize: 14, color: c.textSecondary, fontWeight: '500' },
    resultTotal: { fontSize: 14, fontWeight: '700', color: c.text },
    resultIncome: { fontSize: 13, fontWeight: '700', color: c.success },
    resultExpense: { fontSize: 13, fontWeight: '700', color: c.danger },

    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: c.card,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 10,
        elevation: 1,
        borderLeftWidth: 4,
        borderLeftColor: c.primary,
    },
    resultItemName: { fontSize: 15, fontWeight: '600', color: c.text },
    resultItemMeta: { fontSize: 12, color: c.textMuted, marginTop: 3, fontWeight: '500' },
    resultItemAmount: { fontSize: 15, fontWeight: '700', color: c.primaryText },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: c.textMuted, fontWeight: '500' },
});
