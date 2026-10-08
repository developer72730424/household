// レシート写真のファイル操作（端末のアプリ専用フォルダに保存する）。
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { isValidReceiptFileName, orphanReceipts, receiptFileName } from './receipt-photo';

const receiptsDir = () => new Directory(Paths.document, 'receipts');

function ensureDir(): Directory {
    const dir = receiptsDir();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    return dir;
}

export type PickResult = { ok: true; uri: string } | { ok: false; reason: 'cancelled' | 'denied' };

// 撮影する / 写真から選ぶ。許可が得られなければ 'denied'
export async function pickReceipt(source: 'camera' | 'library'): Promise<PickResult> {
    const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied' };
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return { ok: false, reason: 'cancelled' };
    return { ok: true, uri: result.assets[0].uri };
}

// 選んだ画像をアプリのフォルダへコピーし、保存したファイル名を返す
export function saveReceipt(sourceUri: string, entryId: string): string {
    const ext = (sourceUri.split('.').pop() ?? 'jpg').split('?')[0];
    const name = receiptFileName(`${entryId}_${Date.now().toString(36)}`, ext);
    const dest = new File(ensureDir(), name);
    new File(sourceUri).copy(dest);
    return name;
}

// 保存済みの写真の表示用 URI。ファイルが無ければ null（バックアップを別の端末で復元したときなど）
export function receiptUri(name: string | undefined): string | null {
    if (!name || !isValidReceiptFileName(name)) return null;
    const file = new File(receiptsDir(), name);
    return file.exists ? file.uri : null;
}

export function deleteReceipt(name: string | undefined): void {
    if (!name || !isValidReceiptFileName(name)) return;
    const file = new File(receiptsDir(), name);
    if (file.exists) file.delete();
}

// どの記録からも使われていない写真を消す（削除を取り消せる間は残し、次回の起動時に掃除する）
export function cleanupOrphanReceipts(referenced: (string | undefined)[]): number {
    const dir = receiptsDir();
    if (!dir.exists) return 0;
    const names = dir.list().filter((x): x is File => x instanceof File).map(f => f.name);
    const orphans = orphanReceipts(names, referenced);
    for (const n of orphans) deleteReceipt(n);
    return orphans.length;
}
