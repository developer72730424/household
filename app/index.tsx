import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

import BackupBanner from '@/components/backup-banner';
import BudgetCard from '@/components/budget-card';
import CategoryBudgetCard from '@/components/category-budget-card';
import UndoSnackbar from '@/components/undo-snackbar';
import { useAppData } from '@/context/app-data';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { shouldRemindBackup } from '@/utils/backup';
import { effectiveBudget } from '@/utils/budget';
import { isPlanned, splitPlanned } from '@/utils/planned';
import { categoryBudgetStatuses } from '@/utils/category-budget';
import { compareWithPreviousMonth, describeExpenseChange } from '@/utils/compare';
import {
    entriesInMonth, expenseByCategory, formatDisplayDate, formatMonthJapanese, monthKeyOf, shiftMonth, sortEntries,
    summarize, toDateString, type Entry,
} from '@/utils/entries';

const screenWidth = Dimensions.get('window').width;
// 円グラフの描画幅（カード内の余白を引いた幅）
const PIE_WIDTH = Math.min(screenWidth - 100, 320);
const CHART_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

// ホームの「メニュー」から開く画面。よく使う入力（支出・収入）は右下の＋ボタンにある
const MENU_ITEMS: { label: string; icon: string; color: string; href: Href }[] = [
    { label: '収支統計', icon: '📊', color: '#34C759', href: '/statistics' },
    { label: '年間の集計', icon: '📅', color: '#007AFF', href: '/annual' },
    { label: '検索・フィルター', icon: '🔍', color: '#FF9500', href: '/search' },
    { label: '固定費', icon: '🔁', color: '#AF52DE', href: '/recurring' },
    { label: 'テンプレート', icon: '📋', color: '#FF9500', href: '/templates' },
    { label: 'カテゴリ設定', icon: '⚙️', color: '#5856D6', href: '/categories' },
    { label: 'カテゴリ別の予算', icon: '🎯', color: '#FF2D55', href: '/category-budgets' },
    { label: 'リマインド通知', icon: '🔔', color: '#FF9500', href: '/reminder' },
    { label: 'アプリのロック', icon: '🔒', color: '#8E8E93', href: '/security' },
    { label: 'データ管理・バックアップ', icon: '💾', color: '#00C7BE', href: '/export' },
];

export default function HomeScreen() {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const router = useRouter();
    const { entries, budget, budgetOverrides, categoryBudgets, setBudget, setMonthBudget, deleteEntry, restoreEntry, lastBackupAt, backupSnoozeUntil, snoozeBackup } = useAppData();
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // 直前に削除した記録（数秒間だけ「元に戻す」を出す）
    const [lastDeleted, setLastDeleted] = useState<Entry | null>(null);
    const dismissUndo = useCallback(() => setLastDeleted(null), []);

    // 表示中の月に適用される予算（その月だけの設定があれば優先）
    const monthBudget = useMemo(
        () => effectiveBudget(budget, budgetOverrides, monthKeyOf(currentMonth)),
        [budget, budgetOverrides, currentMonth],
    );

    const monthEntries = useMemo(
        () => sortEntries(entriesInMonth(entries, monthKeyOf(currentMonth))),
        [entries, currentMonth],
    );
    // 今日より後の日付の記録は「予定」として区別する
    const today = toDateString(new Date());
    const planned = useMemo(() => splitPlanned(monthEntries, today), [monthEntries, today]);
    const { income: monthlyIncome, expense: monthlyExpense, balance: monthlyTotal } = useMemo(
        () => summarize(monthEntries),
        [monthEntries],
    );
    // 先月との比較（先月に記録が無ければ出さない）
    const changeText = useMemo(
        () => describeExpenseChange(compareWithPreviousMonth(entries, currentMonth)),
        [entries, currentMonth],
    );
    const expenseDiff = useMemo(() => compareWithPreviousMonth(entries, currentMonth).expenseDiff, [entries, currentMonth]);
    // カテゴリ別予算の進み具合（今月の支出に対して）
    const categoryStatuses = useMemo(
        () => categoryBudgetStatuses(monthEntries, categoryBudgets),
        [monthEntries, categoryBudgets],
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
                {planned.plannedCount > 0 && (
                    // 日付がこれから先の記録は、収支に含めたうえで「うち予定」として内訳を示す
                    <Text style={styles.plannedLine}>
                        うち予定：支出 ¥{planned.plannedExpense.toLocaleString()}／収入 ¥{planned.plannedIncome.toLocaleString()}
                    </Text>
                )}
                {changeText && (
                    // 支出が増えたら注意色、減ったら良い色（同じなら通常色）
                    <Text style={[styles.changeText, expenseDiff > 0 && { color: c.danger }, expenseDiff < 0 && { color: c.success }]}>
                        {expenseDiff > 0 ? '▲ ' : expenseDiff < 0 ? '▼ ' : ''}{changeText}
                    </Text>
                )}
            </View>

            <BudgetCard
                monthLabel={`${currentMonth.getMonth() + 1}月`}
                budget={monthBudget.amount}
                isOverride={monthBudget.isOverride}
                spent={monthlyExpense}
                onSave={(amount, scope) => (scope === 'month' ? setMonthBudget(monthKeyOf(currentMonth), amount) : setBudget(amount))}
            />

            <CategoryBudgetCard statuses={categoryStatuses} onEdit={() => router.push('/category-budgets')} />

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
                                {/* 円グラフは図だけ。凡例は下に「色・カテゴリ名・金額・割合」の並びで自前表示する
                                    （chart-kit 標準の凡例は「金額 カテゴリ名」の順で読みにくい） */}
                                <View style={{ alignItems: 'center' }}>
                                    <PieChart
                                        data={chartData}
                                        width={PIE_WIDTH}
                                        height={170}
                                        chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                                        accessor={'amount'}
                                        backgroundColor={'transparent'}
                                        // 描画の中心は width/4 + paddingLeft。コンテナの中央に来るよう paddingLeft を決める
                                        paddingLeft={String(PIE_WIDTH / 4)}
                                        hasLegend={false}
                                        absolute
                                    />
                                </View>
                                <View style={styles.legendList}>
                                    {chartData.map(({ name, amount: catTotal, color }) => {
                                        const percent = monthlyExpense > 0 ? Math.round((catTotal / monthlyExpense) * 100) : 0;
                                        return (
                                            <View key={name} style={styles.legendRow}>
                                                <View style={[styles.legendDot, { backgroundColor: color }]} />
                                                <Text style={styles.legendName} numberOfLines={1}>{name}</Text>
                                                <Text style={styles.legendAmount}>¥{catTotal.toLocaleString()}</Text>
                                                <Text style={styles.legendPercent}>{percent}%</Text>
                                            </View>
                                        );
                                    })}
                                </View>
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
                            style={[styles.listItem, { borderLeftColor: isIncome ? c.success : c.primary }]}
                            onPress={() => router.push({ pathname: isIncome ? '/income' : '/add', params: { id: item.id } })}
                            onLongPress={() => {
                                Alert.alert('削除', `${item.item}を削除しますか？`, [
                                    { text: 'キャンセル', style: 'cancel' },
                                    {
                                        text: '削除',
                                        style: 'destructive',
                                        onPress: () => setLastDeleted(deleteEntry(item.id)),
                                    },
                                ]);
                            }}
                        >
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.listItemText}>
                                    {isPlanned(item, today) && <Text style={styles.plannedBadge}>予定 </Text>}
                                    {item.item}
                                </Text>
                                <Text style={{ fontSize: 12, color: c.textSecondary }}>
                                    {item.category}{item.payment ? ` · ${item.payment}` : ''} | {formatDisplayDate(item.date)}{item.photo ? ' 📷' : ''}
                                </Text>
                                {!!item.memo && <Text style={styles.memoLine} numberOfLines={1}>{item.memo}</Text>}
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.listItemAmount, isIncome && { color: c.success }]}>
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
                        <View style={[styles.miniCircle, { backgroundColor: c.success }]}>
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

            <UndoSnackbar
                message={lastDeleted ? `「${lastDeleted.item}」を削除しました` : null}
                onUndo={() => {
                    if (lastDeleted) restoreEntry(lastDeleted);
                    setLastDeleted(null);
                }}
                onDismiss={dismissUndo}
                bottom={118}
            />

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
    monthText: { 
        fontSize: 18, 
        fontWeight: '700',
        color: c.primaryText,
        marginTop: 0,
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
    plannedLine: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    plannedBadge: { fontSize: 11, fontWeight: '700', color: c.warning },
    memoLine: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    changeText: { fontSize: 12, color: c.textSecondary, marginTop: 4, fontWeight: '600' },
    monthlyBreakdown: {
        fontSize: 12,
        color: c.textSecondary,
        marginTop: 6,
        fontWeight: '600',
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
        borderLeftColor: c.primary,
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


    floatingButton: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: c.primary,
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
        backgroundColor: c.primary,
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
        backgroundColor: c.primary,
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
        borderTopColor: c.primary,
    },
    chartCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: c.text,
        marginBottom: 12,
    },
    // styles for native-like header placeholder shown on mobile when native header is hidden
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
    legendList: { marginTop: 8 },
    legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
    legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
    legendName: { flex: 1, fontSize: 14, color: c.text, fontWeight: '500' },
    legendAmount: { fontSize: 14, color: c.text, fontWeight: '700', marginLeft: 8 },
    legendPercent: { width: 44, textAlign: 'right', fontSize: 13, color: c.textSecondary, fontWeight: '600' },
});
