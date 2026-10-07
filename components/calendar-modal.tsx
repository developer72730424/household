import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { formatMonthJapanese, shiftMonth } from '@/utils/entries';

interface CalendarModalProps {
    visible: boolean;
    value: Date | null;          // 選択中の日付（なければ今日の月を開く）
    onSelect: (d: Date) => void;
    onClose: () => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// 月のカレンダーを 7 列 × 6 行で作る（空きは null）
function buildWeeks(month: Date): (Date | null)[][] {
    const year = month.getFullYear();
    const m = month.getMonth();
    const days: (Date | null)[] = [];
    for (let i = 0; i < new Date(year, m, 1).getDay(); i++) days.push(null);
    for (let d = 1; d <= new Date(year, m + 1, 0).getDate(); d++) days.push(new Date(year, m, d));
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
        const row = days.slice(i, i + 7);
        while (row.length < 7) row.push(null);
        rows.push(row);
    }
    while (rows.length < 6) rows.push(new Array(7).fill(null));
    return rows;
}

const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function CalendarModal({ visible, value, onSelect, onClose }: CalendarModalProps) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [month, setMonth] = useState(() => new Date((value ?? new Date()).getFullYear(), (value ?? new Date()).getMonth(), 1));

    // 開くたびに、選択中の日付の月（なければ今月）から始める
    useEffect(() => {
        if (visible) {
            const base = value ?? new Date();
            setMonth(new Date(base.getFullYear(), base.getMonth(), 1));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const weeks = useMemo(() => buildWeeks(month), [month]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setMonth(m => shiftMonth(m, -1))} style={styles.navBtn} accessibilityLabel="前の月">
                            <Text style={styles.navText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{formatMonthJapanese(month)}</Text>
                        <TouchableOpacity onPress={() => setMonth(m => shiftMonth(m, 1))} style={styles.navBtn} accessibilityLabel="次の月">
                            <Text style={styles.navText}>›</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.weekRow}>
                        {WEEKDAYS.map(w => <Text key={w} style={styles.weekday}>{w}</Text>)}
                    </View>

                    {weeks.map((week, wi) => (
                        <View key={wi} style={styles.weekRow}>
                            {week.map((d, di) => {
                                const selected = !!d && !!value && sameDay(d, value);
                                return (
                                    <TouchableOpacity
                                        key={di}
                                        style={[styles.dayCell, selected && styles.dayCellSelected]}
                                        onPress={() => d && onSelect(d)}
                                        disabled={!d}
                                    >
                                        <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{d ? d.getDate() : ''}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
                            <Text style={styles.footerBtnText}>キャンセル</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: { width: '100%', maxWidth: 520, backgroundColor: c.card, borderRadius: 12, padding: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    navBtn: { paddingHorizontal: 14, paddingVertical: 8 },
    navText: { color: c.text, fontSize: 20 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    weekday: { width: 36, textAlign: 'center', color: c.textMuted, fontWeight: '700' },
    dayCell: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    dayCellSelected: { backgroundColor: c.primary },
    dayText: { color: c.text },
    dayTextSelected: { color: '#fff', fontWeight: '700' },
    footer: { marginTop: 8, alignItems: 'flex-end' },
    footerBtn: { paddingHorizontal: 12, paddingVertical: 8 },
    footerBtnText: { color: c.primaryText, fontWeight: '700' },
});
