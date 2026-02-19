import { Collapsible } from '@/components/ui/collapsible';
import React, { useState } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
    // カレンダーモーダル用のカレンダーモンスター
    const [startCalendarMonth, setStartCalendarMonth] = useState(() => new Date());
    const [endCalendarMonth, setEndCalendarMonth] = useState(() => new Date());

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
        // 以前は DateTimePicker 用だったが、今はカレンダーモーダルを使うため互換性を残す
        setShowStartPicker(Platform.OS === 'ios');
        if (selectedDate) setStartDate(selectedDate);
    };

    // 終了日付の処理
    const handleEndDateChange = (_event: any, selectedDate?: Date) => {
        setShowEndPicker(Platform.OS === 'ios');
        if (selectedDate) setEndDate(selectedDate);
    };

    // カレンダーモーダルで使用するロジック（InputItem と同等）
    const makeWeeks = (calendarMonth: Date) => {
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
    };

    const startWeeks = makeWeeks(startCalendarMonth);
    const endWeeks = makeWeeks(endCalendarMonth);

    const goPrevMonth = (which: 'start' | 'end') => {
        if (which === 'start') setStartCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        else setEndCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };
    const goNextMonth = (which: 'start' | 'end') => {
        if (which === 'start') setStartCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        else setEndCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const selectStartDate = (d: Date) => {
        setStartDate(d);
        setShowStartPicker(false);
    };
    const selectEndDate = (d: Date) => {
        setEndDate(d);
        setShowEndPicker(false);
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

    // 収入・支出を分けて合計を計算
    const incomeTotal = filteredResults
        .filter(i => i.category === '収入')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expenseTotal = filteredResults
        .filter(i => i.category !== '収入')
        .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
    const netTotal = incomeTotal - expenseTotal;

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
                        value={searchText}
                        onChangeText={setSearchText}
                        returnKeyType="search"
                    />
                </View>

                {/* フィルターセクション */}
                <View style={styles.filterSection}>
                    {/* カテゴリフィルター（折りたたみ） */}
                    <Collapsible title="絞り込み">
                        <View style={styles.collapsibleContent}>
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

                            {/* カテゴリ内に日付範囲フィルターを含める（ユーザー要望） */}
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

                            {/* リセットボタンもカテゴリ折りたたみ内に含める */}
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
                    <Text style={styles.resultCount}>
                        検索結果: {filteredResults.length}件
                    </Text>
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
                    // Wrap FlatList in a flex container so it can take remaining space and scroll.
                    <View style={{ flex: 1, minHeight: 0 }}>
                        <FlatList
                            style={{ flex: 1 }}
                            data={filteredResults}
                            keyExtractor={(item) => item.id}
                            // padding at bottom so last items are not hidden behind any bottom UI.
                            contentContainerStyle={{ paddingBottom: 24 }}
                            // allow taps to dismiss keyboard and still interact with list
                            keyboardShouldPersistTaps="handled"
                            // dismiss keyboard when dragging the list
                            keyboardDismissMode="on-drag"
                            // allow nested scrolling on Android and ensure scrollbar shown
                            nestedScrollEnabled={true}
                            // explicitly enable scrolling
                            scrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                            renderItem={({ item }) => {
                                const isIncome = item.category === '収入';
                                const amt = Number(item.amount) || 0;
                                const displayAmount = `${isIncome ? '+' : '-'}¥${Math.abs(amt).toLocaleString()}`;
                                return (
                                    <View style={[styles.resultItem, { borderLeftColor: isIncome ? '#27AE60' : '#5B4FA3' }] }>
                                        <View>
                                            <Text style={styles.resultItemName}>{item.item}</Text>
                                            <Text style={styles.resultItemMeta}>
                                                {item.category} | {item.date}
                                            </Text>
                                        </View>
                                        <Text style={[styles.resultItemAmount, { color: isIncome ? '#27AE60' : '#5B4FA3' }]}>
                                            {displayAmount}
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

                {/* 開始日カレンダーモーダル */}
                {showStartPicker && (
                    <Modal visible transparent animationType="slide">
                        <View style={modalStyles.overlay}>
                            <View style={modalStyles.container}>
                                <View style={modalStyles.header}>
                                    <TouchableOpacity onPress={() => goPrevMonth('start')} style={modalStyles.navBtn}><Text>‹</Text></TouchableOpacity>
                                    <Text style={modalStyles.headerTitle}>{startCalendarMonth.getFullYear()}年 {startCalendarMonth.getMonth() + 1}月</Text>
                                    <TouchableOpacity onPress={() => goNextMonth('start')} style={modalStyles.navBtn}><Text>›</Text></TouchableOpacity>
                                </View>

                                <View style={modalStyles.weekdaysRow}>
                                    {['日','月','火','水','木','金','土'].map((w) => (
                                        <Text key={w} style={modalStyles.weekday}>{w}</Text>
                                    ))}
                                </View>

                                {startWeeks.map((week, wi) => (
                                    <View key={wi} style={modalStyles.weekRow}>
                                        {week.map((d, di) => {
                                            const isSelected = d && startDate && d.getFullYear() === startDate.getFullYear() && d.getMonth() === startDate.getMonth() && d.getDate() === startDate.getDate();
                                            return (
                                                <TouchableOpacity
                                                    key={di}
                                                    style={[modalStyles.dayCell, isSelected && modalStyles.dayCellSelected]}
                                                    onPress={() => d && selectStartDate(d)}
                                                    disabled={!d}
                                                >
                                                    <Text style={[modalStyles.dayText, isSelected && modalStyles.dayTextSelected]}>{d ? d.getDate() : ''}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ))}

                                <View style={modalStyles.footerRow}>
                                    <TouchableOpacity style={modalStyles.footerBtn} onPress={() => setShowStartPicker(false)}>
                                        <Text style={modalStyles.footerBtnText}>キャンセル</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}

                {/* 終了日カレンダーモーダル */}
                {showEndPicker && (
                    <Modal visible transparent animationType="slide">
                        <View style={modalStyles.overlay}>
                            <View style={modalStyles.container}>
                                <View style={modalStyles.header}>
                                    <TouchableOpacity onPress={() => goPrevMonth('end')} style={modalStyles.navBtn}><Text>‹</Text></TouchableOpacity>
                                    <Text style={modalStyles.headerTitle}>{endCalendarMonth.getFullYear()}年 {endCalendarMonth.getMonth() + 1}月</Text>
                                    <TouchableOpacity onPress={() => goNextMonth('end')} style={modalStyles.navBtn}><Text>›</Text></TouchableOpacity>
                                </View>

                                <View style={modalStyles.weekdaysRow}>
                                    {['日','月','火','水','木','金','土'].map((w) => (
                                        <Text key={w} style={modalStyles.weekday}>{w}</Text>
                                    ))}
                                </View>

                                {endWeeks.map((week, wi) => (
                                    <View key={wi} style={modalStyles.weekRow}>
                                        {week.map((d, di) => {
                                            const isSelected = d && endDate && d.getFullYear() === endDate.getFullYear() && d.getMonth() === endDate.getMonth() && d.getDate() === endDate.getDate();
                                            return (
                                                <TouchableOpacity
                                                    key={di}
                                                    style={[modalStyles.dayCell, isSelected && modalStyles.dayCellSelected]}
                                                    onPress={() => d && selectEndDate(d)}
                                                    disabled={!d}
                                                >
                                                    <Text style={[modalStyles.dayText, isSelected && modalStyles.dayTextSelected]}>{d ? d.getDate() : ''}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ))}

                                <View style={modalStyles.footerRow}>
                                    <TouchableOpacity style={modalStyles.footerBtn} onPress={() => setShowEndPicker(false)}>
                                        <Text style={modalStyles.footerBtnText}>キャンセル</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
    );
}

const styles = StyleSheet.create({
    // minHeight:0 を追加して子要素（FlatList）が正しく伸縮できるようにする
    // height: '100%' を追加して、親が flex を持たない場合でも全高を確保する
    container: { flex: 1, minHeight: 0, height: '100%', backgroundColor: '#F8F9FA', paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8) },
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
        // 背景に馴染むように透明化しカード感を抑える
        backgroundColor: 'transparent',
        marginTop: 12,
        marginHorizontal: 12,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 0,
        borderWidth: 0,
    },
    filterLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },

    categoryFilter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    collapsibleContent: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 12,
        // 軽い影でカード感を出す
        elevation: 2,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    categoryTag: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 22,
        // タグは白背景にして背景とコントラストを確保
        backgroundColor: '#FFFFFF',
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
        // 日付ボタンは白背景にして視認性を向上
        backgroundColor: '#FFFFFF',
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
    resultIncome: { fontSize: 13, fontWeight: '700', color: '#27AE60' },
    resultExpense: { fontSize: 13, fontWeight: '700', color: '#E74C3C' },

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
