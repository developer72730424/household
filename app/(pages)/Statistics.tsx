import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

interface HistoryItem {
    id: string;
    item: string;
    amount: string;
    category: string;
    date: string;
}

interface StatisticsProps {
    history: HistoryItem[];
    categories: string[];
    onBack: () => void;
}

const screenWidth = Dimensions.get('window').width;

export default function Statistics({ history, categories, onBack }: StatisticsProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<'1month' | '3month' | '6month'>('1month');
    const [monthlyData, setMonthlyData] = useState<{ month: string; total: number }[]>([]);
    const [categoryData, setCategoryData] = useState<{ name: string; amount: number; color: string }[]>([]);
    const [statistics, setStatistics] = useState<{
        totalAmount: number;
        averageAmount: number;
        maxCategoryName: string;
        maxCategoryAmount: number;
        transactionCount: number;
    }>({ totalAmount: 0, averageAmount: 0, maxCategoryName: '', maxCategoryAmount: 0, transactionCount: 0 });

    // 期間に応じた月数を取得
    const getMonthsToDisplay = (period: string) => {
        if (period === '1month') return 1;
        if (period === '3month') return 3;
        return 6;
    };

    // 指定年月のデータを集計は useEffect 内で直接計算します（getMonthData を外に残すと依存配列警告になるため）

    // 統計データの計算
    useEffect(() => {
        const months = getMonthsToDisplay(selectedPeriod);
        const today = new Date();
        const monthly: { month: string; total: number }[] = [];

        // 月別データの生成
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthLabel = `${year}/${month}`;
            const monthStr = monthLabel;
            const total = history
                .filter(item => item.date?.startsWith(monthStr))
                .reduce((sum, item) => sum + Number(item.amount), 0);

            monthly.push({ month: monthLabel, total });
        }
        setMonthlyData(monthly);

        // カテゴリ別集計
        const categoryTotals: { [key: string]: number } = {};
        categories.forEach(cat => {
            categoryTotals[cat] = history
                .filter(item => item.category === cat)
                .reduce((sum, item) => sum + Number(item.amount), 0);
        });

        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
        const catData = Object.entries(categoryTotals)
            .map(([name, amount], index) => ({
                name,
                amount,
                color: colors[index % colors.length],
                legendFontColor: '#7F7F7F',
                legendFontSize: 12,
            }))
            .filter(d => d.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        setCategoryData(catData);

        // 統計情報の計算
        const totalAmount = history.reduce((sum, item) => sum + Number(item.amount), 0);
        const avgAmount = history.length > 0 ? Math.round(totalAmount / history.length) : 0;
        const maxCategory = catData[0] || { name: '-', amount: 0 };

        setStatistics({
            totalAmount,
            averageAmount: avgAmount,
            maxCategoryName: maxCategory.name,
            maxCategoryAmount: maxCategory.amount,
            transactionCount: history.length,
        });
    }, [history, selectedPeriod, categories]);

    // BarChartデータの準備
    const barChartData = {
        labels: monthlyData.map(d => d.month.split('/')[1]), // 月のみ表示
        datasets: [
            {
                data: monthlyData.map(d => d.total),
            },
        ],
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
                <Text style={styles.title}>支出統計</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* 統計サマリー */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>総支出</Text>
                        <Text style={styles.summaryValue}>¥{statistics.totalAmount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>平均支出</Text>
                        <Text style={styles.summaryValue}>¥{statistics.averageAmount.toLocaleString()}</Text>
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
                </View>

                {/* 月別推移グラフ */}
                {monthlyData.length > 0 && (
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>月別支出推移</Text>
                        <BarChart
                            data={barChartData}
                            width={screenWidth - 40}
                            height={200}
                            chartConfig={{
                                backgroundColor: '#fff',
                                backgroundGradientFrom: '#fff',
                                backgroundGradientTo: '#fff',
                                color: (opacity = 1) => `rgba(50, 164, 235, ${opacity})`,
                                strokeWidth: 2,
                                barPercentage: 0.7,
                                formatYLabel: (value) => `￥${Math.round(Number(value || 0)).toLocaleString()}`,
                            }}
                            style={styles.chart}
                            yAxisLabel=""
                            yAxisSuffix=""
                            fromZero={true}
                            yAxisInterval={10000}
                        />
                    </View>
                )}

                {/* カテゴリ別支出 */}
                {categoryData.length > 0 && (
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>カテゴリ別内訳</Text>

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

                {/* カテゴリ別詳細 */}
                {categoryData.length > 0 && (
                    <View style={styles.categoryDetailsContainer}>
                        <Text style={styles.chartTitle}>カテゴリ別</Text>
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

                {/* 最高支出カテゴリ */}
                {statistics.maxCategoryAmount > 0 && (
                    <View style={styles.topCategoryContainer}>
                        <Text style={styles.topCategoryLabel}>最高支出カテゴリ</Text>
                        <View style={styles.topCategoryContent}>
                            <Text style={styles.topCategoryName}>{statistics.maxCategoryName}</Text>
                            <Text style={styles.topCategoryAmount}>¥{statistics.maxCategoryAmount.toLocaleString()}</Text>
                        </View>
                    </View>
                )}

                {/* データがない場合 */}
                {history.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>支出データがまだ登録されていません</Text>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
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
    // 新しいヘッダーデザイン用のスタイル
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { padding: 6, marginRight: 8, borderRadius: 8 },
    backIcon: { fontSize: 22, color: '#5B4FA3', fontWeight: '700' },
    appIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#5B4FA3', alignItems: 'center', justifyContent: 'center' },
    appIconText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
    headerRight: { padding: 6 },
    headerRightText: { fontSize: 18, color: '#8A8A8A' },

    backText: { color: '#5B4FA3', fontSize: 16, fontWeight: '600' },

    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 18,
        backgroundColor: '#FFFFFF',
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
    summaryLabel: { fontSize: 13, color: '#666666', marginBottom: 6, fontWeight: '500' },
    summaryValue: { fontSize: 20, fontWeight: '700', color: '#5B4FA3' },

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
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    periodBtnActive: { backgroundColor: '#5B4FA3', borderColor: '#5B4FA3' },
    periodBtnText: { fontSize: 13, color: '#666666', fontWeight: '600' },
    periodBtnTextActive: { color: '#fff', fontWeight: '700' },

    chartContainer: {
        backgroundColor: '#FFFFFF',
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
    chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, color: '#1A1A1A' },
    chart: { alignSelf: 'center' },

    // Pie layout: center the whole block and add spacing so pie doesn't hug left edge
    pieCenter: { alignItems: 'center', justifyContent: 'center' },
    pieRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    // Legend column kept to the right with compact width
    pieLegendColumn: { width: 90, marginLeft: 8, justifyContent: 'flex-start' },
    pieLegendItemColumn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, width: '100%' },
    // compact vertical list for legends
    pieLegendWrap: { flexDirection: 'column' },
    colorDotSmall: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    pieLegendTextSmall: { fontSize: 12, color: '#1A1A1A', fontWeight: '600' },
    pieLegendPercentSmall: { fontSize: 11, color: '#999999', marginLeft: 6, fontWeight: '600' },

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
        backgroundColor: '#FFFFFF',
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
        borderBottomColor: '#F0F0F0',
    },
    categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
    categoryName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    categoryPercentage: { fontSize: 12, color: '#B0B0B0', marginTop: 2, fontWeight: '500' },
    categoryAmount: { fontSize: 15, fontWeight: '700', color: '#5B4FA3' },

    // Pie legend (カテゴリ名のみ表示) スタイル
    pieLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
    pieLegendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 },
    pieLegendText: { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
    // pieLegendAmount removed: legend now shows only name + percent
    // pieLegendAmount: { fontSize: 12, color: '#666666', marginLeft: 8, fontWeight: '600' },
    pieLegendPercent: { fontSize: 12, color: '#666666', marginLeft: 8, fontWeight: '600' },

    topCategoryContainer: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#5B4FA3',
        shadowColor: '#5B4FA3',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    topCategoryLabel: { fontSize: 12, color: '#666666', marginBottom: 8, fontWeight: '500' },
    topCategoryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topCategoryName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
    topCategoryAmount: { fontSize: 18, fontWeight: '700', color: '#5B4FA3' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: '#B0B0B0', fontWeight: '500' },
});
