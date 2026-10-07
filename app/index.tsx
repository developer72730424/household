import { useRouter, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

import BackupBanner from '@/components/backup-banner';
import BudgetCard from '@/components/budget-card';
import { useAppData } from '@/context/app-data';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { shouldRemindBackup } from '@/utils/backup';
import {
    entriesInMonth, expenseByCategory, formatDisplayDate, formatMonthJapanese, monthKeyOf, shiftMonth, sortEntries,
    summarize,
} from '@/utils/entries';

const screenWidth = Dimensions.get('window').width;
const CHART_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

// ホームの「メニュー」から開く画面。よく使う入力（支出・収入）は右下の＋ボタンにある
const MENU_ITEMS: { label: string; icon: string; color: string; href: Href }[] = [
    { label: '収支統計', icon: '📊', color: '#34C759', href: '/statistics' },
    { label: '検索・フィルター', icon: '🔍', color: '#FF9500', href: '/search' },
    { label: '固定費', icon: '🔁', color: '#AF52DE', href: '/recurring' },
    { label: 'テンプレート', icon: '📋', color: '#FF9500', href: '/templates' },
    { label: 'カテゴリ設定', icon: '⚙️', color: '#5856D6', href: '/categories' },
    { label: 'データ管理・バックアップ', icon: '💾', color: '#00C7BE', href: '/export' },
];

export default function HomeScreen() {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const router = useRouter();
    const { entries, budget, setBudget, deleteEntry, lastBackupAt, backupSnoozeUntil, snoozeBackup } = useAppData();
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const monthEntries = useMemo(
        () => sortEntries(entriesInMonth(entries, monthKeyOf(currentMonth))),
        [entries, currentMonth],
    );
    const { income: monthlyIncome, expense: monthlyExpense, balance: monthlyTotal } = useMemo(
        () => summarize(monthEntries),
        [monthEntries],
    );
    const chartData = useMemo(
        () => expenseByCategory(monthEntries).map((t, i) => ({
            name: t.name,
            amount: t.amount,
            color: CHART_COLORS[i % CHART_COLORS.length],
            legendFontColor: c.textSecondary,
            legendFontSize: 12,
        })),
        [monthEntries, c.textSecondary],
    );

    const showBackupBanner = shouldRemindBackup({
        now: new Date(),
        lastBackupAt,
        snoozeUntil: backupSnoozeUntil,
        entryCount: entries.length,
    });

    const openInput = (path: '/add' | '/income') => {
        setIsFabOpen(false);
        router.push(path);
    };

    const openMenuItem = (href: Href) => {
        setIsMenuOpen(false);
        router.push(href);
    };

    return (
        <View style={styles.container}>
            {/* 年月 */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={() => setCurrentMonth(prev => shiftMonth(prev, -1))} style={styles.monthNavButton} accessibilityLabel="前の月">
                    <Text style={styles.monthNavBtnText}>‹</Text>
                </TouchableOpacity>

                <View style={styles.monthDisplayContainer}>
                    <Text style={styles.monthText}>{formatMonthJapanese(currentMonth)}</Text>
                </View>

                <TouchableOpacity onPress={() => setCurrentMonth(prev => shiftMonth(prev, 1))} style={styles.monthNavButton} accessibilityLabel="次の月">
                    <Text style={styles.monthNavBtnText}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuPill} onPress={() => setIsMenuOpen(true)} accessibilityLabel="メニューを開く">
                    <Text style={styles.menuPillText}>☰</Text>
                </TouchableOpacity>
            </View>

            {/* 今月の収支 */}
            <View style={styles.monthlyTotalCard}>
                <Text style={styles.monthlyTotalLabel}>今月の収支</Text>
                <Text style={[styles.monthlyTotalAmount, monthlyTotal < 0 && { color: c.danger }]}>
                    {monthlyTotal < 0 ? '-' : ''}¥{Math.abs(monthlyTotal).toLocaleString()}
                </Text>
                <Text style={styles.monthlyBreakdown}>
                    収入 ¥{monthlyIncome.toLocaleString()}　/　支出 ¥{monthlyExpense.toLocaleString()}
                </Text>
            </View>

            <BudgetCard budget={budget} spent={monthlyExpense} onChangeBudget={setBudget} />

            {showBackupBanner && (
                <BackupBanner
                    hasBackedUpBefore={lastBackupAt !== null}
                    onBackup={() => router.push('/export')}
                    onLater={snoozeBackup}
                />
            )}

            {/* グラフと履歴リスト */}
            <FlatList
                data={monthEntries}
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
                                        backgroundColor: c.card,
                                    }}
                                    accessor={'amount'}
                                    backgroundColor={'transparent'}
                                    paddingLeft={'15'}
                                    absolute
                                />
                            </View>
                        )}
                        {chartData.length > 0 && (
                            <View style={styles.categorySummaryContainer}>
                                {chartData.map(({ name, amount: catTotal }) => (
                                    <View key={name} style={styles.categoryTotalItem}>
                                        <Text style={styles.categoryTotalLabel}>{name}</Text>
                                        <Text style={styles.categoryTotalValue}>¥{catTotal.toLocaleString()}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyStateContainer}>
                        <View style={styles.emptyStateContent}>
                            <Text style={styles.emptyStateIcon}>📊</Text>
                            <Text style={styles.emptyStateTitle}>まだデータがありません</Text>
                            <Text style={styles.emptyStateDescription}>
                                この月の支出をまとめましょう
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
                                onPress={() => router.push('/add')}
                            >
                                <Text style={styles.emptyStateCTAText}>✍️ さっそく入力する</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                renderItem={({ item }) => {
                    const isIncome = item.type === 'income';
                    return (
                        <TouchableOpacity
                            style={[styles.listItem, { borderLeftColor: isIncome ? '#34C759' : '#5B4FA3' }]}
                            onPress={() => router.push({ pathname: isIncome ? '/income' : '/add', params: { id: item.id } })}
                            onLongPress={() => {
                                Alert.alert('削除', `${item.item}を削除しますか？`, [
                                    { text: 'キャンセル', style: 'cancel' },
                                    { text: '削除', style: 'destructive', onPress: () => deleteEntry(item.id) },
                                ]);
                            }}
                        >
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.listItemText}>{item.item}</Text>
                                <Text style={{ fontSize: 12, color: c.textSecondary }}>{item.category} | {formatDisplayDate(item.date)}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.listItemAmount, isIncome && { color: '#34C759' }]}>
                                    {isIncome ? '+' : ''}¥{item.amount.toLocaleString()}
                                </Text>
                                <Text style={{ fontSize: 10, color: c.textMuted }}>タップで編集・長押しで削除</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                // 右下の＋ボタンに最後の行が隠れないよう、末尾に余白を足す
                ListFooterComponent={<View style={{ height: 110 }} />}
            />

            {/* ＋ボタン: 開いている間は背景を暗くして、支出・収入の入力を選べる */}
            {isFabOpen && (
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setIsFabOpen(false)} />
            )}
            {isFabOpen && (
                <View style={styles.fabMenuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => openInput('/income')}>
                        <Text style={styles.menuLabel}>収入を入力</Text>
                        <View style={[styles.miniCircle, { backgroundColor: '#34C759' }]}>
                            <Text style={{ color: '#fff' }}>💴</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => openInput('/add')}>
                        <Text style={styles.menuLabel}>支出を入力</Text>
                        <View style={[styles.miniCircle, { backgroundColor: '#FF2D55' }]}>
                            <Text style={{ color: '#fff' }}>✍️</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}
            <TouchableOpacity
                style={[styles.floatingButton, isFabOpen && styles.floatingButtonOpen]}
                onPress={() => setIsFabOpen(!isFabOpen)}
                accessibilityLabel={isFabOpen ? '閉じる' : '支出・収入を入力'}
            >
                <Text style={styles.floatingButtonText}>{isFabOpen ? '×' : '＋'}</Text>
            </TouchableOpacity>

            {/* メニュー（その他の画面） */}
            <Modal visible={isMenuOpen} transparent animationType="slide" onRequestClose={() => setIsMenuOpen(false)}>
                <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setIsMenuOpen(false)}>
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        {MENU_ITEMS.map((m) => (
                            <TouchableOpacity key={m.label} style={styles.sheetRow} onPress={() => openMenuItem(m.href)}>
                                <View style={[styles.sheetIcon, { backgroundColor: m.color }]}>
                                    <Text>{m.icon}</Text>
                                </View>
                                <Text style={styles.sheetLabel}>{m.label}</Text>
                                <Text style={styles.sheetChevron}>›</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: c.background,
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
        backgroundColor: c.background,
        justifyContent: 'center',
        paddingLeft: 12,
    },
    topLeftLabelText: {
        color: c.primaryText,
        fontWeight: '700',
        fontSize: 14,
    },
    header: { 
        paddingHorizontal: 16, 
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    headerTop: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 6 
    },
    title: { fontSize: 20, fontWeight: '600', textAlign: 'center', color: c.text },
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
        color: c.primaryText,
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
        backgroundColor: c.card,
        borderRadius: 10,
        minWidth: 110,
        elevation: 1,
        borderWidth: 1,
        borderColor: c.border,
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
        color: c.primaryText,
        fontWeight: '700',
    },
    monthYear: {
        fontSize: 9,
        color: c.textMuted,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    monthText: { 
        fontSize: 18, 
        fontWeight: '700',
        color: c.primaryText,
        marginTop: 0,
    },
    monthTotal: {
        fontSize: 12,
        color: c.textSecondary,
        marginTop: 4,
        fontWeight: '600',
    },
    monthlyTotalCard: {
        backgroundColor: c.card,
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
        color: c.textMuted,
        marginBottom: 6,
        fontWeight: '600',
    },
    monthlyTotalAmount: {
        fontSize: 22,
        color: c.primaryText,
        fontWeight: '800',
    },
    monthlyBreakdown: {
        fontSize: 12,
        color: c.textSecondary,
        marginTop: 6,
        fontWeight: '600',
    },
    navText: {
        color: c.primaryText, 
        fontWeight: '600',
        fontSize: 12
    },
    totalText: { 
        fontSize: 16, 
        fontWeight: '700', 
        textAlign: 'right', 
        color: c.primaryText,
        marginTop: 2
    },

    listItem: {
        backgroundColor: c.card,
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
        color: c.text
    },
    listItemAmount: { 
        fontSize: 16, 
        fontWeight: '700', 
        color: c.primaryText 
    },

    footerInput: {
        backgroundColor: c.card,
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
    },
    input: { 
        backgroundColor: c.background, 
        padding: 12, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: c.border,
        color: c.text
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
        backgroundColor: c.chip, 
        minWidth: 60, 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: c.border
    },
    catBtnActive: { 
        backgroundColor: '#5B4FA3',
        borderColor: '#5B4FA3'
    },
    catBtnText: { 
        fontSize: 12, 
        color: c.textSecondary,
        fontWeight: '500'
    },
    catBtnTextActive: { 
        color: '#fff',
        fontWeight: '600'
    },
    dateBtn: { 
        padding: 8, 
        backgroundColor: c.chip, 
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
        backgroundColor: c.card, 
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
        color: c.textSecondary,
        fontWeight: '500'
    },
    categoryTotalValue: { 
        fontSize: 13, 
        fontWeight: '700',
        color: c.primaryText
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
        marginBottom: 12,
    },
    menuLabel: {
        backgroundColor: c.card,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 15,
        fontSize: 14,
        fontWeight: '600',
        color: c.text,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    miniCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
        color: c.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateDescription: {
        fontSize: 14,
        color: c.textMuted,
        marginBottom: 32,
        textAlign: 'center',
        fontWeight: '500',
    },
    guidelineContainer: {
        width: '100%',
        backgroundColor: c.card,
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
        color: c.text,
        marginBottom: 2,
    },
    guidelineDesc: {
        fontSize: 12,
        color: c.textMuted,
        fontWeight: '500',
    },
    guidelineConnector: {
        width: 2,
        height: 16,
        backgroundColor: c.chip,
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
        backgroundColor: c.card,
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
        color: c.text,
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
    menuPill: {
        position: 'absolute',
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
    },
    menuPillText: { fontSize: 18, fontWeight: '700', color: c.primaryText },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 28, paddingHorizontal: 8 },
    sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: 8 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
    sheetIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    sheetLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: c.text },
    sheetChevron: { fontSize: 20, color: c.textMuted },
});
