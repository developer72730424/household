/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// ✨ プライマリカラー（メインカラー）
const primaryLight = '#5B4FA3';
const primaryDark = '#7C63D8';

// ✨ セカンダリカラー（アクセントカラー）
const secondaryLight = '#00C7BE';
const secondaryDark = '#00D9CE';

// ✨ サポートカラー
const successColor = '#34C759';
const warningColor = '#FF9500';
const dangerColor = '#FF3B30';

export const Colors = {
  light: {
    text: '#1A1A1A',
    textSecondary: '#666666',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    tint: primaryLight,
    primary: primaryLight,
    secondary: secondaryLight,
    success: successColor,
    warning: warningColor,
    danger: dangerColor,
    icon: '#666666',
    iconSecondary: '#CCCCCC',
    tabIconDefault: '#666666',
    tabIconSelected: primaryLight,
    border: '#E0E0E0',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    background: '#121212',
    surface: '#1E1E1E',
    tint: primaryDark,
    primary: primaryDark,
    secondary: secondaryDark,
    success: successColor,
    warning: warningColor,
    danger: dangerColor,
    icon: '#B0B0B0',
    iconSecondary: '#555555',
    tabIconDefault: '#B0B0B0',
    tabIconSelected: primaryDark,
    border: '#333333',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
