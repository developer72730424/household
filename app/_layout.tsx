import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
  const colorScheme = useColorScheme();

  // Web-only: set page title and perform a single, safe replacement of stray 'home'/'index' text
  useEffect(() => {
    if (typeof document === 'undefined') return;
    try {
      // set the browser tab title
      document.title = 'シンプル家計簿';

      // replace simple exact occurrences in leaf text nodes (non-destructive)
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('body *'));
      for (const n of nodes) {
        try {
          if (!n || !n.textContent) continue;
          const raw = n.textContent.trim();
          if (/^(home|index)$/i.test(raw)) {
            n.textContent = 'シンプル家計簿';
            n.style.display = 'inline-block';
          }
        } catch {
          // ignore individual node errors
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <>
      {/* Global header: restore a lightweight app header so pages don't shift layout when native header is hidden */}
      <View style={styles.header}>
        <Text style={styles.title}>シンプル家計簿</Text>
      </View>

      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Keep native headers hidden so pages can render their own inner header when needed. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </>
  );
}

const createStyles = (c: AppColors) => StyleSheet.create({
  header: {
    height: Platform.OS === 'web' ? 50 : (Platform.OS === 'ios' ? 88 : 64),
    paddingTop: Platform.OS === 'web' ? 8 : (Platform.OS === 'ios' ? 44 : 20),
    backgroundColor: c.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
    title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: c.text,
  },
});
