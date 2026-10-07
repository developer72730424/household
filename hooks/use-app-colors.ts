import { useColorScheme } from '@/hooks/use-color-scheme';

// 画面のスタイルで使う配色。ライト/ダークで同じキーを持ちます
export interface AppColors {
    background: string;   // 画面背景
    card: string;         // カード・入力エリア背景
    text: string;         // 本文
    textSecondary: string;
    textMuted: string;    // 補足・プレースホルダー
    border: string;
    chip: string;         // 未選択ボタン・トラックなどの薄い背景
    inputBg: string;
    primary: string;      // ボタン背景などのブランド色
    primaryText: string;  // 背景上に置くブランド色の文字（ダークでは明るめ）
    success: string;
    warning: string;
    danger: string;
    dangerBg: string;     // 警告ボックスの背景
    tintBg: string;       // ブランド色の薄い背景
    chartRgb: string;     // チャートの線・文字色（rgba() に埋め込む "r,g,b"）
    chartLabelRgb: string;
}

export const AppPalette: { light: AppColors; dark: AppColors } = {
    light: {
        background: '#F8F9FA',
        card: '#FFFFFF',
        text: '#1A1A1A',
        textSecondary: '#666666',
        textMuted: '#999999',
        border: '#E0E0E0',
        chip: '#F0F0F0',
        inputBg: '#F8F9FA',
        primary: '#5B4FA3',
        primaryText: '#5B4FA3',
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
        dangerBg: '#FFEBEE',
        tintBg: '#E8EAF6',
        chartRgb: '26,26,26',
        chartLabelRgb: '100,100,100',
    },
    dark: {
        background: '#121212',
        card: '#1E1E1E',
        text: '#F2F2F2',
        textSecondary: '#B0B0B0',
        textMuted: '#808080',
        border: '#333333',
        chip: '#2C2C2E',
        inputBg: '#2A2A2A',
        primary: '#6A5BC4',
        primaryText: '#A99BF0',
        success: '#30D158',
        warning: '#FF9F0A',
        danger: '#FF453A',
        dangerBg: '#3A1F1F',
        tintBg: '#2A2640',
        chartRgb: '242,242,242',
        chartLabelRgb: '176,176,176',
    },
};

export function useAppColors(): AppColors {
    const scheme = useColorScheme();
    return AppPalette[scheme === 'dark' ? 'dark' : 'light'];
}
