import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppDataProvider, useAppData } from '@/context/app-data';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import LockScreen from '@/components/lock-screen';
import { shouldLockOnLaunch, shouldLockOnResume } from '@/utils/app-lock';
import { applyReminder } from '@/utils/notifications';
import { cleanupOrphanReceipts } from '@/utils/receipt-files';
import { HEADER_CONTENT_HEIGHT } from '@/hooks/use-header-height';

export const unstable_settings = {
    anchor: 'index',
};

function Shell() {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const insets = useSafeAreaInsets();
    const { loaded, reminder, appLock, entries } = useAppData();

    // どの記録からも使われていないレシート写真を、起動時に掃除する（削除を取り消せる間は残るので、次回の起動で消える）
    const cleaned = useRef(false);
    useEffect(() => {
        if (!loaded || cleaned.current) return;
        cleaned.current = true;
        try {
            cleanupOrphanReceipts(entries.map(e => e.photo));
        } catch (e) {
            console.warn('写真の掃除に失敗しました', e);
        }
    }, [loaded, entries]);

    // アプリのロック: 起動直後と、一定時間離れて戻ったときにロック画面を出す
    const [locked, setLocked] = useState(true); // 設定を読み込むまでは安全側（ロック）で始める
    const leftAt = useRef<number | null>(null);
    const launchHandled = useRef(false);
    const unlock = useCallback(() => setLocked(false), []);

    useEffect(() => {
        if (!loaded || launchHandled.current) return;
        launchHandled.current = true;
        setLocked(shouldLockOnLaunch(appLock));
    }, [loaded, appLock]);

    // ロックをオフにしたら、ロック画面も外す
    useEffect(() => {
        if (loaded && !appLock) setLocked(false);
    }, [loaded, appLock]);

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'background' || state === 'inactive') {
                // 認証ダイアログ（Face ID）が出ている間も inactive になるので、最初の離脱の時刻だけ覚える
                if (leftAt.current === null) leftAt.current = Date.now();
            } else if (state === 'active') {
                if (shouldLockOnResume({ enabled: appLock, leftAt: leftAt.current, now: Date.now() })) setLocked(true);
                leftAt.current = null;
            }
        });
        return () => sub.remove();
    }, [appLock]);

    // Web: ブラウザのタブ名
    useEffect(() => {
        if (typeof document !== 'undefined') document.title = 'シンプル家計簿';
    }, []);

    // 起動のたびに、設定どおりの通知が登録されている状態に整える（OS の更新や再インストールで消えていても戻る）
    useEffect(() => {
        if (!loaded) return;
        applyReminder(reminder).catch((e) => console.warn('通知の登録に失敗しました', e));
    }, [loaded, reminder]);

    return (
        <View style={styles.root}>
            {/* 全画面共通のアプリヘッダー。上の余白は端末のノッチ・ステータスバーの高さに合わせる */}
            <View style={[styles.header, { paddingTop: insets.top, height: insets.top + HEADER_CONTENT_HEIGHT }]}>
                <Text style={styles.title}>シンプル家計簿</Text>
            </View>

            {/* 保存データの読み込みが終わるまで画面を出さない（空の状態を一瞬見せて誤操作されるのを防ぐ） */}
            {loaded && (
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />
            )}

            {/* ロック中は、記録が見えないよう画面全体を覆う */}
            {loaded && appLock && locked && <LockScreen onUnlock={unlock} />}
        </View>
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AppDataProvider>
                <Shell />
            </AppDataProvider>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: {
        backgroundColor: c.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
});
