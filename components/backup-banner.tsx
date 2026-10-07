import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';

interface BackupBannerProps {
    hasBackedUpBefore: boolean;
    onBackup: () => void;
    onLater: () => void;
}

// データは端末の中にしかないので、しばらくバックアップしていないときにホームで案内する
export default function BackupBanner({ hasBackedUpBefore, onBackup, onLater }: BackupBannerProps) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    return (
        <View style={styles.banner}>
            <Text style={styles.title}>💾 バックアップをおすすめします</Text>
            <Text style={styles.body}>
                {hasBackedUpBefore
                    ? '前回のバックアップから日がたっています。'
                    : 'まだバックアップがありません。'}
                データはこの端末にだけ保存されているので、機種変更や故障に備えて保存しておきましょう。
            </Text>
            <View style={styles.buttons}>
                <TouchableOpacity style={[styles.btn, styles.primary]} onPress={onBackup}>
                    <Text style={styles.primaryText}>バックアップする</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={onLater}>
                    <Text style={styles.secondaryText}>あとで</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    banner: {
        backgroundColor: c.tintBg,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 14,
        borderRadius: 14,
        borderLeftWidth: 4,
        borderLeftColor: c.warning,
    },
    title: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 4 },
    body: { fontSize: 12, color: c.textSecondary, lineHeight: 18, marginBottom: 10 },
    buttons: { flexDirection: 'row', gap: 10 },
    btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    primary: { backgroundColor: c.primary },
    primaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    secondary: { backgroundColor: c.chip },
    secondaryText: { color: c.textSecondary, fontWeight: '600', fontSize: 13 },
});
