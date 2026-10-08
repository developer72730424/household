import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';

interface Props {
    enabled: boolean;
    // オンにするときは端末の認証が使えるか確かめ、本人確認を通ってから保存する。結果の説明を返す
    onToggle: (next: boolean) => Promise<{ ok: true } | { ok: false; message: string }>;
    onBack: () => void;
}

export default function Security({ enabled, onToggle, onBack }: Props) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [busy, setBusy] = useState(false);

    const toggle = async () => {
        setBusy(true);
        try {
            const result = await onToggle(!enabled);
            if (!result.ok) Alert.alert('設定できませんでした', result.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← 戻る</Text></TouchableOpacity>
                <Text style={styles.title}>アプリのロック</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Face ID / パスコードでロック</Text>
                        <Text style={styles.desc}>アプリを開くとき、しばらく離れて戻ったときに、本人確認を求めます。</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.toggle, enabled && styles.toggleOn]}
                        onPress={() => void toggle()}
                        disabled={busy}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: enabled }}
                        accessibilityLabel="アプリのロック"
                        activeOpacity={0.8}
                    >
                        <View style={[styles.knob, enabled && styles.knobOn]} />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.note}>
                本人確認には、端末の Face ID・Touch ID、または端末のパスコードを使います。このアプリがパスコードを保存することはありません。
                {'\n'}30秒以内にアプリへ戻ったときは、続けて使えるようにロックし直しません。
            </Text>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === 'ios' ? 12 : 8 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
    backText: { color: c.primaryText, fontWeight: '600', fontSize: 15 },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    card: { backgroundColor: c.card, marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    label: { fontSize: 15, fontWeight: '700', color: c.text },
    desc: { fontSize: 12, color: c.textSecondary, marginTop: 3, lineHeight: 17 },
    toggle: { width: 52, height: 32, borderRadius: 16, backgroundColor: c.border, justifyContent: 'center', paddingHorizontal: 3 },
    toggleOn: { backgroundColor: c.primary },
    knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignSelf: 'flex-start' },
    knobOn: { alignSelf: 'flex-end' },
    note: { marginHorizontal: 20, marginTop: 14, fontSize: 12, color: c.textMuted, lineHeight: 18 },
});
