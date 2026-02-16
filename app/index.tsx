import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, FlatList, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import CategorySettings from './(pages)/CategorySettings';
import Export from './(pages)/Export';
import InputItem from './(pages)/InputItem';
import SearchFilter from './(pages)/SearchFilter';
import Statistics from './(pages)/Statistics';
import Templates, { Template } from './(pages)/Templates';

export const options = {
  title: 'シンプル家計簿',
  headerShown: false,
};

const screenWidth = Dimensions.get('window').width;

const STORAGE_KEY = '@expense_history';

// 1つ1つのデータの形を定義します
interface HistoryItem {
    id: string;
    item: string;
    amount: string;
    category: string;
    date: string;
}

export default function App() {
    // 状態（State）の定義：入力内容と履歴リストを管理します
    const [item, setItem] = useState('');      // 品目
    const [amount, setAmount] = useState('');  // 金額
    const [history, setHistory] = useState<HistoryItem[]>([]); // 履歴の配列
    const [selectedCategory, setSelectedCategory] = useState('食費');
    const [date, setDate] = useState(new Date()); // 選択された日付オブジェクト
    const [showPicker, setShowPicker] = useState(false); // カレンダーを表示するかどうか
    const [currentMonth, setCurrentMonth] = useState(new Date()); // 表示中の年月
    const [currentScreen, setCurrentScreen] = useState<'history' | 'add' | 'settings' | 'statistics' | 'search' | 'export' | 'templates'>('history');
    const [categories, setCategories] = useState<string[]>(['食費', '日用品', 'その他']); // 初期値
    const CATEGORY_STORAGE_KEY = '@app_categories'; // 保存用のキー
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // 編集機能用の状態
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    // テンプレート機能用の状態
    const [templates, setTemplates] = useState<Template[]>([]);
    const TEMPLATES_STORAGE_KEY = '@app_templates';

    // 単一ユーザー（"Default"）前提のストレージキー
    // 既存データ互換のため、"_Default" 接尾辞付きのキーをそのまま利用します
    const getHistoryKey = () => `${STORAGE_KEY}_Default`;
    const getCategoryKey = () => `${CATEGORY_STORAGE_KEY}_Default`;
    const getTemplatesKey = () => `${TEMPLATES_STORAGE_KEY}_Default`;


    // 2. 起動時にカテゴリを読み込む（単一ユーザー）
    useEffect(() => {
        const loadCategories = async () => {
            const savedCats = await AsyncStorage.getItem(getCategoryKey());
            if (savedCats) setCategories(JSON.parse(savedCats));
            else setCategories(['食費', '日用品', 'その他']);
        };
        loadCategories();
    }, []);

    // テンプレート読み込み（単一ユーザー）
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const savedTemplates = await AsyncStorage.getItem(getTemplatesKey());
                if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
                else setTemplates([]);
            } catch (e) {
                console.error('テンプレート読み込み失敗', e);
            }
        };
        loadTemplates();
    }, []);

    // テンプレート / カテゴリ関連の処理は下でメモ化した関数を使用します

    // --- 追加：アプリ起動時にデータを読み込む ---
    useEffect(() => {
        const loadData = async () => {
            try {
                const jsonValue = await AsyncStorage.getItem(getHistoryKey());
                if (jsonValue !== null) {
                    setHistory(JSON.parse(jsonValue));
                } else {
                    setHistory([]);
                }
            } catch (e) {
                console.error('読み込み失敗', e);
            }
        };
        loadData();
    }, []);

    // --- 追加：データを保存する関数 ---
    const saveData = useCallback(async (data: HistoryItem[]) => {
        try {
            const jsonValue = JSON.stringify(data);
            await AsyncStorage.setItem(getHistoryKey(), jsonValue);
        } catch (e) {
            console.error('保存失敗', e);
        }
    }, []);

    // 1. 表示中の年月を「YYYY/M」の形式にする（例: 2026/1）
    const displayYearMonth = `${currentMonth.getFullYear()}/${currentMonth.getMonth() + 1}`;

    // 日本語の月表示（ホーム画面用）
    const displayMonthJapanese = useMemo(() => `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`, [currentMonth]);

    // 前月 / 次月 移動
    const goToPrevMonth = useCallback(() => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }, []);

    const goToNextMonth = useCallback(() => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }, []);

    // 当月の合計支出を計算 （filteredHistory 宣言後に移動）

    // 月名を日本語で取得する関数
    // getMonthName は未使用のため削除

    // displayMonthJapanese は未使用のため削除

    // 2. 履歴の中から、日付が一致するものだけを取り出す（メモ化）
    const filteredHistory = useMemo(() => {
        return history.filter(item => item.date?.startsWith(displayYearMonth));
    }, [history, displayYearMonth]);

    // 当月の合計支出を計算
    const monthlyTotal = useMemo(() => {
        return filteredHistory.reduce((sum, it) => sum + Number(it.amount), 0);
    }, [filteredHistory]);

    // delete/startEdit/update は下でメモ化した関数を使用します

    // 編集をキャンセルする関数（未使用のため削除）

    // カテゴリごとの合計を計算する関数
    const getCategoryTotal = (catName: string) => {
        return filteredHistory // ★ history ではなく filteredHistory を使う
            .filter((entry) => entry.category === catName)
            .reduce((sum, current) => sum + Number(current.amount), 0);
    };

    const onDateChange = (_event: any, selectedDate?: Date) => {
        setShowPicker(Platform.OS === 'ios'); // iOSは出しっぱなし、Androidは選択後閉じる
        if (selectedDate) setDate(selectedDate);
    };

    // 日付を文字列に変換する便利な関数
    const formatDate = (d: Date) => {
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    };

    // カテゴリ合計を先に計算して再利用（メモ化）
    const categoryTotals = useMemo(() => {
        const map: Record<string, number> = {};
        categories.forEach(cat => {
            map[cat] = filteredHistory
                .filter(entry => entry.category === cat)
                .reduce((sum, cur) => sum + Number(cur.amount), 0);
        });
        return map;
    }, [categories, filteredHistory]);

    const chartData = useMemo(() => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
        return categories.map((cat, index) => ({
            name: cat,
            amount: categoryTotals[cat] || 0,
            color: colors[index % colors.length],
            legendFontColor: '#7F7F7F',
            legendFontSize: 12,
        })).filter(d => d.amount > 0);
    }, [categories, categoryTotals]);

    // カテゴリ削除用の関数
    const deleteCategory = useCallback(async (targetCat: string) => {
        const updatedCats = categories.filter(cat => cat !== targetCat);
        setCategories(updatedCats);
        await AsyncStorage.setItem(getCategoryKey(), JSON.stringify(updatedCats));
    }, [categories]);

    // 他よく使うコールバックをメモ化して子コンポーネント再レンダリングを抑える
    const addCategory = useCallback(async (newCat: string) => {
        if (!newCat || categories.includes(newCat)) return;
        const updatedCats = [...categories, newCat];
        setCategories(updatedCats);
        await AsyncStorage.setItem(getCategoryKey(), JSON.stringify(updatedCats));
    }, [categories]);

    const addTemplate = useCallback(async (template: Template) => {
        const updatedTemplates = [...templates, template];
        setTemplates(updatedTemplates);
        await AsyncStorage.setItem(getTemplatesKey(), JSON.stringify(updatedTemplates));
    }, [templates]);

    const deleteTemplate = useCallback(async (id: string) => {
        const updatedTemplates = templates.filter(t => t.id !== id);
        setTemplates(updatedTemplates);
        await AsyncStorage.setItem(getTemplatesKey(), JSON.stringify(updatedTemplates));
    }, [templates]);

    const selectTemplate = useCallback((template: Template) => {
        setItem(template.item);
        setAmount(template.amount);
        setSelectedCategory(template.category);
        setCurrentScreen('add');
    }, []);

    const addEntry = useCallback(() => {
        if (item === '' || amount === '') return;

        const newEntry: HistoryItem = {
            id: Date.now().toString(),
            item: item,
            amount: amount,
            category: selectedCategory,
            date: formatDate(date),
        };

        const newHistory = [newEntry, ...history];
        setHistory(newHistory);
        saveData(newHistory);

        setItem('');
        setAmount('');
        Keyboard.dismiss();
    }, [item, amount, selectedCategory, date, history, saveData]);

    const deleteEntry = useCallback((id: string) => {
        const newHistory = history.filter((item) => item.id !== id);
        setHistory(newHistory);
        void saveData(newHistory);
    }, [history, saveData]);
    

    const startEditEntry = useCallback((entry: HistoryItem) => {
        setEditingId(entry.id);
        setItem(entry.item);
        setAmount(entry.amount);
        setSelectedCategory(entry.category);
        const [year, month, day] = entry.date.split('/').map(Number);
        setDate(new Date(year, month - 1, day));
        setIsEditMode(true);
        setCurrentScreen('add');
    }, []);

    const updateEntry = useCallback(() => {
        if (item === '' || amount === '' || !editingId) return;

        const updatedHistory = history.map((histItem) =>
            histItem.id === editingId
                ? {
                    ...histItem,
                    item: item,
                    amount: amount,
                    category: selectedCategory,
                    date: formatDate(date),
                }
                : histItem
        );

        setHistory(updatedHistory);
        saveData(updatedHistory);

        setItem('');
        setAmount('');
        setSelectedCategory('食費');
        setDate(new Date());
        setEditingId(null);
        setIsEditMode(false);
        Keyboard.dismiss();
    }, [item, amount, editingId, selectedCategory, date, history, saveData]);

    // FAB 用の旧処理は不要になったため削除

    if (currentScreen === 'add') {
        // Input screen needs to show the native DateTimePicker when requested.
        // Previously the picker was only rendered in the main screen return path,
        // so opening the picker from the input screen had no visible effect.
        // Render the InputItem and the DateTimePicker together here so
        // onShowPicker (which sets showPicker) actually displays the picker.
        return (
            <>
                <InputItem
                    item={item}
                    setItem={setItem}
                    amount={amount}
                    setAmount={setAmount}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={categories}
                    onAddCategory={addCategory}
                    onSave={() => {
                        addEntry();
                        setCurrentScreen('history');
                    }}
                    onCancel={() => setCurrentScreen('history')}
                    onSelectDate={(d: Date) => setDate(d)}
                    dateText={formatDate(date)}
                    isEditMode={isEditMode}
                    onUpdate={() => {
                        updateEntry();
                        setCurrentScreen('history');
                    }}
                    templates={templates}
                    onSelectTemplate={selectTemplate}
                />

                {showPicker && (
                    <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
                )}
            </>
        );
    }
    if (currentScreen === 'settings') {
        return (
            <CategorySettings
                categories={categories}
                onAdd={addCategory}
                onDelete={deleteCategory}
                onBack={() => setCurrentScreen('history')}
            />
        );
    }
    if (currentScreen === 'templates') {
        return (
            <Templates
                templates={templates}
                onAddTemplate={addTemplate}
                onDeleteTemplate={deleteTemplate}
                onSelectTemplate={selectTemplate}
                categories={categories}
                onBack={() => setCurrentScreen('history')}
            />
        );
    }


    if (currentScreen === 'statistics') {
        return (
            <Statistics
                history={history}
                categories={categories}
                onBack={() => setCurrentScreen('history')}
            />
        );
    }
    if (currentScreen === 'search') {
        return (
            <SearchFilter
                history={history}
                categories={categories}
                onBack={() => setCurrentScreen('history')}
            />
        );
    }
    if (currentScreen === 'export') {
        return (
            <Export
                history={history}
                categories={categories}
                onBack={() => setCurrentScreen('history')}
            />
        );
    }

  return (
        <View style={styles.container}>

            {/* シンプルな年月表示を追加（ホーム画面上部） */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavButton}>
                    <Text style={styles.monthNavBtnText}>‹</Text>
                </TouchableOpacity>

                <View style={styles.monthDisplayContainer}>
                    <Text style={styles.monthText}>{displayMonthJapanese}</Text>
                </View>

                <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
                    <Text style={styles.monthNavBtnText}>›</Text>
                </TouchableOpacity>
            </View>

            {/* 総支出を目立たせて中央に表示するカード */}
            <View style={styles.monthlyTotalCard}>
                <Text style={styles.monthlyTotalLabel}>今月の総支出</Text>
                <Text style={styles.monthlyTotalAmount}>¥{monthlyTotal.toLocaleString()}</Text>
            </View>

            {/* 2. メインエリア：グラフと履歴リスト */}
            <FlatList
                data={filteredHistory}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                ListHeaderComponent={
                    <>
                        {chartData.length > 0 && (
                            <View style={styles.chartCardContainer}>
                                <Text style={styles.chartCardTitle}>カテゴリ別支出</Text>
                                <PieChart
                                    data={chartData}
                                    width={screenWidth - 120}
                                    height={160}
                                    chartConfig={{ 
                                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                        backgroundColor: '#FFFFFF',
                                    }}
                                    accessor={"amount"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    absolute
                                />
                            </View>
                        )}
                        <View style={styles.categorySummaryContainer}>
                            {categories.map((cat) => {
                                const catTotal = getCategoryTotal(cat);
                                if (catTotal === 0) return null;
                                return (
                                    <View key={cat} style={styles.categoryTotalItem}>
                                        <Text style={styles.categoryTotalLabel}>{cat}</Text>
                                        <Text style={styles.categoryTotalValue}>¥{catTotal.toLocaleString()}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyStateContainer}>
                        <View style={styles.emptyStateContent}>
                            <Text style={styles.emptyStateIcon}>📊</Text>
                            <Text style={styles.emptyStateTitle}>まだデータがありません</Text>
                            <Text style={styles.emptyStateDescription}>
                                このの月の支出をまとめましょう
                            </Text>
                            
                            <View style={styles.guidelineContainer}>
                                <View style={styles.guidelineItem}>
                                    <View style={styles.guidelineNumber}>
                                        <Text style={styles.guidelineNumberText}>1</Text>
                                    </View>
                                    <View style={styles.guidelineText}>
                                        <Text style={styles.guidelineTitle}>支出を入力</Text>
                                        <Text style={styles.guidelineDesc}>品目と金額を入力</Text>
                                    </View>
                                </View>

                                <View style={styles.guidelineConnector} />

                                <View style={styles.guidelineItem}>
                                    <View style={styles.guidelineNumber}>
                                        <Text style={styles.guidelineNumberText}>2</Text>
                                    </View>
                                    <View style={styles.guidelineText}>
                                        <Text style={styles.guidelineTitle}>カテゴリを選択</Text>
                                        <Text style={styles.guidelineDesc}>どの種類の支出か</Text>
                                    </View>
                                </View>

                                <View style={styles.guidelineConnector} />

                                <View style={styles.guidelineItem}>
                                    <View style={styles.guidelineNumber}>
                                        <Text style={styles.guidelineNumberText}>3</Text>
                                    </View>
                                    <View style={styles.guidelineText}>
                                        <Text style={styles.guidelineTitle}>日付を確認</Text>
                                        <Text style={styles.guidelineDesc}>支出した日を選択</Text>
                                    </View>
                                </View>

                                <View style={styles.guidelineConnector} />

                                <View style={styles.guidelineItem}>
                                    <View style={styles.guidelineNumber}>
                                        <Text style={styles.guidelineNumberText}>4</Text>
                                    </View>
                                    <View style={styles.guidelineText}>
                                        <Text style={styles.guidelineTitle}>保存</Text>
                                        <Text style={styles.guidelineDesc}>「保存して戻る」をタップ</Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={styles.emptyStateCTA}
                                onPress={() => setCurrentScreen('add')}
                            >
                                <Text style={styles.emptyStateCTAText}>✍️ さっそく入力する</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => startEditEntry(item)}
                        onLongPress={() => {
                            Alert.alert('削除', `${item.item}を削除しますか？`, [
                                { text: 'キャンセル', style: 'cancel' },
                                { text: '削除', style: 'destructive', onPress: () => deleteEntry(item.id) }
                            ]);
                        }}
                    >
                        <View>
                            <Text style={styles.listItemText}>{item.item}</Text>
                            <Text style={{ fontSize: 12, color: '#666' }}>{item.category} | {item.date}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.listItemAmount}>¥{Number(item.amount).toLocaleString()}</Text>
                            <Text style={{ fontSize: 10, color: '#999' }}>タップで編集・長押しで削除</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />

            {/* --- ★ ここから追加：メニューが開いている時の背景オーバーレイ --- */}
            {isMenuOpen && (
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setIsMenuOpen(false)}
                />
            )}

            {/* --- ★ ここから追加：浮き出るメニュー項目 --- */}
            {isMenuOpen && (
                <View style={styles.fabMenuContainer}>
                    {/* データ管理ボタン */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { setCurrentScreen('export'); setIsMenuOpen(false); }}
                    >
                        <Text style={styles.menuLabel}>データ管理</Text>
                        <View style={[styles.miniCircle, { backgroundColor: '#00C7BE' }]}>
                            <Text style={{ color: '#fff' }}>💾</Text>
                        </View>
                    </TouchableOpacity>

                    {/* テンプレート管理ボタン */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { setCurrentScreen('templates'); setIsMenuOpen(false); }}
                    >
                        <Text style={styles.menuLabel}>テンプレート</Text>
                        <View style={[styles.miniCircle, { backgroundColor: '#FF9500' }]}>
                            <Text style={{ color: '#fff' }}>📋</Text>
                        </View>
                    </TouchableOpacity>

                    {/* 検索ボタン */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { setCurrentScreen('search'); setIsMenuOpen(false); }}
                    >
                        <Text style={styles.menuLabel}>検索・フィルター</Text>
                        <View style={[styles.miniCircle, { backgroundColor: '#FF9500' }]}>
                            <Text style={{ color: '#fff' }}>🔍</Text>
                        </View>
                    </TouchableOpacity>

                    {/* 統計画面ボタン */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { setCurrentScreen('statistics'); setIsMenuOpen(false); }}
                    >
                        <Text style={styles.menuLabel}>支出統計</Text>
                        <View style={[styles.miniCircle, { backgroundColor: '#34C759' }]}>
                            <Text style={{ color: '#fff' }}>📊</Text>
                        </View>
                    </TouchableOpacity>

                    {/* カテゴリ設定ボタン */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { setCurrentScreen('settings'); setIsMenuOpen(false); }}
                    >
                        <Text style={styles.menuLabel}>カテゴリ設定</Text>
                        <View style={[styles.miniCircle, { backgroundColor: '#5856D6' }]}>
                            <Text style={{ color: '#fff' }}>⚙️</Text>
                        </View>
                    </TouchableOpacity>

                    {/* 支出入力ボタン */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { setCurrentScreen('add'); setIsMenuOpen(false); }}
                    >
                        <Text style={styles.menuLabel}>支出を入力</Text>
                        <View style={[styles.miniCircle, { backgroundColor: '#FF2D55' }]}>
                            <Text style={{ color: '#fff' }}>✍️</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* --- ★ 修正：プラスボタンの動作を Alert から メニュー開閉に変更 --- */}
            <TouchableOpacity
                style={[styles.floatingButton, isMenuOpen && styles.floatingButtonOpen]}
                onPress={() => setIsMenuOpen(!isMenuOpen)}
            >
                <Text style={styles.floatingButtonText}>{isMenuOpen ? '×' : '＋'}</Text>
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        // ページはグローバルヘッダーを持つため、上部の余白は小さめに調整
        paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8),
    },
    // overlay label to replace default 'index' text in web header
    topLeftLabel: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 36,
        zIndex: 9999,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        paddingLeft: 12,
    },
    topLeftLabelText: {
        color: '#5B4FA3',
        fontWeight: '700',
        fontSize: 14,
    },
    header: { 
        paddingHorizontal: 16, 
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTop: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 6 
    },
    title: { fontSize: 20, fontWeight: '600', textAlign: 'center', color: '#1A1A1A' },
    userBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5B4FA3',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 18,
        alignSelf: 'flex-start',
        marginBottom: 6,
        elevation: 1,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    userIcon: {
        fontSize: 14,
        marginRight: 5,
    },
    userNameText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 11,
        marginRight: 2,
    },
    userChangeIcon: {
        color: '#5B4FA3',
        fontSize: 16,
    },
    monthNav: { 
        flexDirection: 'row', 
        justifyContent: 'center', /* 中央寄せ */
        alignItems: 'center', 
        marginVertical: 6 
    },
    monthDisplayContainer: {
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        minWidth: 110,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        alignSelf: 'center',
        marginHorizontal: 8,
    },
    monthNavButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthNavBtnText: {
        fontSize: 22,
        color: '#5B4FA3',
        fontWeight: '700',
    },
    monthYear: {
        fontSize: 9,
        color: '#B0B0B0',
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    monthText: { 
        fontSize: 18, 
        fontWeight: '700',
        color: '#5B4FA3',
        marginTop: 0,
    },
    monthTotal: {
        fontSize: 12,
        color: '#666666',
        marginTop: 4,
        fontWeight: '600',
    },
    monthlyTotalCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16, // match chartCardContainer
        marginTop: 8,
        marginBottom: 12, // add spacing between total card and chart
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 3,
    },
    monthlyTotalLabel: {
        fontSize: 12,
        color: '#999999',
        marginBottom: 6,
        fontWeight: '600',
    },
    monthlyTotalAmount: {
        fontSize: 22,
        color: '#5B4FA3',
        fontWeight: '800',
    },
    navText: { 
        color: '#5B4FA3', 
        fontWeight: '600',
        fontSize: 12
    },
    totalText: { 
        fontSize: 16, 
        fontWeight: '700', 
        textAlign: 'right', 
        color: '#5B4FA3',
        marginTop: 2
    },

    listItem: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#5B4FA3',
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    listItemText: { 
        fontSize: 16, 
        fontWeight: '600',
        color: '#1A1A1A'
    },
    listItemAmount: { 
        fontSize: 16, 
        fontWeight: '700', 
        color: '#5B4FA3' 
    },

    footerInput: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
    },
    input: { 
        backgroundColor: '#F8F9FA', 
        padding: 12, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: '#E0E0E0',
        color: '#1A1A1A'
    },
    categorySelectRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginVertical: 10, 
        alignItems: 'center' 
    },
    catBtn: { 
        padding: 8, 
        borderRadius: 18, 
        backgroundColor: '#F0F0F0', 
        minWidth: 60, 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    catBtnActive: { 
        backgroundColor: '#5B4FA3',
        borderColor: '#5B4FA3'
    },
    catBtnText: { 
        fontSize: 12, 
        color: '#666666',
        fontWeight: '500'
    },
    catBtnTextActive: { 
        color: '#fff',
        fontWeight: '600'
    },
    dateBtn: { 
        padding: 8, 
        backgroundColor: '#F0F0F0', 
        borderRadius: 8 
    },
    addButton: { 
        backgroundColor: '#5B4FA3', 
        padding: 16, 
        borderRadius: 10, 
        alignItems: 'center',
        elevation: 3,
    },
    addButtonText: { 
        color: '#fff', 
        fontSize: 16, 
        fontWeight: '700' 
    },

    categorySummaryContainer: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between', 
        marginHorizontal: 16, 
        backgroundColor: '#FFFFFF', 
        padding: 14, 
        borderRadius: 12, 
        marginBottom: 16,
        elevation: 2,
    },
    categoryTotalItem: { 
        width: '48%', 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    categoryTotalLabel: { 
        fontSize: 12, 
        color: '#666666',
        fontWeight: '500'
    },
    categoryTotalValue: { 
        fontSize: 13, 
        fontWeight: '700',
        color: '#5B4FA3'
    },
    floatingButton: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: '#5B4FA3',
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    floatingButtonText: { color: '#fff', fontSize: 32, fontWeight: '700' },
    floatingButtonOpen: {
        backgroundColor: '#00C7BE',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10,
    },
    fabMenuContainer: {
        position: 'absolute',
        right: 25,
        bottom: 110,
        zIndex: 20,
        alignItems: 'flex-end',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    menuLabel: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 15,
        fontSize: 14,
        fontWeight: '600',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    miniCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
        minHeight: 600,
    },
    emptyStateContent: {
        width: '100%',
        alignItems: 'center',
    },
    emptyStateIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateDescription: {
        fontSize: 14,
        color: '#B0B0B0',
        marginBottom: 32,
        textAlign: 'center',
        fontWeight: '500',
    },
    guidelineContainer: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        elevation: 3,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    guidelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    guidelineNumber: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#5B4FA3',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        marginTop: 2,
    },
    guidelineNumberText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    guidelineText: {
        flex: 1,
        justifyContent: 'center',
    },
    guidelineTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    guidelineDesc: {
        fontSize: 12,
        color: '#B0B0B0',
        fontWeight: '500',
    },
    guidelineConnector: {
        width: 2,
        height: 16,
        backgroundColor: '#E0E0E0',
        marginLeft: 17,
        marginVertical: 0,
    },
    emptyStateCTA: {
        backgroundColor: '#5B4FA3',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        elevation: 4,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    emptyStateCTAText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    chartCardContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        elevation: 3,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        borderTopWidth: 3,
        borderTopColor: '#5B4FA3',
    },
    chartCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    // styles for native-like header placeholder shown on mobile when native header is hidden
    nativeHeaderPlaceholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        // larger height/padding to fully cover native header area on iOS/Android
        height: Platform.OS === 'ios' ? 88 : 64,
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        elevation: 99999,
    },
    nativeHeaderText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
    },
});
