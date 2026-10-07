import { useSafeAreaInsets } from 'react-native-safe-area-context';

// アプリ共通ヘッダー（app/_layout.tsx）の本体部分の高さ。上の余白（ノッチ等）は含まない
export const HEADER_CONTENT_HEIGHT = 44;

// 共通ヘッダー全体の高さ。KeyboardAvoidingView の keyboardVerticalOffset に渡すと、
// ヘッダーの下にある画面でもキーボードの分だけ正しく持ち上がる
export function useHeaderHeight(): number {
    const insets = useSafeAreaInsets();
    return insets.top + HEADER_CONTENT_HEIGHT;
}
