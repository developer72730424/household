// Face ID / Touch ID / 端末のパスコードでの認証。
import * as LocalAuthentication from 'expo-local-authentication';

// この端末で認証が使えるか（生体認証またはパスコードが設定されているか）
export async function canAuthenticate(): Promise<boolean> {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
}

export async function authenticate(reason: string): Promise<boolean> {
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: reason,
            cancelLabel: 'キャンセル',
            fallbackLabel: 'パスコードを入力',
            // 生体認証が使えない・失敗したときは、端末のパスコードで解除できる
            disableDeviceFallback: false,
        });
        return result.success;
    } catch {
        return false;
    }
}
