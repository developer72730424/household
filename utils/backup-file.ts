// バックアップのファイル名と、読み込んだファイルの検査（React Native に依存しない部分）。

const pad = (n: number) => String(n).padStart(2, '0');

// 例: household-backup-2026-10-08.json（同じ日に何度も作ると上書き）
export function backupFileName(now: Date = new Date()): string {
    return `household-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// 家計簿のバックアップより明らかに大きいファイル（誤って選んだ動画など）は読み込まない
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export function checkPickedFile(file: { name?: string | null; size?: number | null }): { ok: true } | { ok: false; message: string } {
    if (typeof file.size === 'number' && file.size > MAX_BACKUP_BYTES) {
        return { ok: false, message: 'ファイルが大きすぎます。家計簿のバックアップ（JSON）を選んでください。' };
    }
    if (file.name && !/\.(json|txt)$/i.test(file.name)) {
        return { ok: false, message: 'JSONファイル（.json）を選んでください。' };
    }
    return { ok: true };
}
