import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? 'light';

  return (
    // ライト/ダークともに白背景を指定し、外側のコンテナで完全に白く覆う
    <ThemedView lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.container}>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

        <ThemedText lightColor="#1A1A1A" darkColor="#1A1A1A" type="defaultSemiBold" style={styles.titleText}>{title}</ThemedText>
      </TouchableOpacity>
      {isOpen && (
        // 折りたたみ内の領域も白背景でラップして黒領域が見えないようにする
        <ThemedView lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.content}>
          {children}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 6,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // ヘッダーは外側コンテナが白なので透明にする
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  titleText: {
    marginLeft: 8,
    color: '#1A1A1A',
  },
  content: {
    marginTop: 6,
    // 左余白をなくして中身が右に寄らないようにする
    marginLeft: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
