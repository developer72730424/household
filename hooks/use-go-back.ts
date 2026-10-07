import { useRouter } from 'expo-router';
import { useCallback } from 'react';

// 前の画面へ戻る。履歴が無いとき（通知やリンクから直接開いたとき）はホームへ
export function useGoBack() {
    const router = useRouter();
    return useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }, [router]);
}
