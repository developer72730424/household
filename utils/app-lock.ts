// アプリのロック（Face ID / パスコード）。いつロックするかの判定。
// 起動直後と、バックグラウンドから戻ったとき、離れていた時間が猶予を超えていればロックする。

export const LOCK_GRACE_SECONDS = 30; // 短い切り替え（通知を見るなど）では、ロックし直さない

export function shouldLockOnResume(args: { enabled: boolean; leftAt: number | null; now: number; graceSeconds?: number }): boolean {
    const { enabled, leftAt, now, graceSeconds = LOCK_GRACE_SECONDS } = args;
    if (!enabled) return false;
    // 離れた時刻が分からない場合は、安全のためロックする
    if (leftAt === null) return true;
    return now - leftAt >= graceSeconds * 1000;
}

// 起動直後はロックが有効なら必ずロックする
export const shouldLockOnLaunch = (enabled: boolean): boolean => enabled;
