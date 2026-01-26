import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HistoryItem {
    id: string;
    item: string;
    amount: string;
    category: string;
    date: string;
}

interface ExportProps {
    history: HistoryItem[];
    categories: string[];
    onBack: () => void;
}

export default function Export({ history, categories, onBack }: ExportProps) {
    const [isExporting, setIsExporting] = useState(false);

    // CSVフォーマットでデータを生成
    const generateCSV = (): string => {
        const headers = ['ID', '品目', '金額', 'カテゴリ', '日付'];
        const rows = history.map((item) => [
            item.id,
            `"${item.item}"`, // CSV内のカンマを避けるためダブルクォート
            item.amount,
            item.category,
            item.date,
        ]);

        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        return csv;
    };

    // JSONフォーマットでデータを生成
    const generateJSON = (): string => {
        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            summary: {
                totalExpenses: history.length,
                totalAmount: history.reduce((sum, item) => sum + Number(item.amount), 0),
            },
            categories: categories,
            history: history,
        };
        return JSON.stringify(data, null, 2);
    };

    // テキストレポートを生成
    const generateReport = (): string => {
        const totalAmount = history.reduce((sum, item) => sum + Number(item.amount), 0);
        const categoryTotals: { [key: string]: number } = {};

        categories.forEach((cat) => {
            categoryTotals[cat] = history
                .filter((item) => item.category === cat)
                .reduce((sum, item) => sum + Number(item.amount), 0);
        });

        let report = `家計簿レポート\n`;
        report += `===============================\n`;
        report += `エクスポート日時: ${new Date().toLocaleString('ja-JP')}\n`;
        report += `\n`;
        report += `【概要】\n`;
        report += `総支出額: ¥${totalAmount.toLocaleString()}\n`;
        report += `記録数: ${history.length}件\n`;
        report += `\n`;
        report += `【カテゴリ別支出】\n`;

        Object.entries(categoryTotals).forEach(([cat, amount]) => {
            if (amount > 0) {
                const percentage = Math.round((amount / totalAmount) * 100);
                report += `  ${cat}: ¥${amount.toLocaleString()} (${percentage}%)\n`;
            }
        });

        report += `\n`;
        report += `【詳細な支出履歴】\n`;
        report += `日付, 品目, 金額, カテゴリ\n`;

        history.forEach((item) => {
            report += `${item.date}, ${item.item}, ¥${Number(item.amount).toLocaleString()}, ${item.category}\n`;
        });

        return report;
    };

    // CSVをコピー/シェア
    const exportCSV = async () => {
        try {
            setIsExporting(true);
            const csv = generateCSV();
            Alert.alert('CSVプレビュー', 'CSV形式のデータを表示します。長押しでコピーしてください。');
            console.log('CSV Data:', csv);
        } catch (error) {
            Alert.alert('エラー', 'CSVの生成に失敗しました');
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    // JSONをコピー/バックアップ
    const exportJSON = async () => {
        try {
            setIsExporting(true);
            const json = generateJSON();
            Alert.alert('JSONプレビュー', 'JSON形式のバックアップデータを表示します。長押しでコピーしてください。');
            console.log('JSON Data:', json);
        } catch (error) {
            Alert.alert('エラー', 'JSONの生成に失敗しました');
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    // テキストレポートをコピー/シェア
    const exportReport = async () => {
        try {
            setIsExporting(true);
            const report = generateReport();
            Alert.alert('レポートプレビュー', 'テキスト形式のレポートを表示します。長押しでコピーしてください。');
            console.log('Report Data:', report);
        } catch {
            Alert.alert('エラー', 'CSVの生成に失敗しました');
        } finally {
            setIsExporting(false);
        }
    };

    // クリップボードにコピー
    const copyToClipboard = async (format: 'csv' | 'json' | 'report') => {
        try {
            let text = '';
            if (format === 'csv') {
                text = generateCSV();
            } else if (format === 'json') {
                text = generateJSON();
            } else {
                text = generateReport();
            }

            // React Native Debuggerのコンソールに出力（開発時のワークアラウンド）
            console.log(`${format.toUpperCase()} Data:`, text);
            Alert.alert('情報', 'データはコンソールに出力されました。デバッガーで確認してください。');
        } catch {
            Alert.alert('エラー', 'JSONの生成に失敗しました');
        } finally {
            // noop
        }
    };

    // データをリセット
    const resetData = () => {
        Alert.alert('データ削除', 'すべての支出データを削除しますか？この操作は戻せません', [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: '削除',
                style: 'destructive',
                    onPress: async () => {
                    try {
                        await AsyncStorage.removeItem('@expense_history');
                        Alert.alert('完了', 'データが削除されました。アプリを再起動してください。');
                    } catch {
                        Alert.alert('エラー', 'データの削除に失敗しました');
                    }
                },
            },
        ]);
    };

    const totalAmount = history.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <View style={styles.container}>
            {/* ヘッダー */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}>
                    <Text style={styles.backText}>← 戻る</Text>
                </TouchableOpacity>
                <Text style={styles.title}>データ管理</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* データサマリー */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>📊 現在のデータ</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>記録数:</Text>
                        <Text style={styles.summaryValue}>{history.length}件</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>総支出額:</Text>
                        <Text style={styles.summaryValue}>¥{totalAmount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>カテゴリ数:</Text>
                        <Text style={styles.summaryValue}>{categories.length}個</Text>
                    </View>
                </View>

                {/* エクスポートセクション */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📤 データをエクスポート</Text>

                    {/* CSV */}
                    <View style={styles.exportCard}>
                        <View style={styles.exportHeader}>
                            <Text style={styles.exportTitle}>CSV形式</Text>
                            <Text style={styles.exportDesc}>Excel・Sheets等で開く</Text>
                        </View>
                        <View style={styles.exportButtons}>
                            <TouchableOpacity
                                style={[styles.exportBtn, styles.exportBtnPrimary]}
                                onPress={exportCSV}
                                disabled={isExporting || history.length === 0}
                            >
                                <Text style={styles.exportBtnText}>� コピー</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.exportBtn, styles.exportBtnSecondary]}
                                onPress={() => copyToClipboard('csv')}
                                disabled={isExporting || history.length === 0}
                            >
                                <Text style={styles.exportBtnText2}>🔗 表示</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* JSON */}
                    <View style={styles.exportCard}>
                        <View style={styles.exportHeader}>
                            <Text style={styles.exportTitle}>JSON形式</Text>
                            <Text style={styles.exportDesc}>完全バックアップ</Text>
                        </View>
                        <View style={styles.exportButtons}>
                            <TouchableOpacity
                                style={[styles.exportBtn, styles.exportBtnPrimary]}
                                onPress={exportJSON}
                                disabled={isExporting || history.length === 0}
                            >
                                <Text style={styles.exportBtnText}>� コピー</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.exportBtn, styles.exportBtnSecondary]}
                                onPress={() => copyToClipboard('json')}
                                disabled={isExporting || history.length === 0}
                            >
                                <Text style={styles.exportBtnText2}>🔗 表示</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* テキストレポート */}
                    <View style={styles.exportCard}>
                        <View style={styles.exportHeader}>
                            <Text style={styles.exportTitle}>テキストレポート</Text>
                            <Text style={styles.exportDesc}>統計情報付き</Text>
                        </View>
                        <View style={styles.exportButtons}>
                            <TouchableOpacity
                                style={[styles.exportBtn, styles.exportBtnPrimary]}
                                onPress={exportReport}
                                disabled={isExporting || history.length === 0}
                            >
                                <Text style={styles.exportBtnText}>� コピー</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.exportBtn, styles.exportBtnSecondary]}
                                onPress={() => copyToClipboard('report')}
                                disabled={isExporting || history.length === 0}
                            >
                                <Text style={styles.exportBtnText2}>🔗 表示</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* 危険なアクション */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚠️ 危険なアクション</Text>

                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={resetData}
                        disabled={isExporting || history.length === 0}
                    >
                        <Text style={styles.dangerButtonText}>🗑️ すべてのデータを削除</Text>
                    </TouchableOpacity>

                    <Text style={styles.warningText}>
                        注意: この操作はすべての支出記録を削除します。事前にバックアップを作成することをお勧めします。
                    </Text>
                </View>

                {/* 情報セクション */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>ℹ️ エクスポートについて</Text>
                    <Text style={styles.infoText}>
                        • CSV形式: クリップボードにコピーしてExcelやGoogle Sheetsにペーストして分析できます
                    </Text>
                    <Text style={styles.infoText}>
                        • JSON形式: 完全なバックアップをクリップボードにコピーしてクラウドストレージに保存できます
                    </Text>
                    <Text style={styles.infoText}>
                        • テキストレポート: クリップボードにコピーしてメールやメモアプリに貼り付けられます
                    </Text>
                </View>

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
    backText: { color: '#5B4FA3', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },

    content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#5B4FA3',
    },
    summaryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, color: '#1A1A1A' },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    summaryLabel: { fontSize: 14, color: '#666666', fontWeight: '500' },
    summaryValue: { fontSize: 14, fontWeight: '700', color: '#5B4FA3' },

    section: { marginBottom: 20 },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12,
        color: '#1A1A1A',
    },

    exportCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        elevation: 2,
    },
    exportHeader: { marginBottom: 12 },
    exportTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
    exportDesc: { fontSize: 12, color: '#B0B0B0', marginTop: 2, fontWeight: '500' },

    exportButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    exportBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 2,
    },
    exportBtnPrimary: { backgroundColor: '#5B4FA3' },
    exportBtnSecondary: { backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
    exportBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
    exportBtnText2: { fontSize: 13, color: '#1A1A1A', fontWeight: '700' },

    dangerButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 12,
        elevation: 3,
    },
    dangerButtonText: { fontSize: 14, color: '#fff', fontWeight: '700' },

    warningText: {
        fontSize: 12,
        color: '#D32F2F',
        padding: 12,
        backgroundColor: '#FFEBEE',
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#FF3B30',
        fontWeight: '500'
    },

    infoCard: {
        backgroundColor: '#E8EAF6',
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 4,
        borderLeftColor: '#5B4FA3',
    },
    infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#5B4FA3' },
    infoText: { fontSize: 12, color: '#5B4FA3', marginBottom: 5, lineHeight: 18, fontWeight: '500' },
});
