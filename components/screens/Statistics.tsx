import React, { useMemo, useState } from 'react';
import { Dimensions, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import {
    entriesInMonth, expenseByCategory, formatMonthJapanese, incomeBySource, monthKeyOf, monthlyTrend, shiftMonth,
    summarize, type Entry,
} from '@/utils/entries';

interface StatisticsProps {
    entries: Entry[];
    onBack: () => void;
}

const screenWidth = Dimensions.get('window').width;
const CHART_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

export default function Statistics({ entries, onBack }: StatisticsProps) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [selectedPeriod, setSelectedPeriod] = useState<'1month' | '3month' | '6month'>('1month');
    // 切り替え: 月別表示か全期間表示か
    const [showAllTime, setShowAllTime] = useState(false);
    // 月移動用（ホームと同じ操作感）
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const displayMonthJapanese = formatMonthJapanese(currentMonth);
    const goToPrevMonth = () => setCurrentMonth(prev => shiftMonth(prev, -1));
    const goToNextMonth = () => setCurrentMonth(prev => shiftMonth(prev, 1));

    // 集計の対象: 全期間 or 表示中の月
    const scoped = useMemo(
        () => (showAllTime ? entries : entriesInMonth(entries, monthKeyOf(currentMonth))),
        [entries, showAllTime, currentMonth],
    );

    // 月別推移: 表示中の月を終点に、直近 1・3・6 か月
    const monthlyData = useMemo(() => {
        const months = selectedPeriod === '1month' ? 1 : selectedPeriod === '3month' ? 3 : 6;
        return monthlyTrend(entries, currentMonth, months).map(p => ({ ...p, month: p.month.replace('-', '/') }));
    }, [entries, selectedPeriod, currentMonth]);

    const categoryData = useMemo(
        () => expenseByCategory(scoped).map((t, i) => ({
            ...t,
            color: CHART_COLORS[i % CHART_COLORS.length],
            legendFontColor: c.textSecondary,
            legendFontSize: 12,
        })),
        [scoped, c.textSecondary],
    );
    const incomeData = useMemo(
        () => incomeBySource(scoped).map((t, i) => ({
            ...t,
            color: CHART_COLORS[(i + 2) % CHART_COLORS.length],
            legendFontColor: c.textSecondary,
            legendFontSize: 12,
        })),
        [scoped, c.textSecondary],
    );

    const summary = useMemo(() => summarize(scoped), [scoped]);
    const statistics = {
        totalAmount: summary.expense,
        incomeTotal: summary.income,
        netBalance: summary.balance,
        transactionCount: summary.count,
        maxCategoryName: categoryData[0]?.name ?? '-',
        maxCategoryAmount: categoryData[0]?.amount ?? 0,
        maxIncomeName: incomeData[0]?.name ?? '-',
        maxIncomeAmount: incomeData[0]?.amount ?? 0,
    };

    // 月別推移データ（収入・支出を別線で表示するための LineChart 用データ）
    const lineChartData = {
        // 横軸ラベルは "YYYY/MM"（現在の年月を基準にしたラベル）を使う
        labels: monthlyData.map(d => d.month),
        datasets: [
            {
                data: monthlyData.map(d => d.income),
                color: (opacity = 1) => `rgba(39,174,96, ${opacity})`, // 収入（緑）
                strokeWidth: 2,
            },
            {
                data: monthlyData.map(d => d.expense),
                color: (opacity = 1) => `rgba(91,79,163, ${opacity})`, // 支出（既存の青系）
                strokeWidth: 2,
            },
        ],
        legend: ['収入', '支出'],
    };

    // Adjusted for iPhone width ~375 to keep pie centered
    const pieMax = 220;
    // safeHorizontalPadding を大きめにして小さい画面でも円がはみ出さないようにする
    const safeHorizontalPadding = 64;
    const pieWidth = Math.min(screenWidth - safeHorizontalPadding, pieMax);
    // 内部描画がはみ出す場合があるため若干小さめの幅を渡す
    const pieChartInnerWidth = Math.max(pieWidth - 8, 100);
    

    return (
        <View style={styles.container}>
            {/* ヘッダー */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}>
                    <Text style={styles.backText}>← 戻る</Text>
                </TouchableOpacity>
                <Text style={styles.title}>収支統計</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* 月表示：現在の表示が何月なのか分かるようにする。全期間表示の場合は「全期間」を表示 */}
                <View style={styles.monthNav}>
                    <TouchableOpacity style={styles.monthNavButton} onPress={goToPrevMonth}>
                        <Text style={styles.monthNavBtnText}>‹</Text>
                    </TouchableOpacity>

                    <View style={styles.monthDisplayContainer}>
                        <Text style={styles.monthText}>{showAllTime ? '全期間' : displayMonthJapanese}</Text>
                    </View>

                    <TouchableOpacity style={styles.monthNavButton} onPress={goToNextMonth}>
                        <Text style={styles.monthNavBtnText}>›</Text>
                    </TouchableOpacity>
                </View>
                {/* 統計サマリー */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>収入</Text>
                        <Text style={[styles.summaryValue, { color: c.success }]}>¥{statistics.incomeTotal.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>総支出</Text>
                        <Text style={styles.summaryValue}>¥{statistics.totalAmount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>収支</Text>
                        <Text style={[styles.summaryValue, { color: statistics.netBalance >= 0 ? c.success : c.danger }]}>
                            {statistics.netBalance >= 0 ? '+' : '-'}¥{Math.abs(statistics.netBalance).toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>記録数</Text>
                        <Text style={styles.summaryValue}>{statistics.transactionCount}件</Text>
                    </View>
                </View>

                {/* 期間選択ボタン */}
                <View style={styles.periodSelector}>
                    <TouchableOpacity
                        style={[styles.periodBtn, selectedPeriod === '1month' && styles.periodBtnActive]}
                        onPress={() => setSelectedPeriod('1month')}
                    >
                        <Text style={[styles.periodBtnText, selectedPeriod === '1month' && styles.periodBtnTextActive]}>
                            1ヶ月
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodBtn, selectedPeriod === '3month' && styles.periodBtnActive]}
                        onPress={() => setSelectedPeriod('3month')}
                    >
                        <Text style={[styles.periodBtnText, selectedPeriod === '3month' && styles.periodBtnTextActive]}>
                            3ヶ月
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodBtn, selectedPeriod === '6month' && styles.periodBtnActive]}
                        onPress={() => setSelectedPeriod('6month')}
                    >
                        <Text style={[styles.periodBtnText, selectedPeriod === '6month' && styles.periodBtnTextActive]}>
                            6ヶ月
                        </Text>
                    </TouchableOpacity>
                    {/* 全期間の統計を表示するトグル */}
                    <TouchableOpacity
                        style={[styles.periodBtn, showAllTime && styles.periodBtnActive]}
                        onPress={() => setShowAllTime(prev => !prev)}
                    >
                        <Text style={[styles.periodBtnText, showAllTime && styles.periodBtnTextActive]}>
                            全期間
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 月別推移グラフ（収入と支出を別線で表示） */}
                {monthlyData.length > 0 && (
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>月別収支推移</Text>
                        <LineChart
                            data={lineChartData}
                            // Chart is rendered inside a container with horizontal margin (16) and padding (16),
                            // so reduce width to avoid left-side y-axis labels being pushed outside the visible area.
                            width={screenWidth - 64}
                            height={220}
                            chartConfig={{
                                backgroundColor: c.card,
                                backgroundGradientFrom: c.card,
                                backgroundGradientTo: c.card,
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(${c.chartRgb}, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(${c.chartLabelRgb}, ${opacity})`,
                                style: { borderRadius: 8 },
                                propsForDots: {
                                    r: '3',
                                    strokeWidth: '0',
                                },
                            }}
                            style={styles.chart}
                            fromZero={true}
                            withShadow={false}
                            withDots={true}
                            withInnerLines={false}
                            withOuterLines={false}
                        />
                    </View>
                )}

                {/* 支出内訳 */}
                {categoryData.length > 0 && (
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>支出内訳</Text>

                        {/* 円グラフを中央に配置し、凡例は下に表示するレイアウト */}
                        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            {/* 強制中央寄せラッパー（左右に余白を作り、内部描画がはみ出さないようにする） */}
                            <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: safeHorizontalPadding / 2, overflow: 'visible' }}>
                                <PieChart
                                    data={categoryData}
                                    width={pieChartInnerWidth}
                                    height={200}
                                    chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                                    accessor={'amount'}
                                    backgroundColor={'transparent'}
                                    paddingLeft={'30'}
                                    hasLegend={false}
                                    absolute
                                    style={{ alignSelf: 'center', marginLeft: 0 }}
                                />
                            </View>

                            {/* 凡例：円の下に配置し、横幅に応じて折り返す */}
                            <View style={styles.pieLegendBelow}>
                                {categoryData.map(c => {
                                    const percent = statistics.totalAmount > 0 ? Math.round((c.amount / statistics.totalAmount) * 100) : 0;
                                    return (
                                        <View key={c.name} style={styles.pieLegendItemRow}>
                                            <View style={[styles.colorDotSmall, { backgroundColor: c.color }]} />
                                            <Text style={styles.pieLegendTextSmall} numberOfLines={1} ellipsizeMode={'tail'}>{c.name}</Text>
                                            <Text style={styles.pieLegendPercentSmall}>{percent}%</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                )}

                {/* 収入内訳（収入の円グラフ） */}
                {incomeData.length > 0 && (
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>収入内訳</Text>
                        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: safeHorizontalPadding / 2, overflow: 'visible' }}>
                                <PieChart
                                    data={incomeData}
                                    width={pieChartInnerWidth}
                                    height={180}
                                    chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                                    accessor={'amount'}
                                    backgroundColor={'transparent'}
                                    paddingLeft={'30'}
                                    hasLegend={false}
                                    absolute
                                />
                            </View>

                            <View style={styles.pieLegendBelow}>
                                {incomeData.map(c => {
                                    const percent = statistics.incomeTotal > 0 ? Math.round((c.amount / statistics.incomeTotal) * 100) : 0;
                                    return (
                                        <View key={c.name} style={styles.pieLegendItemRow}>
                                            <View style={[styles.colorDotSmall, { backgroundColor: c.color }]} />
                                            <Text style={styles.pieLegendTextSmall} numberOfLines={1} ellipsizeMode={'tail'}>{c.name}</Text>
                                            <Text style={styles.pieLegendPercentSmall}>{percent}%</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                )}

                {/* カテゴリ別詳細 */}
                {categoryData.length > 0 && (
                    <View style={styles.categoryDetailsContainer}>
                        <Text style={styles.chartTitle}>カテゴリ別（支出）</Text>
                        <FlatList
                            data={categoryData}
                            keyExtractor={item => item.name}
                            scrollEnabled={false}
                            renderItem={({ item }) => {
                                return (
                                    <View style={styles.categoryDetail}>
                                        <View style={styles.categoryInfo}>
                                            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.categoryName}>{item.name}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.categoryAmount}>¥{item.amount.toLocaleString()}</Text>
                                    </View>
                                );
                            }}
                        />
                    </View>
                )}

                {/* カテゴリ別詳細（収入） */}
                {incomeData.length > 0 && (
                    <View style={styles.categoryDetailsContainer}>
                        <Text style={styles.chartTitle}>カテゴリ別（収入）</Text>
                        <FlatList
                            data={incomeData}
                            keyExtractor={item => item.name}
                            scrollEnabled={false}
                            renderItem={({ item }) => {
                                return (
                                    <View style={styles.categoryDetail}>
                                        <View style={styles.categoryInfo}>
                                            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.categoryName}>{item.name}</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.categoryAmount, { color: c.success }]}>¥{item.amount.toLocaleString()}</Text>
                                    </View>
                                );
                            }}
                        />
                    </View>
                )}

                {/* 最高支出カテゴリ */}
                {statistics.maxCategoryAmount > 0 && (
                    <View style={styles.topCategoryContainer}>
                        <Text style={styles.topCategoryLabel}>最大支出カテゴリ</Text>
                        <View style={styles.topCategoryContent}>
                            <Text style={styles.topCategoryName}>{statistics.maxCategoryName}</Text>
                            <Text style={styles.topCategoryAmount}>¥{statistics.maxCategoryAmount.toLocaleString()}</Text>
                        </View>
                    </View>
                )}

                {/* 最高収入カテゴリ */}
                {statistics.maxIncomeAmount > 0 && (
                    <View style={[styles.topCategoryContainer, { borderLeftColor: c.success }]}>
                        <Text style={styles.topCategoryLabel}>最大収入カテゴリ</Text>
                        <View style={styles.topCategoryContent}>
                            <Text style={styles.topCategoryName}>{statistics.maxIncomeName}</Text>
                            <Text style={[styles.topCategoryAmount, { color: c.success }]}>¥{statistics.maxIncomeAmount.toLocaleString()}</Text>
                        </View>
                    </View>
                )}

                {/* データがない場合 */}
                {entries.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>収入・支出のデータがまだ登録されていません</Text>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8) },
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
    // 新しいヘッダーデザイン用のスタイル
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '700', color: c.text },

    // ホーム画面と同様の月移動 / 月集計用スタイル
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

    backText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },

    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 18,
        backgroundColor: c.card,
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    summaryItem: { alignItems: 'center' },
    summaryLabel: { fontSize: 13, color: c.textSecondary, marginBottom: 6, fontWeight: '500' },
    summaryValue: { fontSize: 20, fontWeight: '700', color: c.primaryText },

    periodSelector: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    periodBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 22,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
    },
    periodBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    periodBtnText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    periodBtnTextActive: { color: '#fff', fontWeight: '700' },

    chartContainer: {
        backgroundColor: c.card,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, color: c.text },
    chart: { alignSelf: 'center' },

    // Pie layout: center the whole block and add spacing so pie doesn't hug left edge
    pieCenter: { alignItems: 'center', justifyContent: 'center' },
    // Legend column kept to the right with compact width
    pieLegendColumn: { width: 90, marginLeft: 8, justifyContent: 'flex-start' },
    // compact vertical list for legends
    pieLegendWrap: { flexDirection: 'column' },
    colorDotSmall: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    pieLegendTextSmall: { fontSize: 12, color: c.text, fontWeight: '600' },
    pieLegendPercentSmall: { fontSize: 11, color: c.textMuted, marginLeft: 6, fontWeight: '600' },

    // 凡例（円の下）スタイル
    pieLegendBelow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 12,
        paddingHorizontal: 8,
    },
    pieLegendItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        marginBottom: 8,
    },

    categoryDetailsContainer: {
        backgroundColor: c.card,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    categoryDetail: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
    categoryName: { fontSize: 14, fontWeight: '600', color: c.text },
    categoryAmount: { fontSize: 15, fontWeight: '700', color: c.primaryText },

    // Pie legend (カテゴリ名のみ表示) スタイル
    pieLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
    // pieLegendAmount removed: legend now shows only name + percent
    // pieLegendAmount: { fontSize: 12, color: c.textSecondary, marginLeft: 8, fontWeight: '600' },

    topCategoryContainer: {
        backgroundColor: c.card,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: c.primary,
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    topCategoryLabel: { fontSize: 12, color: c.textSecondary, marginBottom: 8, fontWeight: '500' },
    topCategoryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topCategoryName: { fontSize: 17, fontWeight: '700', color: c.text },
    topCategoryAmount: { fontSize: 18, fontWeight: '700', color: c.primaryText },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: c.textMuted, fontWeight: '500' },
});
