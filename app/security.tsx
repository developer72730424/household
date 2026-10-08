import React from 'react';

import Security from '@/components/screens/Security';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';
import { authenticate, canAuthenticate } from '@/utils/biometrics';

export default function SecurityRoute() {
    const { appLock, setAppLock } = useAppData();

    const toggle = async (next: boolean): Promise<{ ok: true } | { ok: false; message: string }> => {
        if (next) {
            // 端末に認証手段（パスコードなど）が無いと、ロックしたあと自分も開けなくなるので、オンにさせない
            if (!(await canAuthenticate())) {
                return { ok: false, message: 'この端末にパスコード（または Face ID / Touch ID）が設定されていません。端末の設定で設定してから、もう一度お試しください。' };
            }
        }
        // オンにするときも、オフにするときも、本人確認を通ってから切り替える
        if (!(await authenticate(next ? 'ロックをオンにします' : 'ロックをオフにします'))) {
            return { ok: false, message: '本人確認ができなかったため、変更しませんでした。' };
        }
        setAppLock(next);
        return { ok: true };
    };

    return <Security enabled={appLock} onToggle={toggle} onBack={useGoBack()} />;
}
