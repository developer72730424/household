import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';

interface UndoSnackbarProps {
    message: string | null;     // null のときは表示しない
    onUndo: () => void;
    onDismiss: () => void;      // 時間切れ・閉じたとき
    durationMs?: number;
    bottom?: number;
}

// 削除などの直後に、数秒間だけ「元に戻す」を出す
export default function UndoSnackbar({ message, onUndo, onDismiss, durationMs = 5000, bottom = 24 }: UndoSnackbarProps) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);

    // メッセージが変わるたびに表示時間を数え直す
    useEffect(() => {
        if (message === null) return;
        const timer = setTimeout(onDismiss, durationMs);
        return () => clearTimeout(timer);
    }, [message, durationMs, onDismiss]);

    if (message === null) return null;
    return (
        <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
            <View style={styles.bar}>
                <Text style={styles.text} numberOfLines={1}>{message}</Text>
                <TouchableOpacity onPress={onUndo} style={styles.undoBtn} accessibilityLabel="元に戻す">
                    <Text style={styles.undoText}>元に戻す</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 50 },
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.inverseBg,
        borderRadius: 12,
        paddingLeft: 16,
        paddingRight: 6,
        paddingVertical: 4,
        maxWidth: 520,
        width: '100%',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    text: { flex: 1, color: c.inverseText, fontSize: 14, fontWeight: '500' },
    undoBtn: { paddingHorizontal: 14, paddingVertical: 12 },
    undoText: { color: c.inverseAccent, fontWeight: '800', fontSize: 14 },
});
