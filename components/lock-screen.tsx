import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { authenticate } from '@/utils/biometrics';

interface Props {
    onUnlock: () => void;
}

// ロック中に全面に出す画面。開いた直後に自動で認証を始め、失敗・キャンセルしたら「ロックを解除」ボタンでやり直せる
export default function LockScreen({ onUnlock }: Props) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [failed, setFailed] = useState(false);
    const running = useRef(false);

    const tryUnlock = useCallback(async () => {
        if (running.current) return; // 認証ダイアログが開いている間は重ねて開かない
        running.current = true;
        setFailed(false);
        const ok = await authenticate('家計簿のロックを解除');
        running.current = false;
        if (ok) onUnlock();
        else setFailed(true);
    }, [onUnlock]);

    useEffect(() => {
        void tryUnlock();
    }, [tryUnlock]);

    return (
        <View style={styles.container} accessibilityViewIsModal>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.title}>シンプル家計簿</Text>
            <Text style={styles.desc}>{failed ? '認証できませんでした' : 'ロックされています'}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => void tryUnlock()} accessibilityLabel="ロックを解除">
                <Text style={styles.btnText}>ロックを解除</Text>
            </TouchableOpacity>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    // 中身が透けて見えないよう、画面全体を不透明な背景で覆う
    container: { ...StyleSheet.absoluteFillObject, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
    lockIcon: { fontSize: 56, marginBottom: 12 },
    title: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 6 },
    desc: { fontSize: 14, color: c.textSecondary, marginBottom: 24 },
    btn: { backgroundColor: c.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
