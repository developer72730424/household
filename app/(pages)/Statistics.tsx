import React, { useEffect, useMemo, useState } from 'react';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { Dimensions, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

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
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [selectedPeriod, setSelectedPeriod] = useState<'1month' | '3month' | '6month'>('1month');
    const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
    const [categoryData, setCategoryData] = useState<{ name: string; amount: number; color: string }[]>([]);
    const [incomeData, setIncomeData] = useState<{ name: string; amount: number; color: string }[]>([]);
    const [statistics, setStatistics] = useState<{
        totalAmount: number;
        incomeTotal: number;
        netBalance: number;
        averageAmount: number;
        maxCategoryName: string;
        maxCategoryAmount: number;
        maxIncomeName: string;
        maxIncomeAmount: number;
        transactionCount: number;
    }>({ totalAmount: 0, incomeTotal: 0, netBalance: 0, averageAmount: 0, maxCategoryName: '', maxCategoryAmount: 0, maxIncomeName: '', maxIncomeAmount: 0, transactionCount: 0 });

    // 切り替え: 月別表示か全期間表示か
    const [showAllTime, setShowAllTime] = useState(false);

    // 月移動用（ホームと同じ操作感）
    const [currentMonth, setCurrentMonth] = useState(new Date());
    // displayYearMonth はゼロ埋めして "YYYY/MM" 形式にする
    const displayYearMonth = useMemo(() => `${currentMonth.getFullYear()}/${('0' + (currentMonth.getMonth() + 1)).slice(-2)}`, [currentMonth]);
    const displayMonthJapanese = useMemo(() => `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`, [currentMonth]);
    const goToPrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    // 日付文字列を正規化して "YYYY/MM" 形式にするユーティリティ
    const normalizeMonth = (dateStr?: string) => {
        if (!dateStr) return '';
        const s = String(dateStr);
        const m = s.match(/(\d{4})[-\/](\d{1,2})/);
        if (m) return `${m[1]}/${('0' + m[2]).slice(-2)}`;
        const dt = new Date(s);
        if (!isNaN(dt.getTime())) return `${dt.getFullYear()}/${('0' + (dt.getMonth() + 1)).slice(-2)}`;
        return '';
    };

    // 指定月の履歴（normalizeMonth を使って厳密に一致を見る）
    const filteredHistory = useMemo(() => history.filter(item => normalizeMonth(item.date) === displayYearMonth), [history, displayYearMonth]);

    // 月別の集計（表示用）
    const monthExpenseTotalsMap = useMemo(() => {
        const map: Record<string, number> = {};
        filteredHistory.forEach(entry => {
            if (entry.category === '収入') return;
            map[entry.category] = (map[entry.category] || 0) + Math.abs(Number(entry.amount) || 0);
        });
        return map;
    }, [filteredHistory]);

    const monthCategoryData = useMemo(() => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
        return Object.entries(monthExpenseTotalsMap).map(([name, amount], index) => ({
            name,
            amount,
            color: colors[index % colors.length],
            legendFontColor: c.textSecondary,
            legendFontSize: 12,
        })).filter(d => d.amount > 0).sort((a, b) => b.amount - a.amount);
    }, [monthExpenseTotalsMap, c.textSecondary]);

    const monthIncomeTotalsMap = useMemo(() => {
        const map: Record<string, number> = {};
        filteredHistory.forEach(entry => {
            if (entry.category !== '収入') return;
            const key = entry.item || 'その他';
            map[key] = (map[key] || 0) + (Number(entry.amount) || 0);
        });
        return map;
    }, [filteredHistory]);

    const monthIncomeData = useMemo(() => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
        return Object.entries(monthIncomeTotalsMap).map(([name, amount], index) => ({
            name,
            amount,
            color: colors[(index + 2) % colors.length],
            legendFontColor: c.textSecondary,
            legendFontSize: 12,
        })).filter(d => d.amount > 0).sort((a, b) => b.amount - a.amount);
    }, [monthIncomeTotalsMap, c.textSecondary]);

    const monthTotalExpense = useMemo(() => Object.values(monthExpenseTotalsMap).reduce((s, v) => s + v, 0), [monthExpenseTotalsMap]);
    const monthTotalIncome = useMemo(() => Object.values(monthIncomeTotalsMap).reduce((s, v) => s + v, 0), [monthIncomeTotalsMap]);

    // ユーティリティ: 文字列の金額を安全に数値へ変換（カンマや余分な文字を取り除く）
    const parseAmount = (val: string | number) => {
        const s = String(val || '0');
        // カンマや通貨記号など数字以外を取り除く
        const cleaned = s.replace(/[,¥\s]/g, '').replace(/[^0-9.\-]/g, '');
        const n = Number(cleaned);
        return isNaN(n) ? 0 : n;
    };

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
        const monthly: { month: string; income: number; expense: number }[] = [];

        // 月別データの生成
        // 日付文字列のフォーマットはアプリ内で一貫しているとは限らない
        // （"YYYY/MM"、"YYYY-MM-DD"、ISO 文字列など）があるため、
        // 日付文字列を正規化して "YYYY/MM" 形式で比較する関数を使う
        const normalizeMonth = (dateStr?: string) => {
            if (!dateStr) return '';
            const s = String(dateStr);
            // まずは YYYY/MM や YYYY/M, YYYY-MM のような先頭部分を正規表現で抜き出す
            const m = s.match(/(\d{4})[-\/](\d{1,2})/);
            if (m) return `${m[1]}/${('0' + m[2]).slice(-2)}`;
            // 最後に Date にパースして月を取得する（保険）
            const dt = new Date(s);
            if (!isNaN(dt.getTime())) return `${dt.getFullYear()}/${('0' + (dt.getMonth() + 1)).slice(-2)}`;
            return '';
        };

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            // 月ラベルはゼロ埋めした "YYYY/MM" 形式にする（横軸を現在の年月に合わせるため）
            const monthLabel = `${year}/${('0' + month).slice(-2)}`;

            // 正規化した日付が当該月と一致するアイテムを集計する
            const monthItems = history.filter(item => normalizeMonth(item.date) === monthLabel);

            const income = monthItems
                .filter(it => it.category === '収入')
                .reduce((sum, item) => sum + parseAmount(item.amount), 0);
            const expense = monthItems
                .filter(it => it.category !== '収入')
                .reduce((sum, item) => sum + Math.abs(parseAmount(item.amount)), 0);

            monthly.push({ month: monthLabel, income, expense });
        }
        setMonthlyData(monthly);

        // カテゴリ別集計（"収入"カテゴリは支出集計から除外）
        // showAllTime が true の場合は全期間、false の場合は currentMonth のデータのみを使う
        const sourceForCategory = showAllTime ? history : filteredHistory;
        const categoryTotals: { [key: string]: number } = {};
        categories.forEach(cat => {
            // カテゴリリストに万が一「収入」が含まれている場合はスキップ
            if (cat === '収入') return;
            // 支出はマイナスで保存されている場合があるため、絶対値で集計する
            categoryTotals[cat] = sourceForCategory
                .filter(item => item.category === cat)
                .reduce((sum, item) => sum + Math.abs(parseAmount(item.amount)), 0);
        });

        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
        const catData = Object.entries(categoryTotals)
            .map(([name, amount], index) => ({
                name,
                amount,
                color: colors[index % colors.length],
                legendFontColor: c.textSecondary,
                legendFontSize: 12,
            }))
            .filter(d => d.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        setCategoryData(catData);

        // 収入の内訳（収入カテゴリのアイテム名ごとに集計）
        const sourceForIncome = showAllTime ? history : filteredHistory;
        const incomeTotals: { [key: string]: number } = {};
        sourceForIncome
            .filter(item => item.category === '収入')
            .forEach(it => {
                const key = it.item || 'その他';
                incomeTotals[key] = (incomeTotals[key] || 0) + parseAmount(it.amount);
            });

        const incData = Object.entries(incomeTotals)
            .map(([name, amount], index) => ({
                name,
                amount,
                color: colors[(index + 2) % colors.length],
                legendFontColor: c.textSecondary,
                legendFontSize: 12,
            }))
            .filter(d => d.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        setIncomeData(incData);

        const maxIncome = incData[0] || { name: '-', amount: 0 };

        // 統計情報の計算
        // showAllTime が true の場合は全期間、false の場合は currentMonth のデータのみを使う
        const sourceForStats = showAllTime ? history : filteredHistory;
        // 総支出は支出が負数で保存されているケースを想定して絶対値で集計する
        const totalAmount = sourceForStats
            .filter(item => item.category !== '収入')
            .reduce((sum, item) => sum + Math.abs(parseAmount(item.amount)), 0);
        const incomeTotal = sourceForStats
            .filter(item => item.category === '収入')
            .reduce((sum, item) => sum + parseAmount(item.amount), 0);
        const netBalance = incomeTotal - totalAmount; // 収入 - 支出
        const avgAmount = sourceForStats.length > 0 ? Math.round(totalAmount / sourceForStats.length) : 0;
        const maxCategory = catData[0] || { name: '-', amount: 0 };

        setStatistics({
            totalAmount,
            incomeTotal,
            netBalance,
            averageAmount: avgAmount,
            maxCategoryName: maxCategory.name,
            maxCategoryAmount: maxCategory.amount,
            maxIncomeName: maxIncome.name,
            maxIncomeAmount: maxIncome.amount,
            transactionCount: sourceForStats.length,
        });
    }, [history, selectedPeriod, categories, showAllTime, filteredHistory, c.textSecondary]);

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
                        <Text style={[styles.summaryValue, { color: '#27AE60' }]}>¥{statistics.incomeTotal.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>総支出</Text>
                        <Text style={styles.summaryValue}>¥{statistics.totalAmount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>収支</Text>
                        <Text style={[styles.summaryValue, { color: statistics.netBalance >= 0 ? '#27AE60' : '#E74C3C' }]}>
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
                                        <Text style={[styles.categoryAmount, { color: '#27AE60' }]}>¥{item.amount.toLocaleString()}</Text>
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
                    <View style={[styles.topCategoryContainer, { borderLeftColor: '#27AE60' }]}>
                        <Text style={styles.topCategoryLabel}>最大収入カテゴリ</Text>
                        <View style={styles.topCategoryContent}>
                            <Text style={styles.topCategoryName}>{statistics.maxIncomeName}</Text>
                            <Text style={[styles.topCategoryAmount, { color: '#27AE60' }]}>¥{statistics.maxIncomeAmount.toLocaleString()}</Text>
                        </View>
                    </View>
                )}

                {/* データがない場合 */}
                {history.length === 0 && (
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
    iconButton: { padding: 6, marginRight: 8, borderRadius: 8 },
    backIcon: { fontSize: 22, color: c.primaryText, fontWeight: '700' },
    appIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#5B4FA3', alignItems: 'center', justifyContent: 'center' },
    appIconText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    title: { fontSize: 20, fontWeight: '700', color: c.text },
    headerRight: { padding: 6 },
    headerRightText: { fontSize: 18, color: c.textMuted },

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

    monthlyTotalCard: {
        backgroundColor: c.card,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 12,
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
    periodBtnActive: { backgroundColor: '#5B4FA3', borderColor: '#5B4FA3' },
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
    pieRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    // Legend column kept to the right with compact width
    pieLegendColumn: { width: 90, marginLeft: 8, justifyContent: 'flex-start' },
    pieLegendItemColumn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, width: '100%' },
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
    categoryPercentage: { fontSize: 12, color: c.textMuted, marginTop: 2, fontWeight: '500' },
    categoryAmount: { fontSize: 15, fontWeight: '700', color: c.primaryText },

    // Pie legend (カテゴリ名のみ表示) スタイル
    pieLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
    pieLegendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 },
    pieLegendText: { fontSize: 13, color: c.text, fontWeight: '600' },
    // pieLegendAmount removed: legend now shows only name + percent
    // pieLegendAmount: { fontSize: 12, color: c.textSecondary, marginLeft: 8, fontWeight: '600' },
    pieLegendPercent: { fontSize: 12, color: c.textSecondary, marginLeft: 8, fontWeight: '600' },

    topCategoryContainer: {
        backgroundColor: c.card,
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
    topCategoryLabel: { fontSize: 12, color: c.textSecondary, marginBottom: 8, fontWeight: '500' },
    topCategoryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topCategoryName: { fontSize: 17, fontWeight: '700', color: c.text },
    topCategoryAmount: { fontSize: 18, fontWeight: '700', color: c.primaryText },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: c.textMuted, fontWeight: '500' },
});
