import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { buildBackup, parseBackup, type AppSnapshot, type ParsedBackup } from '@/utils/backup';
import { expenseByCategory, formatDisplayDate, sortEntries, summarize, type Entry } from '@/utils/entries';

interface ExportProps {
    entries: Entry[];
    categories: string[];
    lastBackupAt: string | null;
    getSnapshot: () => AppSnapshot;
    onBack: () => void;
    onResetData: () => Promise<void>;
    onRestore: (parsed: Extract<ParsedBackup, { ok: true }>) => Promise<void>;
    onBackedUp: () => void;
}

const formatBackupTime = (iso: string | null): string => {
    if (!iso) return 'まだありません';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'まだありません';
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

export default function Export({ entries, categories, lastBackupAt, getSnapshot, onBack, onResetData, onRestore, onBackedUp }: ExportProps) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [isExporting, setIsExporting] = useState(false);
    const [restoreText, setRestoreText] = useState('');

    const { income: totalIncome, expense: totalExpense } = useMemo(() => summarize(entries), [entries]);

    // CSVのセルをエスケープ（カンマ・改行・ダブルクォートを含む場合）
    const escapeCSV = (value: string): string => {
        if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
        return value;
    };

    // CSV（日付の新しい順）。日付は YYYY-MM-DD なので表計算ソフトで並び替えしやすい
    const generateCSV = (): string => {
        const headers = ['日付', '種別', '品目', 'カテゴリ', '金額'];
        const rows = sortEntries(entries).map((e) => [
            e.date, e.type === 'income' ? '収入' : '支出', e.item, e.category, String(e.amount),
        ]);
        return [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n');
    };

    // JSON: 履歴・カテゴリ・テンプレート・固定費・予算をまとめた完全バックアップ
    const generateJSON = (): string => JSON.stringify(buildBackup(getSnapshot()), null, 2);

    // テキストレポート
    const generateReport = (): string => {
        const categoryTotals = expenseByCategory(entries);
        let report = `家計簿レポート\n`;
        report += `===============================\n`;
        report += `エクスポート日時: ${new Date().toLocaleString('ja-JP')}\n`;
        report += `\n`;
        report += `【概要】\n`;
        report += `総収入額: ¥${totalIncome.toLocaleString()}\n`;
        report += `総支出額: ¥${totalExpense.toLocaleString()}\n`;
        report += `収支: ${totalIncome - totalExpense < 0 ? '-' : ''}¥${Math.abs(totalIncome - totalExpense).toLocaleString()}\n`;
        report += `記録数: ${entries.length}件\n`;
        report += `\n`;
        report += `【カテゴリ別支出】\n`;
        categoryTotals.forEach(({ name, amount }) => {
            const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
            report += `  ${name}: ¥${amount.toLocaleString()} (${percentage}%)\n`;
        });
        report += `\n`;
        report += `【詳細な履歴】\n`;
        report += `日付, 種別, 品目, 金額, カテゴリ\n`;
        sortEntries(entries).forEach((e) => {
            report += `${formatDisplayDate(e.date)}, ${e.type === 'income' ? '収入' : '支出'}, ${e.item}, ¥${e.amount.toLocaleString()}, ${e.category}\n`;
        });
        return report;
    };

    // 共有シートでエクスポート（メモ・メール・AirDrop・ファイル保存などへ渡せる）
    const shareData = async (format: 'csv' | 'json' | 'report') => {
        const generators = { csv: generateCSV, json: generateJSON, report: generateReport };
        const titles = { csv: '家計簿データ（CSV）', json: '家計簿バックアップ（JSON）', report: '家計簿レポート' };
        try {
            setIsExporting(true);
            const result = await Share.share({ message: generators[format](), title: titles[format] });
            // バックアップとして共有を完了したときだけ「最終バックアップ」を更新する
            if (format === 'json' && result.action === Share.sharedAction) onBackedUp();
        } catch (error) {
            Alert.alert('エラー', 'エクスポートに失敗しました');
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    // JSONバックアップを検証して復元
    const restoreFromJSON = () => {
        const parsed = parseBackup(restoreText);
        if (!parsed.ok) {
            Alert.alert('復元エラー', parsed.error);
            return;
        }
        const skippedNote = parsed.skipped > 0 ? `\n（読み取れない記録${parsed.skipped}件は除きます）` : '';
        Alert.alert(
            'データ復元',
            `${parsed.entries.length}件の記録で現在のデータ（${entries.length}件）を置き換えます。よろしいですか？${skippedNote}`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '復元',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await onRestore(parsed);
                            setRestoreText('');
                            Alert.alert('完了', 'データを復元しました。');
                        } catch {
                            Alert.alert('エラー', 'データの復元に失敗しました');
                        }
                    },
                },
            ],
        );
    };

    // データをリセット
    const resetData = () => {
        Alert.alert('データ削除', 'すべての収支データを削除しますか？この操作は戻せません。先にバックアップを作成することをお勧めします。', [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: '削除',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await onResetData();
                        Alert.alert('完了', 'データが削除されました。');
                    } catch {
                        Alert.alert('エラー', 'データの削除に失敗しました');
                    }
                },
            },
        ]);
    };

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
                        <Text style={styles.summaryValue}>{entries.length}件</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>総収入額:</Text>
                        <Text style={styles.summaryValue}>¥{totalIncome.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>総支出額:</Text>
                        <Text style={styles.summaryValue}>¥{totalExpense.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>カテゴリ数:</Text>
                        <Text style={styles.summaryValue}>{categories.length}個</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>最終バックアップ:</Text>
                        <Text style={styles.summaryValue}>{formatBackupTime(lastBackupAt)}</Text>
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
                                onPress={() => shareData('csv')}
                                disabled={isExporting || entries.length === 0}
                            >
                                <Text style={styles.exportBtnText}>📤 共有・保存</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* JSON */}
                    <View style={styles.exportCard}>
                        <View style={styles.exportHeader}>
                            <Text style={styles.exportTitle}>JSON形式</Text>
                            <Text style={styles.exportDesc}>完全バックアップ（記録・カテゴリ・固定費・予算）</Text>
                        </View>
                        <View style={styles.exportButtons}>
                            <TouchableOpacity
                                style={[styles.exportBtn, styles.exportBtnPrimary]}
                                onPress={() => shareData('json')}
                                disabled={isExporting || entries.length === 0}
                            >
                                <Text style={styles.exportBtnText}>📤 共有・保存</Text>
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
                                onPress={() => shareData('report')}
                                disabled={isExporting || entries.length === 0}
                            >
                                <Text style={styles.exportBtnText}>📤 共有・保存</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* 復元セクション */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📥 バックアップから復元</Text>
                    <View style={styles.exportCard}>
                        <Text style={styles.exportDesc}>JSON形式で共有したバックアップを貼り付けてください</Text>
                        <TextInput
                            style={styles.restoreInput}
                            multiline
                            placeholder='{"exportDate": ... }'
                            placeholderTextColor={c.textMuted}
                            value={restoreText}
                            onChangeText={setRestoreText}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            style={[styles.exportBtn, styles.exportBtnPrimary, !restoreText.trim() && { opacity: 0.5 }]}
                            onPress={restoreFromJSON}
                            disabled={!restoreText.trim()}
                        >
                            <Text style={styles.exportBtnText}>復元する</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 危険なアクション */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚠️ 危険なアクション</Text>

                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={resetData}
                        disabled={isExporting || entries.length === 0}
                    >
                        <Text style={styles.dangerButtonText}>🗑️ すべてのデータを削除</Text>
                    </TouchableOpacity>

                    <Text style={styles.warningText}>
                        注意: この操作はすべての収支記録を削除します。事前にバックアップを作成することをお勧めします。
                    </Text>
                </View>

                {/* 情報セクション */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>ℹ️ エクスポートについて</Text>
                    <Text style={styles.infoText}>
                        • CSV形式: 共有メニューからメモやファイルに保存し、ExcelやGoogle Sheetsで分析できます
                    </Text>
                    <Text style={styles.infoText}>
                        • JSON形式: 完全なバックアップです。保存した内容を「バックアップから復元」に貼り付けると元に戻せます
                    </Text>
                    <Text style={styles.infoText}>
                        • テキストレポート: 共有メニューからメールやメモアプリに送れます
                    </Text>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    restoreInput: {
        minHeight: 100,
        maxHeight: 200,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 8,
        padding: 10,
        marginVertical: 10,
        fontSize: 12,
        textAlignVertical: 'top',
        backgroundColor: c.background,
        color: c.text,
    },
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
    backText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: '700', color: c.text },

    content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

    summaryCard: {
        backgroundColor: c.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#5B4FA3',
    },
    summaryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, color: c.text },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    summaryLabel: { fontSize: 14, color: c.textSecondary, fontWeight: '500' },
    summaryValue: { fontSize: 14, fontWeight: '700', color: c.primaryText },

    section: { marginBottom: 20 },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12,
        color: c.text,
    },

    exportCard: {
        backgroundColor: c.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        elevation: 2,
    },
    exportHeader: { marginBottom: 12 },
    exportTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    exportDesc: { fontSize: 12, color: c.textMuted, marginTop: 2, fontWeight: '500' },

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
    exportBtnSecondary: { backgroundColor: c.chip, borderWidth: 1, borderColor: c.border },
    exportBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
    exportBtnText2: { fontSize: 13, color: c.text, fontWeight: '700' },

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
        backgroundColor: c.dangerBg,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#FF3B30',
        fontWeight: '500'
    },

    infoCard: {
        backgroundColor: c.tintBg,
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 4,
        borderLeftColor: '#5B4FA3',
    },
    infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: c.primaryText },
    infoText: { fontSize: 12, color: c.primaryText, marginBottom: 5, lineHeight: 18, fontWeight: '500' },
});
