import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppDataProvider, useAppData } from '@/context/app-data';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
    anchor: 'index',
};

function Shell() {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const insets = useSafeAreaInsets();
    const { loaded } = useAppData();

    // Web: ブラウザのタブ名
    useEffect(() => {
        if (typeof document !== 'undefined') document.title = 'シンプル家計簿';
    }, []);

    return (
        <View style={styles.root}>
            {/* 全画面共通のアプリヘッダー。上の余白は端末のノッチ・ステータスバーの高さに合わせる */}
            <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 44 }]}>
                <Text style={styles.title}>シンプル家計簿</Text>
            </View>

            {/* 保存データの読み込みが終わるまで画面を出さない（空の状態を一瞬見せて誤操作されるのを防ぐ） */}
            {loaded && (
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />
            )}
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
